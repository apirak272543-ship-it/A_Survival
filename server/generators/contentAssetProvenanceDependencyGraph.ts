import { createHash } from "node:crypto";
import { canDistributeAsset, type AssetCredit } from "../../client/src/game/data/assetProvenance";
import {
  createContentCatalogRegistry,
  DEFAULT_CONTENT_CATALOG_INPUT,
  type ContentCategory,
  type ContentCatalogInput,
  type ContentCatalogOutput,
} from "./contentCatalogGenerator";
import { buildContentCatalogDependencyGraph } from "./contentCatalogDependencyGraph";
import {
  readActivePlantAssetProvenanceSources,
  type DurableAssetRegistrySnapshot,
  type PlantAssetProvenanceSources,
  type RuntimeAssetPackManifest,
  type RuntimeAssetFileState,
} from "./plantAssetProvenanceDependencyGraph";
import { hashStableJson, type GeneratorKind, type GeneratorAssetRef } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const CONTENT_ASSET_PROVENANCE_GRAPH_RULES_VERSION = "content-asset-provenance-graph-rules.v1" as const;
export const CONTENT_ASSET_PROVENANCE_GENERATOR_VERSION = "1.0.0" as const;
export const CONTENT_ASSET_PROVENANCE_SCHEMA_VERSION = "a-survival.content-asset-provenance.v1" as const;
export const CONTENT_ASSET_REGISTRY_GENERATOR_VERSION = "1.0.0" as const;

export type ContentAssetProvenanceSources = PlantAssetProvenanceSources;

export type ContentAssetReferenceType =
  | "content-asset-binding"
  | "asset-integrity"
  | "asset-binding"
  | "asset-provenance"
  | "pack-integrity"
  | "durable-registry"
  | "logical-provenance";

export type ContentAssetProvenanceReference = {
  sourceKey: string;
  referenceType: ContentAssetReferenceType;
  referenceId: string;
  reason: string;
};

export type ContentAssetStatus = "metadata-only" | "verified" | "kind-mismatch" | "integrity-blocked";

export type ContentAssetStatusRecord = {
  category: ContentCategory;
  assetId: string;
  logicalKind: GeneratorAssetRef["kind"];
  logicalSource: GeneratorAssetRef["source"];
  provenanceRef?: string;
  manifestEntry: boolean;
  manifestEntryKind?: RuntimeAssetPackManifest["entries"][string]["kind"];
  fileExists: boolean;
  fileHashMatches: boolean;
  status: ContentAssetStatus;
};

export type ContentAssetProvenanceDependencyGraphInput = {
  seed: string;
  categories?: ContentCategory[];
  countPerCategory?: number;
  assetNamespace?: string;
  samplePerCategory?: number;
  rulesVersion?: string;
};

