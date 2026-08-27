import { describe, expect, it } from "vitest";
import { resolveAnimationMotionPolicy } from "../client/src/game/systems/animationMotionPolicy";

describe("animation motion policy", () => {
  it("keeps a visible nearby clip at full LOD", () => {
    const decision = resolveAnimationMotionPolicy({ state: "walk", tier: "balanced", distanceMeters: 10, visible: true, hasAssetClip: true });
    expect(decision).toMatchObject({
      policyVersion: "animation-motion-policy.v1",
      state: "walk",
      tier: "balanced",
      distanceMeters: 10,
      animationRadiusMeters: 48,
      mode: "full",
      animationLod: "full",
      updateIntervalMs: 16,
      bobScale: 1,
      cycleScale: 1,
      assetPolicy: "reuse-clip",
      reasons: ["near-visible"],
    });
  });

  it("reduces a visible far animation and reuses the profile when no clip exists", () => {
    const decision = resolveAnimationMotionPolicy({ state: "run", tier: "balanced", distanceMeters: 35, visible: true, hasAssetClip: false });
    expect(decision).toMatchObject({ mode: "reduced", animationLod: "reduced", updateIntervalMs: 66, bobScale: 0.5, cycleScale: 0.5, assetPolicy: "profile-fallback", reasons: ["far-visible"] });
  });

  it("sleeps animations outside the tier radius", () => {
    const decision = resolveAnimationMotionPolicy({ state: "idle", tier: "balanced", distanceMeters: 49, visible: true, hasAssetClip: true });
    expect(decision).toMatchObject({ mode: "sleep", animationLod: "static", updateIntervalMs: null, bobScale: 0, cycleScale: 0, assetPolicy: "none", reasons: ["outside-radius"] });
  });

  it("sleeps non-visible entities even when their distance is near", () => {
    const decision = resolveAnimationMotionPolicy({ state: "attack", tier: "high", distanceMeters: 1, visible: false, hasAssetClip: true });
    expect(decision.mode).toBe("sleep");
    expect(decision.reasons).toEqual(["not-visible"]);
  });

  it("honors reduced-motion preference before distance LOD", () => {
    const decision = resolveAnimationMotionPolicy({ state: "dash", tier: "high", distanceMeters: 1, visible: true, reducedMotion: true, hasAssetClip: true });
    expect(decision).toMatchObject({ mode: "reduced", animationLod: "reduced", updateIntervalMs: 66, bobScale: 0.5, cycleScale: 0.5, reasons: ["reduced-motion"] });
  });

  it("keeps dead state static without advancing motion", () => {
    const decision = resolveAnimationMotionPolicy({ state: "dead", tier: "balanced", distanceMeters: 1, visible: true, hasAssetClip: true });
    expect(decision).toMatchObject({ mode: "static", animationLod: "static", updateIntervalMs: null, bobScale: 0, cycleScale: 0, assetPolicy: "none", reasons: ["dead-state"] });
  });

  it("normalizes unknown tier and unsafe distance conservatively", () => {
    const decision = resolveAnimationMotionPolicy({ state: "idle", tier: "unsupported", distanceMeters: Number.NaN, visible: true, hasAssetClip: true });
    expect(decision).toMatchObject({ tier: "balanced", distanceMeters: null, mode: "sleep", reasons: ["outside-radius"] });
  });

  it("does not claim asset generation, skeleton retargeting, wind simulation or automatic tiering", () => {
    const decision = resolveAnimationMotionPolicy({ state: "idle", tier: "low", distanceMeters: 1, visible: true });
    expect(decision.claims).toEqual({
      binaryAssetGenerated: false,
      generatedInRenderLoop: false,
      skeletonRetargeted: false,
      windSimulated: false,
      adaptiveTiering: false,
      deviceBenchmark: false,
      playerRuntimeMutation: false,
    });
  });
});
