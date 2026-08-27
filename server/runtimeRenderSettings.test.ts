import { describe, expect, it } from "vitest";
import {
  buildRuntimeRenderSettings,
  RUNTIME_RENDER_SETTINGS_RULES_VERSION,
} from "./generators/runtimeRenderSettings";

describe("runtime render settings contract", () => {
  it("enumerates every supported view-distance step and target FPS option", () => {
    const result = buildRuntimeRenderSettings({
      seed: "s03-options",
      tier: "balanced",
      requestedViewDistanceBlocks: 35,
      requestedTargetFps: 60,
    });

    expect(result.viewDistance.supportedSteps).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    expect(result.viewDistance.minimumBlocks).toBe(5);
    expect(result.viewDistance.maximumBlocks).toBe(50);
    expect(result.viewDistance.stepBlocks).toBe(5);
    expect(result.viewDistance.options[0]).toEqual({ requestedBlocks: 5, visibleRadiusMeters: 5, prefetchRadiusMeters: 10, preset: "near", label: "5 blocks" });
    expect(result.viewDistance.options.at(-1)).toEqual({ requestedBlocks: 50, visibleRadiusMeters: 50, prefetchRadiusMeters: 68, preset: "far", label: "50 blocks" });
    expect(result.targetFps.supportedOptions).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 120]);
    expect(result.targetFps.includes120DeviceDependentOption).toBe(true);
    expect(result.targetFps.options.at(-1)).toEqual({ requestedTargetFps: 120, disclaimer: "device-dependent-option" });
    expect(result.targetFps.options[0].disclaimer).toBe("goal-not-guarantee");
  });

  it("applies the selected tier ceilings without changing the discrete settings contract", () => {
    const low = buildRuntimeRenderSettings({ seed: "s03-low", tier: "low", requestedViewDistanceBlocks: 50, requestedTargetFps: 120 });
    const balanced = buildRuntimeRenderSettings({ seed: "s03-balanced", tier: "balanced", requestedViewDistanceBlocks: 50, requestedTargetFps: 120 });
    const high = buildRuntimeRenderSettings({ seed: "s03-high", tier: "high", requestedViewDistanceBlocks: 50, requestedTargetFps: 120 });

    expect(low.selected).toMatchObject({ tier: "low", requestedViewDistanceBlocks: 50, effectiveViewDistanceBlocks: 15, requestedTargetFps: 120, effectiveTargetFps: 30 });
    expect(balanced.selected).toMatchObject({ tier: "balanced", effectiveViewDistanceBlocks: 35, effectiveTargetFps: 60 });
    expect(high.selected).toMatchObject({ tier: "high", effectiveViewDistanceBlocks: 50, effectiveTargetFps: 120 });
    expect(low.tierEnvelopes).toHaveLength(3);
    expect(low.tierEnvelopes.map(envelope => envelope.tier)).toEqual(["low", "balanced", "high"]);
    expect(low.tierEnvelopes[0].clampedViewRequestCount).toBe(7);
    expect(low.tierEnvelopes[0].clampedTargetFpsRequestCount).toBe(7);
    expect(high.tierEnvelopes[2].clampedViewRequestCount).toBe(0);
    expect(high.tierEnvelopes[2].clampedTargetFpsRequestCount).toBe(0);
  });

  it("binds the streaming formula and real settings persistence owner without claiming persistence E2E", () => {
    const result = buildRuntimeRenderSettings({ seed: "s03-persistence", tier: "high", requestedViewDistanceBlocks: 50, requestedTargetFps: 120 });

    expect(result.streamingPolicy).toEqual({
      owner: "client/src/game/systems/renderDistance.ts",
      prefetchFormula: "visible + max(5, round(visible * 0.35))",
      boundedByMapRadiusMeters: 500,
      deterministic: true,
    });
    expect(result.persistence).toEqual({
      owner: "client/src/pages/ArcaneFrontier.tsx:801-806",
      scope: "player-and-map",
      normalizeBeforeSave: true,
      savePolicy: "source-owner-writes",
      durablePersistenceE2E: false,
    });
    expect(result.blockers.map(blocker => blocker.id)).toEqual(["settings-persistence-e2e", "target-fps-device-evidence"]);
  });

  it("is deterministic, bounded, and fail-safe for malformed requests", () => {
    const input = { seed: "s03-deterministic", tier: "not-a-tier", requestedViewDistanceBlocks: "bad", requestedTargetFps: Number.NaN } as const;
    const first = buildRuntimeRenderSettings(input);
    const second = buildRuntimeRenderSettings(input);
    const changed = buildRuntimeRenderSettings({ ...input, seed: "s03-changed" });

    expect(first).toEqual(second);
    expect(changed.artifact.contentHash).not.toBe(first.artifact.contentHash);
    expect(first.selected).toMatchObject({ tier: "balanced", effectiveViewDistanceBlocks: 35, effectiveTargetFps: 60 });
    expect(first.summary).toEqual({ bounded: true, deterministic: true, viewOptionCount: 10, targetFpsOptionCount: 13, tierCount: 3, deviceBenchmark: false, mobileAcceptance: false });
    expect(first.claims).toEqual({
      runtimeWrite: false,
      generatorCall: false,
      assetGeneration: false,
      cacheWrite: false,
      playerVisibleEffect: false,
      deviceBenchmark: false,
      adaptiveTierMutation: false,
    });
    expect(first.artifact.rulesVersion).toBe(RUNTIME_RENDER_SETTINGS_RULES_VERSION);
  });

  it("rejects invalid seeds and unsupported rules versions", () => {
    expect(() => buildRuntimeRenderSettings({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildRuntimeRenderSettings({ seed: "x".repeat(129) })).toThrow("seed must be 1–128 characters");
    expect(() => buildRuntimeRenderSettings({ seed: "s03", rulesVersion: "runtime-render-settings-rules.v0" })).toThrow("Unsupported runtime render settings rules version");
  });
});