export type ContentAssetProvenanceDependencyGraphOutput = {
  artifact: {
    generatorId: "content.asset.provenance";
    generatorVersion: typeof CONTENT_ASSET_PROVENANCE_GENERATOR_VERSION;
    schemaVersion: typeof CONTENT_ASSET_PROVENANCE_SCHEMA_VERSION;
    seed: string;
    rulesVersion: string;
    contentHash: string;
    catalogHash: string;
    definitionCount: number;
    categoryCount: number;
    sampledDefinitionCount: number;
  };
  catalog: {
    schemaVersion: ContentCatalogOutput["schemaVersion"];
    categoryIds: ContentCategory[];
    definitionCount: number;
    assetRefCount: number;
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
  assetStatuses: ContentAssetStatusRecord[];
  summary: {
    definitionCount: number;
    categoryCount: number;
    sampledDefinitionCount: number;
    logicalAssetIds: string[];
    metadataOnlyAssetIds: string[];
    verifiedAssetIds: string[];
    blockedAssetIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<ContentAssetReferenceType, number>;
  };
  unresolvedReferences: ContentAssetProvenanceReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
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

function readSeed(seed: string) {
  if (!seed.trim() || seed.length > 128) throw new Error("seed must be 1–128 characters");
  return seed;
}

function sha256Text(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function fileHashMatches(entry: RuntimeAssetPackManifest["entries"][string] | undefined, fileState: RuntimeAssetFileState | undefined) {
  return Boolean(entry?.sha256 && fileState?.exists && fileState.sha256 && entry.sha256.toLowerCase() === fileState.sha256.toLowerCase());
}

function packIntegrityMatches(manifest: RuntimeAssetPackManifest, fileStates: Record<string, RuntimeAssetFileState>) {
  const expected = sha256Text(Object.values(manifest.entries).map(entry => entry.sha256 ?? "").join(""));
  const manifestHashMatches = Boolean(manifest.packSha256 && manifest.packSha256.toLowerCase() === expected);
  const everyFileMatches = Object.entries(manifest.entries).every(([assetId, entry]) => fileHashMatches(entry, fileStates[assetId]));
  return manifestHashMatches && everyFileMatches;
}

function runtimeEntryKind(kind: RuntimeAssetPackManifest["entries"][string]["kind"]): GeneratorKind {
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
    generatorVersion: CONTENT_ASSET_REGISTRY_GENERATOR_VERSION,
    schemaVersion: "a-survival.asset-pack-manifest.v1",
    seed: manifest.id,
    rulesVersion,
    contentHash: hashStableJson(manifest as never),
    dependencies: [],
  };
}

function buildRuntimeEntryNode(manifest: RuntimeAssetPackManifest, assetId: string, fileState: RuntimeAssetFileState | undefined, rulesVersion: string, packNode: DependencyGraphNode): DependencyGraphNode | null {
  const entry = manifest.entries[assetId];
  if (!entry || !fileHashMatches(entry, fileState)) return null;
  return {
    key: `runtime-asset:${assetId}`,
    kind: runtimeEntryKind(entry.kind),
    generatorId: "asset.pack.manifest",
    generatorVersion: CONTENT_ASSET_REGISTRY_GENERATOR_VERSION,
    schemaVersion: "a-survival.asset-pack-entry.v1",
    seed: `${manifest.id}:${assetId}`,
    rulesVersion,
    contentHash: hashStableJson({ assetId, entry, verifiedFileSha256: fileState?.sha256 } as never),
    dependencies: [dependencyFor(packNode)],
  };
}

function provenanceMatchesPack(provenance: AssetCredit | null, manifest: RuntimeAssetPackManifest) {
  return Boolean(provenance && provenance.assetId === `pack.${manifest.id}` && canDistributeAsset(provenance));
}

function unresolvedReferenceTypes(unresolvedReferences: ContentAssetProvenanceReference[]) {
  const referenceTypes: ContentAssetReferenceType[] = [
    "content-asset-binding",
    "asset-integrity",
    "asset-binding",
    "asset-provenance",
    "pack-integrity",
    "durable-registry",
    "logical-provenance",
  ];
  return Object.fromEntries(referenceTypes.map(type => [type, unresolvedReferences.filter(reference => reference.referenceType === type).length])) as Record<ContentAssetReferenceType, number>;
}

function pushUnresolved(unresolvedReferences: ContentAssetProvenanceReference[], sourceKey: string, referenceType: ContentAssetReferenceType, referenceId: string, reason: string) {
  unresolvedReferences.push({ sourceKey, referenceType, referenceId, reason });
}

function normalizeCatalogInput(input: ContentAssetProvenanceDependencyGraphInput): ContentCatalogInput {
  const categories = input.categories ?? DEFAULT_CONTENT_CATALOG_INPUT.categories;
  if (categories.length > 10) throw new Error("categories must contain at most 10 entries");
  return {
    categories: [...categories],
    countPerCategory: input.countPerCategory ?? DEFAULT_CONTENT_CATALOG_INPUT.countPerCategory,
    assetNamespace: input.assetNamespace ?? DEFAULT_CONTENT_CATALOG_INPUT.assetNamespace,
  };
}

export function buildContentAssetProvenanceDependencyGraphFromSources(input: ContentAssetProvenanceDependencyGraphInput, sources: ContentAssetProvenanceSources): ContentAssetProvenanceDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? CONTENT_ASSET_PROVENANCE_GRAPH_RULES_VERSION;
  if (rulesVersion !== CONTENT_ASSET_PROVENANCE_GRAPH_RULES_VERSION) throw new Error(`Unsupported content asset provenance graph rules version: ${rulesVersion}`);
  const seed = readSeed(input.seed);
  const samplePerCategory = input.samplePerCategory ?? 1;
  if (!Number.isInteger(samplePerCategory) || samplePerCategory < 1 || samplePerCategory > 8) throw new Error("samplePerCategory must be an integer from 1 to 8");
  const catalogInput = normalizeCatalogInput(input);
  const catalogArtifact = createContentCatalogRegistry().generate<ContentCatalogInput, ContentCatalogOutput>("content.catalog", catalogInput, { seed, generatedAt: 0 });
  const catalogOutput = catalogArtifact.output;
  const contentGraph = buildContentCatalogDependencyGraph({ seed, samplePerCategory, rulesVersion: "content-catalog-rules.v1" }, catalogInput);
  const catalogRoot = contentGraph.nodes.find(node => node.key === `content-catalog:${catalogArtifact.contentHash}`);
  if (!catalogRoot) throw new Error("Content catalog root node is missing");
  const unresolvedReferences: ContentAssetProvenanceReference[] = [];
  const manifest = sources.manifest;
  const packNode = buildRuntimePackNode(manifest, rulesVersion);
  const packIntegrityVerified = packIntegrityMatches(manifest, sources.fileStates);
  const provenanceVerified = provenanceMatchesPack(sources.provenance, manifest);
  const durableRegistryVerified = Boolean(sources.durableRegistry);
  const provenanceKey = `provenance:pack.${manifest.id}`;
  const durableRegistryKey = `registry:asset-pack:${manifest.id}`;
  const provenanceNode: DependencyGraphNode | null = provenanceVerified && sources.provenance
    ? {
        key: provenanceKey,
        kind: "other",
        generatorId: "asset.provenance",
        generatorVersion: CONTENT_ASSET_REGISTRY_GENERATOR_VERSION,
        schemaVersion: "a-survival.asset-provenance.v1",
        seed: manifest.id,
        rulesVersion,
        contentHash: hashStableJson(sources.provenance as never),
        dependencies: [],
      }
    : null;
  if (provenanceNode) packNode.dependencies.push(dependencyFor(provenanceNode));
  else {
    packNode.dependencies.push(missingDependency(provenanceKey, "other"));
    pushUnresolved(unresolvedReferences, packNode.key, "asset-provenance", manifest.id, "active asset pack has no project-original or license-verified provenance credit");
  }
  if (!packIntegrityVerified) {
    packNode.dependencies.push(missingDependency(`asset-pack-integrity:${manifest.id}@${manifest.version}`, "other"));
    pushUnresolved(unresolvedReferences, packNode.key, "pack-integrity", manifest.id, "active asset pack packSha256 or one of its local file SHA-256 values is invalid");
  }
  const durableRegistryNode: DependencyGraphNode | null = sources.durableRegistry
    ? {
        key: durableRegistryKey,
        kind: "other",
        generatorId: "asset.registry",
        generatorVersion: CONTENT_ASSET_REGISTRY_GENERATOR_VERSION,
        schemaVersion: "a-survival.asset-registry.v1",
        seed: manifest.id,
        rulesVersion,
        contentHash: sources.durableRegistry.contentHash,
        dependencies: [],
      }
    : null;
  if (durableRegistryNode) packNode.dependencies.push(dependencyFor(durableRegistryNode));
  else {
    packNode.dependencies.push(missingDependency(durableRegistryKey, "other"));
    pushUnresolved(unresolvedReferences, packNode.key, "durable-registry", manifest.id, "active asset pack has no durable registry snapshot binding; in-memory metadata is not a durable registry");
  }

  const runtimeEntryNodes = new Map<string, DependencyGraphNode>();
  const assetStatuses: ContentAssetStatusRecord[] = [];
  const auditNodes: DependencyGraphNode[] = [];
  for (const assetRef of catalogOutput.assetRefs) {
    const logicalNode = contentGraph.nodes.find(node => node.key === `asset:${assetRef.assetId}`);
    if (!logicalNode) throw new Error(`Catalog asset node is missing for ${assetRef.assetId}`);
    const entry = manifest.entries[assetRef.assetId];
    const fileState = sources.fileStates[assetRef.assetId];
    const fileExists = Boolean(fileState?.exists);
    const fileMatches = fileHashMatches(entry, fileState);
    const runtimeEntryNode = fileMatches ? buildRuntimeEntryNode(manifest, assetRef.assetId, fileState, rulesVersion, packNode) : null;
    if (runtimeEntryNode) runtimeEntryNodes.set(assetRef.assetId, runtimeEntryNode);
    const expectedRuntimeKind: GeneratorKind = assetRef.kind === "icon" || assetRef.kind === "key-art" ? "texture" : runtimeEntryKind(assetRef.kind as RuntimeAssetPackManifest["entries"][string]["kind"]);
    const status: ContentAssetStatus = !entry
      ? "metadata-only"
      : !fileMatches
        ? "integrity-blocked"
        : runtimeEntryKind(entry.kind) !== expectedRuntimeKind
          ? "kind-mismatch"
          : "verified";
    assetStatuses.push({
      category: assetRef.assetId.slice(assetRef.assetId.lastIndexOf(".") + 1) as ContentCategory,
      assetId: assetRef.assetId,
      logicalKind: assetRef.kind,
      logicalSource: assetRef.source,
      ...(assetRef.provenanceRef ? { provenanceRef: assetRef.provenanceRef } : {}),
      manifestEntry: Boolean(entry),
      ...(entry ? { manifestEntryKind: entry.kind } : {}),
      fileExists,
      fileHashMatches: fileMatches,
      status,
    });
    const auditNode: DependencyGraphNode = {
      key: `content-asset-audit:${assetRef.assetId}`,
      kind: "texture",
      generatorId: "content.asset.provenance",
      generatorVersion: CONTENT_ASSET_PROVENANCE_GENERATOR_VERSION,
      schemaVersion: CONTENT_ASSET_PROVENANCE_SCHEMA_VERSION,
      seed,
      rulesVersion,
      contentHash: hashStableJson({ assetRef, logicalAssetHash: logicalNode.contentHash, runtimeEntryHash: runtimeEntryNode?.contentHash ?? null } as never),
      dependencies: [dependencyFor(logicalNode)],
    };
    if (!assetRef.provenanceRef) {
      auditNode.dependencies.push(missingDependency(`logical-provenance:${assetRef.assetId}`, "other"));
      pushUnresolved(unresolvedReferences, auditNode.key, "logical-provenance", assetRef.assetId, "logical content asset has no provenance reference");
    }
    if (runtimeEntryNode) {
      auditNode.dependencies.push({ key: runtimeEntryNode.key, kind: expectedRuntimeKind, required: true, generatorId: runtimeEntryNode.generatorId, generatorVersion: runtimeEntryNode.generatorVersion, contentHash: runtimeEntryNode.contentHash });
      if (status === "kind-mismatch") pushUnresolved(unresolvedReferences, auditNode.key, "asset-binding", assetRef.assetId, `logical asset requires runtime kind ${expectedRuntimeKind} but active pack declares kind ${entry?.kind}`);
    } else {
      auditNode.dependencies.push(missingDependency(`runtime-asset:${assetRef.assetId}`, expectedRuntimeKind));
      if (!entry) pushUnresolved(unresolvedReferences, auditNode.key, "content-asset-binding", assetRef.assetId, "logical content catalog asset has no exact file-backed binding in the active playable pack");
      else pushUnresolved(unresolvedReferences, auditNode.key, "asset-integrity", assetRef.assetId, "logical content catalog asset manifest entry is not backed by a matching local file SHA-256");
    }
    auditNodes.push(auditNode);
  }

  const runtimeNodes = Array.from(runtimeEntryNodes.values());
  const nodes = [...contentGraph.nodes, packNode, ...(provenanceNode ? [provenanceNode] : []), ...(durableRegistryNode ? [durableRegistryNode] : []), ...runtimeNodes, ...auditNodes].sort((left, right) => compareStrings(left.key, right.key));
  const sortedAssetStatuses = assetStatuses.sort((left, right) => compareStrings(left.assetId, right.assetId));
  const sortedUnresolvedReferences = unresolvedReferences.sort((left, right) => compareStrings(left.sourceKey, right.sourceKey) || compareStrings(left.referenceType, right.referenceType) || compareStrings(left.referenceId, right.referenceId) || compareStrings(left.reason, right.reason));
  const metadataOnlyAssetIds = sortedAssetStatuses.filter(status => status.status === "metadata-only").map(status => status.assetId);
  const verifiedAssetIds = sortedAssetStatuses.filter(status => status.status === "verified" && packIntegrityVerified && provenanceVerified && durableRegistryVerified).map(status => status.assetId);
  const blockedAssetIds = sortedAssetStatuses.filter(status => !verifiedAssetIds.includes(status.assetId)).map(status => status.assetId);
  const sampledDefinitionCount = contentGraph.nodes.filter(node => node.key.startsWith("content:")).length;
  const contentHash = hashStableJson({
    schemaVersion: CONTENT_ASSET_PROVENANCE_SCHEMA_VERSION,
    generatorId: "content.asset.provenance",
    generatorVersion: CONTENT_ASSET_PROVENANCE_GENERATOR_VERSION,
    seed,
    rulesVersion,
    catalogHash: catalogArtifact.contentHash,
    catalogInput,
    assetRefs: catalogOutput.assetRefs,
    manifest,
    fileStates: catalogOutput.assetRefs.map(assetRef => ({ assetId: assetRef.assetId, fileState: sources.fileStates[assetRef.assetId] ?? null })),
    provenance: sources.provenance,
    durableRegistry: sources.durableRegistry,
  } as never);
  return {
    artifact: {
      generatorId: "content.asset.provenance",
      generatorVersion: CONTENT_ASSET_PROVENANCE_GENERATOR_VERSION,
      schemaVersion: CONTENT_ASSET_PROVENANCE_SCHEMA_VERSION,
      seed,
      rulesVersion,
      contentHash,
      catalogHash: catalogArtifact.contentHash,
      definitionCount: catalogOutput.definitions.length,
      categoryCount: catalogOutput.assetRefs.length,
      sampledDefinitionCount,
    },
    catalog: {
      schemaVersion: catalogOutput.schemaVersion,
      categoryIds: [...catalogInput.categories].sort(compareStrings),
      definitionCount: catalogOutput.definitions.length,
      assetRefCount: catalogOutput.assetRefs.length,
    },
    runtimePack: {
      id: manifest.id,
      namespace: manifest.namespace,
      version: manifest.version,
      contentHash: packNode.contentHash,
      ...(manifest.packSha256 ? { packSha256: manifest.packSha256 } : {}),
      entryCount: Object.keys(manifest.entries).length,
      packIntegrityVerified,
      provenanceVerified,
      durableRegistryVerified,
    },
    assetStatuses: sortedAssetStatuses,
    summary: {
      definitionCount: catalogOutput.definitions.length,
      categoryCount: catalogOutput.assetRefs.length,
      sampledDefinitionCount,
      logicalAssetIds: sortedAssetStatuses.map(status => status.assetId),
      metadataOnlyAssetIds,
      verifiedAssetIds,
      blockedAssetIds,
      unresolvedReferenceCount: sortedUnresolvedReferences.length,
      unresolvedReferenceTypes: unresolvedReferenceTypes(sortedUnresolvedReferences),
    },
    unresolvedReferences: sortedUnresolvedReferences,
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}

export function buildContentAssetProvenanceDependencyGraph(input: ContentAssetProvenanceDependencyGraphInput): ContentAssetProvenanceDependencyGraphOutput {
  return buildContentAssetProvenanceDependencyGraphFromSources(input, readActivePlantAssetProvenanceSources());
}

export function createInjectedDurableAssetRegistrySnapshot(registryId: string, contentHash: string): DurableAssetRegistrySnapshot {
  if (!registryId.trim()) throw new Error("registryId must be non-empty");
  if (!/^[a-f0-9]{64}$/i.test(contentHash)) throw new Error("contentHash must be a SHA-256 hex digest");
  return { registryId, contentHash: contentHash.toLowerCase() };
}

export { readActivePlantAssetProvenanceSources } from "./plantAssetProvenanceDependencyGraph";

export const CONTENT_ASSET_PROVENANCE_MAX_CATEGORIES = 10 as const;
