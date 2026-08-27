import { describe, expect, it } from "vitest";
import { validateLoadTelemetry } from "./loadTelemetryContract";
import type { RuntimePerformanceTelemetrySnapshot } from "../client/src/game/systems/runtimePerformanceTelemetry";

const validSnapshot: RuntimePerformanceTelemetrySnapshot = {
  tier: "balanced",
  effectiveTargetFps: 60,
  sampleWindowMs: 1_000,
  renderedFrames: 56,
  throttledFrames: 4,
  averageFrameMs: 16.5,
  p95FrameMs: 18.2,
  worstFrameMs: 24.1,
  totalMeshes: 500,
  activeMeshes: 120,
};

describe("load telemetry contract", () => {
  it("accepts a bounded snapshot and derives frame budget and active mesh ratio", () => {
    const result = validateLoadTelemetry(validSnapshot);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.frameBudgetMs).toBe(16.67);
    expect(result.activeMeshRatio).toBe(0.24);
  });

  it("accepts null frame metrics when the sampler has no intervals", () => {
    const result = validateLoadTelemetry({ ...validSnapshot, renderedFrames: 1, averageFrameMs: null, p95FrameMs: null, worstFrameMs: null });

    expect(result.valid).toBe(true);
    expect(result.frameBudgetMs).toBe(16.67);
  });

  it("rejects invalid target, counts, metrics, mesh bounds and sample window", () => {
    const result = validateLoadTelemetry({
      ...validSnapshot,
      effectiveTargetFps: 1,
      sampleWindowMs: 60_001,
      renderedFrames: -1,
      p95FrameMs: 30,
      worstFrameMs: 20,
      totalMeshes: 2,
      activeMeshes: 3,
    });
    const codes = result.issues.map(issue => issue.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain("INVALID_TARGET_FPS");
    expect(codes).toContain("INVALID_SAMPLE_WINDOW");
    expect(codes).toContain("INVALID_FRAME_COUNTS");
    expect(codes).toContain("INVALID_FRAME_METRICS");
    expect(codes).toContain("INVALID_MESH_COUNTS");
  });
});
