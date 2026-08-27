import { getPerformanceBudget, normalizePerformanceTier, PERFORMANCE_TIERS, type PerformanceTier } from "../../client/src/game/systems/performanceProfile";
import { getBlockRenderDistanceConfig, TARGET_FPS_OPTIONS, VIEW_DISTANCE_BLOCK_STEPS } from "../../client/src/game/systems/renderDistance";
import { hashStableJson } from "./commonGeneratorApi";

export const RUNTIME_RENDER_SETTINGS_RULES_VERSION = "runtime-render-settings-rules.v1" as const;
export const RUNTIME_RENDER_SETTINGS_GENERATOR_ID = "runtime.render-settings" as const;
export const RUNTIME_RENDER_SETTINGS_GENERATOR_VERSION = "1.0.0" as const;
export const RUNTIME_RENDER_SETTINGS_SCHEMA_VERSION = "a-survival.runtime-render-settings.v1" as const;

const MAP_RADIUS_METERS = 500;

export type RuntimeRenderSettingsInput = {
  seed: string;
  tier?: unknown;
  requestedViewDistanceBlocks?: unknown;
  requestedTargetFps?: unknown;
  rulesVersion?: string;
};

type ViewSettingOption = {
  requestedBlocks: number;
  visibleRadiusMeters: number;
  prefetchRadiusMeters: number;
  preset: "near" | "balanced" | "far";
  label: string;
};

type FpsSettingOption = {
  requestedTargetFps: number;
  disclaimer: "goal-not-guarantee" | "device-dependent-option";
};

type TierSettingEnvelope = {
  tier: PerformanceTier;
  maxViewDistanceBlocks: number;
  maxTargetFps: number;
  effectiveViewDistanceByRequest: number[];
  effectiveTargetFpsByRequest: number[];
  clampedViewRequestCount: number;
  clampedTargetFpsRequestCount: number;
};

export type RuntimeRenderSettingsOutput = {
  artifact: {
    generatorId: typeof RUNTIME_RENDER_SETTINGS_GENERATOR_ID;
    generatorVersion: typeof RUNTIME_RENDER_SETTINGS_GENERATOR_VERSION;
    schemaVersion: typeof RUNTIME_RENDER_SETTINGS_SCHEMA_VERSION;
    seed: string;
    rulesVersion: typeof RUNTIME_RENDER_SETTINGS_RULES_VERSION;
    contentHash: string;
  };
  selected: {
    tier: PerformanceTier;
    requestedViewDistanceBlocks: number;
    effectiveViewDistanceBlocks: number;
    requestedTargetFps: number;
    effectiveTargetFps: number;
  };
  viewDistance: {
    supportedSteps: number[];
    minimumBlocks: number;
    maximumBlocks: number;
    stepBlocks: 5;
    options: ViewSettingOption[];
    mapRadiusMeters: typeof MAP_RADIUS_METERS;
  };
  targetFps: {
    supportedOptions: number[];
    minimumFps: number;
    maximumFps: number;
    includes120DeviceDependentOption: true;
    options: FpsSettingOption[];
  };
  tierEnvelopes: TierSettingEnvelope[];
  persistence: {
    owner: "client/src/pages/ArcaneFrontier.tsx:801-806";
    scope: "player-and-map";
    normalizeBeforeSave: true;
    savePolicy: "source-owner-writes";
    durablePersistenceE2E: false;
  };
  streamingPolicy: {
    owner: "client/src/game/systems/renderDistance.ts";
    prefetchFormula: "visible + max(5, round(visible * 0.35))";
    boundedByMapRadiusMeters: typeof MAP_RADIUS_METERS;
    deterministic: true;
  };
  blockers: Array<{
    id: "settings-persistence-e2e" | "target-fps-device-evidence";
    required: true;
    status: "missing-evidence";
    owner: string;
    reason: string;
  }>;
  summary: {
    bounded: true;
    deterministic: true;
    viewOptionCount: number;
    targetFpsOptionCount: number;
    tierCount: number;
    deviceBenchmark: false;
    mobileAcceptance: false;
  };
  claims: {
    runtimeWrite: false;
    generatorCall: false;
    assetGeneration: false;
    cacheWrite: false;
    playerVisibleEffect: false;
    deviceBenchmark: false;
    adaptiveTierMutation: false;
  };
};

function finiteOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function validateSeed(seed: string) {
  if (!seed.trim() || seed.length > 128) throw new Error("seed must be 1–128 characters");
}

function buildViewOptions(): ViewSettingOption[] {
  return VIEW_DISTANCE_BLOCK_STEPS.map(requestedBlocks => {
    const config = getBlockRenderDistanceConfig(requestedBlocks, MAP_RADIUS_METERS);
    return {
      requestedBlocks,
      visibleRadiusMeters: config.visibleRadiusMeters,
      prefetchRadiusMeters: config.prefetchRadiusMeters,
      preset: config.preset,
      label: config.label,
    };
  });
}

function buildFpsOptions(): FpsSettingOption[] {
  return TARGET_FPS_OPTIONS.map(requestedTargetFps => ({
    requestedTargetFps,
    disclaimer: requestedTargetFps === 120 ? "device-dependent-option" : "goal-not-guarantee",
  }));
}

