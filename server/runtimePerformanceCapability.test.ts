import { describe, expect, it } from "vitest";
import { advisePerformanceTier, normalizeRuntimeCapabilitySnapshot } from "../client/src/game/systems/runtimePerformanceCapability";

describe("runtime performance capability contract", () => {
  it("normalizes capability values into a bounded snapshot", () => {
    const snapshot = normalizeRuntimeCapabilitySnapshot({
      webgl: true,
      webgl2: 1,
      webgpu: true,
      hardwareConcurrency: 999,
      deviceMemoryGb: 2.75,
      storageQuotaGb: 12.4,
      maxTouchPoints: 5.9,
      viewportWidth: 430.8,
      viewportHeight: Number.POSITIVE_INFINITY,
    });

    expect(snapshot).toEqual({
      schemaVersion: "a-survival.runtime-capability.v1",
      webgl: true,
      webgl2: false,
      webgpu: true,
      hardwareConcurrency: 128,
      deviceMemoryGb: 2.75,
      storageQuotaGb: 12.4,
      maxTouchPoints: 5,
      viewportWidth: 430,
      viewportHeight: null,
    });
  });

  it("normalizes unknown or unsafe values conservatively", () => {
    const snapshot = normalizeRuntimeCapabilitySnapshot({
      webgl: "yes",
      webgl2: true,
      webgpu: false,
      hardwareConcurrency: 0,
      deviceMemoryGb: 0,
      storageQuotaGb: -1,
      maxTouchPoints: -3,
      viewportWidth: 0,
      viewportHeight: "768",
    });

    expect(snapshot.webgl).toBe(false);
    expect(snapshot.webgl2).toBe(true);
    expect(snapshot.hardwareConcurrency).toBe(null);
    expect(snapshot.deviceMemoryGb).toBe(null);
    expect(snapshot.storageQuotaGb).toBe(null);
    expect(snapshot.maxTouchPoints).toBe(0);
    expect(snapshot.viewportWidth).toBe(null);
    expect(snapshot.viewportHeight).toBe(null);
  });

  it("fails closed to low when WebGL is unavailable", () => {
    const advice = advisePerformanceTier({ webgl: false, webgl2: false, webgpu: false });
    expect(advice.recommendedTier).toBe("low");
    expect(advice.reasons.map(reason => reason.code)).toEqual(["WEBGL_MISSING"]);
    expect(advice.confidence).toBe("conservative");
  });

  it("fails closed to low when WebGL2 is unavailable", () => {
    const advice = advisePerformanceTier({ webgl: true, webgl2: false, webgpu: true });
    expect(advice.recommendedTier).toBe("low");
    expect(advice.reasons.map(reason => reason.code)).toEqual(["WEBGL2_MISSING"]);
  });

  it("uses low tier advice for low CPU or memory signals", () => {
    const advice = advisePerformanceTier({ webgl: true, webgl2: true, hardwareConcurrency: 2, deviceMemoryGb: 1 });
    expect(advice.recommendedTier).toBe("low");
    expect(advice.reasons.map(reason => reason.code)).toEqual(["LOW_CPU", "LOW_MEMORY"]);
  });

  it("uses high tier advice only for an explicit high-capability heuristic", () => {
    const advice = advisePerformanceTier({ webgl: true, webgl2: true, webgpu: true, hardwareConcurrency: 8, deviceMemoryGb: 8 });
    expect(advice.recommendedTier).toBe("high");
    expect(advice.confidence).toBe("heuristic");
    expect(advice.reasons.map(reason => reason.code)).toEqual(["HIGH_CAPABILITY"]);
  });

  it("keeps baseline capability advice balanced and explicit about non-claims", () => {
    const advice = advisePerformanceTier({ webgl: true, webgl2: true, webgpu: false, hardwareConcurrency: 4, deviceMemoryGb: 2 });
    expect(advice.recommendedTier).toBe("balanced");
    expect(advice.confidence).toBe("conservative");
    expect(advice.reasons.map(reason => reason.code)).toEqual(["BASELINE"]);
    expect(advice.claims).toEqual({
      oneTimeProbe: true,
      deviceBenchmark: false,
      adaptiveTiering: false,
      autoApplied: false,
      renderLoopCoupled: false,
      networkPersistence: false,
    });
  });

  it("accepts an already-normalized snapshot without changing it", () => {
    const snapshot = normalizeRuntimeCapabilitySnapshot({ webgl: true, webgl2: true, webgpu: false, hardwareConcurrency: 6, deviceMemoryGb: 4, maxTouchPoints: 2 });
    const advice = advisePerformanceTier(snapshot);
    expect(advice.snapshot).toEqual(snapshot);
    expect(advice.claims.renderLoopCoupled).toBe(false);
  });
});
