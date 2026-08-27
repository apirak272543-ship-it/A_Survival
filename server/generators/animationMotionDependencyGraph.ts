import {
  ANIMATION_PROFILE_SCHEMA_VERSION,
  ANIMATION_PROFILE_VERSION,
  createAnimationProfileRegistry,
  type AnimationAssetSource,
  type AnimationProfileInput,
  type AnimationProfileOutput,
  type AnimationStateId,
} from "./animationProfileGenerator";
import {
  ANIMATION_MOTION_POLICY_VERSION,
  resolveAnimationMotionPolicy,
  type AnimationMotionDecision,
} from "../../client/src/game/systems/animationMotionPolicy";
import { hashStableJson } from "./commonGeneratorApi";
import {
  validateGeneratorDependencyGraph,
  type DependencyGraphNode,
  type DependencyGraphValidation,
  type GeneratorDependency,
} from "./dependencyGraph";

export const ANIMATION_MOTION_GRAPH_RULES_VERSION = "animation-motion-graph-rules.v1" as const;
export const ANIMATION_MOTION_GRAPH_SCHEMA_VERSION = "a-survival.animation-motion-graph.v1" as const;
export const ANIMATION_MOTION_GRAPH_VERSION = "1.0.0" as const;
export const ANIMATION_MOTION_MAX_STATE_SAMPLES = 7;

const STATE_IDS: readonly AnimationStateId[] = ["idle", "walk", "run", "dash", "attack", "hurt", "dead"];
const DEFAULT_SEED = "t02-animation-motion";
const DEFAULT_PROFILE_ID = "survivor.default";
const DEFAULT_DISPLAY_NAME = "Survivor animation profile";
const DEFAULT_ASSET_ID = "animation.survivor.default";
const DEFAULT_PROVENANCE_REF = "asset-pack:arcane-frontier-voxel-pixel#animation.survivor.default";

const PROFILE_OWNER_KEY = "owner:animation:profile-generator" as const;
const MOTION_POLICY_OWNER_KEY = "owner:animation:motion-policy" as const;
const ASSET_PROVENANCE_OWNER_KEY = "owner:animation:asset-provenance" as const;
const RUNTIME_CALLER_OWNER_KEY = "owner:animation:runtime-caller" as const;
const VARIATION_OWNER_KEY = "owner:animation:runtime-variation" as const;
const SKELETON_RETARGET_OWNER_KEY = "owner:animation:skeleton-retarget" as const;
const WIND_OWNER_KEY = "owner:animation:wind-motion" as const;
const BINARY_ASSET_OWNER_KEY = "owner:animation:binary-asset-generation" as const;

export type AnimationMotionDependencyGraphInput = {
  seed?: string;
  profileId?: string;
  displayName?: string;
  assetId?: string;
  assetSource?: AnimationAssetSource;
  provenanceRef?: string;
  fps?: number;
  rulesVersion?: string;
};

export type AnimationMotionBlocker =
  | "runtime-animation-caller-owner-missing"
  | "runtime-variation-owner-missing"
  | "skeleton-retarget-owner-missing"
  | "wind-motion-owner-missing"
  | "binary-animation-asset-generation-owner-missing";

export type AnimationMotionDependencyGraphSummary = {
  profileId: string;
  assetId: string;
  assetSource: AnimationAssetSource;
  provenanceRef: string;
  stateCount: number;
  stateIds: AnimationStateId[];
  fps: number;
  playbackPolicy: AnimationProfileOutput["playbackPolicy"];
  assetReferenceOnly: true;
  binaryAssetGenerated: false;
  generatedInRenderLoop: false;
  skeletonRetargeted: false;
  windSimulated: false;
  profileVariationInputSupported: true;
  motionPolicyVersion: typeof ANIMATION_MOTION_POLICY_VERSION;
  motionDecisions: Array<{
    label: "near-full" | "far-reduced" | "offscreen-sleep" | "reduced-motion" | "dead-static";
    state: AnimationStateId;
    mode: AnimationMotionDecision["mode"];
    animationLod: AnimationMotionDecision["animationLod"];
    assetPolicy: AnimationMotionDecision["assetPolicy"];
    reason: AnimationMotionDecision["reasons"][number];
  }>;
  owners: {
    profileGenerator: true;
    motionPolicy: true;
    assetProvenance: true;
    runtimeCaller: false;
    runtimeVariation: false;
    skeletonRetarget: false;
    windMotion: false;
    binaryAssetGeneration: false;
  };
  blockerCodes: AnimationMotionBlocker[];
  runtimeImportAllowed: false;
  playerVisible: false;
  cacheable: false;
};

