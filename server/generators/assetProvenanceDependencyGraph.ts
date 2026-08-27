import { ALL_ITEMS, type ItemDefinition } from "../../client/src/game/data/catalog";
import { isAssetPackManifest, type AssetPackEntry, type AssetPackManifest } from "../../client/src/game/assets/assetPackLoader";
import { ASSET_CREDITS, type AssetCredit } from "../../client/src/game/data/assetProvenance";
import { PLANT_CATALOG, type PlantDefinition } from "../../client/src/game/data/plantCatalog";
import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const ASSET_PROVENANCE_GRAPH_RULES_VERSION = "asset-provenance-graph-rules.v1" as const;
export const ACTIVE_ASSET_PACK_ID = "arcane-frontier-voxel-pixel" as const;
export const ASSET_PROVENANCE_GRAPH_GENERATOR_VERSION = "1.0.0" as const;

const MAX_SAMPLE_COUNT = 32;

type AssetReferenceType = "item-icon" | "item-model" | "plant-asset" | "plant-seed-icon" | "manifest-asset" | "asset-credit" | "pack-credit";

type AssetProvenanceDependencyGraphInput = {
  seed: string;
  manifest: AssetPackManifest;
  credits?: readonly AssetCredit[];
  sampleItemCount?: number;
  samplePlantCount?: number;
  rulesVersion?: string;
};

export type UnresolvedAssetProvenanceReference = {
  sourceKey: string;
  referenceType: AssetReferenceType;
  referenceId: string;
  reason: string;
};

export type AssetProvenanceDependencyGraphOutput = {
  artifact: {
    generatorId: string;
    generatorVersion: string;
    seed: string;
    manifestId: string;
    manifestVersion: string;
    manifestHash: string;
    sampledItemCount: number;
    sampledPlantCount: number;
  };
  summary: {
    manifestEntryCount: number;
    itemCount: number;
    sampledItemCount: number;
    plantCount: number;
    sampledPlantCount: number;
    referencedAssetCount: number;
    manifestAssetMatchCount: number;
    missingManifestAssetCount: number;
    creditMatchCount: number;
    missingCreditCount: number;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<AssetReferenceType, number>;
  };
  unresolvedReferences: UnresolvedAssetProvenanceReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedSample(value: number | undefined, fallback: number, label: string) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > MAX_SAMPLE_COUNT) throw new Error(`${label} must be an integer from 1 to ${MAX_SAMPLE_COUNT}`);
  return normalized;
}

function manifestNode(manifest: AssetPackManifest, seed: string, rulesVersion: string, credit?: AssetCredit): DependencyGraphNode {
  const node: DependencyGraphNode = {
    key: `asset-pack:${manifest.id}:${manifest.version}`,
    kind: "other",
    generatorId: "asset.pack",
    generatorVersion: manifest.version,
    schemaVersion: "a-survival.asset-pack-manifest.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(manifest as never),
    dependencies: [],
  };
  if (credit) node.dependencies.push({ key: `asset-credit:${credit.assetId}`, kind: "other", required: true, generatorId: "asset.provenance", generatorVersion: ASSET_PROVENANCE_GRAPH_GENERATOR_VERSION, contentHash: hashStableJson(credit as never) });
  return node;
}

function entryKind(entry: AssetPackEntry): GeneratorKind {
  return entry.kind === "texture" ? "texture" : entry.kind === "animation" ? "animation" : entry.kind === "audio" ? "audio" : "other";
}

function manifestEntryNode(manifest: AssetPackManifest, assetId: string, entry: AssetPackEntry, root: DependencyGraphNode, seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `asset:${assetId}`,
    kind: entryKind(entry),
    generatorId: "asset.pack",
    generatorVersion: manifest.version,
    schemaVersion: "a-survival.asset-pack-entry.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(entry as never),
    dependencies: [{ key: root.key, kind: root.kind, required: true, generatorId: root.generatorId, generatorVersion: root.generatorVersion, contentHash: root.contentHash }],
  };
}

function creditNode(credit: AssetCredit, seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `asset-credit:${credit.assetId}`,
    kind: "other",
    generatorId: "asset.provenance",
    generatorVersion: ASSET_PROVENANCE_GRAPH_GENERATOR_VERSION,
    schemaVersion: "a-survival.asset-credit.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(credit as never),
    dependencies: [],
  };
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return { key: node.key, kind: node.kind, required: true, generatorId: node.generatorId, generatorVersion: node.generatorVersion, contentHash: node.contentHash };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function addUnresolved(list: UnresolvedAssetProvenanceReference[], sourceKey: string, referenceType: AssetReferenceType, referenceId: string, reason: string) {
  list.push({ sourceKey, referenceType, referenceId, reason });
}

