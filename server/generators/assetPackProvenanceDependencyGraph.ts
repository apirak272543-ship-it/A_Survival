import { createHash } from "node:crypto";
import { canDistributeAsset, getAssetCredit, type AssetCredit } from "../../client/src/game/data/assetProvenance";
import {
  readActivePlantAssetProvenanceSources,
  type DurableAssetRegistrySnapshot,
  type RuntimeAssetFileState,
  type RuntimeAssetPackManifest,
} from "./plantAssetProvenanceDependencyGraph";
import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const ASSET_PACK_PROVENANCE_GRAPH_RULES_VERSION = "asset-pack-provenance-graph-rules.v1" as const;
export const ASSET_PACK_PROVENANCE_GENERATOR_VERSION = "1.0.0" as const;
export const ASSET_PACK_PROVENANCE_SCHEMA_VERSION = "a-survival.asset-pack-provenance.v1" as const;
export const ASSET_PACK_PROVENANCE_MAX_ENTRIES = 64 as const;
export const ASSET_PACK_PROVENANCE_MANIFEST_GENERATOR_VERSION = "1.0.0" as const;

const RUNTIME_ASSET_KINDS = ["texture", "model", "animation", "audio", "data"] as const;
type RuntimeAssetKind = (typeof RUNTIME_ASSET_KINDS)[number];
type ProvenanceSource = "entry" | "pack" | "none";
type AssetPackEntryStatus = "verified" | "reference-only" | "unknown-provenance" | "integrity-blocked" | "kind-mismatch";

export type AssetPackProvenanceSources = {
  manifest: RuntimeAssetPackManifest;
  fileStates: Record<string, RuntimeAssetFileState>;
  packCredit: AssetCredit | null;
  entryCredits: Record<string, AssetCredit | null>;
  durableRegistry: DurableAssetRegistrySnapshot | null;
};

export type AssetPackProvenanceReferenceType = "entry-integrity" | "entry-kind" | "entry-provenance" | "pack-provenance" | "pack-integrity" | "durable-registry";

export type AssetPackProvenanceReference = {
  sourceKey: string;
  referenceType: AssetPackProvenanceReferenceType;
  referenceId: string;
  reason: string;
};

export type AssetPackProvenanceEntry = {
  assetId: string;
  kind: string;
  path: string;
  manifestSha256?: string;
  fileExists: boolean;
  fileHashMatches: boolean;
  kindVerified: boolean;
  provenanceSource: ProvenanceSource;
  provenanceAssetId?: string;
  provenanceStatus: AssetCredit["status"] | "missing";
  distributionAllowed: boolean;
  status: AssetPackEntryStatus;
};

export type AssetPackProvenanceDependencyGraphInput = {
  seed: string;
  rulesVersion?: string;
};

