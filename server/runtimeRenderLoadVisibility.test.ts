import { describe, expect, it } from "vitest";
import {
  buildRuntimeRenderLoadVisibility,
  RUNTIME_RENDER_LOAD_VISIBILITY_RULES_VERSION,
} from "./generators/runtimeRenderLoadVisibility";

describe("runtime render/load visibility contract", () => {
  it("binds low-tier render, prefetch, streaming, and simulation budgets", () => {
    const result = buildRuntimeRenderLoadVisibility({
      seed: "m02-low",
      tier: "low",
      requestedViewDistanceBlocks: 50,
      requestedTargetFps: 120,
      playerPosition: { x: 0, z: 0 },
    });

    expect(result.budget).toMatchObject({ tier: "low", viewDistanceBlocks: 15, targetFps: 30 });
    expect(result.renderDistance).toMatchObject({
      visibleRadiusMeters: 15,
      prefetchRadiusMeters: 20,
      label: "15 blocks",
      preset: "near",
      mapRadiusMeters: 500,
    });
    expect(result.streaming).toMatchObject({
      playerPosition: { x: 0, z: 0 },
      chunkWorldSizeMeters: 16,
      visibleChunkCount: 9,
      prefetchChunkCount: 25,
      mapBoundaryChunkCount: 4225,
      visibleWithinPrefetch: true,
      clippedToMapBoundary: true,
    });
    expect(result.runtimeGates).toMatchObject({
      terrainVisibilityRefreshOnViewChange: true,
      plantAnimationRadiusMeters: 24,
      enemySleepWakeRadiusMeters: 24,
      physicsRadiusMeters: 16,
      objectPolicy: "euclidean-distance-with-broken-disable-and-malformed-fail-open",
    });
    expect(result.visibilityProbe).toEqual({
      insideBudgetEnabled: true,
      outsideBudgetEnabled: false,
      brokenObjectEnabled: false,
      malformedMetadataEnabled: true,
    });
  });

  it("proves safety padding and clips player positions to the map envelope", () => {
    const result = buildRuntimeRenderLoadVisibility({
      seed: "m02-padding",
      tier: "balanced",
      playerPosition: { x: 900, z: -900 },
      safetyPaddingBlocks: 4,
    });

    expect(result.streaming.playerPosition).toEqual({ x: 500, z: -500 });
    expect(result.visibilityProbe).toEqual({
      insideBudgetEnabled: true,
      outsideBudgetEnabled: true,
      brokenObjectEnabled: false,
      malformedMetadataEnabled: true,
    });
    expect(result.streaming.visibleChunkCount).toBeLessThanOrEqual(result.streaming.prefetchChunkCount);
    expect(result.streaming.prefetchChunkCount).toBeLessThanOrEqual(result.streaming.mapBoundaryChunkCount);
  });

  it("is deterministic and changes its hash when the profile or player position changes", () => {
    const input = {
      seed: "m02-deterministic",
      tier: "high",
      requestedViewDistanceBlocks: 45,
      requestedTargetFps: 120,
      playerPosition: { x: 32, z: -48 },
    } as const;
    const first = buildRuntimeRenderLoadVisibility(input);
    const second = buildRuntimeRenderLoadVisibility(input);
    const differentPosition = buildRuntimeRenderLoadVisibility({ ...input, playerPosition: { x: 48, z: -48 } });

    expect(first).toEqual(second);
    expect(differentPosition.artifact.contentHash).not.toBe(first.artifact.contentHash);
    expect(first.artifact.rulesVersion).toBe(RUNTIME_RENDER_LOAD_VISIBILITY_RULES_VERSION);
  });

  it("normalizes malformed requests and keeps all unsupported claims false", () => {
    const result = buildRuntimeRenderLoadVisibility({
      seed: "m02-malformed",
      tier: "not-a-tier",
      requestedViewDistanceBlocks: "bad",
      requestedTargetFps: Number.NaN,
      playerPosition: { x: Number.POSITIVE_INFINITY, z: null },
      safetyPaddingBlocks: Number.NaN,
    });

    expect(result.budget).toMatchObject({ tier: "balanced", viewDistanceBlocks: 35, targetFps: 60 });
    expect(result.streaming.playerPosition).toEqual({ x: 0, z: 0 });
    expect(result.claims).toEqual({
      runtimeWrite: false,
      generatorCall: false,
      assetGeneration: false,
      cacheWrite: false,
      futureMapEnabled: false,
      deviceBenchmark: false,
      gpuTiming: false,
      mobileAcceptance: false,
    });
    expect(result.blockers.map(blocker => blocker.id)).toEqual([
      "controlled-device-load-benchmark",
      "full-object-culling",
      "object-pooling",
    ]);
  });

  it("rejects invalid seeds and rules versions", () => {
    expect(() => buildRuntimeRenderLoadVisibility({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildRuntimeRenderLoadVisibility({ seed: "x".repeat(129) })).toThrow("seed must be 1–128 characters");
    expect(() => buildRuntimeRenderLoadVisibility({ seed: "m02", rulesVersion: "runtime-render-load-visibility-rules.v0" })).toThrow("Unsupported runtime render/load visibility rules version");
  });
});
