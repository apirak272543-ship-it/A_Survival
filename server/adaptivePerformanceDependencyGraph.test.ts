import { describe, expect, it } from "vitest";
import { PERFORMANCE_TIERS } from "../client/src/game/systems/performanceProfile";
import {
  ADAPTIVE_PERFORMANCE_GRAPH_RULES_VERSION,
  ADAPTIVE_PERFORMANCE_MAX_FRAME_SAMPLES,
  ADAPTIVE_PERFORMANCE_MAX_SAMPLE_WINDOW_MS,
  buildAdaptivePerformanceDependencyGraph,
  getDefaultAdaptivePerformanceDependencyGraphInput,
} from "./generators/adaptivePerformanceDependencyGraph";

describe("adaptive performance dependency graph", () => {
  it("connects the existing capability, tier budget, culling, telemetry, and profiler owners", () => {
    const result = buildAdaptivePerformanceDependencyGraph(getDefaultAdaptivePerformanceDependencyGraphInput());

    expect(result.summary).toMatchObject({
      configuredTierCount: PERFORMANCE_TIERS.length,
      configuredTiers: [...PERFORMANCE_TIERS],
      selectedTier: "balanced",
      selectedBudget: { maxViewDistanceBlocks: 35, maxTargetFps: 60, lodPolicy: "balanced" },
      capability: { recommendedTier: "balanced", webgl: true, webgl2: true, adaptiveTiering: false, autoApplied: false, renderLoopCoupled: false },
      renderDistance: { viewDistanceBlocks: 35, visibleRadiusMeters: 35, prefetchRadiusMeters: 47 },
      visibility: { nearObjectEnabled: true, farObjectDisabled: true, brokenObjectDisabled: true, cullingOwnerPresent: true },
      telemetry: { sampleWindowMs: 1000, maxFrameSamples: 120, renderedFrames: 2, throttledFrames: 1 },
      profiler: { deviceBenchmark: false, adaptiveTiering: false, playerRuntimeMutation: false, networkPersistence: false },
      owners: { capability: true, staticBudgets: true, visibilityCulling: true, telemetry: true, profiler: true, lodPolicyConfigured: true, adaptiveTierController: false, lodRuntime: false, hysteresis: false, pooling: false, sleepWake: false },
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
    });
    expect(result.blockers).toEqual([
      "adaptive-tier-controller-owner-missing",
      "lod-runtime-owner-missing",
      "hysteresis-owner-missing",
      "pooling-owner-missing",
      "sleep-wake-owner-missing",
    ]);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues.filter(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toHaveLength(5);
  });

  it("keeps capability advice observational and changes the bounded profile when capability input is weak", () => {
    const result = buildAdaptivePerformanceDependencyGraph({
      tier: "high",
      capability: { webgl: false, webgl2: false, webgpu: false, hardwareConcurrency: 2, deviceMemoryGb: 1 },
      requestedViewDistanceBlocks: 50,
      requestedTargetFps: 120,
      sampleWindowMs: 500,
      maxFrameSamples: 8,
    });

    expect(result.summary.selectedTier).toBe("high");
    expect(result.summary.selectedBudget.maxViewDistanceBlocks).toBe(50);
    expect(result.summary.selectedBudget.maxTargetFps).toBe(120);
    expect(result.summary.capability.recommendedTier).toBe("low");
    expect(result.summary.capability.adaptiveTiering).toBe(false);
    expect(result.summary.telemetry).toMatchObject({ sampleWindowMs: 500, maxFrameSamples: 8 });
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("fails closed rather than claiming LOD, hysteresis, pooling, or sleep-wake runtime behavior", () => {
    const result = buildAdaptivePerformanceDependencyGraph({ tier: "low", requestedViewDistanceBlocks: 5, requestedTargetFps: 30 });

    expect(result.summary.selectedBudget.lodPolicy).toBe("aggressive");
    expect(result.summary.owners.lodPolicyConfigured).toBe(true);
    expect(result.summary.owners.lodRuntime).toBe(false);
    expect(result.summary.owners.hysteresis).toBe(false);
    expect(result.summary.owners.pooling).toBe(false);
    expect(result.summary.owners.sleepWake).toBe(false);
    expect(result.summary.profiler).toMatchObject({ deviceBenchmark: false, adaptiveTiering: false, playerRuntimeMutation: false, networkPersistence: false });
    expect(result.graph.issues.map(issue => issue.dependencyKey).filter(Boolean)).toEqual(expect.arrayContaining([
      "owner:performance:adaptive-controller",
      "owner:performance:lod-runtime",
      "owner:performance:hysteresis",
      "owner:performance:pooling",
      "owner:performance:sleep-wake",
    ]));
  });

  it("is deterministic and changes the audit node hash when bounded inputs change", () => {
    const input = { ...getDefaultAdaptivePerformanceDependencyGraphInput(), rulesVersion: ADAPTIVE_PERFORMANCE_GRAPH_RULES_VERSION };
    const first = buildAdaptivePerformanceDependencyGraph(input);
    const second = buildAdaptivePerformanceDependencyGraph(input);
    const changed = buildAdaptivePerformanceDependencyGraph({ ...input, maxFrameSamples: 32 });
    const node = (result: typeof first) => result.nodes.find(candidate => candidate.generatorId === "runtime.performance.adaptive-audit");

    expect(first).toEqual(second);
    expect(node(first)?.contentHash).not.toBe(node(changed)?.contentHash);
  });

  it("rejects unbounded telemetry inputs and unsupported rules", () => {
    expect(() => buildAdaptivePerformanceDependencyGraph({ sampleWindowMs: 0 })).toThrow(/sampleWindowMs/);
    expect(() => buildAdaptivePerformanceDependencyGraph({ sampleWindowMs: ADAPTIVE_PERFORMANCE_MAX_SAMPLE_WINDOW_MS + 1 })).toThrow(/sampleWindowMs/);
    expect(() => buildAdaptivePerformanceDependencyGraph({ maxFrameSamples: ADAPTIVE_PERFORMANCE_MAX_FRAME_SAMPLES + 1 })).toThrow(/maxFrameSamples/);
    expect(() => buildAdaptivePerformanceDependencyGraph({ rulesVersion: "future-rules" })).toThrow(/Unsupported/);
  });
});
