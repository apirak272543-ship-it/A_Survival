import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ANIMATION_PROFILE_SCHEMA_VERSION,
  ANIMATION_PROFILE_VERSION,
  createAnimationProfileRegistry,
  type AnimationAssetSource,
  type AnimationProfileInput,
  type AnimationProfileOutput,
  type AnimationStateId,
} from "./animationProfileGenerator";
import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const ANIMATION_ASSET_GRAPH_RULES_VERSION = "animation-asset-graph-rules.v1" as const;
export const RUNTIME_ASSET_PACK_MANIFEST_VERSION = "1.0.0" as const;
export const RUNTIME_ANIMATION_METADATA_VERSION = "1.0.0" as const;

const ACTIVE_ASSET_PACK_ROOT = resolve(process.cwd(), "client/public/assets/packs/arcane-frontier-voxel-pixel");
const ACTIVE_ASSET_PACK_MANIFEST_PATH = resolve(ACTIVE_ASSET_PACK_ROOT, "manifest.json");
const ACTIVE_ANIMATION_METADATA_PATH = resolve(ACTIVE_ASSET_PACK_ROOT, "metadata/animations.json");
const STATE_IDS: readonly AnimationStateId[] = ["idle", "walk", "run", "dash", "attack", "hurt", "dead"];
const RUNTIME_ANIMATION_METADATA_ASSET_ID = "data.animations" as const;

type RuntimeAssetEntry = {
  kind: "texture" | "model" | "animation" | "audio" | "data";
  path: string;
  sha256?: string;
};

type RuntimeAssetPackManifest = {
  schemaVersion: number;
  id: string;
  namespace: string;
  version: string;
  packSha256?: string;
  entries: Record<string, RuntimeAssetEntry>;
};

type RuntimeAnimationState = {
  glbClip?: string | null;
  bobAmplitude?: number;
  cyclesPerSecond?: number;
  trailEffect?: string;
  impactEffect?: string;
  flash?: boolean;
  visible?: boolean;
};

type RuntimeAnimationMetadata = {
  schemaVersion: number;
  source: string;
  states: Partial<Record<AnimationStateId, RuntimeAnimationState>>;
};

export type AnimationAssetDependencyGraphInput = AnimationProfileInput & {
  seed: string;
  rulesVersion?: string;
};

export type AnimationAssetReference = {
  sourceKey: string;
  referenceType: "asset-binding" | "metadata-mismatch";
  referenceId: string;
  reason: string;
};

