import { describe, expect, it } from "vitest";
import {
  buildAssetPackProvenanceDependencyGraph,
  buildAssetPackProvenanceDependencyGraphFromSources,
  readActiveAssetPackProvenanceSources,
  ASSET_PACK_PROVENANCE_GRAPH_RULES_VERSION,
  ASSET_PACK_PROVENANCE_MAX_ENTRIES,
  type AssetPackProvenanceSources,
} from "./generators/assetPackProvenanceDependencyGraph";

describe("asset pack provenance dependency graph", () => {
  it("is deterministic and records pack fallback provenance without claiming durable registry", () => {
    const input = { seed: "asset-pack-provenance-seed" };
    const first = buildAssetPackProvenanceDependencyGraph(input);
    const second = buildAssetPackProvenanceDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({
      generatorId: "asset.pack.provenance",
      generatorVersion: "1.0.0",
      schemaVersion: "a-survival.asset-pack-provenance.v1",
      seed: input.seed,
      rulesVersion: ASSET_PACK_PROVENANCE_GRAPH_RULES_VERSION,
      entryCount: 39,
      auditedEntryCount: 39,
    });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.packHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.runtimePack).toMatchObject({
      id: "arcane-frontier-voxel-pixel",
      namespace: "af",
      version: "0.3.0",
      entryCount: 39,
      packIntegrityVerified: true,
      packProvenanceVerified: true,
      durableRegistryVerified: false,
    });
    expect(first.summary.entryCount).toBe(39);
    expect(first.summary.verifiedEntryCount).toBe(39);
    expect(first.summary.directProvenanceEntryCount).toBe(0);
    expect(first.summary.packFallbackEntryCount).toBe(39);
    expect(first.summary.unknownProvenanceEntryCount).toBe(0);
    expect(first.summary.referenceOnlyEntryCount).toBe(0);
    expect(first.summary.verifiedAssetIds).toEqual([]);
    expect(first.summary.blockedAssetIds).toHaveLength(39);
    expect(first.summary.unresolvedReferenceTypes["entry-integrity"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["entry-kind"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["entry-provenance"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["pack-provenance"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["pack-integrity"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["durable-registry"]).toBe(1);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "registry:asset-pack:arcane-frontier-voxel-pixel")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("uses a direct credit when supplied and keeps reference-only status blocked", () => {
    const sources = readActiveAssetPackProvenanceSources();
    const output = buildAssetPackProvenanceDependencyGraphFromSources(
      { seed: "asset-pack-direct-credit-seed" },
      {
        ...sources,
        durableRegistry: { registryId: "asset-registry.v1", contentHash: "a".repeat(64) },
        entryCredits: {
          "items.seed": {
            assetId: "items.seed",
            category: "item",
            title: "Seed icon review record",
            creator: "A_Survival project",
            status: "reference-only",
            attribution: "Reference-only test credit",
          },
        },
      },
    );

    const seedEntry = output.entries.find(entry => entry.assetId === "items.seed");
    expect(seedEntry).toMatchObject({ provenanceSource: "entry", provenanceAssetId: "items.seed", provenanceStatus: "reference-only", distributionAllowed: false, status: "reference-only" });
    expect(output.summary.directProvenanceEntryCount).toBe(1);
    expect(output.summary.packFallbackEntryCount).toBe(38);
    expect(output.summary.referenceOnlyEntryCount).toBe(1);
    expect(output.runtimePack.durableRegistryVerified).toBe(true);
    expect(output.summary.unresolvedReferenceTypes["durable-registry"]).toBe(0);
    expect(output.summary.unresolvedReferenceTypes["entry-provenance"]).toBeGreaterThan(0);
    expect(output.graph.issues.some(issue => issue.dependencyKey === "provenance:entry:items.seed")).toBe(true);
  });

  it("blocks all entries when neither direct nor pack-level provenance is available", () => {
    const sources = readActiveAssetPackProvenanceSources();
    const output = buildAssetPackProvenanceDependencyGraphFromSources(
      { seed: "asset-pack-unknown-provenance-seed" },
      { ...sources, packCredit: null },
    );

    expect(output.runtimePack.packProvenanceVerified).toBe(false);
    expect(output.summary.unknownProvenanceEntryCount).toBe(39);
    expect(output.summary.referenceOnlyEntryCount).toBe(0);
    expect(output.summary.unresolvedReferenceTypes["entry-provenance"]).toBe(39);
    expect(output.summary.unresolvedReferenceTypes["pack-provenance"]).toBe(1);
    expect(output.unresolvedReferences).toEqual(expect.arrayContaining([
      expect.objectContaining({ referenceType: "pack-provenance", referenceId: "arcane-frontier-voxel-pixel" }),
    ]));
  });

  it("keeps file hash and unsupported kind failures as required blockers", () => {
    const sources = readActiveAssetPackProvenanceSources();
    const manifest = {
      ...sources.manifest,
      entries: {
        ...sources.manifest.entries,
        "items.seed": { ...sources.manifest.entries["items.seed"]!, kind: "unsupported-kind" },
      },
    } as AssetPackProvenanceSources["manifest"];
    const output = buildAssetPackProvenanceDependencyGraphFromSources(
      { seed: "asset-pack-integrity-kind-seed" },
      {
        ...sources,
        manifest,
        fileStates: { ...sources.fileStates, "items.seed": { exists: true, sha256: "0".repeat(64) } },
      },
    );

    expect(output.entries.find(entry => entry.assetId === "items.seed")).toMatchObject({ fileExists: true, fileHashMatches: false, kindVerified: false, status: "kind-mismatch" });
    expect(output.summary.unresolvedReferenceTypes["entry-integrity"]).toBeGreaterThan(0);
    expect(output.summary.unresolvedReferenceTypes["entry-kind"]).toBe(1);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "asset-integrity:items.seed")).toBe(true);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "asset-kind:items.seed")).toBe(true);
  });

  it("changes the deterministic audit hash when seed, file state, or provenance changes", () => {
    const sources = readActiveAssetPackProvenanceSources();
    const first = buildAssetPackProvenanceDependencyGraphFromSources({ seed: "asset-pack-hash-a" }, sources);
    const differentSeed = buildAssetPackProvenanceDependencyGraphFromSources({ seed: "asset-pack-hash-b" }, sources);
    const differentFileState = buildAssetPackProvenanceDependencyGraphFromSources(
      { seed: "asset-pack-hash-a" },
      { ...sources, fileStates: { ...sources.fileStates, "items.seed": { exists: true, sha256: "1".repeat(64) } } },
    );
    const differentProvenance = buildAssetPackProvenanceDependencyGraphFromSources(
      { seed: "asset-pack-hash-a" },
      {
        ...sources,
        entryCredits: {
          "items.seed": {
            assetId: "items.seed",
            category: "item",
            title: "Direct credit",
            creator: "A_Survival project",
            status: "license-verified",
            attribution: "License test record",
          },
        },
      },
    );

    expect(first.artifact.contentHash).not.toBe(differentSeed.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentFileState.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentProvenance.artifact.contentHash);
  });

  it("rejects unsupported rules, empty seeds, and unbounded manifests", () => {
    const sources = readActiveAssetPackProvenanceSources();
    expect(() => buildAssetPackProvenanceDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported asset pack provenance graph rules version");
    expect(() => buildAssetPackProvenanceDependencyGraph({ seed: "   " })).toThrow("seed must be 1–128 characters");
    const tooManyEntries = Object.fromEntries(Array.from({ length: ASSET_PACK_PROVENANCE_MAX_ENTRIES + 1 }, (_, index) => [`asset-${index}`, sources.manifest.entries["items.seed"]!]));
    expect(() => buildAssetPackProvenanceDependencyGraphFromSources({ seed: "seed" }, { ...sources, manifest: { ...sources.manifest, entries: tooManyEntries } })).toThrow(`manifest entries must contain 1 to ${ASSET_PACK_PROVENANCE_MAX_ENTRIES} entries`);
  });
});
