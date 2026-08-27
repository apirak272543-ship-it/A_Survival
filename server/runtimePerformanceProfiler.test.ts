import { describe, expect, it } from "vitest";
import { analyzeRuntimePerformanceSnapshot } from "./generators/runtimePerformanceProfiler";

describe("runtime performance profiler", () => {
  it("returns a bounded no-sample preview without inventing FPS", () => {
    const result = analyzeRuntimePerformanceSnapshot({
      tier: "low",
      effectiveTargetFps: 30,
      viewDistanceBlocks: 15,
      sampleWindowMs: 1000,
      renderedFrames: 0,
      throttledFrames: 4,
      averageFrameMs: null,
      p95FrameMs: null,
      worstFrameMs: null,
      totalMeshes: 120,
      activeMeshes: 40,
    });

    expect(result).toMatchObject({ previewOnly: true, status: "no-sample", observedFps: null, targetFrameMs: 33.33, activeMeshRatio: 0.33 });
    expect(result.claims).toEqual({ deviceBenchmark: false, adaptiveTiering: false, playerRuntimeMutation: false, networkPersistence: false });
    expect(result.recommendations.map(item => item.code)).toContain("NO_RENDER_SAMPLE");
  });

  it("flags frame cadence when p95 exceeds the effective tier budget", () => {
    const result = analyzeRuntimePerformanceSnapshot({
      tier: "balanced",
      effectiveTargetFps: 60,
      viewDistanceBlocks: 20,
      sampleWindowMs: 1000,
      renderedFrames: 7,
      throttledFrames: 0,
      averageFrameMs: 144.42,
      p95FrameMs: 152.6,
      worstFrameMs: 152.6,
      totalMeshes: 1342,
      activeMeshes: 418,
    });

    expect(result.observedFps).toBe(7);
    expect(result.status).toBe("action");
    expect(result.activeMeshRatio).toBe(0.31);
    expect(result.recommendations.map(item => item.code)).toContain("FRAME_CADENCE");
  });

  it("flags high active-mesh ratio and callback throttling", () => {
    const result = analyzeRuntimePerformanceSnapshot({
      tier: "high",
      effectiveTargetFps: 120,
      viewDistanceBlocks: 50,
      sampleWindowMs: 2000,
      renderedFrames: 160,
      throttledFrames: 12,
      averageFrameMs: 12.5,
      p95FrameMs: 16,
      worstFrameMs: 22,
      totalMeshes: 100,
      activeMeshes: 100,
    });

    expect(result.status).toBe("action");
    expect(result.activeMeshRatio).toBe(1);
    expect(result.recommendations.map(item => item.code)).toEqual(expect.arrayContaining(["ACTIVE_MESH_RATIO", "THROTTLED_CALLBACKS"]));
  });

  it("normalizes malformed numeric metrics without producing NaN or changing input", () => {
    const input = {
      tier: "balanced" as const,
      effectiveTargetFps: -1,
      viewDistanceBlocks: Number.NaN,
      sampleWindowMs: Number.POSITIVE_INFINITY,
      renderedFrames: -4,
      throttledFrames: -2,
      averageFrameMs: Number.NaN,
      p95FrameMs: null,
      worstFrameMs: -5,
      totalMeshes: 4,
      activeMeshes: 9,
    };
    const before = JSON.stringify(input);
    const result = analyzeRuntimePerformanceSnapshot(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(result.effectiveTargetFps).toBe(60);
    expect(result.viewDistanceBlocks).toBe(20);
    expect(result.observedFps).toBeNull();
    expect(result.activeMeshRatio).toBe(1);
    expect(result.recommendations.every(item => !Object.values(item).some(value => typeof value === "number" && !Number.isFinite(value)))).toBe(true);
  });
});
