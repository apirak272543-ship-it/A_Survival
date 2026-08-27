import { describe, expect, it } from "vitest";
import { buildRuntimePerformanceContract } from "./generators/runtimePerformanceContract";

const balancedSnapshot = {
  tier: "balanced" as const,
  effectiveTargetFps: 60,
  sampleWindowMs: 1000,
  renderedFrames: 58,
  throttledFrames: 2,
  averageFrameMs: 17.1,
  p95FrameMs: 20.4,
  worstFrameMs: 24.2,
  totalMeshes: 120,
  activeMeshes: 36,
};

describe("runtime performance contract", () => {
  it("uses one normalized budget across visibility, telemetry, throttling, simulation, and profiler preview", () => {
    const first = buildRuntimePerformanceContract({
      seed: "performance-contract",
      tier: "low",
      requestedViewDistanceBlocks: 50,
      requestedTargetFps: 120,
      telemetrySnapshot: { ...balancedSnapshot, tier: "low", effectiveTargetFps: 30 },
    });
    const second = buildRuntimePerformanceContract({
      seed: "performance-contract",
      tier: "low",
      requestedViewDistanceBlocks: 50,
      requestedTargetFps: 120,
      telemetrySnapshot: { ...balancedSnapshot, tier: "low", effectiveTargetFps: 30 },
    });

    expect(first.artifact).toEqual(second.artifact);
    expect(first.budget).toMatchObject({ tier: "low", viewDistanceBlocks: 15, targetFps: 30, maxViewDistanceBlocks: 15, maxTargetFps: 30, lodPolicy: "aggressive", shadowQuality: "off" });
    expect(first.simulation).toMatchObject({ mobSimulationRadiusMeters: 24, animationRadiusMeters: 24, physicsRadiusMeters: 16, maxParticleCount: 80, lodPolicy: "aggressive", shadowQuality: "off" });
    expect(first.visibility).toMatchObject({
      input: { positionX: 0, positionZ: 0, viewDistanceBlocks: 15, safetyPaddingBlocks: 0 },
      objectPolicy: { safetyPaddingBlocks: 0, brokenStateEnabled: false, malformedMetadata: "fail-open" },
      probe: { insideBudgetRadius: true, outsideBudgetRadius: false, brokenState: false, missingCoordinates: true },
    });
    expect(first.throttling).toEqual({ effectiveTargetFps: 30, targetFrameMs: 33.33, callbackPolicy: "render-when-interval-elapsed", telemetryFlushResetsWindow: true });
    expect(first.telemetry).toMatchObject({ provided: true, sourceTier: "low", sourceEffectiveTargetFps: 30, compatible: true });
    expect(first.profiler).toMatchObject({ previewOnly: true, input: { tier: "low", effectiveTargetFps: 30, viewDistanceBlocks: 15 }, output: { previewOnly: true, tier: "low" } });
    expect(first.profiler.output?.claims).toEqual({ deviceBenchmark: false, adaptiveTiering: false, playerRuntimeMutation: false, networkPersistence: false });
    expect(first.validation).toEqual({ valid: true, issues: [] });
    expect(first.claims).toEqual({ runtimeWrite: false, generatorCall: false, assetGeneration: false, cacheWrite: false, playerVisibleEffect: false, deviceBenchmark: false, adaptiveTierMutation: false });
  });

  it("keeps telemetry/profile incompatibilities as explicit bounded invariant blockers", () => {
    const result = buildRuntimePerformanceContract({
      seed: "contract-blockers",
      tier: "low",
      requestedViewDistanceBlocks: 15,
      requestedTargetFps: 30,
      telemetrySnapshot: {
        ...balancedSnapshot,
        tier: "high",
        effectiveTargetFps: 120,
        throttledFrames: -1,
        activeMeshes: 121,
      },
    });

    expect(result.validation.valid).toBe(false);
    expect(result.validation.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      "TELEMETRY_TIER_MISMATCH",
      "TELEMETRY_TARGET_FPS_MISMATCH",
      "TELEMETRY_TARGET_FPS_EXCEEDS_BUDGET",
      "TELEMETRY_NEGATIVE_METRIC",
      "TELEMETRY_ACTIVE_MESHES_EXCEED_TOTAL",
    ]));
    expect(result.telemetry.compatible).toBe(false);
    expect(result.telemetry.snapshot).toMatchObject({ tier: "high", effectiveTargetFps: 120, throttledFrames: 0, totalMeshes: 120, activeMeshes: 120 });
    expect(result.profiler.input).toMatchObject({ tier: "low", effectiveTargetFps: 30, viewDistanceBlocks: 15, activeMeshes: 120 });
    expect(result.profiler.output?.tier).toBe("low");
  });

  it("returns a read-only no-snapshot contract and changes hash when meaningful input changes", () => {
    const noSnapshot = buildRuntimePerformanceContract({ seed: "contract-empty", tier: "balanced" });
    const same = buildRuntimePerformanceContract({ seed: "contract-empty", tier: "balanced" });
    const high = buildRuntimePerformanceContract({ seed: "contract-high", tier: "high", requestedTargetFps: 120, telemetrySnapshot: { ...balancedSnapshot, tier: "high", effectiveTargetFps: 120 } });

    expect(noSnapshot).toEqual(same);
    expect(noSnapshot.telemetry).toEqual({ provided: false, sourceTier: null, sourceEffectiveTargetFps: null, compatible: true, snapshot: null });
    expect(noSnapshot.profiler).toEqual({ previewOnly: true, input: null, output: null });
    expect(noSnapshot.validation).toEqual({ valid: true, issues: [] });
    expect(noSnapshot.artifact.contentHash).not.toBe(high.artifact.contentHash);
    expect(noSnapshot.claims.runtimeWrite).toBe(false);
    expect(noSnapshot.claims.cacheWrite).toBe(false);
  });

  it("enforces the bounded seed and rules-version contract", () => {
    expect(() => buildRuntimePerformanceContract({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildRuntimePerformanceContract({ seed: "x".repeat(129) })).toThrow("seed must be 1–128 characters");
    expect(() => buildRuntimePerformanceContract({ seed: "bad", rulesVersion: "runtime-performance-contract-rules.v0" })).toThrow("Unsupported runtime performance contract rules version");
  });
});
