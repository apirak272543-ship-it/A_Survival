import { describe, expect, it } from "vitest";
import { evaluateAnimationMotionProfile } from "./animationMotionProfileContract";

describe("animation motion profile contract", () => {
  it("accepts a near visible clip reuse profile", () => {
    const result = evaluateAnimationMotionProfile({ state: "walk", tier: "balanced", distanceMeters: 8, visible: true, reducedMotion: false, hasAssetClip: true });

    expect(result.valid).toBe(true);
    expect(result.profile).toMatchObject({ tier: "balanced", mode: "full", radiusMeters: 48, updateIntervalMs: 16, assetPolicy: "reuse-clip", reusesExistingClip: true, generatedInRenderLoop: false, binaryAssetGenerated: false, deviceBenchmark: false });
    expect(result.decision.claims).toEqual({ binaryAssetGenerated: false, generatedInRenderLoop: false, skeletonRetargeted: false, windSimulated: false, adaptiveTiering: false, deviceBenchmark: false, playerRuntimeMutation: false });
  });

  it("accepts reduced/fallback and sleep/static profiles from canonical reasons", () => {
    const reduced = evaluateAnimationMotionProfile({ state: "run", tier: "low", distanceMeters: 20, visible: true, hasAssetClip: false });
    const sleeping = evaluateAnimationMotionProfile({ state: "run", tier: "low", distanceMeters: 25, visible: false, hasAssetClip: true });
    const dead = evaluateAnimationMotionProfile({ state: "dead", tier: "high", distanceMeters: 3, visible: true, hasAssetClip: true });

    expect(reduced).toMatchObject({ valid: true, profile: { mode: "reduced", updateIntervalMs: 66, assetPolicy: "profile-fallback" } });
    expect(sleeping).toMatchObject({ valid: true, profile: { mode: "sleep", updateIntervalMs: null, assetPolicy: "none" } });
    expect(dead).toMatchObject({ valid: true, profile: { mode: "static", updateIntervalMs: null, assetPolicy: "none" } });
  });

  it("normalizes unknown input to safe tier/distance behavior without asset generation", () => {
    const result = evaluateAnimationMotionProfile({ state: "idle", tier: "unknown-tier", distanceMeters: "not-a-number", visible: true, reducedMotion: true, hasAssetClip: false });

    expect(result.valid).toBe(true);
    expect(result.decision.tier).toBe("balanced");
    expect(result.decision.distanceMeters).toBeNull();
    expect(result.profile.mode).toBe("sleep");
    expect(result.profile.binaryAssetGenerated).toBe(false);
  });

  it("is deterministic for the same state and visibility input", () => {
    const input = { state: "attack" as const, tier: "high", distanceMeters: 60, visible: true, reducedMotion: false, hasAssetClip: true };
    const first = evaluateAnimationMotionProfile(input);
    const second = evaluateAnimationMotionProfile(input);

    expect(second).toEqual(first);
    expect(first.valid).toBe(true);
    expect(first.decision.reasons).toEqual(["far-visible"]);
  });
});
