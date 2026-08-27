import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { ALL_ITEMS, type ItemDefinition } from "../../client/src/game/data/catalog";
import { getAssetCredit, canDistributeAsset, type AssetCredit } from "../../client/src/game/data/assetProvenance";
import { PLANT_CATALOG, type PlantDefinition } from "../../client/src/game/data/plantCatalog";
import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const ASSET_PROVENANCE_BINDING_GRAPH_RULES_VERSION = "asset-provenance-binding-graph-rules.v1" as const;
export const ASSET_PROVENANCE_BINDING_GENERATOR_VERSION = "1.0.0" as const;
export const ASSET_PROVENANCE_BINDING_SCHEMA_VERSION = "a-survival.asset-provenance-binding.v1" as const;
export const ASSET_PROVENANCE_BINDING_MAX_MANIFEST_ENTRIES = 64 as const;
export const ASSET_PROVENANCE_BINDING_MAX_PLANT_SAMPLE = 64 as const;
export const ASSET_PROVENANCE_BINDING_MAX_ITEM_SAMPLE = 64 as const;

const ACTIVE_ASSET_PACK_ROOT = resolve(process.cwd(), "client/public/assets/packs/arcane-frontier-voxel-pixel");
const ACTIVE_ASSET_PACK_MANIFEST_PATH = resolve(ACTIVE_ASSET_PACK_ROOT, "manifest.json");

type RuntimeAssetKind = "texture" | "model" | "animation" | "audio" | "data";
type BindingSource = "plant" | "item";
type BindingStatus = "verified" | "missing-asset" | "integrity-blocked" | "kind-mismatch" | "provenance-blocked";
type ProvenanceSource = "direct" | "pack" | "none";

export type RuntimeAssetEntry = {
  kind: RuntimeAssetKind;
  path: string;
  mime?: string;
  fallback?: string;
  sha256?: string;
};

export type RuntimeAssetPackManifest = {
  schemaVersion: number;
  id: string;
  namespace: string;
  version: string;
  packSha256?: string;
  entries: Record<string, RuntimeAssetEntry>;
};

export type RuntimeAssetFileState = {
  exists: boolean;
  sha256?: string;
  isFile?: boolean;
};

export type AssetProvenanceBindingSources = {
  plants: PlantDefinition[];
  items: ItemDefinition[];
  manifest: RuntimeAssetPackManifest;
  fileStates: Record<string, RuntimeAssetFileState>;
  provenance: AssetCredit | null;
  directAssetCredits: Record<string, AssetCredit | null>;
  durableRegistry: { registryId: string; contentHash: string } | null;
};

export type AssetProvenanceBindingReferenceType =
  | "plant-binding"
  | "item-binding"
  | "asset-integrity"
  | "asset-kind"
  | "asset-provenance"
  | "pack-integrity"
  | "durable-registry";

export type AssetProvenanceBindingReference = {
  sourceKey: string;
  referenceType: AssetProvenanceBindingReferenceType;
  referenceId: string;
  reason: string;
};

export type AssetProvenanceBindingRecord = {
  source: BindingSource;
  sourceId: string;
  assetId: string;
  expectedKind: "texture";
  manifestEntry: boolean;
  manifestEntryKind?: RuntimeAssetKind;
  path?: string;
  fileExists: boolean;
  fileHashMatches: boolean;
  provenanceSource: ProvenanceSource;
  provenanceAssetId?: string;
  provenanceStatus: AssetCredit["status"] | "missing";
  status: BindingStatus;
};

export type AssetProvenanceBindingDependencyGraphInput = {
  seed: string;
  plantSampleCount?: number;
  itemSampleCount?: number;
  rulesVersion?: string;
};

