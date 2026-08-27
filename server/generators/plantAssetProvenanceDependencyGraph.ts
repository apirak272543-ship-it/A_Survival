import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { getAssetCredit, canDistributeAsset, type AssetCredit } from "../../client/src/game/data/assetProvenance";
import { getItemDefinition } from "../../client/src/game/data/catalog";
import { PLANT_ITEMS, PLANT_CATALOG, getPlantDefinition } from "../../client/src/game/data/plantCatalog";
import { generateWorldPlantCatalog, WORLD_PLANT_CATALOG_SIZE, type WorldPlantDefinition } from "../../client/src/game/tools/plantCatalogGenerator";
import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { buildContentCatalogDependencyGraph } from "./contentCatalogDependencyGraph";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const PLANT_ASSET_PROVENANCE_GRAPH_RULES_VERSION = "plant-asset-provenance-graph-rules.v1" as const;
export const PLANT_ASSET_PROVENANCE_GENERATOR_VERSION = "1.0.0" as const;
export const PLANT_ASSET_PROVENANCE_SCHEMA_VERSION = "a-survival.plant-asset-provenance.v1" as const;
export const RUNTIME_ASSET_PACK_MANIFEST_VERSION = "1.0.0" as const;

const ACTIVE_ASSET_PACK_ROOT = resolve(process.cwd(), "client/public/assets/packs/arcane-frontier-voxel-pixel");
const ACTIVE_ASSET_PACK_MANIFEST_PATH = resolve(ACTIVE_ASSET_PACK_ROOT, "manifest.json");
const EXPECTED_RUNTIME_ASSET_KIND = "texture" as const;
const CONTENT_ASSET_CATEGORIES = ["plant", "seed"] as const;

type RuntimeAssetKind = "texture" | "model" | "animation" | "audio" | "data";

type RuntimeAssetEntry = {
  kind: RuntimeAssetKind;
  path: string;
  mime?: string;
  sha256?: string;
  fallback?: string;
};

export type RuntimeAssetPackManifest = {
  schemaVersion: number;
  id: string;
  namespace: string;
  displayName?: string;
  version: string;
  packSha256?: string;
  designSource?: string;
  artStatus?: string;
  logicalResolution?: { width: number; height: number };
  tileSize?: number;
  textureSampling?: "nearest" | "linear";
  dependencies?: string[];
  entries: Record<string, RuntimeAssetEntry>;
};

export type RuntimeAssetFileState = {
  exists: boolean;
  sha256?: string;
};

export type DurableAssetRegistrySnapshot = {
  registryId: string;
  contentHash: string;
};

export type PlantAssetProvenanceSources = {
  manifest: RuntimeAssetPackManifest;
  fileStates: Record<string, RuntimeAssetFileState>;
  provenance: AssetCredit | null;
  durableRegistry: DurableAssetRegistrySnapshot | null;
};

type PlantAssetReferenceType =
  | "content-asset-binding"
  | "plant-asset-binding"
  | "seed-asset-binding"
  | "asset-binding"
  | "asset-integrity"
  | "asset-provenance"
  | "pack-integrity"
  | "durable-registry"
  | "definition-binding";

export type PlantAssetProvenanceReference = {
  sourceKey: string;
  referenceType: PlantAssetReferenceType;
  referenceId: string;
  reason: string;
};

type RuntimeAssetStatus = "verified" | "missing" | "kind-mismatch" | "integrity-blocked";

export type PlantAssetStatus = {
  assetId: string;
  manifestEntry: boolean;
  manifestEntryKind?: RuntimeAssetKind;
  fileExists: boolean;
  fileHashMatches: boolean;
  provenanceVerified: boolean;
  status: RuntimeAssetStatus;
};

export type PlantAssetProvenanceDependencyGraphInput = {
  seed: string;
  samplePlantCount?: number;
  samplePerCategory?: number;
  rulesVersion?: string;
};

