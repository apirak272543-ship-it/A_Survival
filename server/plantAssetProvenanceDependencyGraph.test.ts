import { describe, expect, it } from "vitest";
import {
  buildPlantAssetProvenanceDependencyGraph,
  buildPlantAssetProvenanceDependencyGraphFromSources,
  readActivePlantAssetProvenanceSources,
  PLANT_ASSET_PROVENANCE_GRAPH_RULES_VERSION,
  type RuntimeAssetPackManifest,
} from "./generators/plantAssetProvenanceDependencyGraph";

describe("plant asset provenance dependency graph", () => {
  it("is deterministic and distinguishes logical catalog metadata from verified active-pack files", () => {
    const input = { seed: "plant-asset-provenance-seed", samplePlantCount: 16, samplePerCategory: 8 };
    const first = buildPlantAssetProvenanceDependencyGraph(input);
    const second = buildPlantAssetProvenanceDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({
      generatorId: "plant.asset.provenance",
      generatorVersion: "1.0.0",
      schemaVersion: "a-survival.plant-asset-provenance.v1",
      seed: input.seed,
      rulesVersion: PLANT_ASSET_PROVENANCE_GRAPH_RULES_VERSION,
      plantCount: 300,
      sampledPlantCount: 16,
    });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.runtimePack).toMatchObject({
      id: "arcane-frontier-voxel-pixel",
      namespace: "af",
      version: "0.3.0",
      packIntegrityVerified: true,
      provenanceVerified: true,
      entryCount: 39,
    });
    expect(first.summary.logicalContentAssetIds).toEqual(["a-survival.content.plant", "a-survival.content.seed"]);
    expect(first.summary.auditedAssetIds).toEqual(["a-survival.content.plant", "a-survival.content.seed", "art.obsidian.crystal-fern", "items.seed"]);
    expect(first.summary.verifiedAssetIds).toEqual(["art.obsidian.crystal-fern", "items.seed"]);
    expect(first.summary.blockedAssetIds).toEqual(["a-survival.content.plant", "a-survival.content.seed"]);
    expect(first.plantAssetStatuses).toEqual([
      expect.objectContaining({ assetId: "a-survival.content.plant", manifestEntry: false, status: "missing" }),
      expect.objectContaining({ assetId: "a-survival.content.seed", manifestEntry: false, status: "missing" }),
      expect.objectContaining({ assetId: "art.obsidian.crystal-fern", manifestEntry: true, manifestEntryKind: "texture", fileExists: true, fileHashMatches: true, status: "verified" }),
      expect.objectContaining({ assetId: "items.seed", manifestEntry: true, manifestEntryKind: "texture", fileExists: true, fileHashMatches: true, status: "verified" }),
    ]);
    expect(first.summary.unresolvedReferenceTypes["content-asset-binding"]).toBe(2);
    expect(first.summary.unresolvedReferenceTypes["asset-integrity"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["asset-provenance"]).toBe(0);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "runtime-asset:a-survival.content.plant")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("blocks a plant and seed binding when the local file digest no longer matches the manifest", () => {
    const sources = readActivePlantAssetProvenanceSources();
    const output = buildPlantAssetProvenanceDependencyGraphFromSources(
      { seed: "plant-asset-integrity-seed", samplePlantCount: 4 },
      {
        ...sources,
        fileStates: {
          ...sources.fileStates,
          "items.seed": { exists: true, sha256: "0".repeat(64) },
        },
      },
    );

    expect(output.plantAssetStatuses).toEqual(expect.arrayContaining([
      expect.objectContaining({ assetId: "items.seed", fileExists: true, fileHashMatches: false, status: "integrity-blocked" }),
    ]));
    expect(output.summary.unresolvedReferenceTypes["asset-integrity"]).toBeGreaterThan(0);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "runtime-asset:items.seed")).toBe(true);
  });

  it("keeps an existing but wrong-kind manifest entry as a blocking mismatch", () => {
    const sources = readActivePlantAssetProvenanceSources();
    const manifest: RuntimeAssetPackManifest = {
      ...sources.manifest,
      entries: {
        ...sources.manifest.entries,
        "items.seed": { ...sources.manifest.entries["items.seed"]!, kind: "model" },
      },
    };
    const output = buildPlantAssetProvenanceDependencyGraphFromSources(
      { seed: "plant-asset-kind-seed", samplePlantCount: 4 },
      { ...sources, manifest },
    );

    expect(output.plantAssetStatuses).toEqual(expect.arrayContaining([
      expect.objectContaining({ assetId: "items.seed", manifestEntryKind: "model", fileHashMatches: true, status: "kind-mismatch" }),
    ]));
    expect(output.summary.unresolvedReferenceTypes["asset-binding"]).toBeGreaterThan(0);
    expect(output.graph.issues.some(issue => issue.code === "DEPENDENCY_KIND_MISMATCH" && issue.dependencyKey === "runtime-asset:items.seed")).toBe(true);
  });

  it("blocks the pack when its provenance is unknown instead of treating metadata as distributable", () => {
    const sources = readActivePlantAssetProvenanceSources();
    const output = buildPlantAssetProvenanceDependencyGraphFromSources(
      { seed: "plant-asset-provenance-blocker-seed", samplePlantCount: 4 },
      { ...sources, provenance: null },
    );

    expect(output.runtimePack.provenanceVerified).toBe(false);
    expect(output.summary.unresolvedReferenceTypes["asset-provenance"]).toBe(1);
    expect(output.unresolvedReferences).toEqual(expect.arrayContaining([
      expect.objectContaining({ referenceType: "asset-provenance", referenceId: "arcane-frontier-voxel-pixel" }),
    ]));
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "provenance:pack.arcane-frontier-voxel-pixel")).toBe(true);
  });

  it("changes the audit hash when the seed or file-backed input changes", () => {
    const first = buildPlantAssetProvenanceDependencyGraph({ seed: "plant-asset-hash-a", samplePlantCount: 4 });
    const second = buildPlantAssetProvenanceDependencyGraph({ seed: "plant-asset-hash-b", samplePlantCount: 4 });
    const sources = readActivePlantAssetProvenanceSources();
    const changedFileInput = buildPlantAssetProvenanceDependencyGraphFromSources(
      { seed: "plant-asset-hash-a", samplePlantCount: 4 },
      { ...sources, fileStates: { ...sources.fileStates, "items.seed": { exists: true, sha256: "1".repeat(64) } } },
    );

    expect(first.artifact.contentHash).not.toBe(second.artifact.contentHash);
    expect(first.artifact.catalogHash).not.toBe(second.artifact.catalogHash);
    expect(first.artifact.contentHash).not.toBe(changedFileInput.artifact.contentHash);
  });

  it("rejects unsupported rules, empty seeds, and unbounded samples", () => {
    expect(() => buildPlantAssetProvenanceDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported plant asset provenance graph rules version");
    expect(() => buildPlantAssetProvenanceDependencyGraph({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildPlantAssetProvenanceDependencyGraph({ seed: "seed", samplePlantCount: 33 })).toThrow("samplePlantCount must be an integer from 1 to 32");
    expect(() => buildPlantAssetProvenanceDependencyGraph({ seed: "seed", samplePerCategory: 9 })).toThrow("samplePerCategory must be an integer from 1 to 8");
  });
});
