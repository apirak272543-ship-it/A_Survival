import { hashStableJson } from "./commonGeneratorApi";
import { getPerformanceBudget, normalizePerformanceTier, type PerformanceBudget, type PerformanceTier } from "../../client/src/game/systems/performanceProfile";

export const RUNTIME_CAPABILITY_POLICY_SCHEMA_VERSION = "a-survival.runtime-capability-policy.v1" as const;
export const RUNTIME_CAPABILITY_POLICY_VERSION = "1.0.0" as const;

export type RuntimeCapabilitySignals = {
  webglVersion?: unknown;
  deviceMemoryGb?: unknown;
  hardwareConcurrency?: unknown;
  maxTextureSize?: unknown;
  prefersReducedMotion?: unknown;
};

export type RuntimeCapabilityPolicyInput = {
  requestedTier?: unknown;
  persistedTier?: unknown;
  signals?: RuntimeCapabilitySignals | null;
};

type CapabilityPolicyBlockerId =
  | "webgl-device-detection"
  | "adaptive-tier-controller"
  | "tier-hysteresis"
  | "frustum-occlusion-culling"
  | "object-pooling"
  | "real-device-benchmark";

type CapabilityPolicyBlocker = {
  id: CapabilityPolicyBlockerId;
  required: true;
  status: "missing-evidence";
  owner: string;
  reason: string;
};

type NormalizedSignals = {
  webglVersion: 1 | 2 | null;
  deviceMemoryGb: number | null;
  hardwareConcurrency: number | null;
  maxTextureSize: number | null;
  prefersReducedMotion: boolean | null;
};

export type RuntimeCapabilityPolicyOutput = {
  schemaVersion: typeof RUNTIME_CAPABILITY_POLICY_SCHEMA_VERSION;
  policyVersion: typeof RUNTIME_CAPABILITY_POLICY_VERSION;
  requestedTier: PerformanceTier;
  persistedTier: PerformanceTier;
  appliedTier: PerformanceTier;
  appliedBudget: PerformanceBudget & { viewDistanceBlocks: number; targetFps: number };
  signals: NormalizedSignals & {
    completeness: "none" | "partial" | "complete";
    webgl2Supported: boolean | null;
  };
  recommendation: {
    tier: PerformanceTier;
    reasonCodes: string[];
    manualReviewRequired: true;
    appliedAutomatically: false;
  };
  blockers: CapabilityPolicyBlocker[];
  summary: {
    bounded: true;
    deterministic: true;
    signalCompleteness: "none" | "partial" | "complete";
    advancedCapabilityCount: number;
    missingEvidenceCount: number;
    runtimeMutation: false;
    playerVisible: false;
    cacheWrite: false;
  };
  claims: {
    browserApiProbe: false;
    automaticTierMutation: false;
    adaptiveController: false;
    hysteresis: false;
    frustumOcclusionCulling: false;
    objectPooling: false;
    realDeviceBenchmark: false;
    runtimeWrite: false;
    cacheWrite: false;
    playerVisible: false;
  };
  contentHash: string;
};

function normalizeFiniteNumber(value: unknown, min: number, max: number, integer = false): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return null;
  const normalized = integer ? Math.floor(value) : Number(value.toFixed(2));
  return normalized >= min && normalized <= max ? normalized : null;
}

function normalizeWebglVersion(value: unknown): 1 | 2 | null {
  const normalized = normalizeFiniteNumber(value, 1, 2, true);
  return normalized === 1 || normalized === 2 ? normalized : null;
}

function normalizeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeSignals(signals: RuntimeCapabilitySignals | null | undefined): NormalizedSignals {
  return {
    webglVersion: normalizeWebglVersion(signals?.webglVersion),
    deviceMemoryGb: normalizeFiniteNumber(signals?.deviceMemoryGb, 0.25, 64),
    hardwareConcurrency: normalizeFiniteNumber(signals?.hardwareConcurrency, 1, 128, true),
    maxTextureSize: normalizeFiniteNumber(signals?.maxTextureSize, 256, 32768, true),
    prefersReducedMotion: normalizeBoolean(signals?.prefersReducedMotion),
  };
}

function signalCompleteness(signals: NormalizedSignals): "none" | "partial" | "complete" {
  const knownCount = [signals.webglVersion, signals.deviceMemoryGb, signals.hardwareConcurrency, signals.maxTextureSize, signals.prefersReducedMotion]
    .filter(value => value !== null).length;
  return knownCount === 0 ? "none" : knownCount === 5 ? "complete" : "partial";
}