export type PlantAssetProvenanceDependencyGraphOutput = {
  artifact: {
    generatorId: "plant.asset.provenance";
    generatorVersion: typeof PLANT_ASSET_PROVENANCE_GENERATOR_VERSION;
    schemaVersion: typeof PLANT_ASSET_PROVENANCE_SCHEMA_VERSION;
    seed: string;
    rulesVersion: string;
    contentHash: string;
    catalogHash: string;
    plantCount: number;
    sampledPlantCount: number;
  };
  runtimePack: {
    id: string;
    namespace: string;
    version: string;
    contentHash: string;
    packSha256?: string;
    entryCount: number;
    packIntegrityVerified: boolean;
    provenanceVerified: boolean;
    durableRegistryVerified: boolean;
  };
  plantAssetStatuses: PlantAssetStatus[];
  summary: {
    plantCount: number;
    sampledPlantCount: number;
    logicalContentAssetIds: string[];
    auditedAssetIds: string[];
    verifiedAssetIds: string[];
    blockedAssetIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<PlantAssetReferenceType, number>;
  };
  unresolvedReferences: PlantAssetProvenanceReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, label: string) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return normalized;
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return {
    key: target.key,
    kind: target.kind,
    required: true,
    generatorId: target.generatorId,
    generatorVersion: target.generatorVersion,
    contentHash: target.contentHash,
  };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function sha256File(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function sha256Text(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isSafeRelativeAssetPath(path: string) {
  return path.length > 0 && !path.startsWith("/") && !path.includes("\\") && !path.split("/").some(segment => segment === ".." || segment === "");
}

function isInsidePackRoot(filePath: string) {
  const pathFromRoot = relative(ACTIVE_ASSET_PACK_ROOT, filePath);
  return pathFromRoot.length > 0 && !pathFromRoot.startsWith("..");
}

/**
 * Reads only the active repository pack and computes file digests without using
 * browser cache, IndexedDB, network, database writes, or runtime imports.
 */
export function readActivePlantAssetProvenanceSources(): PlantAssetProvenanceSources {
  const manifest = readJsonFile<RuntimeAssetPackManifest>(ACTIVE_ASSET_PACK_MANIFEST_PATH);
  const fileStates: Record<string, RuntimeAssetFileState> = {};
  for (const [assetId, entry] of Object.entries(manifest.entries)) {
    const filePath = resolve(ACTIVE_ASSET_PACK_ROOT, entry.path);
    if (!isSafeRelativeAssetPath(entry.path) || !isInsidePackRoot(filePath) || !existsSync(filePath)) {
      fileStates[assetId] = { exists: false };
      continue;
    }
    fileStates[assetId] = { exists: true, sha256: sha256File(filePath) };
  }
  return {
    manifest,
    fileStates,
    provenance: getAssetCredit(`pack.${manifest.id}`) ?? null,
    durableRegistry: null,
  };
}

function runtimeEntryKind(kind: RuntimeAssetKind): GeneratorKind {
  if (kind === "texture") return "texture";
  if (kind === "animation") return "animation";
  if (kind === "audio") return "audio";
  return "other";
}

function buildRuntimePackNode(manifest: RuntimeAssetPackManifest, rulesVersion: string): DependencyGraphNode {
  return {
    key: `asset-pack:${manifest.id}@${manifest.version}`,
    kind: "other",
    generatorId: "asset.pack.manifest",
    generatorVersion: RUNTIME_ASSET_PACK_MANIFEST_VERSION,
    schemaVersion: "a-survival.asset-pack-manifest.v1",
    seed: manifest.id,
    rulesVersion,
    contentHash: hashStableJson(manifest as never),
    dependencies: [],
  };
}

function buildRuntimeEntryNode(manifest: RuntimeAssetPackManifest, assetId: string, fileState: RuntimeAssetFileState, rulesVersion: string, packNode: DependencyGraphNode): DependencyGraphNode | null {
  const entry = manifest.entries[assetId];
  if (!entry || !fileState.exists || !entry.sha256 || fileState.sha256?.toLowerCase() !== entry.sha256.toLowerCase()) return null;
  return {
    key: `runtime-asset:${assetId}`,
    kind: runtimeEntryKind(entry.kind),
    generatorId: "asset.pack.manifest",
    generatorVersion: RUNTIME_ASSET_PACK_MANIFEST_VERSION,
    schemaVersion: "a-survival.asset-pack-entry.v1",
    seed: `${manifest.id}:${assetId}`,
    rulesVersion,
    contentHash: hashStableJson({ assetId, entry, verifiedFileSha256: fileState.sha256 } as never),
    dependencies: [dependencyFor(packNode)],
  };
}

function packIntegrityMatches(manifest: RuntimeAssetPackManifest, fileStates: Record<string, RuntimeAssetFileState>) {
  const expected = sha256Text(Object.values(manifest.entries).map(entry => entry.sha256 ?? "").join(""));
  const manifestHashMatches = Boolean(manifest.packSha256 && manifest.packSha256.toLowerCase() === expected);
  const everyFileMatches = Object.entries(manifest.entries).every(([assetId, entry]) => fileHashMatches(entry, fileStates[assetId]));
  return manifestHashMatches && everyFileMatches;
}

function provenanceMatchesPack(provenance: AssetCredit | null, manifest: RuntimeAssetPackManifest) {
  return Boolean(provenance && provenance.assetId === `pack.${manifest.id}` && canDistributeAsset(provenance));
}

function fileHashMatches(entry: RuntimeAssetEntry | undefined, fileState: RuntimeAssetFileState | undefined) {
  return Boolean(entry?.sha256 && fileState?.exists && fileState.sha256 && entry.sha256.toLowerCase() === fileState.sha256.toLowerCase());
}

function collectUnresolvedReferenceTypes(unresolvedReferences: PlantAssetProvenanceReference[]) {
  const referenceTypes: PlantAssetReferenceType[] = [
    "content-asset-binding",
    "plant-asset-binding",
    "seed-asset-binding",
    "asset-binding",
    "asset-integrity",
    "asset-provenance",
    "pack-integrity",
    "durable-registry",
    "definition-binding",
  ];
  return Object.fromEntries(referenceTypes.map(type => [type, unresolvedReferences.filter(reference => reference.referenceType === type).length])) as Record<PlantAssetReferenceType, number>;
}

function pushUnresolved(unresolvedReferences: PlantAssetProvenanceReference[], sourceKey: string, referenceType: PlantAssetReferenceType, referenceId: string, reason: string) {
  unresolvedReferences.push({ sourceKey, referenceType, referenceId, reason });
}

function addRuntimeAssetDependency(
  dependencies: GeneratorDependency[],
  unresolvedReferences: PlantAssetProvenanceReference[],
  runtimeEntryNodes: Map<string, DependencyGraphNode>,
  manifest: RuntimeAssetPackManifest,
  assetId: string,
  sourceKey: string,
  referenceType: "plant-asset-binding" | "seed-asset-binding",
) {
  const runtimeEntryNode = runtimeEntryNodes.get(assetId);
  if (runtimeEntryNode) {
    dependencies.push({
      key: runtimeEntryNode.key,
      kind: EXPECTED_RUNTIME_ASSET_KIND,
      required: true,
      generatorId: runtimeEntryNode.generatorId,
      generatorVersion: runtimeEntryNode.generatorVersion,
      contentHash: runtimeEntryNode.contentHash,
    });
    const entry = manifest.entries[assetId];
    if (entry && entry.kind !== EXPECTED_RUNTIME_ASSET_KIND) {
      pushUnresolved(unresolvedReferences, sourceKey, referenceType, assetId, `plant runtime binding requires texture but active pack declares kind ${entry.kind}`);
    }
    return;
  }
  dependencies.push(missingDependency(`runtime-asset:${assetId}`, EXPECTED_RUNTIME_ASSET_KIND));
  const entry = manifest.entries[assetId];
  if (!entry) pushUnresolved(unresolvedReferences, sourceKey, referenceType, assetId, "plant runtime asset has no exact active asset-pack manifest binding");
  else pushUnresolved(unresolvedReferences, sourceKey, "asset-integrity", assetId, "plant runtime asset manifest entry is not backed by a matching local file SHA-256");
}

function addDefinitionNode(
  definitionKey: string,
  definition: unknown,
  seed: string,
  rulesVersion: string,
  schemaVersion: string,
) {
  const node: DependencyGraphNode = {
    key: definitionKey,
    kind: "item",
    generatorId: "plant.catalog",
    generatorVersion: PLANT_ASSET_PROVENANCE_GENERATOR_VERSION,
    schemaVersion,
    seed,
    rulesVersion,
    contentHash: hashStableJson(definition as never),
    dependencies: [],
  };
  return node;
}

export function buildPlantAssetProvenanceDependencyGraphFromSources(input: PlantAssetProvenanceDependencyGraphInput, sources: PlantAssetProvenanceSources): PlantAssetProvenanceDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? PLANT_ASSET_PROVENANCE_GRAPH_RULES_VERSION;
  if (rulesVersion !== PLANT_ASSET_PROVENANCE_GRAPH_RULES_VERSION) throw new Error(`Unsupported plant asset provenance graph rules version: ${rulesVersion}`);
  if (!input.seed.trim() || input.seed.length > 128) throw new Error("seed must be 1–128 characters");
  const samplePlantCount = boundedInteger(input.samplePlantCount, 16, 1, 32, "samplePlantCount");
  const samplePerCategory = boundedInteger(input.samplePerCategory, 8, 1, 8, "samplePerCategory");
  const contentGraph = buildContentCatalogDependencyGraph(
    { seed: input.seed, samplePerCategory },
    { categories: [...CONTENT_ASSET_CATEGORIES], countPerCategory: 300, assetNamespace: "a-survival.content" },
  );
  const catalogNode = contentGraph.nodes.find(node => node.key.startsWith("content-catalog:"));
  if (!catalogNode) throw new Error("Content catalog root node is missing");
  const logicalContentAssetNodes = contentGraph.nodes.filter(node => node.key === catalogNode.key || CONTENT_ASSET_CATEGORIES.some(category => node.key === `asset:a-survival.content.${category}`));
  const logicalContentAssetNodeById = new Map(logicalContentAssetNodes.filter(node => node.key.startsWith("asset:")).map(node => [node.key.slice("asset:".length), node]));
  const allPlants = generateWorldPlantCatalog(WORLD_PLANT_CATALOG_SIZE);
  const sampledPlants = allPlants.slice().sort((left, right) => left.id.localeCompare(right.id)).slice(0, samplePlantCount);
  const unresolvedReferences: PlantAssetProvenanceReference[] = [];
  const pack = sources.manifest;
  const packNode = buildRuntimePackNode(pack, rulesVersion);
  const packIntegrityVerified = packIntegrityMatches(pack, sources.fileStates);
  const provenanceVerified = provenanceMatchesPack(sources.provenance, pack);
  const durableRegistryVerified = Boolean(sources.durableRegistry);
  const provenanceKey = `provenance:pack.${pack.id}`;
  const durableRegistryKey = `registry:asset-pack:${pack.id}`;
  const provenanceNode: DependencyGraphNode | null = provenanceVerified && sources.provenance
    ? {
        key: provenanceKey,
        kind: "other",
        generatorId: "asset.provenance",
        generatorVersion: "1.0.0",
        schemaVersion: "a-survival.asset-provenance.v1",
        seed: pack.id,
        rulesVersion,
        contentHash: hashStableJson(sources.provenance as never),
        dependencies: [],
      }
    : null;
  if (provenanceNode) packNode.dependencies.push(dependencyFor(provenanceNode));
  else {
    packNode.dependencies.push(missingDependency(provenanceKey, "other"));
    pushUnresolved(unresolvedReferences, packNode.key, "asset-provenance", pack.id, "active asset pack has no project-original or license-verified provenance credit");
  }
  if (!packIntegrityVerified) {
    packNode.dependencies.push(missingDependency(`asset-pack-integrity:${pack.id}@${pack.version}`, "other"));
    pushUnresolved(unresolvedReferences, packNode.key, "pack-integrity", pack.id, "active asset pack packSha256 does not match the ordered manifest entry digests");
  }
  if (sources.durableRegistry) {
    const durableRegistryNode: DependencyGraphNode = {
      key: durableRegistryKey,
      kind: "other",
      generatorId: "asset.registry",
      generatorVersion: "1.0.0",
      schemaVersion: "a-survival.asset-registry.v1",
      seed: pack.id,
      rulesVersion,
      contentHash: sources.durableRegistry.contentHash,
      dependencies: [],
    };
    packNode.dependencies.push(dependencyFor(durableRegistryNode));
  } else {
    packNode.dependencies.push(missingDependency(durableRegistryKey, "other"));
    pushUnresolved(unresolvedReferences, packNode.key, "durable-registry", pack.id, "active asset pack has no durable registry snapshot binding; in-memory metadata is not a durable registry");
  }

  const logicalContentAssetIds = CONTENT_ASSET_CATEGORIES.map(category => `a-survival.content.${category}`);
  const runtimeAssetIds = Array.from(new Set([
    ...allPlants.map(plant => getPlantDefinition(plant.id)?.assetId).filter((assetId): assetId is string => Boolean(assetId)),
    ...PLANT_ITEMS.map(item => item.iconAssetId).filter((assetId): assetId is string => Boolean(assetId)),
    ...logicalContentAssetIds,
  ])).sort(compareStrings);
  const runtimeEntryNodes = new Map<string, DependencyGraphNode>();
  const plantAssetStatuses: PlantAssetStatus[] = [];
  for (const assetId of runtimeAssetIds) {
    const entry = pack.entries[assetId];
    const fileState = sources.fileStates[assetId];
    const fileExists = Boolean(fileState?.exists);
    const fileHashMatchesValue = fileHashMatches(entry, fileState);
    const entryIsVerified = Boolean(entry && fileExists && fileHashMatchesValue);
    const runtimeEntryNode = entryIsVerified ? buildRuntimeEntryNode(pack, assetId, fileState!, rulesVersion, packNode) : null;
    if (runtimeEntryNode) runtimeEntryNodes.set(assetId, runtimeEntryNode);
    const manifestEntryKind = entry?.kind;
    const status: RuntimeAssetStatus = !entry
      ? "missing"
      : !entryIsVerified
        ? "integrity-blocked"
        : entry.kind !== EXPECTED_RUNTIME_ASSET_KIND
          ? "kind-mismatch"
          : "verified";
    plantAssetStatuses.push({
      assetId,
      manifestEntry: Boolean(entry),
      ...(manifestEntryKind ? { manifestEntryKind } : {}),
      fileExists,
      fileHashMatches: fileHashMatchesValue,
      provenanceVerified,
      status,
    });
    if (entry && !entryIsVerified) pushUnresolved(unresolvedReferences, `asset:${assetId}`, "asset-integrity", assetId, "active asset-pack manifest entry is missing, unsafe, or has a mismatched local file SHA-256");
    if (entry && entryIsVerified && entry.kind !== EXPECTED_RUNTIME_ASSET_KIND) pushUnresolved(unresolvedReferences, `asset:${assetId}`, "asset-binding", assetId, `active asset-pack entry kind ${entry.kind} is incompatible with the required texture binding`);
  }

  const durableRegistryNode = sources.durableRegistry
    ? ({
        key: durableRegistryKey,
        kind: "other",
        generatorId: "asset.registry",
        generatorVersion: "1.0.0",
        schemaVersion: "a-survival.asset-registry.v1",
        seed: pack.id,
        rulesVersion,
        contentHash: sources.durableRegistry.contentHash,
        dependencies: [],
      } satisfies DependencyGraphNode)
    : null;
  const nodes: DependencyGraphNode[] = [catalogNode, ...Array.from(logicalContentAssetNodeById.values()), packNode, ...(provenanceNode ? [provenanceNode] : []), ...(durableRegistryNode ? [durableRegistryNode] : []), ...Array.from(runtimeEntryNodes.values())];
  for (const assetId of logicalContentAssetIds) {
    const logicalAssetNode = logicalContentAssetNodeById.get(assetId);
    if (!logicalAssetNode) continue;
    const auditNode: DependencyGraphNode = {
      key: `content-asset-audit:${assetId}`,
      kind: "texture",
      generatorId: "content.asset.provenance",
      generatorVersion: PLANT_ASSET_PROVENANCE_GENERATOR_VERSION,
      schemaVersion: PLANT_ASSET_PROVENANCE_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson({ assetId, logicalAssetHash: logicalAssetNode.contentHash, runtimeEntryHash: runtimeEntryNodes.get(assetId)?.contentHash ?? null } as never),
      dependencies: [dependencyFor(logicalAssetNode)],
    };
    const runtimeEntryNode = runtimeEntryNodes.get(assetId);
    if (runtimeEntryNode) {
      auditNode.dependencies.push({ key: runtimeEntryNode.key, kind: EXPECTED_RUNTIME_ASSET_KIND, required: true, generatorId: runtimeEntryNode.generatorId, generatorVersion: runtimeEntryNode.generatorVersion, contentHash: runtimeEntryNode.contentHash });
      if (pack.entries[assetId]?.kind !== EXPECTED_RUNTIME_ASSET_KIND) pushUnresolved(unresolvedReferences, auditNode.key, "content-asset-binding", assetId, `logical content asset requires texture but active pack declares kind ${pack.entries[assetId]?.kind}`);
    } else {
      auditNode.dependencies.push(missingDependency(`runtime-asset:${assetId}`, EXPECTED_RUNTIME_ASSET_KIND));
      pushUnresolved(unresolvedReferences, auditNode.key, "content-asset-binding", assetId, "logical content catalog asset has no exact file-backed binding in the active playable pack");
    }
    nodes.push(auditNode);
  }

  const definitionNodes = new Map<string, DependencyGraphNode>();
  for (const plant of sampledPlants) {
    const runtimePlant = getPlantDefinition(plant.id);
    const seedDefinition = PLANT_ITEMS.find(item => item.id === plant.seedDefinitionId);
    const harvestDefinition = getItemDefinition(plant.harvestDefinitionId);
    if (seedDefinition && !definitionNodes.has(`definition:seed:${seedDefinition.id}`)) {
      definitionNodes.set(`definition:seed:${seedDefinition.id}`, addDefinitionNode(`definition:seed:${seedDefinition.id}`, seedDefinition, input.seed, rulesVersion, "a-survival.plant-seed-definition.v1"));
    }
    if (harvestDefinition && !definitionNodes.has(`definition:harvest:${harvestDefinition.id}`)) {
      definitionNodes.set(`definition:harvest:${harvestDefinition.id}`, addDefinitionNode(`definition:harvest:${harvestDefinition.id}`, harvestDefinition, input.seed, rulesVersion, "a-survival.plant-harvest-definition.v1"));
    }
  }
  nodes.push(...Array.from(definitionNodes.values()));

  for (const plant of sampledPlants) {
    const runtimePlant = getPlantDefinition(plant.id);
    const plantNode: DependencyGraphNode = {
      key: `plant:${plant.id}`,
      kind: "plant",
      generatorId: "plant.asset.provenance",
      generatorVersion: PLANT_ASSET_PROVENANCE_GENERATOR_VERSION,
      schemaVersion: PLANT_ASSET_PROVENANCE_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson({ plant, runtimeAssetId: runtimePlant?.assetId ?? null, seed: input.seed } as never),
      dependencies: [dependencyFor(catalogNode)],
    };
    const logicalPlantAsset = logicalContentAssetNodeById.get("a-survival.content.plant");
    if (logicalPlantAsset) plantNode.dependencies.push(dependencyFor(logicalPlantAsset));
    else plantNode.dependencies.push(missingDependency("asset:a-survival.content.plant", "texture"));
    if (runtimePlant) addRuntimeAssetDependency(plantNode.dependencies, unresolvedReferences, runtimeEntryNodes, pack, runtimePlant.assetId, plantNode.key, "plant-asset-binding");
    else {
      plantNode.dependencies.push(missingDependency(`plant-asset:${plant.id}`, EXPECTED_RUNTIME_ASSET_KIND));
      pushUnresolved(unresolvedReferences, plantNode.key, "plant-asset-binding", plant.id, "plant runtime definition has no assetId");
    }
    const seedDefinition = PLANT_ITEMS.find(item => item.id === plant.seedDefinitionId);
    const seedDefinitionNode = definitionNodes.get(`definition:seed:${plant.seedDefinitionId}`);
    if (seedDefinitionNode) plantNode.dependencies.push(dependencyFor(seedDefinitionNode));
    else {
      plantNode.dependencies.push(missingDependency(`definition:seed:${plant.seedDefinitionId}`, "item"));
      pushUnresolved(unresolvedReferences, plantNode.key, "definition-binding", plant.seedDefinitionId, "plant seedItemId does not resolve to the canonical PLANT_ITEMS definition");
    }
    const harvestDefinitionNode = definitionNodes.get(`definition:harvest:${plant.harvestDefinitionId}`);
    if (harvestDefinitionNode) plantNode.dependencies.push(dependencyFor(harvestDefinitionNode));
    else {
      plantNode.dependencies.push(missingDependency(`definition:harvest:${plant.harvestDefinitionId}`, "item"));
      pushUnresolved(unresolvedReferences, plantNode.key, "definition-binding", plant.harvestDefinitionId, "plant yieldItemId does not resolve to a canonical item definition");
    }
    nodes.push(plantNode);

    if (seedDefinition) {
      const seedNode: DependencyGraphNode = {
        key: `seed:${seedDefinition.id}`,
        kind: "item",
        generatorId: "plant.asset.provenance",
        generatorVersion: PLANT_ASSET_PROVENANCE_GENERATOR_VERSION,
        schemaVersion: "a-survival.plant-seed-asset.v1",
        seed: input.seed,
        rulesVersion,
        contentHash: hashStableJson({ plantId: plant.id, seedDefinition, seed: input.seed } as never),
        dependencies: [dependencyFor(plantNode)],
      };
      const seedAssetId = seedDefinition.iconAssetId;
      if (seedAssetId) addRuntimeAssetDependency(seedNode.dependencies, unresolvedReferences, runtimeEntryNodes, pack, seedAssetId, seedNode.key, "seed-asset-binding");
      else {
        seedNode.dependencies.push(missingDependency(`asset:seed-icon:${seedDefinition.id}`, EXPECTED_RUNTIME_ASSET_KIND));
        pushUnresolved(unresolvedReferences, seedNode.key, "seed-asset-binding", seedDefinition.id, "canonical seed definition has no iconAssetId");
      }
      nodes.push(seedNode);
    }
  }

  const sortedUnresolvedReferences = unresolvedReferences.sort((left, right) => compareStrings(left.sourceKey, right.sourceKey) || compareStrings(left.referenceType, right.referenceType) || compareStrings(left.referenceId, right.referenceId) || compareStrings(left.reason, right.reason));
  const sortedNodes = nodes.sort((left, right) => compareStrings(left.key, right.key));
  const graph = validateGeneratorDependencyGraph(sortedNodes);
  const statuses = plantAssetStatuses.sort((left, right) => compareStrings(left.assetId, right.assetId));
  const verifiedRuntimeAssetIds = statuses.filter(status => status.status === "verified" && packIntegrityVerified && provenanceVerified).map(status => status.assetId);
  const blockedRuntimeAssetIds = statuses.filter(status => !verifiedRuntimeAssetIds.includes(status.assetId)).map(status => status.assetId);
  const contentHash = hashStableJson({
    schemaVersion: PLANT_ASSET_PROVENANCE_SCHEMA_VERSION,
    generatorId: "plant.asset.provenance",
    generatorVersion: PLANT_ASSET_PROVENANCE_GENERATOR_VERSION,
    seed: input.seed,
    rulesVersion,
    sampledPlantIds: sampledPlants.map(plant => plant.id),
    catalogHash: contentGraph.artifact.contentHash,
    manifest: pack,
    fileStates: runtimeAssetIds.map(assetId => ({ assetId, fileState: sources.fileStates[assetId] ?? null })),
    provenance: sources.provenance,
    durableRegistry: sources.durableRegistry,
  } as never);
  return {
    artifact: {
      generatorId: "plant.asset.provenance",
      generatorVersion: PLANT_ASSET_PROVENANCE_GENERATOR_VERSION,
      schemaVersion: PLANT_ASSET_PROVENANCE_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash,
      catalogHash: contentGraph.artifact.contentHash,
      plantCount: allPlants.length,
      sampledPlantCount: sampledPlants.length,
    },
    runtimePack: {
      id: pack.id,
      namespace: pack.namespace,
      version: pack.version,
      contentHash: packNode.contentHash,
      ...(pack.packSha256 ? { packSha256: pack.packSha256 } : {}),
      entryCount: Object.keys(pack.entries).length,
      packIntegrityVerified,
      provenanceVerified,
      durableRegistryVerified,
    },
    plantAssetStatuses: statuses,
    summary: {
      plantCount: allPlants.length,
      sampledPlantCount: sampledPlants.length,
      logicalContentAssetIds,
      auditedAssetIds: statuses.map(status => status.assetId),
      verifiedAssetIds: verifiedRuntimeAssetIds,
      blockedAssetIds: blockedRuntimeAssetIds,
      unresolvedReferenceCount: sortedUnresolvedReferences.length,
      unresolvedReferenceTypes: collectUnresolvedReferenceTypes(sortedUnresolvedReferences),
    },
    unresolvedReferences: sortedUnresolvedReferences,
    nodes: sortedNodes,
    graph,
  };
}

export function buildPlantAssetProvenanceDependencyGraph(input: PlantAssetProvenanceDependencyGraphInput): PlantAssetProvenanceDependencyGraphOutput {
  return buildPlantAssetProvenanceDependencyGraphFromSources(input, readActivePlantAssetProvenanceSources());
}

export const PLANT_ASSET_PROVENANCE_SOURCE_CATALOG_SIZE = PLANT_CATALOG.length;
export const PLANT_ASSET_PROVENANCE_SOURCE_WORLD_CATALOG_SIZE = WORLD_PLANT_CATALOG_SIZE;
export const PLANT_ASSET_PROVENANCE_REFERENCE_SEED_COUNT = PLANT_ITEMS.length;