export type AssetPackProvenanceDependencyGraphOutput = {
  artifact: {
    generatorId: "asset.pack.provenance";
    generatorVersion: typeof ASSET_PACK_PROVENANCE_GENERATOR_VERSION;
    schemaVersion: typeof ASSET_PACK_PROVENANCE_SCHEMA_VERSION;
    seed: string;
    rulesVersion: string;
    contentHash: string;
    packHash: string;
    entryCount: number;
    auditedEntryCount: number;
  };
  runtimePack: {
    id: string;
    namespace: string;
    version: string;
    contentHash: string;
    packSha256?: string;
    entryCount: number;
    packIntegrityVerified: boolean;
    packProvenanceVerified: boolean;
    durableRegistryVerified: boolean;
  };
  entries: AssetPackProvenanceEntry[];
  summary: {
    entryCount: number;
    verifiedEntryCount: number;
    directProvenanceEntryCount: number;
    packFallbackEntryCount: number;
    unknownProvenanceEntryCount: number;
    referenceOnlyEntryCount: number;
    logicalAssetIds: string[];
    verifiedAssetIds: string[];
    blockedAssetIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<AssetPackProvenanceReferenceType, number>;
  };
  unresolvedReferences: AssetPackProvenanceReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

export function readActiveAssetPackProvenanceSources(): AssetPackProvenanceSources {
  const sources = readActivePlantAssetProvenanceSources();
  const entryCredits = Object.fromEntries(Object.keys(sources.manifest.entries).map(assetId => [assetId, getAssetCredit(assetId) ?? null]));
  return {
    manifest: sources.manifest,
    fileStates: sources.fileStates,
    packCredit: sources.provenance,
    entryCredits,
    durableRegistry: sources.durableRegistry,
  };
}

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

function runtimeEntryKind(kind: string): GeneratorKind {
  if (kind === "texture") return "texture";
  if (kind === "animation") return "animation";
  if (kind === "audio") return "audio";
  return "other";
}

function isRuntimeAssetKind(kind: string): kind is RuntimeAssetKind {
  return RUNTIME_ASSET_KINDS.includes(kind as RuntimeAssetKind);
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
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

function buildRuntimePackNode(manifest: RuntimeAssetPackManifest, rulesVersion: string): DependencyGraphNode {
  return {
    key: `asset-pack:${manifest.id}@${manifest.version}`,
    kind: "other",
    generatorId: "asset.pack.manifest",
    generatorVersion: ASSET_PACK_PROVENANCE_MANIFEST_GENERATOR_VERSION,
    schemaVersion: "a-survival.asset-pack-manifest.v1",
    seed: manifest.id,
    rulesVersion,
    contentHash: hashStableJson(manifest as never),
    dependencies: [],
  };
}

function buildProvenanceNode(credit: AssetCredit, key: string, seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key,
    kind: "other",
    generatorId: "asset.provenance",
    generatorVersion: ASSET_PACK_PROVENANCE_MANIFEST_GENERATOR_VERSION,
    schemaVersion: "a-survival.asset-provenance.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(credit as never),
    dependencies: [],
  };
}

function unresolvedReferenceTypes(unresolvedReferences: AssetPackProvenanceReference[]) {
  const referenceTypes: AssetPackProvenanceReferenceType[] = ["entry-integrity", "entry-kind", "entry-provenance", "pack-provenance", "pack-integrity", "durable-registry"];
  return Object.fromEntries(referenceTypes.map(type => [type, unresolvedReferences.filter(reference => reference.referenceType === type).length])) as Record<AssetPackProvenanceReferenceType, number>;
}

function pushUnresolved(unresolvedReferences: AssetPackProvenanceReference[], sourceKey: string, referenceType: AssetPackProvenanceReferenceType, referenceId: string, reason: string) {
  unresolvedReferences.push({ sourceKey, referenceType, referenceId, reason });
}

function selectedCredit(assetId: string, sources: AssetPackProvenanceSources) {
  if (hasOwn(sources.entryCredits as Record<string, unknown>, assetId) && sources.entryCredits[assetId]) {
    return { source: "entry" as const, credit: sources.entryCredits[assetId]! };
  }
  return { source: "pack" as const, credit: sources.packCredit };
}

function provenanceStatus(credit: AssetCredit | null): AssetCredit["status"] | "missing" {
  return credit?.status ?? "missing";
}

export function buildAssetPackProvenanceDependencyGraphFromSources(input: AssetPackProvenanceDependencyGraphInput, sources: AssetPackProvenanceSources): AssetPackProvenanceDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? ASSET_PACK_PROVENANCE_GRAPH_RULES_VERSION;
  if (rulesVersion !== ASSET_PACK_PROVENANCE_GRAPH_RULES_VERSION) throw new Error(`Unsupported asset pack provenance graph rules version: ${rulesVersion}`);
  if (!input.seed.trim() || input.seed.length > 128) throw new Error("seed must be 1–128 characters");
  const entryIds = Object.keys(sources.manifest.entries).sort(compareStrings);
  if (entryIds.length === 0 || entryIds.length > ASSET_PACK_PROVENANCE_MAX_ENTRIES) throw new Error(`manifest entries must contain 1 to ${ASSET_PACK_PROVENANCE_MAX_ENTRIES} entries`);

  const manifest = sources.manifest;
  const packNode = buildRuntimePackNode(manifest, rulesVersion);
  const packIntegrityVerified = packIntegrityMatches(manifest, sources.fileStates);
  const packProvenanceVerified = Boolean(sources.packCredit && canDistributeAsset(sources.packCredit));
  const durableRegistryVerified = Boolean(sources.durableRegistry);
  const unresolvedReferences: AssetPackProvenanceReference[] = [];
  const provenanceNodes = new Map<string, DependencyGraphNode>();
  const entries: AssetPackProvenanceEntry[] = [];
  const entryNodes: DependencyGraphNode[] = [];
  let packFallbackEntryCount = 0;
  let directProvenanceEntryCount = 0;
  let packProvenanceFallbackMissing = false;

  if (!packIntegrityVerified) pushUnresolved(unresolvedReferences, packNode.key, "pack-integrity", manifest.id, "active asset pack packSha256 or one of its local file SHA-256 values is invalid");
  if (!packIntegrityVerified) packNode.dependencies.push(missingDependency(`asset-pack-integrity:${manifest.id}@${manifest.version}`, "other"));

  if (durableRegistryVerified) {
    const durableRegistryNode: DependencyGraphNode = {
      key: `registry:asset-pack:${manifest.id}`,
      kind: "other",
      generatorId: "asset.registry",
      generatorVersion: ASSET_PACK_PROVENANCE_MANIFEST_GENERATOR_VERSION,
      schemaVersion: "a-survival.asset-registry.v1",
      seed: manifest.id,
      rulesVersion,
      contentHash: sources.durableRegistry!.contentHash,
      dependencies: [],
    };
    provenanceNodes.set(durableRegistryNode.key, durableRegistryNode);
    packNode.dependencies.push(dependencyFor(durableRegistryNode));
  } else {
    packNode.dependencies.push(missingDependency(`registry:asset-pack:${manifest.id}`, "other"));
    pushUnresolved(unresolvedReferences, packNode.key, "durable-registry", manifest.id, "active asset pack has no durable registry snapshot binding; in-memory metadata is not a durable registry");
  }

  for (const assetId of entryIds) {
    const entry = manifest.entries[assetId]!;
    const fileState = sources.fileStates[assetId];
    const fileExists = Boolean(fileState?.exists);
    const fileMatches = fileHashMatches(entry, fileState);
    const kindVerified = isRuntimeAssetKind(entry.kind);
    const selected = selectedCredit(assetId, sources);
    const selectedCreditIsDistributable = Boolean(selected.credit && canDistributeAsset(selected.credit));
    if (selected.source === "entry") directProvenanceEntryCount += 1;
    else packFallbackEntryCount += 1;
    if (selected.source === "pack" && !selected.credit) packProvenanceFallbackMissing = true;
    const provenanceStatusValue = provenanceStatus(selected.credit);
    const status: AssetPackEntryStatus = !kindVerified
      ? "kind-mismatch"
      : !fileMatches
        ? "integrity-blocked"
        : !selected.credit
          ? "unknown-provenance"
          : selected.credit.status === "reference-only" || selected.credit.status === "awaiting-contact"
            ? "reference-only"
            : !selectedCreditIsDistributable
              ? "unknown-provenance"
              : "verified";
    entries.push({
      assetId,
      kind: entry.kind,
      path: entry.path,
      ...(entry.sha256 ? { manifestSha256: entry.sha256 } : {}),
      fileExists,
      fileHashMatches: fileMatches,
      kindVerified,
      provenanceSource: selected.source,
      ...(selected.credit ? { provenanceAssetId: selected.credit.assetId } : {}),
      provenanceStatus: provenanceStatusValue,
      distributionAllowed: selectedCreditIsDistributable && kindVerified && fileMatches,
      status,
    });
    const entryNode: DependencyGraphNode = {
      key: `runtime-asset:${assetId}`,
      kind: runtimeEntryKind(entry.kind),
      generatorId: "asset.pack.manifest",
      generatorVersion: ASSET_PACK_PROVENANCE_MANIFEST_GENERATOR_VERSION,
      schemaVersion: "a-survival.asset-pack-entry.v1",
      seed: `${manifest.id}:${assetId}`,
      rulesVersion,
      contentHash: hashStableJson({ assetId, entry, fileState, selectedProvenance: selected.credit, provenanceSource: selected.source } as never),
      dependencies: [dependencyFor(packNode)],
    };
    if (!fileMatches) {
      entryNode.dependencies.push(missingDependency(`asset-integrity:${assetId}`, "other"));
      pushUnresolved(unresolvedReferences, entryNode.key, "entry-integrity", assetId, "manifest entry is not backed by a matching local file SHA-256");
    }
    if (!kindVerified) {
      entryNode.dependencies.push(missingDependency(`asset-kind:${assetId}`, "other"));
      pushUnresolved(unresolvedReferences, entryNode.key, "entry-kind", assetId, `manifest entry declares unsupported runtime asset kind ${entry.kind}`);
    }
    if (selectedCreditIsDistributable) {
      const provenanceKey = selected.source === "entry" ? `provenance:entry:${assetId}` : `provenance:pack.${manifest.id}`;
      const provenanceNode = provenanceNodes.get(provenanceKey) ?? buildProvenanceNode(selected.credit!, provenanceKey, manifest.id, rulesVersion);
      provenanceNodes.set(provenanceKey, provenanceNode);
      entryNode.dependencies.push(dependencyFor(provenanceNode));
    } else {
      const provenanceKey = selected.source === "entry" ? `provenance:entry:${assetId}` : `provenance:pack.${manifest.id}`;
      entryNode.dependencies.push(missingDependency(provenanceKey, "other"));
      pushUnresolved(unresolvedReferences, entryNode.key, "entry-provenance", assetId, !selected.credit ? "asset entry has no direct credit and pack-level provenance fallback is unavailable" : `asset provenance status ${selected.credit.status} is not distributable`);
    }
    entryNodes.push(entryNode);
  }
  if (packProvenanceFallbackMissing) pushUnresolved(unresolvedReferences, packNode.key, "pack-provenance", manifest.id, "one or more asset entries require pack-level provenance fallback but the pack has no credit");
  if (packProvenanceVerified) {
    const packProvenanceKey = `provenance:pack.${manifest.id}`;
    provenanceNodes.set(packProvenanceKey, buildProvenanceNode(sources.packCredit!, packProvenanceKey, manifest.id, rulesVersion));
  }

  const sortedEntries = entries.sort((left, right) => compareStrings(left.assetId, right.assetId));
  const sortedUnresolvedReferences = unresolvedReferences.sort((left, right) => compareStrings(left.sourceKey, right.sourceKey) || compareStrings(left.referenceType, right.referenceType) || compareStrings(left.referenceId, right.referenceId) || compareStrings(left.reason, right.reason));
  const verifiedAssetIds = sortedEntries.filter(entry => entry.status === "verified" && packIntegrityVerified && durableRegistryVerified).map(entry => entry.assetId);
  const blockedAssetIds = sortedEntries.filter(entry => !verifiedAssetIds.includes(entry.assetId)).map(entry => entry.assetId);
  const nodes = [packNode, ...Array.from(provenanceNodes.values()), ...entryNodes].sort((left, right) => compareStrings(left.key, right.key));
  const packHash = packNode.contentHash;
  const contentHash = hashStableJson({
    schemaVersion: ASSET_PACK_PROVENANCE_SCHEMA_VERSION,
    generatorId: "asset.pack.provenance",
    generatorVersion: ASSET_PACK_PROVENANCE_GENERATOR_VERSION,
    seed: input.seed,
    rulesVersion,
    manifest,
    fileStates: entryIds.map(assetId => ({ assetId, fileState: sources.fileStates[assetId] ?? null })),
    packCredit: sources.packCredit,
    entryCredits: entryIds.map(assetId => ({ assetId, credit: sources.entryCredits[assetId] ?? null })),
    durableRegistry: sources.durableRegistry,
  } as never);
  const unknownProvenanceEntryCount = sortedEntries.filter(entry => entry.status === "unknown-provenance").length;
  const referenceOnlyEntryCount = sortedEntries.filter(entry => entry.status === "reference-only").length;
  return {
    artifact: {
      generatorId: "asset.pack.provenance",
      generatorVersion: ASSET_PACK_PROVENANCE_GENERATOR_VERSION,
      schemaVersion: ASSET_PACK_PROVENANCE_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash,
      packHash,
      entryCount: entryIds.length,
      auditedEntryCount: sortedEntries.length,
    },
    runtimePack: {
      id: manifest.id,
      namespace: manifest.namespace,
      version: manifest.version,
      contentHash: packHash,
      ...(manifest.packSha256 ? { packSha256: manifest.packSha256 } : {}),
      entryCount: entryIds.length,
      packIntegrityVerified,
      packProvenanceVerified,
      durableRegistryVerified,
    },
    entries: sortedEntries,
    summary: {
      entryCount: sortedEntries.length,
      verifiedEntryCount: sortedEntries.filter(entry => entry.status === "verified").length,
      directProvenanceEntryCount,
      packFallbackEntryCount,
      unknownProvenanceEntryCount,
      referenceOnlyEntryCount,
      logicalAssetIds: sortedEntries.map(entry => entry.assetId),
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

export function buildAssetPackProvenanceDependencyGraph(input: AssetPackProvenanceDependencyGraphInput): AssetPackProvenanceDependencyGraphOutput {
  return buildAssetPackProvenanceDependencyGraphFromSources(input, readActiveAssetPackProvenanceSources());
}
