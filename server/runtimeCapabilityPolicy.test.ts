import { describe, expect, it } from "vitest";
import { buildRuntimeCapabilityPolicy } from "./generators/runtimeCapabilityPolicy";

describe("runtime capability policy", () => {
  it("falls back safely with no capability signals and preserves the requested tier", () => {
    const result = buildRuntimeCapabilityPolicy({ requestedTier: "high" });

    expect(result.requestedTier).toBe("high");
    expect(result.persistedTier).toBe("high");
    expect(result.appliedTier).toBe("high");
    expect(result.appliedBudget.maxTargetFps).toBe(120);
    expect(result.signals).toMatchObject({
      webglVersion: null,
      deviceMemoryGb: null,
      hardwareConcurrency: null,
      maxTextureSize: null,
      prefersReducedMotion: null,
      completeness: "none",
      webgl2Supported: null,
    });
    expect(result.recommendation).toMatchObject({
      tier: "balanced",
      reasonCodes: ["unknown-capability-fallback"],
      manualReviewRequired: true,
      appliedAutomatically: false,
    });
  });

  it("recommends low for constrained signals without mutating a persisted high tier", () => {
    const result = buildRuntimeCapabilityPolicy({
      requestedTier: "high",
      persistedTier: "high",
      signals: {
        webglVersion: 1,
        deviceMemoryGb: 2,
        hardwareConcurrency: 2,
        maxTextureSize: 1024,
        prefersReducedMotion: true,
      },
    });

    expect(result.signals).toMatchObject({ completeness: "complete", webgl2Supported: false });
    expect(result.recommendation.tier).toBe("low");
    expect(result.recommendation.reasonCodes).toEqual([
      "prefers-reduced-motion",
      "webgl1-safe-fallback",
      "low-device-memory",
      "low-hardware-concurrency",
      "low-texture-capability",
    ]);
    expect(result.appliedTier).toBe("high");
    expect(result.appliedBudget.maxViewDistanceBlocks).toBe(50);
  });

  it("recommends high only for complete high-capacity signals and keeps the budget source canonical", () => {
    const result = buildRuntimeCapabilityPolicy({
      requestedTier: "balanced",
      persistedTier: "balanced",
      signals: { webglVersion: 2, deviceMemoryGb: 8, hardwareConcurrency: 8, maxTextureSize: 4096 },
    });

    expect(result.recommendation).toMatchObject({ tier: "high", reasonCodes: ["webgl2-high-capacity-signals"] });
    expect(result.appliedTier).toBe("balanced");
    expect(result.appliedBudget).toMatchObject({ maxViewDistanceBlocks: 35, maxTargetFps: 60, lodPolicy: "balanced" });
  });

  it("normalizes malformed signals, remains deterministic, and exposes non-claims", () => {
    const input = {
      requestedTier: "unknown",
      persistedTier: "invalid",
      signals: {
        webglVersion: 3,
        deviceMemoryGb: -1,
        hardwareConcurrency: Number.NaN,
        maxTextureSize: 999999,
        prefersReducedMotion: "yes",
      },
    };
    const first = buildRuntimeCapabilityPolicy(input);
    const second = buildRuntimeCapabilityPolicy(input);

    expect(first).toEqual(second);
    expect(first.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.signals).toMatchObject({
      webglVersion: null,
      deviceMemoryGb: null,
      hardwareConcurrency: null,
      maxTextureSize: null,
      prefersReducedMotion: null,
      completeness: "none",
    });
    expect(first.summary).toMatchObject({
      bounded: true,
      deterministic: true,
      advancedCapabilityCount: 0,
      missingEvidenceCount: 6,
      runtimeMutation: false,
      playerVisible: false,
      cacheWrite: false,
    });
    expect(first.claims).toEqual({
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
    });
    expect(first.blockers.map(blocker => blocker.id)).toEqual([
      "webgl-device-detection",
      "adaptive-tier-controller",
      "tier-hysteresis",
      "frustum-occlusion-culling",
      "object-pooling",
      "real-device-benchmark",
    ]);
  });
});
