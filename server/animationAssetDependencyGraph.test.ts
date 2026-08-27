import { describe, expect, it } from "vitest";
import { buildAnimationAssetDependencyGraph, type AnimationAssetDependencyGraphInput } from "./generators/animationAssetDependencyGraph";

const validInput: AnimationAssetDependencyGraphInput = {
  id: "survivor.default",
  displayName: "Survivor Default Motion",
  assetId: "animation.survivor.default",
  assetSource: "starter-authored",
  provenanceRef: "procedural-starter-authored",
  seed: "animation-asset-seed",
  fps: 12,
};

describe("animation asset dependency graph", () => {
  it("connects the real animation profile to active runtime metadata deterministically", () => {
    const first = buildAnimationAssetDependencyGraph(validInput);
    const second = buildAnimationAssetDependencyGraph(validInput);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ generatorId: "animation.profile", generatorVersion: "1.0.0", seed: "animation-asset-seed", profileId: "survivor.default", assetId: "animation.survivor.default" });
    expect(first.runtimePack).toMatchObject({ id: "arcane-frontier-voxel-pixel", namespace: "af", version: "0.3.0", entryCount: 39 });
    expect(first.runtimeMetadata).toMatchObject({ schemaVersion: 1, source: "google-gemini-brief", stateIds: ["attack", "dash", "dead", "hurt", "idle", "run", "walk"] });
    expect(first.profile.states).toHaveProperty("attack");
    expect(first.summary).toMatchObject({ profileId: "survivor.default", stateCount: 7, runtimeMetadataStateCount: 7, metadataMatch: true, unresolvedReferenceCount: 1, unresolvedReferenceTypes: { "asset-binding": 1, "metadata-mismatch": 0 } });
    expect(first.unresolvedReferences[0]).toMatchObject({ referenceType: "asset-binding", referenceId: "animation.survivor.default" });
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.nodes.some(node => node.generatorId === "asset.pack.metadata")).toBe(true);
  });

  it("keeps an existing non-animation manifest entry visible as a kind blocker", () => {
    const result = buildAnimationAssetDependencyGraph({ ...validInput, assetId: "data.animations" });

    expect(result.summary.runtimeAssetEntryKind).toBe("data");
    expect(result.summary.unresolvedReferenceTypes["asset-binding"]).toBe(1);
    expect(result.unresolvedReferences).toContainEqual(expect.objectContaining({ referenceType: "asset-binding", referenceId: "data.animations" }));
    expect(result.graph.issues.some(issue => issue.code === "DEPENDENCY_KIND_MISMATCH")).toBe(true);
    expect(result.graph.valid).toBe(false);
  });

  it("blocks profile-to-metadata drift instead of rewriting active runtime metadata", () => {
    const result = buildAnimationAssetDependencyGraph({ ...validInput, states: { idle: { bobAmplitude: 0.11 } } });

    expect(result.summary.metadataMatch).toBe(false);
    expect(result.summary.unresolvedReferenceTypes["metadata-mismatch"]).toBe(1);
    expect(result.unresolvedReferences).toContainEqual(expect.objectContaining({ referenceType: "metadata-mismatch", referenceId: "survivor.default", reason: "runtime animation metadata mismatch: idle.bobAmplitude" }));
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey?.startsWith("animation-metadata-validation:"))).toBe(true);
    expect(result.graph.valid).toBe(false);
  });

  it("rejects unsupported rules and unbounded seed input", () => {
    expect(() => buildAnimationAssetDependencyGraph({ ...validInput, rulesVersion: "wrong.v1" })).toThrow("Unsupported animation asset graph rules version");
    expect(() => buildAnimationAssetDependencyGraph({ ...validInput, seed: " " })).toThrow("seed must be 1–128 characters");
    expect(() => buildAnimationAssetDependencyGraph({ ...validInput, seed: "x".repeat(129) })).toThrow("seed must be 1–128 characters");
  });
});
