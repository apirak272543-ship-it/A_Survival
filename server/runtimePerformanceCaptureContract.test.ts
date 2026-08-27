import { describe, expect, it } from "vitest";
import { buildRuntimePerformanceCaptureExport } from "./generators/runtimePerformanceCaptureContract";

const balancedSnapshot = {
  tier: "balanced" as const,
  effectiveTargetFps: 60,
  viewDistanceBlocks: 35,
  sampleWindowMs: 1_000,
  renderedFrames: 58,
  throttledFrames: 2,
  averageFrameMs: 17.2,
  p95FrameMs: 19.4,
  worstFrameMs: 22.1,
  totalMeshes: 1_000,
  activeMeshes: 620,
};

describe("runtime performance capture export contract", () => {
  it("normalizes a telemetry snapshot and reuses the existing profiler preview", () => {
    const result = buildRuntimePerformanceCaptureExport({ snapshot: balancedSnapshot, captureId: "balanced-window-001", source: "qa-runtime-snapshot" });

    expect(result).toMatchObject({
      exportSchemaVersion: "a-survival.runtime-performance-capture.v1",
      exportVersion: "1.0.0",
      exportOnly: true,
      captureId: "balanced-window-001",
      generatorId: "runtime.performance.capture",
      generatorVersion: "1.0.0",
      manifest: {
        captureKind: "runtime-performance-snapshot",
        profilerVersion: "0.1.0",
        files: [],
      },
      summary: {
        tier: "balanced",
        effectiveTargetFps: 60,
        viewDistanceBlocks: 35,
        renderedFrames: 58,
        throttledFrames: 2,
        observedFps: 58,
        status: "watch",
        recommendationCodes: ["THROTTLED_CALLBACKS", "OBSERVATION_ONLY"],
        normalizationIssueCount: 0,
      },
      provenance: {
        source: "qa-runtime-snapshot",
        sampler: "client-runtime-performance-telemetry",
        analyzer: "server-runtime-performance-profiler",
        usage: "developer-registry-only; not automatically imported by playable runtime",
      },
      runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
      assets: [],
      publishReady: false,
    });
    expect(result.profiler.previewOnly).toBe(true);
    expect(result.profiler.claims).toEqual({ deviceBenchmark: false, adaptiveTiering: false, playerRuntimeMutation: false, networkPersistence: false });
  });

  it("does not fabricate FPS when the caller provides no render sample", () => {
    const result = buildRuntimePerformanceCaptureExport({ snapshot: { ...balancedSnapshot, sampleWindowMs: 0, renderedFrames: 0, averageFrameMs: null, p95FrameMs: null, worstFrameMs: null }, captureId: "empty-window-001" });

    expect(result.summary).toMatchObject({ observedFps: null, status: "no-sample", recommendationCodes: ["NO_RENDER_SAMPLE", "THROTTLED_CALLBACKS", "OBSERVATION_ONLY"] });
    expect(result.profiler.previewOnly).toBe(true);
    expect(result.claims.deviceBenchmark).toBe(false);
  });

  it("keeps export metadata deterministic for the same snapshot and capture id", () => {
    const first = buildRuntimePerformanceCaptureExport({ snapshot: balancedSnapshot, captureId: "balanced-window-001", source: "qa-runtime-snapshot" });
    const second = buildRuntimePerformanceCaptureExport({ snapshot: balancedSnapshot, captureId: "balanced-window-001", source: "qa-runtime-snapshot" });
    const changed = buildRuntimePerformanceCaptureExport({ snapshot: { ...balancedSnapshot, activeMeshes: 700 }, captureId: "balanced-window-001", source: "qa-runtime-snapshot" });

    expect(first).toEqual(second);
    expect(first.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifactKey).toBe(`profiler:balanced-window-001:${first.contentSha256}`);
    expect(changed.contentSha256).not.toBe(first.contentSha256);
    expect(changed.manifest.snapshotHash).not.toBe(first.manifest.snapshotHash);
  });

  it("bounds malformed snapshots, clamps active meshes, and records normalization issues", () => {
    const result = buildRuntimePerformanceCaptureExport({
      snapshot: {
        tier: "unsupported",
        effectiveTargetFps: 999,
        viewDistanceBlocks: -4,
        sampleWindowMs: Number.NaN,
        renderedFrames: 100_009,
        throttledFrames: -4,
        averageFrameMs: Number.POSITIVE_INFINITY,
        p95FrameMs: -1,
        worstFrameMs: "bad",
        totalMeshes: 3,
        activeMeshes: 8,
      },
      captureId: "BAD ID",
      source: "unknown",
    });

    expect(result.captureId).toBe("runtime-snapshot");
    expect(result.provenance.source).toBe("qa-runtime-snapshot");
    expect(result.snapshot).toEqual({
      tier: "balanced",
      effectiveTargetFps: 240,
      viewDistanceBlocks: 0,
      sampleWindowMs: 0,
      renderedFrames: 100_000,
      throttledFrames: 0,
      averageFrameMs: 0,
      p95FrameMs: 0,
      worstFrameMs: 0,
      totalMeshes: 3,
      activeMeshes: 3,
    });
    expect(result.summary.normalizationIssueCount).toBe(9);
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      "CAPTURE_ID_NORMALIZED",
      "SOURCE_NORMALIZED",
      "TIER_NORMALIZED",
      "FPS_NORMALIZED",
      "VIEW_DISTANCE_NORMALIZED",
      "SAMPLE_WINDOW_NORMALIZED",
      "FRAME_COUNT_NORMALIZED",
      "FRAME_METRIC_NORMALIZED",
      "ACTIVE_MESH_CLAMPED",
    ]));
  });

  it("keeps the checkpoint read-only and records all advanced evidence blockers", () => {
    const result = buildRuntimePerformanceCaptureExport({ snapshot: balancedSnapshot });

    expect(result.blockers.map(blocker => blocker.id)).toEqual([
      "controlled-capture-export",
      "registry-cache-write",
      "durable-profiler-history",
      "real-device-benchmark",
    ]);
    expect(result.claims).toEqual({
      generatorCallInRenderLoop: false,
      assetGeneration: false,
      registryWrite: false,
      cacheWrite: false,
      runtimeImport: false,
      playerVisible: false,
      adaptiveTiering: false,
      deviceBenchmark: false,
    });
  });
});
