import { getPerformanceBudget, normalizePerformanceTier, type PerformanceTier } from "./performanceProfile";

export type AnimationStateId = "idle" | "walk" | "run" | "dash" | "attack" | "hurt" | "dead";

export const ANIMATION_MOTION_POLICY_VERSION = "animation-motion-policy.v1" as const;

export type AnimationMotionInput = {
  state: AnimationStateId;
  tier: unknown;
  distanceMeters?: unknown;
  visible?: unknown;
  reducedMotion?: unknown;
  hasAssetClip?: unknown;
};

export type AnimationMotionMode = "full" | "reduced" | "sleep" | "static";

export type AnimationMotionDecision = {
  policyVersion: typeof ANIMATION_MOTION_POLICY_VERSION;
  state: AnimationStateId;
  tier: PerformanceTier;
  distanceMeters: number | null;
  animationRadiusMeters: number;
  mode: AnimationMotionMode;
  animationLod: "full" | "reduced" | "static";
  updateIntervalMs: number | null;
  bobScale: 0 | 0.5 | 1;
  cycleScale: 0 | 0.5 | 1;
  assetPolicy: "reuse-clip" | "profile-fallback" | "none";
  reasons: Array<"not-visible" | "outside-radius" | "reduced-motion" | "dead-state" | "near-visible" | "far-visible">;
  claims: {
    binaryAssetGenerated: false;
    generatedInRenderLoop: false;
    skeletonRetargeted: false;
    windSimulated: false;
    adaptiveTiering: false;
    deviceBenchmark: false;
    playerRuntimeMutation: false;
  };
};

function finiteDistance(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.min(10_000, value) : null;
}

export function resolveAnimationMotionPolicy(input: AnimationMotionInput): AnimationMotionDecision {
  const tier = normalizePerformanceTier(input.tier);
  const budget = getPerformanceBudget(tier);
  const distanceMeters = finiteDistance(input.distanceMeters);
  const visible = input.visible === true;
  const reducedMotion = input.reducedMotion === true;
  const hasAssetClip = input.hasAssetClip === true;
  const reasons: AnimationMotionDecision["reasons"] = [];
  let mode: AnimationMotionMode = "sleep";

  if (!visible || distanceMeters === null || distanceMeters > budget.animationRadiusMeters) {
    reasons.push(!visible ? "not-visible" : "outside-radius");
  } else if (input.state === "dead") {
    mode = "static";
    reasons.push("dead-state");
  } else if (reducedMotion) {
    mode = "reduced";
    reasons.push("reduced-motion");
  } else if (distanceMeters <= budget.animationRadiusMeters * 0.5) {
    mode = "full";
    reasons.push("near-visible");
  } else {
    mode = "reduced";
    reasons.push("far-visible");
  }

  const animationLod = mode === "full" ? "full" : mode === "reduced" ? "reduced" : "static";
  const updateIntervalMs = mode === "full" ? 16 : mode === "reduced" ? 66 : null;
  const scale = mode === "full" ? 1 : mode === "reduced" ? 0.5 : 0;
  return {
    policyVersion: ANIMATION_MOTION_POLICY_VERSION,
    state: input.state,
    tier,
    distanceMeters,
    animationRadiusMeters: budget.animationRadiusMeters,
    mode,
    animationLod,
    updateIntervalMs,
    bobScale: scale,
    cycleScale: scale,
    assetPolicy: mode === "full" || mode === "reduced" ? (hasAssetClip ? "reuse-clip" : "profile-fallback") : "none",
    reasons,
    claims: {
      binaryAssetGenerated: false,
      generatedInRenderLoop: false,
      skeletonRetargeted: false,
      windSimulated: false,
      adaptiveTiering: false,
      deviceBenchmark: false,
      playerRuntimeMutation: false,
    },
  };
}
