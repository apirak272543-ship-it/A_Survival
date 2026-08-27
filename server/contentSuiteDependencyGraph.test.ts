import { describe, expect, it } from "vitest";
import type { AssetManifestLike } from "../tools/content-generator";
import { generateContentSuiteBundle, type ContentSuiteInput } from "../tools/contentRegistry";
import {
  buildContentSuiteDependencyGraph,
  MAX_CONTENT_SUITE_BUNDLES,
  MAX_CONTENT_SUITE_SAMPLE,
} from "./generators/contentSuiteDependencyGraph";

const baseInput: ContentSuiteInput = {
  kind: "block",
  name: "Obsidian Integrity Block",
  description: "A deterministic content suite fixture.",
  material: "obsidian",
  element: "fire",
  biome: "obsidian-frontier",
  gameplayRole: "building-block",
  rarity: "rare",
  seed: 9107,
};

const boundManifest: AssetManifestLike = {
  id: "fixture-pack",
  version: "1.0.0",
  artStatus: "starter-authored-from-gemini-brief",
  entries: {
    "model.bound": { kind: "model", path: "models/bound.glb", sha256: "a".repeat(64) },
    "texture.bound": { kind: "texture", path: "textures/bound.png", sha256: "b".repeat(64) },
  },
};

function createBundle(overrides: Partial<ContentSuiteInput> = {}) {
  return generateContentSuiteBundle({ ...baseInput, ...overrides });
}

function build(bundles = [createBundle()], overrides: Partial<Parameters<typeof buildContentSuiteDependencyGraph>[0]> = {}) {
  return buildContentSuiteDependencyGraph({ seed: "content-suite-proof-seed", bundles, ...overrides });
}

describe("content suite dependency graph", () => {
  it("connects real suite components and keeps awaiting assets as required blockers", () => {
    const result = build();

    expect(result.artifact).toMatchObject({
      generatorId: "content.suite",
      generatorVersion: "1.0.0",
      sampledBundleCount: 1,
      bundleCount: 1,
    });
    expect(result.summary).toMatchObject({
      bundleCount: 1,
      sampledBundleCount: 1,
      validBundleCount: 1,
      invalidBundleCount: 0,
      awaitingAssetCount: 2,
      referenceOnlyAssetCount: 2,
      unresolvedReferenceCount: 2,
    });
    expect(result.nodes.some(node => node.key === "content-suite:block-obsidian-integrity-block")).toBe(true);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(result.graph.valid).toBe(false);
  });

  it("resolves bound model and texture assets into a valid deterministic graph", () => {
    const bundle = createBundle({ id: "bound-fixture", modelAssetId: "model.bound", textureAssetId: "texture.bound", assetManifest: boundManifest });
    const first = build([bundle]);
    const second = build([bundle]);

    expect(first.summary).toMatchObject({
      validBundleCount: 1,
      invalidBundleCount: 0,
      resolvedAssetCount: 2,
      awaitingAssetCount: 0,
      referenceOnlyAssetCount: 0,
      unresolvedReferenceCount: 0,
    });
    expect(first.graph.valid).toBe(true);
    expect(second).toEqual(first);
    expect(first.nodes.filter(node => node.generatorId === "asset.binding")).toHaveLength(2);
  });

  it("fails closed for malformed bundle hashes and duplicate definition IDs", () => {
    const valid = createBundle({ id: "duplicate-fixture", modelAssetId: "model.bound", textureAssetId: "texture.bound", assetManifest: boundManifest });
    const tampered = { ...valid, contentHash: "f".repeat(64) };
    const result = build([valid, tampered], { sampleCount: 2 });

    expect(result.summary.duplicateDefinitionCount).toBe(1);
    expect(result.summary.invalidBundleCount).toBe(2);
    expect(result.invalidBundleIds).toEqual(["duplicate-fixture"]);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues.some(issue => issue.code === "DUPLICATE_NODE")).toBe(true);
  });

  it("keeps the graph bounded and rejects unsupported configuration", () => {
    expect(() => build([], { sampleCount: 0 })).toThrow("sampleCount must be an integer from 1 to 32");
    expect(() => build([createBundle()], { sampleCount: MAX_CONTENT_SUITE_SAMPLE + 1 })).toThrow("sampleCount must be an integer from 1 to 32");
    expect(() => build([createBundle()], { rulesVersion: "content-suite-dependency-graph-rules.v0" })).toThrow("Unsupported content suite dependency graph rules version");
    expect(() => build(Array.from({ length: MAX_CONTENT_SUITE_BUNDLES + 1 }, (_, index) => createBundle({ id: `bounded-${index}` })))).toThrow("bundles exceeds 256 records");
  });
});