function attachAssetReference(input: {
  node: DependencyGraphNode;
  assetId: string;
  referenceType: AssetReferenceType;
  manifestEntry: AssetPackEntry | undefined;
  manifest: AssetPackManifest;
  root: DependencyGraphNode;
  credit: AssetCredit | undefined;
  credits: Map<string, AssetCredit>;
  seed: string;
  rulesVersion: string;
  unresolved: UnresolvedAssetProvenanceReference[];
}) {
  const { node, assetId, referenceType, manifestEntry, manifest, root, credit, credits, seed, rulesVersion, unresolved } = input;
  if (manifestEntry) {
    const manifestNode = manifestEntryNode(manifest, assetId, manifestEntry, root, seed, rulesVersion);
    node.dependencies.push(dependencyFor(manifestNode));
  } else {
    node.dependencies.push(missingDependency(`asset:${assetId}`, referenceType === "item-model" ? "other" : "texture"));
    addUnresolved(unresolved, node.key, "manifest-asset", assetId, `asset ID ${assetId} is not present in active manifest ${manifest.id}`);
  }

  if (credit) {
    node.dependencies.push({ key: `asset-credit:${credit.assetId}`, kind: "other", required: true, generatorId: "asset.provenance", generatorVersion: ASSET_PROVENANCE_GRAPH_GENERATOR_VERSION, contentHash: hashStableJson(credit as never) });
  } else {
    const kind = credits.has(assetId) ? "asset-credit" : "asset-credit";
    node.dependencies.push(missingDependency(`asset-credit:${assetId}`, "other"));
    addUnresolved(unresolved, node.key, kind, assetId, `asset ID ${assetId} has no matching distributable credit/provenance record`);
  }
}

function itemNode(item: ItemDefinition, input: { manifest: AssetPackManifest; manifestNodes: Map<string, DependencyGraphNode>; credits: Map<string, AssetCredit>; root: DependencyGraphNode; seed: string; rulesVersion: string; unresolved: UnresolvedAssetProvenanceReference[] }): DependencyGraphNode {
  const node: DependencyGraphNode = {
    key: `item:${item.id}`,
    kind: "item",
    generatorId: "item.catalog",
    generatorVersion: "1.0.0",
    schemaVersion: "a-survival.item-definition.v1",
    seed: input.seed,
    rulesVersion: input.rulesVersion,
    contentHash: hashStableJson(item as never),
    dependencies: [dependencyFor(input.root)],
  };
  if (item.iconAssetId) {
    attachAssetReference({ ...input, node, assetId: item.iconAssetId, referenceType: "item-icon", manifestEntry: input.manifest.entries[item.iconAssetId], credit: input.credits.get(item.iconAssetId), credits: input.credits, unresolved: input.unresolved });
  } else {
    node.dependencies.push(missingDependency(`asset:item-icon:${item.id}`, "texture"));
    addUnresolved(input.unresolved, node.key, "item-icon", item.id, "item definition has no iconAssetId");
  }
  if (item.modelAssetId) attachAssetReference({ ...input, node, assetId: item.modelAssetId, referenceType: "item-model", manifestEntry: input.manifest.entries[item.modelAssetId], credit: input.credits.get(item.modelAssetId), credits: input.credits, unresolved: input.unresolved });
  return node;
}

function plantNode(plant: PlantDefinition, input: { manifest: AssetPackManifest; manifestNodes: Map<string, DependencyGraphNode>; credits: Map<string, AssetCredit>; root: DependencyGraphNode; seed: string; rulesVersion: string; unresolved: UnresolvedAssetProvenanceReference[] }): DependencyGraphNode {
  const node: DependencyGraphNode = {
    key: `plant:${plant.id}`,
    kind: "plant",
    generatorId: "plant.catalog",
    generatorVersion: "1.0.0",
    schemaVersion: "a-survival.plant-definition.v1",
    seed: input.seed,
    rulesVersion: input.rulesVersion,
    contentHash: hashStableJson(plant as never),
    dependencies: [dependencyFor(input.root)],
  };
  attachAssetReference({ ...input, node, assetId: plant.assetId, referenceType: "plant-asset", manifestEntry: input.manifest.entries[plant.assetId], credit: input.credits.get(plant.assetId), credits: input.credits, unresolved: input.unresolved });
  attachAssetReference({ ...input, node, assetId: "items.seed", referenceType: "plant-seed-icon", manifestEntry: input.manifest.entries["items.seed"], credit: input.credits.get("items.seed"), credits: input.credits, unresolved: input.unresolved });
  return node;
}