function recommendTier(signals: NormalizedSignals): { tier: PerformanceTier; reasonCodes: string[] } {
  const reasonCodes: string[] = [];
  if (signals.prefersReducedMotion === true) reasonCodes.push("prefers-reduced-motion");
  if (signals.webglVersion === 1) reasonCodes.push("webgl1-safe-fallback");
  if (signals.deviceMemoryGb !== null && signals.deviceMemoryGb <= 2) reasonCodes.push("low-device-memory");
  if (signals.hardwareConcurrency !== null && signals.hardwareConcurrency <= 2) reasonCodes.push("low-hardware-concurrency");
  if (signals.maxTextureSize !== null && signals.maxTextureSize < 2048) reasonCodes.push("low-texture-capability");
  if (reasonCodes.length > 0) return { tier: "low", reasonCodes };

  const highCapacity = signals.webglVersion === 2
    && signals.deviceMemoryGb !== null && signals.deviceMemoryGb >= 8
    && signals.hardwareConcurrency !== null && signals.hardwareConcurrency >= 8
    && signals.maxTextureSize !== null && signals.maxTextureSize >= 4096;
  if (highCapacity) return { tier: "high", reasonCodes: ["webgl2-high-capacity-signals"] };
  if (signalCompleteness(signals) === "none") return { tier: "balanced", reasonCodes: ["unknown-capability-fallback"] };
  return { tier: "balanced", reasonCodes: ["balanced-capability-signals"] };
}

function buildBlockers(): CapabilityPolicyBlocker[] {
  return [
    {
      id: "webgl-device-detection",
      required: true,
      status: "missing-evidence",
      owner: "runtime capability integration",
      reason: "this adapter consumes caller-provided signals and does not probe WebGL or device APIs",
    },
    {
      id: "adaptive-tier-controller",
      required: true,
      status: "missing-evidence",
      owner: "performance profile/runtime controller",
      reason: "the recommendation is advisory and never mutates the persisted tier automatically",
    },
    {
      id: "tier-hysteresis",
      required: true,
      status: "missing-evidence",
      owner: "performance profile/runtime controller",
      reason: "no rolling signal history or hysteresis thresholds are implemented",
    },
    {
      id: "frustum-occlusion-culling",
      required: true,
      status: "missing-evidence",
      owner: "scene visibility owner",
      reason: "this policy does not claim camera-frustum or occlusion culling",
    },
    {
      id: "object-pooling",
      required: true,
      status: "missing-evidence",
      owner: "scene object lifecycle owner",
      reason: "this policy does not create, recycle, or dispose runtime objects",
    },
    {
      id: "real-device-benchmark",
      required: true,
      status: "missing-evidence",
      owner: "performance validation owner",
      reason: "no mobile/GPU/FPS/memory/thermal benchmark is generated or inferred",
    },
  ];
}

export function buildRuntimeCapabilityPolicy(input: RuntimeCapabilityPolicyInput = {}): RuntimeCapabilityPolicyOutput {
  const requestedTier = normalizePerformanceTier(input.requestedTier, "balanced");
  const persistedTier = normalizePerformanceTier(input.persistedTier, requestedTier);
  const appliedTier = persistedTier;
  const signals = normalizeSignals(input.signals);
  const completeness = signalCompleteness(signals);
  const recommendation = recommendTier(signals);
  const blockers = buildBlockers();
  const appliedBudget = getPerformanceBudget(appliedTier);
  const advancedCapabilityCount = [signals.webglVersion === 2, signals.deviceMemoryGb !== null, signals.hardwareConcurrency !== null, signals.maxTextureSize !== null]
    .filter(Boolean).length;
  const canonicalPayload = {
    schemaVersion: RUNTIME_CAPABILITY_POLICY_SCHEMA_VERSION,
    policyVersion: RUNTIME_CAPABILITY_POLICY_VERSION,
    requestedTier,
    persistedTier,
    appliedTier,
    appliedBudget,
    signals: { ...signals, completeness, webgl2Supported: signals.webglVersion === null ? null : signals.webglVersion === 2 },
    recommendation,
    blockers,
  };

  return {
    schemaVersion: RUNTIME_CAPABILITY_POLICY_SCHEMA_VERSION,
    policyVersion: RUNTIME_CAPABILITY_POLICY_VERSION,
    requestedTier,
    persistedTier,
    appliedTier,
    appliedBudget,
    signals: { ...signals, completeness, webgl2Supported: signals.webglVersion === null ? null : signals.webglVersion === 2 },
    recommendation: { ...recommendation, manualReviewRequired: true, appliedAutomatically: false },
    blockers,
    summary: {
      bounded: true,
      deterministic: true,
      signalCompleteness: completeness,
      advancedCapabilityCount,
      missingEvidenceCount: blockers.length,
      runtimeMutation: false,
      playerVisible: false,
      cacheWrite: false,
    },
    claims: {
      browserApiProbe: false,
      automaticTierMutation: false,
      adaptiveController: false,
      hysteresis: false,
      frustumOcclusionCulling: false,
      objectPooling: false,
      realDeviceBenchmark: false,
      runtimeWrite: false,
      cacheWrite: false,
      playerVisible: false,
    },
    contentHash: hashStableJson(canonicalPayload as never),
  };
}
