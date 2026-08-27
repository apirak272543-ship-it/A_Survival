import { describe, expect, it } from "vitest";
import {
  buildContentAssetProvenanceDependencyGraph,
  buildContentAssetProvenanceDependencyGraphFromSources,
  createInjectedDurableAssetRegistrySnapshot,
  readActivePlantAssetProvenanceSources,
  CONTENT_ASSET_PROVENANCE_GRAPH_RULES_VERSION,
  type RuntimeAssetPackManifest,
} from "./generators/contentAssetProvenanceDependencyGraph";

describe("generic content asset provenance dependency graph", () => {
  it("audits every logical content category without counting metadata as verified runtime assets", () => {
    const input = { seed: "generic-content-provenance-seed", samplePerCategory: 1 };
    const first = buildContentAssetProvenanceDependencyGraph(input);
    const second = buildContentAssetProvenanceDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({
      generatorId: "content.asset.provenance",
      generatorVersion: "1.0.0",
      schemaVersion: "a-survival.content-asset-provenance.v1",
      seed: input.seed,
      rulesVersion: CONTENT_ASSET_PROVENANCE_GRAPH_RULES_VERSION,
      definitionCount: 3000,
      categoryCount: 10,
      sampledDefinitionCount: 10,
    });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.catalogHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.catalog).toMatchObject({ schemaVersion: "a-survival.content-catalog.v1", definitionCount: 3000, assetRefCount: 10 });
    expect(first.catalog.categoryIds).toHaveLength(10);
    expect(first.runtimePack).toMatchObject({
      id: "arcane-frontier-voxel-pixel",
      namespace: "af",
      version: "0.3.0",
      entryCount: 39,
      packIntegrityVerified: true,
      provenanceVerified: true,
      durableRegistryVerified: false,
    });
    expect(first.summary.logicalAssetIds).toEqual([
      "a-survival.content.decoration",
      "a-survival.content.furniture",
      "a-survival.content.material",
      "a-survival.content.plant",
      "a-survival.content.seed",
      "a-survival.content.structure",
      "a-survival.content.tool",
      "a-survival.content.weapon-bow",
      "a-survival.content.weapon-ranged",
      "a-survival.content.weapon-sword",
    ]);
    expect(first.summary.metadataOnlyAssetIds).toEqual(first.summary.logicalAssetIds);
    expect(first.summary.verifiedAssetIds).toEqual([]);
    expect(first.summary.blockedAssetIds).toEqual(first.summary.logicalAssetIds);
    expect(first.summary.unresolvedReferenceTypes["content-asset-binding"]).toBe(10);
    expect(first.summary.unresolvedReferenceTypes["asset-integrity"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["asset-binding"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["asset-provenance"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["pack-integrity"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["durable-registry"]).toBe(1);
    expect(first.summary.unresolvedReferenceTypes["logical-provenance"]).toBe(0);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "runtime-asset:a-survival.content.plant")).toBe(true);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "registry:asset-pack:arcane-frontier-voxel-pixel")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("keeps a wrong-kind logical asset entry as a blocking dependency mismatch", () => {
    const sources = readActivePlantAssetProvenanceSources();
    const manifest: RuntimeAssetPackManifest = {
      ...sources.manifest,
      entries: {
        ...sources.manifest.entries,
        "a-survival.content.plant": { ...sources.manifest.entries["items.seed"]!, kind: "model" },
      },
    };
    const output = buildContentAssetProvenanceDependencyGraphFromSources(
      { seed: "generic-content-kind-seed", categories: ["plant"], countPerCategory: 300 },
      {
        ...sources,
        manifest,
        fileStates: { ...sources.fileStates, "a-survival.content.plant": sources.fileStates["items.seed"]! },
      },
    );

    expect(output.assetStatuses).toEqual([
      expect.objectContaining({ category: "plant", assetId: "a-survival.content.plant", manifestEntry: true, manifestEntryKind: "model", fileExists: true, fileHashMatches: true, status: "kind-mismatch" }),
    ]);
    expect(output.summary.unresolvedReferenceTypes["asset-binding"]).toBe(1);
    expect(output.graph.issues.some(issue => issue.code === "DEPENDENCY_KIND_MISMATCH" && issue.dependencyKey === "runtime-asset:a-survival.content.plant")).toBe(true);
  });

  it("accepts only an explicitly supplied durable registry snapshot and still keeps logical-only assets blocked", () => {
    const sources = readActivePlantAssetProvenanceSources();
    const output = buildContentAssetProvenanceDependencyGraphFromSources(
      { seed: "generic-content-registry-seed", categories: ["plant", "seed"], countPerCategory: 300 },
      { ...sources, durableRegistry: createInjectedDurableAssetRegistrySnapshot("asset-registry.generic-content.v1", "a".repeat(64)) },
    );

    expect(output.runtimePack.durableRegistryVerified).toBe(true);
    expect(output.summary.unresolvedReferenceTypes["durable-registry"]).toBe(0);
    expect(output.nodes.some(node => node.key === "registry:asset-pack:arcane-frontier-voxel-pixel")).toBe(true);
    expect(output.summary.verifiedAssetIds).toEqual([]);
    expect(output.summary.metadataOnlyAssetIds).toEqual(["a-survival.content.plant", "a-survival.content.seed"]);
    expect(output.graph.issues.some(issue => issue.dependencyKey === "registry:asset-pack:arcane-frontier-voxel-pixel")).toBe(false);
  });

  it("changes the audit hash when seed, catalog input, or registry input changes", () => {
    const sources = readActivePlantAssetProvenanceSources();
    const first = buildContentAssetProvenanceDependencyGraphFromSources(
      { seed: "generic-content-hash-a", categories: ["plant"], samplePerCategory: 2 },
      { ...sources, durableRegistry: createInjectedDurableAssetRegistrySnapshot("asset-registry.v1", "a".repeat(64)) },
    );
    const differentSeed = buildContentAssetProvenanceDependencyGraphFromSources(
      { seed: "generic-content-hash-b", categories: ["plant"], samplePerCategory: 2 },
      { ...sources, durableRegistry: createInjectedDurableAssetRegistrySnapshot("asset-registry.v1", "a".repeat(64)) },
    );
    const differentCategoryInput = buildContentAssetProvenanceDependencyGraphFromSources(
      { seed: "generic-content-hash-a", categories: ["seed"], samplePerCategory: 2 },
      { ...sources, durableRegistry: createInjectedDurableAssetRegistrySnapshot("asset-registry.v1", "a".repeat(64)) },
    );
    const differentRegistry = buildContentAssetProvenanceDependencyGraphFromSources(
      { seed: "generic-content-hash-a", categories: ["plant"], samplePerCategory: 2 },
      { ...sources, durableRegistry: createInjectedDurableAssetRegistrySnapshot("asset-registry.v1", "b".repeat(64)) },
    );

    expect(first.artifact.contentHash).not.toBe(differentSeed.artifact.contentHash);
    expect(first.artifact.catalogHash).not.toBe(differentSeed.artifact.catalogHash);
    expect(first.artifact.contentHash).not.toBe(differentCategoryInput.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentRegistry.artifact.contentHash);
  });

  it("keeps category and sample bounds explicit", () => {
    expect(() => buildContentAssetProvenanceDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported content asset provenance graph rules version");
    expect(() => buildContentAssetProvenanceDependencyGraph({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildContentAssetProvenanceDependencyGraph({ seed: "seed", samplePerCategory: 0 })).toThrow("samplePerCategory must be an integer from 1 to 8");
    expect(() => buildContentAssetProvenanceDependencyGraph({ seed: "seed", samplePerCategory: 9 })).toThrow("samplePerCategory must be an integer from 1 to 8");
    expect(() => buildContentAssetProvenanceDependencyGraph({ seed: "seed", categories: Array.from({ length: 11 }, () => "plant") })).toThrow("categories must contain at most 10 entries");
    expect(() => createInjectedDurableAssetRegistrySnapshot("", "a".repeat(64))).toThrow("registryId must be non-empty");
    expect(() => createInjectedDurableAssetRegistrySnapshot("registry", "not-a-hash")).toThrow("contentHash must be a SHA-256 hex digest");
  });
});