export function buildAssetProvenanceDependencyGraph(input: AssetProvenanceDependencyGraphInput): AssetProvenanceDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? ASSET_PROVENANCE_GRAPH_RULES_VERSION;
  if (rulesVersion !== ASSET_PROVENANCE_GRAPH_RULES_VERSION) throw new Error(`Unsupported asset provenance graph rules version: ${rulesVersion}`);
  if (!isAssetPackManifest(input.manifest)) throw new Error("Active asset manifest shape is invalid");
  if (input.manifest.id !== ACTIVE_ASSET_PACK_ID) throw new Error(`Asset provenance graph only accepts active pack ${ACTIVE_ASSET_PACK_ID}`);
  const sampleItemCount = boundedSample(input.sampleItemCount, 16, "sampleItemCount");
  const samplePlantCount = boundedSample(input.samplePlantCount, 16, "samplePlantCount");
  const credits = new Map<string, AssetCredit>();
  for (const credit of input.credits ?? ASSET_CREDITS) {
    if (credits.has(credit.assetId)) throw new Error(`Duplicate asset credit ID: ${credit.assetId}`);
    credits.set(credit.assetId, credit);
  }

  const rootCredit = credits.get(`pack.${input.manifest.id}`);
  const root = manifestNode(input.manifest, input.seed, rulesVersion, rootCredit);
  const creditsNodes = Array.from(credits.values()).sort((left, right) => left.assetId.localeCompare(right.assetId)).map(credit => creditNode(credit, input.seed, rulesVersion));
  const manifestNodes = new Map(Object.entries(input.manifest.entries).sort(([left], [right]) => left.localeCompare(right)).map(([assetId, entry]) => [assetId, manifestEntryNode(input.manifest, assetId, entry, root, input.seed, rulesVersion)]));
  const unresolved: UnresolvedAssetProvenanceReference[] = [];
  if (!rootCredit) addUnresolved(unresolved, root.key, "pack-credit", `pack.${input.manifest.id}`, "active manifest has no matching pack-level credit record");

  const sampledItems = ALL_ITEMS.slice().sort((left, right) => left.id.localeCompare(right.id)).slice(0, sampleItemCount);
  const sampledPlants = PLANT_CATALOG.slice().sort((left, right) => left.id.localeCompare(right.id)).slice(0, samplePlantCount);
  const itemNodes = sampledItems.map(item => itemNode(item, { manifest: input.manifest, manifestNodes, credits, root, seed: input.seed, rulesVersion, unresolved }));
  const plantNodes = sampledPlants.map(plant => plantNode(plant, { manifest: input.manifest, manifestNodes, credits, root, seed: input.seed, rulesVersion, unresolved }));
  const referencedAssetIds = Array.from(new Set([...sampledItems.flatMap(item => [item.iconAssetId, item.modelAssetId]), ...sampledPlants.flatMap(plant => [plant.assetId, "items.seed"])]))
    .filter((value): value is string => Boolean(value))
    .sort();
  const manifestAssetMatchCount = referencedAssetIds.filter(assetId => Boolean(input.manifest.entries[assetId])).length;
  const creditMatchCount = referencedAssetIds.filter(assetId => credits.has(assetId)).length;
  const unresolvedReferenceTypes = {
    "item-icon": unresolved.filter(reference => reference.referenceType === "item-icon").length,
    "item-model": unresolved.filter(reference => reference.referenceType === "item-model").length,
    "plant-asset": unresolved.filter(reference => reference.referenceType === "plant-asset").length,
    "plant-seed-icon": unresolved.filter(reference => reference.referenceType === "plant-seed-icon").length,
    "manifest-asset": unresolved.filter(reference => reference.referenceType === "manifest-asset").length,
    "asset-credit": unresolved.filter(reference => reference.referenceType === "asset-credit").length,
    "pack-credit": unresolved.filter(reference => reference.referenceType === "pack-credit").length,
  } satisfies Record<AssetReferenceType, number>;
  const nodes = [root, ...creditsNodes, ...Array.from(manifestNodes.values()), ...itemNodes, ...plantNodes];
  const manifestHash = hashStableJson(input.manifest as never);
  return {
    artifact: { generatorId: "asset.provenance", generatorVersion: ASSET_PROVENANCE_GRAPH_GENERATOR_VERSION, seed: input.seed, manifestId: input.manifest.id, manifestVersion: input.manifest.version, manifestHash, sampledItemCount: sampledItems.length, sampledPlantCount: sampledPlants.length },
    summary: { manifestEntryCount: Object.keys(input.manifest.entries).length, itemCount: ALL_ITEMS.length, sampledItemCount: sampledItems.length, plantCount: PLANT_CATALOG.length, sampledPlantCount: sampledPlants.length, referencedAssetCount: referencedAssetIds.length, manifestAssetMatchCount, missingManifestAssetCount: referencedAssetIds.length - manifestAssetMatchCount, creditMatchCount, missingCreditCount: referencedAssetIds.length - creditMatchCount, unresolvedReferenceCount: unresolved.length, unresolvedReferenceTypes },
    unresolvedReferences: unresolved.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
