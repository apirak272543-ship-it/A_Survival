import { describe, expect, it } from "vitest";
import {
  ASSET_PROVENANCE_BINDING_GRAPH_RULES_VERSION,
  ASSET_PROVENANCE_BINDING_MAX_ITEM_SAMPLE,
  ASSET_PROVENANCE_BINDING_MAX_MANIFEST_ENTRIES,
  ASSET_PROVENANCE_BINDING_MAX_PLANT_SAMPLE,
  buildAssetProvenanceBindingDependencyGraph,
  buildAssetProvenanceBindingDependencyGraphFromSources,
  readActiveAssetProvenanceBindingSources,
  type AssetProvenanceBindingSources,
  type RuntimeAssetPackManifest,
} from "./generators/assetProvenanceBindingDependencyGraph";

describe("asset provenance binding dependency graph", () => {
  it("is deterministic and separates verified file bindings from metadata/blockers", () => {
    const input = { seed: "asset-provenance-binding-seed", plantSampleCount: 16, itemSampleCount: 18 };
    const first = buildAssetProvenanceBindingDependencyGraph(input);
    const second = buildAssetProvenanceBindingDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({
      generatorId: "asset.provenance.binding",
      generatorVersion: "1.0.0",
      schemaVersion: "a-survival.asset-provenance-binding.v1",
      seed: input.seed,
      rulesVersion: ASSET_PROVENANCE_BINDING_GRAPH_RULES_VERSION,
      plantCount: 300,
      itemCount: 3910,
      sampledPlantCount: 16,
      sampledItemCount: 18,
      auditedBindingCount: 66,
    });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.runtimePack).toMatchObject({ id: "arcane-frontier-voxel-pixel", namespace: "af", version: "0.3.0", entryCount: 39, packIntegrityVerified: true, provenanceVerified: true, durableRegistryVerified: false });
    expect(first.summary.auditedBindingCount).toBe(66);
    expect(first.summary.uniqueAssetCount).toBeGreaterThan(10);
    expect(first.summary.verifiedBindingCount).toBeGreaterThan(0);
    expect(first.summary.blockedBindingCount).toBeGreaterThan(0);
    expect(first.summary.missingAssetBindingCount).toBeGreaterThan(0);
    expect(first.summary.integrityBlockedBindingCount).toBe(0);
    expect(first.summary.kindMismatchBindingCount).toBe(0);
    expect(first.summary.provenanceBlockedBindingCount).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["plant-binding"]).toBeGreaterThan(0);
    expect(first.summary.unresolvedReferenceTypes["item-binding"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["asset-integrity"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["asset-kind"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["asset-provenance"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["pack-integrity"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["durable-registry"]).toBe(1);
    expect(first.summary.fallbackCount).toBeGreaterThan(0);
    expect(first.summary.fallbackBlockedCount).toBeGreaterThan(0);
    expect(first.summary.fallbackCycleCount).toBeGreaterThan(0);
    expect(first.summary.unresolvedReferenceTypes["fallback-cycle"]).toBeGreaterThan(0);
    expect(first.fallbacks.some(fallback => fallback.assetId === "items.blade" && fallback.status === "cycle")).toBe(true);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "registry:asset-provenance:arcane-frontier-voxel-pixel")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.bindings).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "plant", assetId: "items.seed", manifestEntry: true, manifestEntryKind: "texture", fileExists: true, fileHashMatches: true, provenanceSource: "pack", status: "verified" }),
      expect.objectContaining({ source: "plant", assetId: "seed-plant-001", manifestEntry: false, fileExists: false, fileHashMatches: false, status: "missing-asset" }),
      expect.objectContaining({ source: "item", assetId: "items.buildingCube", manifestEntry: true, manifestEntryKind: "texture", fileExists: true, fileHashMatches: true, status: "verified" }),
    ]));
  });

  it("blocks a manifest kind mismatch without deleting the existing binding", () => {
    const sources = readActiveAssetProvenanceBindingSources();
    const manifest: RuntimeAssetPackManifest = {
      ...sources.manifest,
      entries: { ...sources.manifest.entries, "items.seed": { ...sources.manifest.entries["items.seed"]!, kind: "model" } },
    };
    const output = buildAssetProvenanceBindingDependencyGraphFromSources(
      { seed: "asset-provenance-kind-mismatch-seed", plantSampleCount: 2, itemSampleCount: 1 },
      { ...sources, manifest },
    );

    expect(output.summary.kindMismatchBindingCount).toBeGreaterThan(0);
    expect(output.bindings.some(binding => binding.assetId === "items.seed" && binding.status === "kind-mismatch")).toBe(true);
    expect(output.graph.issues.some(issue => issue.code === "DEPENDENCY_KIND_MISMATCH" && issue.dependencyKey === "asset:items.seed")).toBe(true);
  });

  it("blocks a missing fallback target while retaining the primary manifest entry", () => {
    const sources = readActiveAssetProvenanceBindingSources();
    const manifest: RuntimeAssetPackManifest = {
      ...sources.manifest,
      entries: { ...sources.manifest.entries, "items.seed": { ...sources.manifest.entries["items.seed"]!, fallback: "missing.fallback" } },
    };
    const output = buildAssetProvenanceBindingDependencyGraphFromSources(
      { seed: "asset-provenance-missing-fallback-seed", plantSampleCount: 1, itemSampleCount: 1 },
      { ...sources, manifest },
    );

    expect(output.fallbacks.some(fallback => fallback.assetId === "items.seed" && fallback.status === "missing-target" && fallback.fallbackPath.at(-1) === "missing.fallback")).toBe(true);
    expect(output.summary.fallbackMissingTargetCount).toBeGreaterThan(0);
    expect(output.summary.unresolvedReferenceTypes["fallback-binding"]).toBeGreaterThan(0);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "asset:missing.fallback")).toBe(true);
  });

  it("blocks a fallback kind mismatch without deleting the primary binding", () => {
    const sources = readActiveAssetProvenanceBindingSources();
    const manifest: RuntimeAssetPackManifest = {
      ...sources.manifest,
      entries: { ...sources.manifest.entries, "items.seed": { ...sources.manifest.entries["items.seed"]!, fallback: "models.survivor" } },
    };
    const output = buildAssetProvenanceBindingDependencyGraphFromSources(
      { seed: "asset-provenance-fallback-kind-seed", plantSampleCount: 1, itemSampleCount: 1 },
      { ...sources, manifest },
    );

    expect(output.fallbacks.some(fallback => fallback.assetId === "items.seed" && fallback.status === "kind-mismatch")).toBe(true);
    expect(output.summary.fallbackKindMismatchCount).toBeGreaterThan(0);
    expect(output.summary.unresolvedReferenceTypes["fallback-kind"]).toBeGreaterThan(0);
    expect(output.graph.issues.some(issue => issue.code === "DEPENDENCY_KIND_MISMATCH" && issue.dependencyKey === "asset:models.survivor")).toBe(true);
  });

  it("blocks an explicit fallback cycle and changes the artifact hash when fallback input changes", () => {
    const sources = readActiveAssetProvenanceBindingSources();
    const first = buildAssetProvenanceBindingDependencyGraphFromSources({ seed: "asset-provenance-fallback-hash-seed", plantSampleCount: 1, itemSampleCount: 1 }, sources);
    const manifest: RuntimeAssetPackManifest = {
      ...sources.manifest,
      entries: { ...sources.manifest.entries, "items.seed": { ...sources.manifest.entries["items.seed"]!, fallback: "items.energy" }, "items.energy": { ...sources.manifest.entries["items.energy"]!, fallback: "items.seed" } },
    };
    const cycle = buildAssetProvenanceBindingDependencyGraphFromSources({ seed: "asset-provenance-fallback-hash-seed", plantSampleCount: 1, itemSampleCount: 1 }, { ...sources, manifest });

    expect(cycle.fallbacks.some(fallback => fallback.assetId === "items.seed" && fallback.status === "cycle")).toBe(true);
    expect(cycle.summary.fallbackCycleCount).toBeGreaterThan(0);
    expect(cycle.summary.unresolvedReferenceTypes["fallback-cycle"]).toBeGreaterThan(0);
    expect(cycle.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "fallback-cycle:items.seed")).toBe(true);
    expect(first.artifact.contentHash).not.toBe(cycle.artifact.contentHash);
  });

  it("blocks a changed local digest and pack integrity while retaining the manifest reference", () => {
    const sources = readActiveAssetProvenanceBindingSources();
    const output = buildAssetProvenanceBindingDependencyGraphFromSources(
      { seed: "asset-provenance-integrity-seed", plantSampleCount: 2, itemSampleCount: 1 },
      { ...sources, fileStates: { ...sources.fileStates, "items.seed": { exists: true, isFile: true, sha256: "0".repeat(64) } } },
    );

    expect(output.runtimePack.packIntegrityVerified).toBe(false);
    expect(output.summary.integrityBlockedBindingCount).toBeGreaterThan(0);
    expect(output.bindings.some(binding => binding.assetId === "items.seed" && binding.status === "integrity-blocked" && binding.manifestEntry)).toBe(true);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "asset-integrity:items.seed")).toBe(true);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "asset-pack-integrity:arcane-frontier-voxel-pixel@0.3.0")).toBe(true);
  });

  it("keeps an unknown pack provenance credit as a blocker", () => {
    const sources = readActiveAssetProvenanceBindingSources();
    const output = buildAssetProvenanceBindingDependencyGraphFromSources(
      { seed: "asset-provenance-unknown-credit-seed", plantSampleCount: 2, itemSampleCount: 1 },
      { ...sources, provenance: null, directAssetCredits: {} },
    );

    expect(output.runtimePack.provenanceVerified).toBe(false);
    expect(output.summary.provenanceBlockedBindingCount).toBeGreaterThan(0);
    expect(output.summary.unresolvedReferenceTypes["asset-provenance"]).toBeGreaterThan(0);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "provenance:items.seed")).toBe(true);
  });

  it("requires explicit durable registry evidence before reporting verified asset IDs", () => {
    const sources = readActiveAssetProvenanceBindingSources();
    const output = buildAssetProvenanceBindingDependencyGraphFromSources(
      { seed: "asset-provenance-registry-seed", plantSampleCount: 2, itemSampleCount: 1 },
      { ...sources, durableRegistry: { registryId: "registry.asset-provenance.v1", contentHash: "a".repeat(64) } },
    );

    expect(output.runtimePack.durableRegistryVerified).toBe(true);
    expect(output.summary.unresolvedReferenceTypes["durable-registry"]).toBe(0);
    expect(output.summary.verifiedAssetIds).toEqual(expect.arrayContaining(["items.seed", "items.buildingCube"]));
    expect(output.graph.issues.some(issue => issue.dependencyKey === "registry:asset-provenance:arcane-frontier-voxel-pixel")).toBe(false);
  });

  it("changes hashes when seed, sampled inputs, manifest, or registry changes", () => {
    const sources = readActiveAssetProvenanceBindingSources();
    const first = buildAssetProvenanceBindingDependencyGraphFromSources({ seed: "asset-provenance-hash-a", plantSampleCount: 2, itemSampleCount: 1 }, sources);
    const differentSeed = buildAssetProvenanceBindingDependencyGraphFromSources({ seed: "asset-provenance-hash-b", plantSampleCount: 2, itemSampleCount: 1 }, sources);
    const differentSample = buildAssetProvenanceBindingDependencyGraphFromSources({ seed: "asset-provenance-hash-a", plantSampleCount: 3, itemSampleCount: 1 }, sources);
    const differentManifest = buildAssetProvenanceBindingDependencyGraphFromSources({ seed: "asset-provenance-hash-a", plantSampleCount: 2, itemSampleCount: 1 }, { ...sources, manifest: { ...sources.manifest, version: "0.3.1" } });
    const differentRegistry = buildAssetProvenanceBindingDependencyGraphFromSources({ seed: "asset-provenance-hash-a", plantSampleCount: 2, itemSampleCount: 1 }, { ...sources, durableRegistry: { registryId: "registry.v1", contentHash: "a".repeat(64) } });

    expect(first.artifact.contentHash).not.toBe(differentSeed.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentSample.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentManifest.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentRegistry.artifact.contentHash);
  });

  it("keeps sample and manifest bounds explicit", () => {
    const sources = readActiveAssetProvenanceBindingSources();
    expect(() => buildAssetProvenanceBindingDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported asset provenance binding graph rules version");
    expect(() => buildAssetProvenanceBindingDependencyGraph({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildAssetProvenanceBindingDependencyGraph({ seed: "seed", plantSampleCount: 0 })).toThrow(`plantSampleCount must be an integer from 1 to ${ASSET_PROVENANCE_BINDING_MAX_PLANT_SAMPLE}`);
    expect(() => buildAssetProvenanceBindingDependencyGraph({ seed: "seed", itemSampleCount: ASSET_PROVENANCE_BINDING_MAX_ITEM_SAMPLE + 1 })).toThrow(`itemSampleCount must be an integer from 1 to ${ASSET_PROVENANCE_BINDING_MAX_ITEM_SAMPLE}`);
    const tooManyEntries = Object.fromEntries(Array.from({ length: ASSET_PROVENANCE_BINDING_MAX_MANIFEST_ENTRIES + 1 }, (_, index) => [`entry-${index}`, sources.manifest.entries["items.seed"]!]));
    expect(() => buildAssetProvenanceBindingDependencyGraphFromSources({ seed: "seed" }, { ...sources, manifest: { ...sources.manifest, entries: tooManyEntries } })).toThrow(`manifest entries must contain 1 to ${ASSET_PROVENANCE_BINDING_MAX_MANIFEST_ENTRIES} entries`);
  });
});
