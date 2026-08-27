import { describe, expect, it } from "vitest";
import {
  ANIMATION_MOTION_GRAPH_RULES_VERSION,
  buildAnimationMotionDependencyGraph,
  getDefaultAnimationMotionDependencyGraphInput,
} from "./generators/animationMotionDependencyGraph";

describe("animation motion dependency graph", () => {
  it("audits the canonical seven-state profile and bounded playback policy", () => {
    const result = buildAnimationMotionDependencyGraph(getDefaultAnimationMotionDependencyGraphInput());

    expect(result.profile).toMatchObject({
      schemaVersion: "a-survival.animation-profile.v1",
      id: "survivor.default",
      assetId: "animation.survivor.default",
      fps: 12,
      playbackPolicy: { generateOnLoad: false, distanceBasedUpdate: true, sleepWhenOffscreen: true, runtimeAssetReuse: true },
    });
    expect(result.summary).toMatchObject({
      profileId: "survivor.default",
      assetSource: "starter-authored",
      assetReferenceOnly: true,
      binaryAssetGenerated: false,
      generatedInRenderLoop: false,
      skeletonRetargeted: false,
      windSimulated: false,
      profileVariationInputSupported: true,
      stateCount: 7,
      stateIds: ["idle", "walk", "run", "dash", "attack", "hurt", "dead"],
      motionPolicyVersion: "animation-motion-policy.v1",
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
    });
    expect(result.graph.valid).toBe(false);
  });

  it("proves near/full, far/reduced, offscreen/sleep, reduced-motion, and dead/static decisions", () => {
    const result = buildAnimationMotionDependencyGraph();
    const decisions = Object.fromEntries(result.summary.motionDecisions.map(decision => [decision.label, decision]));

    expect(decisions["near-full"]).toMatchObject({ state: "walk", mode: "full", animationLod: "full", assetPolicy: "reuse-clip", reason: "near-visible" });
    expect(decisions["far-reduced"]).toMatchObject({ state: "run", mode: "reduced", animationLod: "reduced", assetPolicy: "profile-fallback", reason: "far-visible" });
    expect(decisions["offscreen-sleep"]).toMatchObject({ state: "attack", mode: "sleep", animationLod: "static", assetPolicy: "none", reason: "not-visible" });
    expect(decisions["reduced-motion"]).toMatchObject({ state: "dash", mode: "reduced", animationLod: "reduced", assetPolicy: "reuse-clip", reason: "reduced-motion" });
    expect(decisions["dead-static"]).toMatchObject({ state: "dead", mode: "static", animationLod: "static", assetPolicy: "none", reason: "dead-state" });
  });

  it("keeps procedural profile generation reference-only and exposes missing runtime owners as blockers", () => {
    const result = buildAnimationMotionDependencyGraph({ assetSource: "reference-only", provenanceRef: "reference:animation-profile" });

    expect(result.profile.assetSource).toBe("reference-only");
    expect(result.profile.provenanceRef).toBe("reference:animation-profile");
    expect(result.summary.owners).toMatchObject({ profileGenerator: true, motionPolicy: true, assetProvenance: true, runtimeCaller: false, runtimeVariation: false, skeletonRetarget: false, windMotion: false, binaryAssetGeneration: false });
    expect(result.blockers).toEqual([
      "runtime-animation-caller-owner-missing",
      "runtime-variation-owner-missing",
      "skeleton-retarget-owner-missing",
      "wind-motion-owner-missing",
      "binary-animation-asset-generation-owner-missing",
    ]);
    expect(result.graph.issues.filter(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toHaveLength(5);
  });

  it("is deterministic and changes the graph hash when profile input changes", () => {
    const input = { ...getDefaultAnimationMotionDependencyGraphInput(), rulesVersion: ANIMATION_MOTION_GRAPH_RULES_VERSION };
    const first = buildAnimationMotionDependencyGraph(input);
    const second = buildAnimationMotionDependencyGraph(input);
    const changed = buildAnimationMotionDependencyGraph({ ...input, fps: 24 });

    expect(first).toEqual(second);
    expect(first.artifact.contentHash).not.toBe(changed.artifact.contentHash);
    expect(first.profile.fps).toBe(12);
    expect(changed.profile.fps).toBe(24);
  });

  it("rejects unsupported rules, invalid seed/provenance, and out-of-range FPS", () => {
    expect(() => buildAnimationMotionDependencyGraph({ rulesVersion: "future-rules" })).toThrow(/Unsupported/);
    expect(() => buildAnimationMotionDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildAnimationMotionDependencyGraph({ provenanceRef: "" })).toThrow(/provenanceRef/);
    expect(() => buildAnimationMotionDependencyGraph({ fps: 0 })).toThrow(/fps/);
    expect(() => buildAnimationMotionDependencyGraph({ fps: 61 })).toThrow(/fps/);
  });
});