export type AnimationAssetDependencyGraphOutput = {
  artifact: {
    generatorId: "animation.profile";
    generatorVersion: typeof ANIMATION_PROFILE_VERSION;
    seed: string;
    profileId: string;
    assetId: string;
    contentHash: string;
  };
  runtimePack: {
    id: string;
    namespace: string;
    version: string;
    contentHash: string;
    entryCount: number;
  };
  runtimeMetadata: {
    assetId: typeof RUNTIME_ANIMATION_METADATA_ASSET_ID;
    schemaVersion: number;
    source: string;
    stateIds: string[];
    contentHash: string;
  };
  profile: AnimationProfileOutput;
  summary: {
    profileId: string;
    assetId: string;
    stateCount: number;
    runtimeMetadataStateCount: number;
    runtimeAssetEntryKind?: RuntimeAssetEntry["kind"];
    metadataMatch: boolean;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<AnimationAssetReference["referenceType"], number>;
  };
  unresolvedReferences: AnimationAssetReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

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

function runtimeEntryKind(kind: RuntimeAssetEntry["kind"]): GeneratorKind {
  if (kind === "animation") return "animation";
  if (kind === "texture") return "texture";
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

function buildRuntimeEntryNode(manifest: RuntimeAssetPackManifest, assetId: string, rulesVersion: string, packNode: DependencyGraphNode): DependencyGraphNode | null {
  const entry = manifest.entries[assetId];
  if (!entry) return null;
  return {
    key: `asset:${assetId}`,
    kind: runtimeEntryKind(entry.kind),
    generatorId: "asset.pack.manifest",
    generatorVersion: RUNTIME_ASSET_PACK_MANIFEST_VERSION,
    schemaVersion: "a-survival.asset-pack-entry.v1",
    seed: `${manifest.id}:${assetId}`,
    rulesVersion,
    contentHash: hashStableJson({ assetId, entry } as never),
    dependencies: [dependencyFor(packNode)],
  };
}

function compareRuntimeMetadata(profile: AnimationProfileOutput, metadata: RuntimeAnimationMetadata) {
  const issues: string[] = [];
  for (const stateId of STATE_IDS) {
    const profileState = profile.states[stateId];
    const runtimeState = metadata.states[stateId];
    if (!runtimeState) {
      issues.push(`runtime animation metadata is missing state: ${stateId}`);
      continue;
    }
    for (const field of ["glbClip", "bobAmplitude", "cyclesPerSecond", "trailEffect", "impactEffect", "flash", "visible"] as const) {
      if (runtimeState[field] !== undefined && runtimeState[field] !== profileState[field]) {
        issues.push(`runtime animation metadata mismatch: ${stateId}.${field}`);
      }
    }
  }
  return issues;
}

export function buildAnimationAssetDependencyGraph(input: AnimationAssetDependencyGraphInput): AnimationAssetDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? ANIMATION_ASSET_GRAPH_RULES_VERSION;
  if (rulesVersion !== ANIMATION_ASSET_GRAPH_RULES_VERSION) throw new Error(`Unsupported animation asset graph rules version: ${rulesVersion}`);
  if (!input.seed.trim() || input.seed.length > 128) throw new Error("seed must be 1–128 characters");
  const unresolvedReferences: AnimationAssetReference[] = [];

  const profileInput: AnimationProfileInput = {
    id: input.id,
    displayName: input.displayName,
    assetId: input.assetId,
    assetSource: input.assetSource as AnimationAssetSource,
    provenanceRef: input.provenanceRef,
    fps: input.fps,
    states: input.states,
  };
  const profileArtifact = createAnimationProfileRegistry().generate<AnimationProfileInput, AnimationProfileOutput>("animation.profile", profileInput, { seed: input.seed, generatedAt: 0 });
  const manifest = readJsonFile<RuntimeAssetPackManifest>(ACTIVE_ASSET_PACK_MANIFEST_PATH);
  const metadata = readJsonFile<RuntimeAnimationMetadata>(ACTIVE_ANIMATION_METADATA_PATH);
  const packNode = buildRuntimePackNode(manifest, rulesVersion);
  const metadataHash = hashStableJson(metadata as never);
  const metadataEntryNode = buildRuntimeEntryNode(manifest, RUNTIME_ANIMATION_METADATA_ASSET_ID, rulesVersion, packNode);
  const metadataNode: DependencyGraphNode = {
    key: `animation-metadata:${metadataHash}`,
    kind: "animation",
    generatorId: "asset.pack.metadata",
    generatorVersion: RUNTIME_ANIMATION_METADATA_VERSION,
    schemaVersion: "a-survival.runtime-animation-metadata.v1",
    seed: `${manifest.id}:${RUNTIME_ANIMATION_METADATA_ASSET_ID}`,
    rulesVersion,
    contentHash: metadataHash,
    dependencies: [dependencyFor(packNode)],
  };
  if (metadataEntryNode) {
    metadataNode.dependencies.push(dependencyFor(metadataEntryNode));
  } else {
    metadataNode.dependencies.push(missingDependency(`asset:${RUNTIME_ANIMATION_METADATA_ASSET_ID}`, "other"));
    unresolvedReferences.push({ sourceKey: metadataNode.key, referenceType: "asset-binding", referenceId: RUNTIME_ANIMATION_METADATA_ASSET_ID, reason: "active pack has no exact animation metadata manifest entry" });
  }
  const profileNode: DependencyGraphNode = {
    key: `animation-profile:${profileArtifact.contentHash}`,
    kind: "animation",
    generatorId: "animation.profile",
    generatorVersion: ANIMATION_PROFILE_VERSION,
    schemaVersion: ANIMATION_PROFILE_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: profileArtifact.contentHash,
    dependencies: [dependencyFor(metadataNode)],
  };
  const assetEntry = manifest.entries[input.assetId];
  const entryNode = input.assetId === RUNTIME_ANIMATION_METADATA_ASSET_ID ? metadataEntryNode : buildRuntimeEntryNode(manifest, input.assetId, rulesVersion, packNode);
  if (entryNode) {
    profileNode.dependencies.push({
      key: entryNode.key,
      kind: "animation",
      required: true,
      generatorId: "asset.pack.manifest",
      generatorVersion: RUNTIME_ASSET_PACK_MANIFEST_VERSION,
      contentHash: entryNode.contentHash,
    });
    if (assetEntry.kind !== "animation") {
      unresolvedReferences.push({ sourceKey: profileNode.key, referenceType: "asset-binding", referenceId: input.assetId, reason: `animation profile requires an animation asset entry but active pack declares kind ${assetEntry.kind}` });
    }
  } else {
    profileNode.dependencies.push(missingDependency(`asset:${input.assetId}`, "animation"));
    unresolvedReferences.push({ sourceKey: profileNode.key, referenceType: "asset-binding", referenceId: input.assetId, reason: "animation profile assetId has no exact active asset-pack manifest binding" });
  }

  const metadataIssues = compareRuntimeMetadata(profileArtifact.output, metadata);
  if (metadataIssues.length > 0) profileNode.dependencies.push(missingDependency(`animation-metadata-validation:${profileArtifact.output.id}`, "animation"));
  for (const issue of metadataIssues) unresolvedReferences.push({ sourceKey: profileNode.key, referenceType: "metadata-mismatch", referenceId: profileArtifact.output.id, reason: issue });
  const unresolvedReferenceTypes = {
    "asset-binding": unresolvedReferences.filter(reference => reference.referenceType === "asset-binding").length,
    "metadata-mismatch": unresolvedReferences.filter(reference => reference.referenceType === "metadata-mismatch").length,
  } satisfies Record<AnimationAssetReference["referenceType"], number>;
  const entryNodes = [metadataEntryNode, entryNode].filter((node, index, all): node is DependencyGraphNode => Boolean(node) && all.findIndex(candidate => candidate?.key === node?.key) === index);
  const nodes = [packNode, ...entryNodes, metadataNode, profileNode];
  return {
    artifact: {
      generatorId: "animation.profile",
      generatorVersion: ANIMATION_PROFILE_VERSION,
      seed: input.seed,
      profileId: profileArtifact.output.id,
      assetId: profileArtifact.output.assetId,
      contentHash: profileArtifact.contentHash,
    },
    runtimePack: {
      id: manifest.id,
      namespace: manifest.namespace,
      version: manifest.version,
      contentHash: packNode.contentHash,
      entryCount: Object.keys(manifest.entries).length,
    },
    runtimeMetadata: {
      assetId: RUNTIME_ANIMATION_METADATA_ASSET_ID,
      schemaVersion: metadata.schemaVersion,
      source: metadata.source,
      stateIds: Object.keys(metadata.states).sort(),
      contentHash: metadataHash,
    },
    profile: profileArtifact.output,
    summary: {
      profileId: profileArtifact.output.id,
      assetId: profileArtifact.output.assetId,
      stateCount: Object.keys(profileArtifact.output.states).length,
      runtimeMetadataStateCount: Object.keys(metadata.states).length,
      ...(assetEntry ? { runtimeAssetEntryKind: assetEntry.kind } : {}),
      metadataMatch: metadataIssues.length === 0,
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId) || left.reason.localeCompare(right.reason)),
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
