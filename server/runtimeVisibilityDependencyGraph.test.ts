import { describe, expect, it } from "vitest";
import { buildRuntimeVisibilityDependencyGraph } from "./generators/runtimeVisibilityDependencyGraph";

describe("runtime visibility dependency graph", () => {
  it("connects the canonical Obsidian runtime budget, stream, object, and telemetry nodes", () => {
    const report = buildRuntimeVisibilityDependencyGraph({
      mapId: "obsidian-frontier",
      performanceTier: "balanced",
      requestedViewDistanceBlocks: 35,
      requestedTargetFps: 60,
      positionX: 0,
      positionZ: 0,
      safetyPaddingBlocks: 2,
      chunkWorldSize: 16,
      mapRadiusMeters: 500,
    });

    expect(report).toMatchObject({
      artifact: {
        mapId: "obsidian-frontier",
        requestedMapId: "obsidian-frontier",
        performanceTier: "balanced",
        viewDistanceBlocks: 35,
        targetFps: 60,
      },
      summary: {
        mapId: "obsidian-frontier",
        performanceTier: "balanced",
        viewDistanceBlocks: 35,
        targetFps: 60,
        visibleRadiusMeters: 35,
        prefetchRadiusMeters: 47,
        safetyPaddingBlocks: 2,
        mapChunkRadius: 32,
        objectVisibility: {
          inRangeEnabled: true,
          paddedRangeEnabled: true,
          outOfRangeEnabled: false,
          brokenObjectEnabled: false,
        },
        telemetryPreview: { status: "no-sample", observedFps: null, activeMeshRatio: null, previewOnly: true },
        runtimeImportAllowed: false,
        playerVisible: false,
        cacheable: false,
      },
      issues: [],
      claims: {
        staticPolicyProjected: true,
        runtimeRenderApplied: false,
        adaptiveTiering: false,
        deviceBenchmark: false,
        playerRuntimeMutation: false,
        networkPersistence: false,
        visualAcceptance: false,
      },
    });
    expect(report.nodes).toHaveLength(4);
    expect(report.graph.valid).toBe(true);
    expect(report.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(report.graph.topologicalOrder).toHaveLength(4);
    expect(report.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("clamps tier budgets before deriving the visible and prefetch windows", () => {
    const report = buildRuntimeVisibilityDependencyGraph({ performanceTier: "low", requestedViewDistanceBlocks: 50, requestedTargetFps: 120 });

    expect(report.summary).toMatchObject({ performanceTier: "low", viewDistanceBlocks: 15, targetFps: 30, visibleRadiusMeters: 15, prefetchRadiusMeters: 20 });
    expect(report.summary.visibleChunkCount).toBeGreaterThan(0);
    expect(report.summary.visibleChunkCount).toBeLessThanOrEqual((2 * Math.ceil(15 / 16) + 1) ** 2);
  });

  it("projects provided telemetry as observation-only profiler output", () => {
    const report = buildRuntimeVisibilityDependencyGraph({
      telemetry: {
        sampleWindowMs: 1_000,
        renderedFrames: 30,
        throttledFrames: 2,
        averageFrameMs: 40,
        p95FrameMs: 45,
        worstFrameMs: 50,
        totalMeshes: 100,
        activeMeshes: 95,
      },
    });

    expect(report.summary.telemetryPreview).toEqual({ status: "action", observedFps: 30, activeMeshRatio: 0.95, previewOnly: true });
    expect(report.claims).toMatchObject({ adaptiveTiering: false, deviceBenchmark: false, playerRuntimeMutation: false, networkPersistence: false });
  });

  it("remains deterministic for identical input and fails closed for a future map", () => {
    const input = { mapId: "obsidian-frontier", positionX: 12.5, positionZ: -7.25, safetyPaddingBlocks: 3 };
    const first = buildRuntimeVisibilityDependencyGraph(input);
    const second = buildRuntimeVisibilityDependencyGraph(input);
    expect(first).toEqual(second);

    const futureMap = buildRuntimeVisibilityDependencyGraph({ mapId: "desert-expanse" });
    expect(futureMap).toMatchObject({
      artifact: { mapId: "obsidian-frontier", requestedMapId: "desert-expanse" },
      summary: { mapId: "obsidian-frontier", requestedMapId: "desert-expanse" },
      issues: [{ code: "MAP_NOT_PLAYABLE" }],
      claims: { runtimeRenderApplied: false, playerRuntimeMutation: false, visualAcceptance: false },
    });
    expect(futureMap.graph.valid).toBe(true);
  });

  it("bounds malformed numeric inputs and unsupported rules without throwing", () => {
    const report = buildRuntimeVisibilityDependencyGraph({
      rulesVersion: "future-rules",
      performanceTier: "unknown",
      requestedViewDistanceBlocks: Number.POSITIVE_INFINITY,
      requestedTargetFps: Number.NaN,
      positionX: 999_999,
      positionZ: -999_999,
      safetyPaddingBlocks: 999,
      chunkWorldSize: 0,
      mapRadiusMeters: -10,
    });

    expect(report.issues).toEqual([{ code: "RULES_VERSION_UNSUPPORTED", detail: "Unsupported runtime visibility graph rules version: future-rules" }]);
    expect(report.summary).toMatchObject({ positionX: 500, positionZ: -500, mapRadiusMeters: 1, chunkWorldSize: 1, safetyPaddingBlocks: 16, performanceTier: "balanced", viewDistanceBlocks: 35, targetFps: 60 });
    expect(report.graph.valid).toBe(true);
    expect(report.claims.runtimeImportAllowed).toBeUndefined();
  });
});