function buildTierEnvelopes(): TierSettingEnvelope[] {
  return PERFORMANCE_TIERS.map(tier => {
    const budget = getPerformanceBudget(tier);
    const effectiveViewDistanceByRequest = VIEW_DISTANCE_BLOCK_STEPS.map(requestedBlocks => getPerformanceBudget(tier, requestedBlocks, budget.maxTargetFps).viewDistanceBlocks);
    const effectiveTargetFpsByRequest = TARGET_FPS_OPTIONS.map(requestedTargetFps => getPerformanceBudget(tier, budget.maxViewDistanceBlocks, requestedTargetFps).targetFps);
    return {
      tier,
      maxViewDistanceBlocks: budget.maxViewDistanceBlocks,
      maxTargetFps: budget.maxTargetFps,
      effectiveViewDistanceByRequest,
      effectiveTargetFpsByRequest,
      clampedViewRequestCount: effectiveViewDistanceByRequest.filter((value, index) => value !== VIEW_DISTANCE_BLOCK_STEPS[index]).length,
      clampedTargetFpsRequestCount: effectiveTargetFpsByRequest.filter((value, index) => value !== TARGET_FPS_OPTIONS[index]).length,
    };
  });
}

export function buildRuntimeRenderSettings(input: RuntimeRenderSettingsInput): RuntimeRenderSettingsOutput {
  const rulesVersion = input.rulesVersion ?? RUNTIME_RENDER_SETTINGS_RULES_VERSION;
  if (rulesVersion !== RUNTIME_RENDER_SETTINGS_RULES_VERSION) throw new Error(`Unsupported runtime render settings rules version: ${rulesVersion}`);
  validateSeed(input.seed);

  const tier = normalizePerformanceTier(input.tier);
  const budget = getPerformanceBudget(tier, input.requestedViewDistanceBlocks, input.requestedTargetFps);
  const requestedViewDistanceBlocks = finiteOr(input.requestedViewDistanceBlocks, budget.viewDistanceBlocks);
  const requestedTargetFps = finiteOr(input.requestedTargetFps, budget.targetFps);
  const viewDistance = buildViewOptions();
  const targetFps = buildFpsOptions();
  const tierEnvelopes = buildTierEnvelopes();
  const persistence = {
    owner: "client/src/pages/ArcaneFrontier.tsx:801-806" as const,
    scope: "player-and-map" as const,
    normalizeBeforeSave: true as const,
    savePolicy: "source-owner-writes" as const,
    durablePersistenceE2E: false as const,
  };
  const streamingPolicy = {
    owner: "client/src/game/systems/renderDistance.ts" as const,
    prefetchFormula: "visible + max(5, round(visible * 0.35))" as const,
    boundedByMapRadiusMeters: MAP_RADIUS_METERS as typeof MAP_RADIUS_METERS,
    deterministic: true as const,
  };
  const blockers: RuntimeRenderSettingsOutput["blockers"] = [
    {
      id: "settings-persistence-e2e",
      required: true,
      status: "missing-evidence",
      owner: "client/src/pages/ArcaneFrontier.tsx:801-806",
      reason: "the source owner normalizes and saves player/map settings, but this pure contract does not claim a browser reload or cross-session persistence proof",
    },
    {
      id: "target-fps-device-evidence",
      required: true,
      status: "missing-evidence",
      owner: "docs/PERFORMANCE_PROFILE.md",
      reason: "target FPS is a policy ceiling and 120 is device-dependent; no real-device FPS benchmark is present",
    },
  ];
  const canonicalPayload = {
    schemaVersion: RUNTIME_RENDER_SETTINGS_SCHEMA_VERSION,
    generatorId: RUNTIME_RENDER_SETTINGS_GENERATOR_ID,
    generatorVersion: RUNTIME_RENDER_SETTINGS_GENERATOR_VERSION,
    seed: input.seed,
    rulesVersion,
    selected: { tier, requestedViewDistanceBlocks, effectiveViewDistanceBlocks: budget.viewDistanceBlocks, requestedTargetFps, effectiveTargetFps: budget.targetFps },
    viewDistance,
    targetFps,
    tierEnvelopes,
    persistence,
    streamingPolicy,
    blockers,
  };
  const contentHash = hashStableJson(canonicalPayload as never);

  return {
    artifact: {
      generatorId: RUNTIME_RENDER_SETTINGS_GENERATOR_ID,
      generatorVersion: RUNTIME_RENDER_SETTINGS_GENERATOR_VERSION,
      schemaVersion: RUNTIME_RENDER_SETTINGS_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash,
    },
    selected: {
      tier,
      requestedViewDistanceBlocks,
      effectiveViewDistanceBlocks: budget.viewDistanceBlocks,
      requestedTargetFps,
      effectiveTargetFps: budget.targetFps,
    },
    viewDistance: {
      supportedSteps: [...VIEW_DISTANCE_BLOCK_STEPS],
      minimumBlocks: VIEW_DISTANCE_BLOCK_STEPS[0],
      maximumBlocks: VIEW_DISTANCE_BLOCK_STEPS[VIEW_DISTANCE_BLOCK_STEPS.length - 1],
      stepBlocks: 5,
      options: viewDistance,
      mapRadiusMeters: MAP_RADIUS_METERS,
    },
    targetFps: {
      supportedOptions: [...TARGET_FPS_OPTIONS],
      minimumFps: TARGET_FPS_OPTIONS[0],
      maximumFps: TARGET_FPS_OPTIONS[TARGET_FPS_OPTIONS.length - 1],
      includes120DeviceDependentOption: true,
      options: targetFps,
    },
    tierEnvelopes,
    persistence,
    streamingPolicy,
    blockers,
    summary: {
      bounded: true,
      deterministic: true,
      viewOptionCount: viewDistance.length,
      targetFpsOptionCount: targetFps.length,
      tierCount: tierEnvelopes.length,
      deviceBenchmark: false,
      mobileAcceptance: false,
    },
    claims: {
      runtimeWrite: false,
      generatorCall: false,
      assetGeneration: false,
      cacheWrite: false,
      playerVisibleEffect: false,
      deviceBenchmark: false,
      adaptiveTierMutation: false,
    },
  };
}
