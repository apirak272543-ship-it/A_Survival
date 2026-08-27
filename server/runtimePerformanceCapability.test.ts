import { describe, expect, it } from "vitest";
import {
  buildRuntimePerformanceCapability,
  RUNTIME_PERFORMANCE_CAPABILITY_RULES_VERSION,
} from "./generators/runtimePerformanceCapability";

describe("runtime performance capability evidence", () => {
  it("reports the shared bounded runtime capabilities and explicit advanced blockers", () => {
    const result = buildRuntimePerformanceCapability({
      seed: "capability-low",
      tier: "low",
      requestedViewDistanceBlocks: 50,
      requestedTargetFps: 120,
    });

    expect(result.budget).toMatchObject({ tier: "low", viewDistanceBlocks: 15, targetFps: 30, maxViewDistanceBlocks: 15, maxTargetFps: 30 });
    expect(result.visibility).toMatchObject({
      viewDistanceBlocks: 15,
      chunkWorldSize: 16,
      mapRadiusMeters: 500,
      visibleChunkCount: 9,
      insideBudgetObjectEnabled: true,
      outsideBudgetObjectEnabled: false,
      brokenObjectEnabled: false,
      malformedMetadataEnabled: true,
    });
    expect(result.telemetry).toEqual({
      sampleWindowMs: 1000,
      maxFrameSamples: 120,
      storesOnlyCurrentWindow: true,
      meshCountsSampledOnFlush: true,
      networkUpload: false,
    });
    expect(result.profiler).toEqual({
      version: "0.1.0",
      previewOnly: true,
      deviceBenchmark: false,
      adaptiveTierMutation: false,
      persistentHistory: false,
    });
    expect(result.summary).toEqual({
      verifiedCapabilityCount: 8,
      requiredBlockerCount: 9,
      bounded: true,
      deterministic: true,
      deviceBenchmark: false,
      mobileAcceptance: false,
    });
    expect(result.capabilities.every(capability => capability.status === "verified")).toBe(true);
    expect(result.blockers.map(blocker => blocker.id)).toEqual([
      "device-capability-detection",
      "real-device-benchmark",
      "adaptive-tiering",
      "hysteresis-controller",
      "frustum-culling",
      "occlusion-culling",
      "object-pooling",
      "full-lod-controller",
      "persistent-profiler-history",
    ]);
    expect(result.claims).toEqual({
      runtimeWrite: false,
      generatorCall: false,
      assetGeneration: false,
      cacheWrite: false,
      playerVisibleEffect: false,
      deviceBenchmark: false,
      adaptiveTierMutation: false,
    });
  });

  it("is deterministic for identical input and hashes meaningful profile changes", () => {
    const first = buildRuntimePerformanceCapability({ seed: "same", tier: "balanced", requestedViewDistanceBlocks: 20, requestedTargetFps: 60 });
    const second = buildRuntimePerformanceCapability({ seed: "same", tier: "balanced", requestedViewDistanceBlocks: 20, requestedTargetFps: 60 });
    const high = buildRuntimePerformanceCapability({ seed: "same", tier: "high", requestedViewDistanceBlocks: 50, requestedTargetFps: 120 });
    const differentSeed = buildRuntimePerformanceCapability({ seed: "different", tier: "balanced", requestedViewDistanceBlocks: 20, requestedTargetFps: 60 });

    expect(first).toEqual(second);
    expect(high.artifact.contentHash).not.toBe(first.artifact.contentHash);
    expect(differentSeed.artifact.contentHash).not.toBe(first.artifact.contentHash);
    expect(first.artifact.rulesVersion).toBe(RUNTIME_PERFORMANCE_CAPABILITY_RULES_VERSION);
  });

  it("keeps the report read-only and bounded even when requested values are malformed", () => {
    const result = buildRuntimePerformanceCapability({ seed: "malformed", tier: "unknown", requestedViewDistanceBlocks: "bad", requestedTargetFps: Number.NaN });

    expect(result.budget).toMatchObject({ tier: "balanced", viewDistanceBlocks: 35, targetFps: 60 });
    expect(result.visibility.visibleChunkCount).toBe(49);
    expect(result.telemetry.sampleWindowMs).toBeGreaterThan(0);
    expect(result.telemetry.maxFrameSamples).toBeGreaterThan(0);
    expect(result.summary.bounded).toBe(true);
    expect(result.claims.runtimeWrite).toBe(false);
    expect(result.claims.cacheWrite).toBe(false);
  });

  it("rejects invalid seeds and unsupported rules versions", () => {
    expect(() => buildRuntimePerformanceCapability({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildRuntimePerformanceCapability({ seed: "x".repeat(129) })).toThrow("seed must be 1–128 characters");
    expect(() => buildRuntimePerformanceCapability({ seed: "bad", rulesVersion: "runtime-performance-capability-rules.v0" })).toThrow("Unsupported runtime performance capability rules version");
  });
});
