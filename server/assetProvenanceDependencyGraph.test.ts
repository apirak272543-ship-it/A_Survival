import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ASSET_CREDITS } from "../client/src/game/data/assetProvenance";
import type { AssetPackManifest } from "../client/src/game/assets/assetPackLoader";
import { buildAssetProvenanceDependencyGraph } from "./generators/assetProvenanceDependencyGraph";

const activeManifest = JSON.parse(readFileSync("client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json", "utf8")) as AssetPackManifest;

function build(overrides: Partial<Parameters<typeof buildAssetProvenanceDependencyGraph>[0]> = {}) {
  return buildAssetProvenanceDependencyGraph({
    seed: "asset-proof-seed",
    manifest: activeManifest,
    sampleItemCount: 4,
    samplePlantCount: 4,
    ...overrides,
  });
}

describe("asset provenance dependency graph", () => {
  it("connects sampled item/plant references to the active manifest and reports missing credits", () => {
    const result = build();
    expect(result.artifact.manifestId).toBe("arcane-frontier-voxel-pixel");
    expect(result.artifact.manifestVersion).toBe("0.3.0");
    expect(result.summary.itemCount).toBeGreaterThan(0);
    expect(result.summary.plantCount).toBe(300);
    expect(result.summary.sampledItemCount).toBe(4);
    expect(result.summary.sampledPlantCount).toBe(4);
    expect(result.summary.referencedAssetCount).toBeGreaterThan(0);
    expect(result.summary.manifestAssetMatchCount).toBeGreaterThan(0);
    expect(result.summary.missingCreditCount).toBeGreaterThan(0);
    expect(result.unresolvedReferences.some(reference => reference.referenceType === "asset-credit")).toBe(true);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(result.graph.valid).toBe(false);
  });

  it("is deterministic for the same manifest, seed, credits and sample bounds", () => {
    const first = build({ credits: ASSET_CREDITS });
    const second = build({ credits: ASSET_CREDITS });
    expect(second.artifact).toEqual(first.artifact);
    expect(second.summary).toEqual(first.summary);
    expect(second.unresolvedReferences).toEqual(first.unresolvedReferences);
    expect(second.graph).toEqual(first.graph);
  });

  it("keeps missing manifest and credit references as required blockers", () => {
    const manifest = {
      ...activeManifest,
      entries: { ...activeManifest.entries },
    };
    delete manifest.entries["items.buildingCube"];
    const result = build({ manifest, sampleItemCount: 32, samplePlantCount: 1, credits: [ASSET_CREDITS[0]!] });
    expect(result.summary.missingManifestAssetCount).toBeGreaterThan(0);
    expect(result.unresolvedReferences.some(reference => reference.referenceType === "manifest-asset" && reference.referenceId === "items.buildingCube")).toBe(true);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("rejects future or non-active asset packs before building the graph", () => {
    expect(() => build({ manifest: { ...activeManifest, id: "a-survival-future-pack" } })).toThrow("only accepts active pack");
  });

  it("rejects unsupported rules and unbounded sample counts", () => {
    expect(() => build({ rulesVersion: "asset-provenance-graph-rules.v0" })).toThrow("Unsupported asset provenance graph rules version");
    expect(() => build({ sampleItemCount: 0 })).toThrow("sampleItemCount must be an integer from 1 to 32");
    expect(() => build({ samplePlantCount: 33 })).toThrow("samplePlantCount must be an integer from 1 to 32");
  });
});