export type AssetProvenanceBindingDependencyGraphOutput = {
  artifact: {
    generatorId: "asset.provenance.binding";
    generatorVersion: typeof ASSET_PROVENANCE_BINDING_GENERATOR_VERSION;
    schemaVersion: typeof ASSET_PROVENANCE_BINDING_SCHEMA_VERSION;
    seed: string;
    rulesVersion: string;
    contentHash: string;
    plantCatalogHash: string;
    itemCatalogHash: string;
    manifestHash: string;
    plantCount: number;
    itemCount: number;
    sampledPlantCount: number;
    sampledItemCount: number;
    auditedBindingCount: number;
  };
  runtimePack: {
    id: string;
    namespace: string;
    version: string;
    contentHash: string;
    entryCount: number;
    packIntegrityVerified: boolean;
    provenanceVerified: boolean;
    durableRegistryVerified: boolean;
  };
  bindings: AssetProvenanceBindingRecord[];
  summary: {
    plantCount: number;
    itemCount: number;
    sampledPlantCount: number;
    sampledItemCount: number;
    auditedBindingCount: number;
    uniqueAssetCount: number;
    verifiedBindingCount: number;
    blockedBindingCount: number;
    missingAssetBindingCount: number;
    integrityBlockedBindingCount: number;
    kindMismatchBindingCount: number;
    provenanceBlockedBindingCount: number;
    logicalAssetIds: string[];
    verifiedAssetIds: string[];
    blockedAssetIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<AssetProvenanceBindingReferenceType, number>;
  };
  unresolvedReferences: AssetProvenanceBindingReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

export function readActiveAssetProvenanceBindingSources(): AssetProvenanceBindingSources {
  const manifest = JSON.parse(readFileSync(ACTIVE_ASSET_PACK_MANIFEST_PATH, "utf8")) as RuntimeAssetPackManifest;
  const fileStates: Record<string, RuntimeAssetFileState> = {};
  for (const [assetId, entry] of Object.entries(manifest.entries)) {
    const filePath = resolve(ACTIVE_ASSET_PACK_ROOT, entry.path);
    const withinPack = relative(ACTIVE_ASSET_PACK_ROOT, filePath) && !relative(ACTIVE_ASSET_PACK_ROOT, filePath).startsWith("..") && !relative(ACTIVE_ASSET_PACK_ROOT, filePath).includes("/../");
    const exists = Boolean(withinPack && existsSync(filePath));
    const isFile = exists && statSync(filePath).isFile();
    fileStates[assetId] = { exists: exists && isFile, isFile, ...(exists && isFile ? { sha256: sha256File(filePath) } : {}) };
  }
  const directAssetCredits = Object.fromEntries(Object.keys(manifest.entries).map(assetId => [assetId, getAssetCredit(assetId) ?? null]));
  return {
    plants: PLANT_CATALOG.map(plant => ({ ...plant, biomeTags: [...plant.biomeTags], compatibleSoils: [...plant.compatibleSoils], growthStages: [...plant.growthStages], effect: { ...plant.effect }, yieldQuantity: [...plant.yieldQuantity] as [number, number] })),
    items: ALL_ITEMS.map(item => ({ ...item, tags: [...item.tags] })),
    manifest,
    fileStates,
    provenance: getAssetCredit(`pack.${manifest.id}`) ?? null,
    directAssetCredits,
    durableRegistry: null,
  };
}

function sha256File(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function sha256Text(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return { key: target.key, kind: target.kind, required: true, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function runtimeEntryKind(kind: RuntimeAssetKind): GeneratorKind {
  if (kind === "texture") return "texture";
  if (kind === "model") return "other";
  if (kind === "animation") return "animation";
  if (kind === "audio") return "audio";
  return "other";
}

function fileHashMatches(entry: RuntimeAssetEntry | undefined, fileState: RuntimeAssetFileState | undefined) {
  return Boolean(entry?.sha256 && fileState?.exists && fileState.sha256 && entry.sha256.toLowerCase() === fileState.sha256.toLowerCase());
}

function packIntegrityMatches(manifest: RuntimeAssetPackManifest, fileStates: Record<string, RuntimeAssetFileState>) {
  const orderedEntryDigestHash = sha256Text(Object.values(manifest.entries).map(entry => entry.sha256 ?? "").join(""));
  return Boolean(manifest.packSha256 && manifest.packSha256.toLowerCase() === orderedEntryDigestHash && Object.entries(manifest.entries).every(([assetId, entry]) => fileHashMatches(entry, fileStates[assetId])));
}

function provenanceStatus(credit: AssetCredit | null): AssetCredit["status"] | "missing" {
  return credit?.status ?? "missing";
}

function unresolvedReferenceTypes(unresolvedReferences: AssetProvenanceBindingReference[]) {
  const referenceTypes: AssetProvenanceBindingReferenceType[] = ["plant-binding", "item-binding", "asset-integrity", "asset-kind", "asset-provenance", "pack-integrity", "durable-registry"];
  return Object.fromEntries(referenceTypes.map(type => [type, unresolvedReferences.filter(reference => reference.referenceType === type).length])) as Record<AssetProvenanceBindingReferenceType, number>;
}

function pushUnresolved(unresolvedReferences: AssetProvenanceBindingReference[], sourceKey: string, referenceType: AssetProvenanceBindingReferenceType, referenceId: string, reason: string) {
  unresolvedReferences.push({ sourceKey, referenceType, referenceId, reason });
}

function selectSamples(sources: AssetProvenanceBindingSources, input: AssetProvenanceBindingDependencyGraphInput) {
  const plantSampleCount = input.plantSampleCount ?? 16;
  const itemSampleCount = input.itemSampleCount ?? 18;
  if (!Number.isInteger(plantSampleCount) || plantSampleCount < 1 || plantSampleCount > ASSET_PROVENANCE_BINDING_MAX_PLANT_SAMPLE) throw new Error(`plantSampleCount must be an integer from 1 to ${ASSET_PROVENANCE_BINDING_MAX_PLANT_SAMPLE}`);
  if (!Number.isInteger(itemSampleCount) || itemSampleCount < 1 || itemSampleCount > ASSET_PROVENANCE_BINDING_MAX_ITEM_SAMPLE) throw new Error(`itemSampleCount must be an integer from 1 to ${ASSET_PROVENANCE_BINDING_MAX_ITEM_SAMPLE}`);
  const plants = [...sources.plants].sort((left, right) => compareStrings(left.id, right.id)).slice(0, plantSampleCount);
  const items = [...sources.items].sort((left, right) => compareStrings(left.id, right.id)).slice(0, itemSampleCount);
  return { plants, items };
}

export function buildAssetProvenanceBindingDependencyGraphFromSources(input: AssetProvenanceBindingDependencyGraphInput, sources: AssetProvenanceBindingSources): AssetProvenanceBindingDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? ASSET_PROVENANCE_BINDING_GRAPH_RULES_VERSION;
  if (rulesVersion !== ASSET_PROVENANCE_BINDING_GRAPH_RULES_VERSION) throw new Error(`Unsupported asset provenance binding graph rules version: ${rulesVersion}`);
  if (!input.seed.trim() || input.seed.length > 128) throw new Error("seed must be 1–128 characters");
  const manifestEntryIds = Object.keys(sources.manifest.entries).sort(compareStrings);
  if (manifestEntryIds.length === 0 || manifestEntryIds.length > ASSET_PROVENANCE_BINDING_MAX_MANIFEST_ENTRIES) throw new Error(`manifest entries must contain 1 to ${ASSET_PROVENANCE_BINDING_MAX_MANIFEST_ENTRIES} entries`);
  const { plants, items } = selectSamples(sources, input);
  const packNode: DependencyGraphNode = {
    key: `asset-pack:${sources.manifest.id}@${sources.manifest.version}`,
    kind: "other",
    generatorId: "asset.pack.manifest",
    generatorVersion: ASSET_PROVENANCE_BINDING_GENERATOR_VERSION,
    schemaVersion: "a-survival.asset-pack-manifest.v1",
    seed: sources.manifest.id,
    rulesVersion,
    contentHash: hashStableJson(sources.manifest as never),
    dependencies: [],
  };
  const packIntegrityVerified = packIntegrityMatches(sources.manifest, sources.fileStates);
  const provenanceVerified = Boolean(sources.provenance && canDistributeAsset(sources.provenance));
  const durableRegistryVerified = Boolean(sources.durableRegistry);
  const unresolvedReferences: AssetProvenanceBindingReference[] = [];
  if (!packIntegrityVerified) {
    packNode.dependencies.push(missingDependency(`asset-pack-integrity:${sources.manifest.id}@${sources.manifest.version}`, "other"));
    pushUnresolved(unresolvedReferences, packNode.key, "pack-integrity", sources.manifest.id, "active pack packSha256 or one of its local file SHA-256 values is invalid");
  }
  const provenanceNode: DependencyGraphNode | null = provenanceVerified && sources.provenance
    ? { key: `provenance:pack.${sources.manifest.id}`, kind: "other", generatorId: "asset.provenance", generatorVersion: ASSET_PROVENANCE_BINDING_GENERATOR_VERSION, schemaVersion: "a-survival.asset-provenance.v1", seed: sources.manifest.id, rulesVersion, contentHash: hashStableJson(sources.provenance as never), dependencies: [] }
    : null;
  if (provenanceNode) packNode.dependencies.push(dependencyFor(provenanceNode));
  else {
    packNode.dependencies.push(missingDependency(`provenance:pack.${sources.manifest.id}`, "other"));
    pushUnresolved(unresolvedReferences, packNode.key, "asset-provenance", sources.manifest.id, "active pack has no distributable project-original or license-verified provenance credit");
  }
  const durableRegistryNode: DependencyGraphNode | null = sources.durableRegistry
    ? { key: `registry:asset-provenance:${sources.manifest.id}`, kind: "other", generatorId: "asset.registry", generatorVersion: ASSET_PROVENANCE_BINDING_GENERATOR_VERSION, schemaVersion: "a-survival.asset-registry.v1", seed: sources.manifest.id, rulesVersion, contentHash: sources.durableRegistry.contentHash, dependencies: [] }
    : null;
  if (durableRegistryNode) packNode.dependencies.push(dependencyFor(durableRegistryNode));
  else {
    packNode.dependencies.push(missingDependency(`registry:asset-provenance:${sources.manifest.id}`, "other"));
    pushUnresolved(unresolvedReferences, packNode.key, "durable-registry", sources.manifest.id, "asset provenance has no durable registry snapshot binding");
  }

  const requestedBindings: Array<{ source: BindingSource; sourceId: string; assetId?: string }> = [];
  for (const plant of plants) {
    requestedBindings.push({ source: "plant", sourceId: plant.id, assetId: plant.assetId });
    requestedBindings.push({ source: "plant", sourceId: `${plant.id}:seed`, assetId: plant.seedItemId });
    requestedBindings.push({ source: "plant", sourceId: `${plant.id}:yield`, assetId: plant.yieldItemId });
  }
  for (const item of items) requestedBindings.push({ source: "item", sourceId: item.id, assetId: item.iconAssetId });
  const uniqueBindings = new Map<string, { source: BindingSource; sourceId: string; assetId?: string }>();
  for (const binding of requestedBindings) {
    const key = `${binding.source}:${binding.sourceId}:${binding.assetId ?? ""}`;
    if (!uniqueBindings.has(key)) uniqueBindings.set(key, binding);
  }
  const runtimeNodes = new Map<string, DependencyGraphNode>();
  const bindingNodes: DependencyGraphNode[] = [];
  const bindings: AssetProvenanceBindingRecord[] = [];
  for (const binding of Array.from(uniqueBindings.values())) {
    const sourceKey = `asset-binding:${binding.source}:${binding.sourceId}`;
    const assetId = binding.assetId ?? "";
    const entry = assetId ? sources.manifest.entries[assetId] : undefined;
    const fileState = assetId ? sources.fileStates[assetId] : undefined;
    const fileExists = Boolean(fileState?.exists);
    const fileMatches = fileHashMatches(entry, fileState);
    const directCredit = assetId ? sources.directAssetCredits[assetId] ?? null : null;
    const selectedCredit = directCredit ?? sources.provenance;
    const provenanceSource: ProvenanceSource = directCredit ? "direct" : sources.provenance ? "pack" : "none";
    const provenanceAllowed = Boolean(selectedCredit && canDistributeAsset(selectedCredit));
    const status: BindingStatus = !assetId || !entry ? "missing-asset" : entry.kind !== "texture" ? "kind-mismatch" : !fileMatches ? "integrity-blocked" : !provenanceAllowed ? "provenance-blocked" : "verified";
    bindings.push({
      source: binding.source,
      sourceId: binding.sourceId,
      assetId,
      expectedKind: "texture",
      manifestEntry: Boolean(entry),
      ...(entry ? { manifestEntryKind: entry.kind, path: entry.path } : {}),
      fileExists,
      fileHashMatches: fileMatches,
      provenanceSource,
      ...(selectedCredit ? { provenanceAssetId: selectedCredit.assetId } : {}),
      provenanceStatus: provenanceStatus(selectedCredit),
      status,
    });
    const bindingNode: DependencyGraphNode = {
      key: sourceKey,
      kind: "texture",
      generatorId: "asset.provenance.binding",
      generatorVersion: ASSET_PROVENANCE_BINDING_GENERATOR_VERSION,
      schemaVersion: ASSET_PROVENANCE_BINDING_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson({ binding, entry, fileState, selectedCredit } as never),
      dependencies: [dependencyFor(packNode)],
    };
    if (entry) {
      const runtimeNode = runtimeNodes.get(assetId) ?? {
        key: `asset:${assetId}`,
        kind: runtimeEntryKind(entry.kind),
        generatorId: "asset.pack.manifest",
        generatorVersion: ASSET_PROVENANCE_BINDING_GENERATOR_VERSION,
        schemaVersion: "a-survival.asset-pack-entry.v1",
        seed: `${sources.manifest.id}:${assetId}`,
        rulesVersion,
        contentHash: hashStableJson({ assetId, entry, fileState } as never),
        dependencies: [dependencyFor(packNode)],
      } satisfies DependencyGraphNode;
      runtimeNodes.set(assetId, runtimeNode);
      bindingNode.dependencies.push({ key: runtimeNode.key, kind: "texture", required: true, generatorId: runtimeNode.generatorId, generatorVersion: runtimeNode.generatorVersion, contentHash: runtimeNode.contentHash });
      if (entry.kind !== "texture") pushUnresolved(unresolvedReferences, sourceKey, "asset-kind", assetId, `binding requires texture but active manifest declares ${entry.kind}`);
      if (!fileMatches) {
        bindingNode.dependencies.push(missingDependency(`asset-integrity:${assetId}`, "other"));
        pushUnresolved(unresolvedReferences, sourceKey, "asset-integrity", assetId, "manifest entry is not backed by a matching local file SHA-256");
      }
    } else {
      bindingNode.dependencies.push(missingDependency(`asset:${assetId || "unknown"}`, "texture"));
      pushUnresolved(unresolvedReferences, sourceKey, binding.source === "plant" ? "plant-binding" : "item-binding", binding.sourceId, "definition has no exact active-pack asset binding");
    }
    if (!provenanceAllowed) {
      bindingNode.dependencies.push(missingDependency(`provenance:${assetId || "unknown"}`, "other"));
      pushUnresolved(unresolvedReferences, sourceKey, "asset-provenance", assetId || binding.sourceId, "binding has no distributable direct or pack-level provenance credit");
    } else if (directCredit) {
      const directNode: DependencyGraphNode = {
        key: `provenance:entry:${assetId}`,
        kind: "other",
        generatorId: "asset.provenance",
        generatorVersion: ASSET_PROVENANCE_BINDING_GENERATOR_VERSION,
        schemaVersion: "a-survival.asset-provenance.v1",
        seed: assetId,
        rulesVersion,
        contentHash: hashStableJson(directCredit as never),
        dependencies: [],
      };
      bindingNode.dependencies.push(dependencyFor(directNode));
    } else if (provenanceNode) bindingNode.dependencies.push(dependencyFor(provenanceNode));
    bindingNodes.push(bindingNode);
  }
  const sortedBindings = bindings.sort((left, right) => compareStrings(`${left.source}:${left.sourceId}:${left.assetId}`, `${right.source}:${right.sourceId}:${right.assetId}`));
  const sortedUnresolvedReferences = unresolvedReferences.sort((left, right) => compareStrings(left.sourceKey, right.sourceKey) || compareStrings(left.referenceType, right.referenceType) || compareStrings(left.referenceId, right.referenceId) || compareStrings(left.reason, right.reason));
  const uniqueAssetIds = Array.from(new Set(sortedBindings.map(binding => binding.assetId).filter(Boolean))).sort(compareStrings);
  const verifiedAssetIds = uniqueAssetIds.filter(assetId => sortedBindings.filter(binding => binding.assetId === assetId).every(binding => binding.status === "verified") && packIntegrityVerified && provenanceVerified && durableRegistryVerified);
  const blockedAssetIds = uniqueAssetIds.filter(assetId => !verifiedAssetIds.includes(assetId));
  const plantCatalogHash = hashStableJson(sources.plants as never);
  const itemCatalogHash = hashStableJson(sources.items as never);
  const manifestHash = packNode.contentHash;
  const contentHash = hashStableJson({ schemaVersion: ASSET_PROVENANCE_BINDING_SCHEMA_VERSION, generatorId: "asset.provenance.binding", generatorVersion: ASSET_PROVENANCE_BINDING_GENERATOR_VERSION, seed: input.seed, rulesVersion, plantCatalogHash, itemCatalogHash, manifest: sources.manifest, fileStates: sources.fileStates, provenance: sources.provenance, directAssetCredits: sources.directAssetCredits, durableRegistry: sources.durableRegistry, sampledPlantIds: plants.map(plant => plant.id), sampledItemIds: items.map(item => item.id) } as never);
  const rootNode: DependencyGraphNode = {
    key: `asset-provenance-binding:${contentHash}`,
    kind: "other",
    generatorId: "asset.provenance.binding",
    generatorVersion: ASSET_PROVENANCE_BINDING_GENERATOR_VERSION,
    schemaVersion: ASSET_PROVENANCE_BINDING_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash,
    dependencies: bindingNodes.sort((left, right) => compareStrings(left.key, right.key)).map(dependencyFor),
  };
  const directProvenanceNodes = uniqueAssetIds.filter(assetId => sources.directAssetCredits[assetId]).map(assetId => {
    const credit = sources.directAssetCredits[assetId]!;
    return { key: `provenance:entry:${assetId}`, kind: "other" as const, generatorId: "asset.provenance", generatorVersion: ASSET_PROVENANCE_BINDING_GENERATOR_VERSION, schemaVersion: "a-survival.asset-provenance.v1", seed: assetId, rulesVersion, contentHash: hashStableJson(credit as never), dependencies: [] } satisfies DependencyGraphNode;
  });
  const nodes = [packNode, ...(provenanceNode ? [provenanceNode] : []), ...(durableRegistryNode ? [durableRegistryNode] : []), ...Array.from(runtimeNodes.values()), ...directProvenanceNodes, ...bindingNodes, rootNode].sort((left, right) => compareStrings(left.key, right.key));
  const missingAssetBindingCount = sortedBindings.filter(binding => binding.status === "missing-asset").length;
  const integrityBlockedBindingCount = sortedBindings.filter(binding => binding.status === "integrity-blocked").length;
  const kindMismatchBindingCount = sortedBindings.filter(binding => binding.status === "kind-mismatch").length;
  const provenanceBlockedBindingCount = sortedBindings.filter(binding => binding.status === "provenance-blocked").length;
  return {
    artifact: { generatorId: "asset.provenance.binding", generatorVersion: ASSET_PROVENANCE_BINDING_GENERATOR_VERSION, schemaVersion: ASSET_PROVENANCE_BINDING_SCHEMA_VERSION, seed: input.seed, rulesVersion, contentHash, plantCatalogHash, itemCatalogHash, manifestHash, plantCount: sources.plants.length, itemCount: sources.items.length, sampledPlantCount: plants.length, sampledItemCount: items.length, auditedBindingCount: sortedBindings.length },
    runtimePack: { id: sources.manifest.id, namespace: sources.manifest.namespace, version: sources.manifest.version, contentHash: manifestHash, entryCount: manifestEntryIds.length, packIntegrityVerified, provenanceVerified, durableRegistryVerified },
    bindings: sortedBindings,
    summary: { plantCount: sources.plants.length, itemCount: sources.items.length, sampledPlantCount: plants.length, sampledItemCount: items.length, auditedBindingCount: sortedBindings.length, uniqueAssetCount: uniqueAssetIds.length, verifiedBindingCount: sortedBindings.filter(binding => binding.status === "verified").length, blockedBindingCount: sortedBindings.filter(binding => binding.status !== "verified").length, missingAssetBindingCount, integrityBlockedBindingCount, kindMismatchBindingCount, provenanceBlockedBindingCount, logicalAssetIds: uniqueAssetIds, verifiedAssetIds, blockedAssetIds, unresolvedReferenceCount: sortedUnresolvedReferences.length, unresolvedReferenceTypes: unresolvedReferenceTypes(sortedUnresolvedReferences) },
    unresolvedReferences: sortedUnresolvedReferences,
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}

export function buildAssetProvenanceBindingDependencyGraph(input: AssetProvenanceBindingDependencyGraphInput): AssetProvenanceBindingDependencyGraphOutput {
  return buildAssetProvenanceBindingDependencyGraphFromSources(input, readActiveAssetProvenanceBindingSources());
}
