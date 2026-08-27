import { describe, expect, it } from "vitest";
import { createRuntimePerformanceSampler } from "../client/src/game/systems/runtimePerformanceTelemetry";

describe("runtime performance telemetry sampler", () => {
  it("summarizes rendered and throttled callbacks with finite cadence metrics", () => {
    const sampler = createRuntimePerformanceSampler({ tier: "low", effectiveTargetFps: 30, sampleWindowMs: 1000, maxFrameSamples: 120 });
    sampler.recordCallback(0, true);
    sampler.recordCallback(16.666, true);
    sampler.recordCallback(33.333, false);
    sampler.recordCallback(50, true);

    expect(sampler.shouldFlush(999)).toBe(false);
    sampler.recordCallback(1000, false);
    expect(sampler.shouldFlush(1000)).toBe(true);
    expect(sampler.flush(1000, { totalMeshes: 12.8, activeMeshes: 7.9 })).toEqual({
      tier: "low",
      effectiveTargetFps: 30,
      sampleWindowMs: 1000,
      renderedFrames: 3,
      throttledFrames: 2,
      averageFrameMs: 25,
      p95FrameMs: 33.33,
      worstFrameMs: 33.33,
      totalMeshes: 12,
      activeMeshes: 7,
    });
  });

  it("keeps the frame interval buffer bounded and resets after flush", () => {
    const sampler = createRuntimePerformanceSampler({ tier: "balanced", effectiveTargetFps: 60, sampleWindowMs: 100, maxFrameSamples: 2 });
    sampler.recordCallback(0, true);
    sampler.recordCallback(10, true);
    sampler.recordCallback(20, true);
    sampler.recordCallback(30, true);
    const snapshot = sampler.flush(100);

    expect(snapshot?.averageFrameMs).toBe(10);
    expect(snapshot?.p95FrameMs).toBe(10);
    expect(snapshot?.renderedFrames).toBe(4);
    expect(sampler.flush(200)).toBeNull();
  });

  it("returns null cadence metrics when no rendered frame exists", () => {
    const sampler = createRuntimePerformanceSampler({ tier: "high", effectiveTargetFps: 120, sampleWindowMs: 20 });
    sampler.recordCallback(0, false);
    sampler.recordCallback(20, false);

    expect(sampler.flush(20)).toMatchObject({
      tier: "high",
      effectiveTargetFps: 120,
      renderedFrames: 0,
      throttledFrames: 2,
      averageFrameMs: null,
      p95FrameMs: null,
      worstFrameMs: null,
    });
  });

  it("uses the latest budget for the next snapshot without leaking prior samples", () => {
    const sampler = createRuntimePerformanceSampler({ tier: "low", effectiveTargetFps: 30, sampleWindowMs: 10 });
    sampler.recordCallback(0, true);
    sampler.recordCallback(10, true);
    sampler.setBudget({ tier: "high", effectiveTargetFps: 120 });

    expect(sampler.flush(10)).toMatchObject({ tier: "high", effectiveTargetFps: 120, renderedFrames: 2 });
    expect(sampler.flush(20)).toBeNull();
  });

  it("normalizes invalid scene counts and timestamps without producing NaN", () => {
    const sampler = createRuntimePerformanceSampler({ tier: "balanced", effectiveTargetFps: 60, sampleWindowMs: 10 });
    sampler.recordCallback(Number.NaN, true);
    sampler.recordCallback(Number.POSITIVE_INFINITY, true);

    const snapshot = sampler.flush(Number.POSITIVE_INFINITY, { totalMeshes: Number.NaN, activeMeshes: -3 });
    expect(snapshot).toMatchObject({ sampleWindowMs: 0, totalMeshes: 0, activeMeshes: 0 });
    for (const value of [snapshot?.sampleWindowMs, snapshot?.averageFrameMs, snapshot?.p95FrameMs, snapshot?.worstFrameMs]) {
      if (value !== null && value !== undefined) expect(Number.isFinite(value)).toBe(true);
    }
  });
});