export type AnimationMotionDependencyGraphOutput = {
  artifact: {
    generatorId: "animation.motion.audit";
    generatorVersion: typeof ANIMATION_MOTION_GRAPH_VERSION;
    seed: string;
    profileContentHash: string;
    contentHash: string;
  };
  profile: AnimationProfileOutput;
  summary: AnimationMotionDependencyGraphSummary;
  blockers: AnimationMotionBlocker[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedText(value: string | undefined, fallback: string, field: string, maxLength: number): string {
  const text = value ?? fallback;
  if (!text.trim() || text.length > maxLength) throw new Error(`${field} must be 1–${maxLength} characters`);
  return text;
}

function boundedSeed(value: string | undefined): string {
  return boundedText(value, DEFAULT_SEED, "seed", 128);
}

function boundedFps(value: number | undefined): number {
  const fps = value ?? 12;
  if (!Number.isInteger(fps) || fps < 1 || fps > 60) throw new Error("fps must be an integer from 1 to 60");
  return fps;
}

function profileInput(input: AnimationMotionDependencyGraphInput): AnimationProfileInput {
  return {
    id: boundedText(input.profileId, DEFAULT_PROFILE_ID, "profileId", 64),
    displayName: boundedText(input.displayName, DEFAULT_DISPLAY_NAME, "displayName", 120),
    assetId: boundedText(input.assetId, DEFAULT_ASSET_ID, "assetId", 64),
    assetSource: input.assetSource ?? "starter-authored",
    provenanceRef: boundedText(input.provenanceRef, DEFAULT_PROVENANCE_REF, "provenanceRef", 512),
    fps: boundedFps(input.fps),
  };
}

function sourceNode(key: string, generatorId: string, kind: DependencyGraphNode["kind"], source: string, rulesVersion: string): DependencyGraphNode {
  return {
    key,
    kind,
    generatorId,
    generatorVersion: "1.0.0",
    schemaVersion: ANIMATION_MOTION_GRAPH_SCHEMA_VERSION,
    seed: DEFAULT_SEED,
    rulesVersion,
    contentHash: hashStableJson({ generatorId, source, rulesVersion } as never),
    dependencies: [],
  };
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return {
    key: node.key,
    kind: node.kind,
    required: true,
    generatorId: node.generatorId,
    generatorVersion: node.generatorVersion,
    contentHash: node.contentHash,
  };
}

function missingDependency(key: string): GeneratorDependency {
  return { key, kind: "animation", required: true, generatorId: key.replace(/^owner:/, "") , generatorVersion: "1.0.0" };
}

function summarizeMotionDecision(label: AnimationMotionDependencyGraphSummary["motionDecisions"][number]["label"], decision: AnimationMotionDecision) {
  return {
    label,
    state: decision.state,
    mode: decision.mode,
    animationLod: decision.animationLod,
    assetPolicy: decision.assetPolicy,
    reason: decision.reasons[0]!,
  };
}

export function buildAnimationMotionDependencyGraph(
  input: AnimationMotionDependencyGraphInput = {},
): AnimationMotionDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? ANIMATION_MOTION_GRAPH_RULES_VERSION;
  if (rulesVersion !== ANIMATION_MOTION_GRAPH_RULES_VERSION) throw new Error(`Unsupported animation motion graph rules version: ${rulesVersion}`);
  const seed = boundedSeed(input.seed);
  const profileInputValue = profileInput(input);
  const profileArtifact = createAnimationProfileRegistry().generate<AnimationProfileInput, AnimationProfileOutput>("animation.profile", profileInputValue, { seed, generatedAt: 0 });
  const profile = profileArtifact.output;
  const nearFull = resolveAnimationMotionPolicy({ state: "walk", tier: "balanced", distanceMeters: 10, visible: true, hasAssetClip: true });
  const farReduced = resolveAnimationMotionPolicy({ state: "run", tier: "balanced", distanceMeters: 35, visible: true, hasAssetClip: false });
  const offscreenSleep = resolveAnimationMotionPolicy({ state: "attack", tier: "high", distanceMeters: 1, visible: false, hasAssetClip: true });
  const reducedMotion = resolveAnimationMotionPolicy({ state: "dash", tier: "high", distanceMeters: 1, visible: true, reducedMotion: true, hasAssetClip: true });
  const deadStatic = resolveAnimationMotionPolicy({ state: "dead", tier: "balanced", distanceMeters: 1, visible: true, hasAssetClip: true });
  const blockers: AnimationMotionBlocker[] = [
    "runtime-animation-caller-owner-missing",
    "runtime-variation-owner-missing",
    "skeleton-retarget-owner-missing",
    "wind-motion-owner-missing",
    "binary-animation-asset-generation-owner-missing",
  ];
  const summary: AnimationMotionDependencyGraphSummary = {
    profileId: profile.id,
    assetId: profile.assetId,
    assetSource: profile.assetSource,
    provenanceRef: profile.provenanceRef,
    stateCount: Object.keys(profile.states).length,
    stateIds: [...STATE_IDS],
    fps: profile.fps,
    playbackPolicy: profile.playbackPolicy,
    assetReferenceOnly: true,
    binaryAssetGenerated: false,
    generatedInRenderLoop: false,
    skeletonRetargeted: false,
    windSimulated: false,
    profileVariationInputSupported: true,
    motionPolicyVersion: ANIMATION_MOTION_POLICY_VERSION,
    motionDecisions: [
      summarizeMotionDecision("near-full", nearFull),
      summarizeMotionDecision("far-reduced", farReduced),
      summarizeMotionDecision("offscreen-sleep", offscreenSleep),
      summarizeMotionDecision("reduced-motion", reducedMotion),
      summarizeMotionDecision("dead-static", deadStatic),
    ],
    owners: {
      profileGenerator: true,
      motionPolicy: true,
      assetProvenance: true,
      runtimeCaller: false,
      runtimeVariation: false,
      skeletonRetarget: false,
      windMotion: false,
      binaryAssetGeneration: false,
    },
    blockerCodes: blockers,
    runtimeImportAllowed: false,
    playerVisible: false,
    cacheable: false,
  };
  const profileNode = sourceNode(PROFILE_OWNER_KEY, "animation.profile", "animation", "server/generators/animationProfileGenerator.ts", rulesVersion);
  const motionNode = sourceNode(MOTION_POLICY_OWNER_KEY, "animation.motion.policy", "animation", "client/src/game/systems/animationMotionPolicy.ts", rulesVersion);
  const assetNode = sourceNode(ASSET_PROVENANCE_OWNER_KEY, "animation.asset.provenance", "other", "server/generators/animationAssetDependencyGraph.ts", rulesVersion);
  const dependencies: GeneratorDependency[] = [profileNode, motionNode, assetNode].map(dependencyFor);
  dependencies.push(missingDependency(RUNTIME_CALLER_OWNER_KEY));
  dependencies.push(missingDependency(VARIATION_OWNER_KEY));
  dependencies.push(missingDependency(SKELETON_RETARGET_OWNER_KEY));
  dependencies.push(missingDependency(WIND_OWNER_KEY));
  dependencies.push(missingDependency(BINARY_ASSET_OWNER_KEY));
  const auditNode: DependencyGraphNode = {
    key: `animation-motion:${profile.id}:${profileArtifact.contentHash}`,
    kind: "animation",
    generatorId: "animation.motion.audit",
    generatorVersion: ANIMATION_MOTION_GRAPH_VERSION,
    schemaVersion: ANIMATION_MOTION_GRAPH_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson({ profile, summary, dependencies } as never),
    dependencies,
  };
  const nodes = [profileNode, motionNode, assetNode, auditNode];
  return {
    artifact: {
      generatorId: "animation.motion.audit",
      generatorVersion: ANIMATION_MOTION_GRAPH_VERSION,
      seed,
      profileContentHash: profileArtifact.contentHash,
      contentHash: auditNode.contentHash,
    },
    profile,
    summary,
    blockers,
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}

export function getDefaultAnimationMotionDependencyGraphInput(): AnimationMotionDependencyGraphInput {
  return { seed: DEFAULT_SEED, profileId: DEFAULT_PROFILE_ID, displayName: DEFAULT_DISPLAY_NAME, assetId: DEFAULT_ASSET_ID, assetSource: "starter-authored", provenanceRef: DEFAULT_PROVENANCE_REF, fps: 12 };
}
