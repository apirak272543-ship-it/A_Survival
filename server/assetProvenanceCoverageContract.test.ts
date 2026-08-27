import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_ITEMS, type ItemDefinition } from "../client/src/game/data/catalog";
import { type AssetCredit } from "../client/src/game/data/assetProvenance";
import { PLANT_CATALOG } from "../client/src/game/data/plantCatalog";
import type { AssetPackManifest } from "../client/src/game/assets/assetPackLoader";
import { buildAssetProvenanceCoverage } from "./generators/assetProvenanceCoverageContract";

const activeManifest = JSON.parse(readFileSync("client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json", "utf8")) as AssetPackManifest;

const projectCredit = (assetId: string): AssetCredit => ({
  assetId,
  category: "item",
  title: `Project asset ${assetId}`,
  creator: "A_Survival project",
  license: "Project-authored asset",
  status: "project-original",
  attribution: `A_Survival project · ${assetId}`,
});

const itemWithIcon = (iconAssetId: string): ItemDefinition => ({
  id: "test-item",
  category: "material",
  name: "Test item",
  tier: "common",
  stackLimit: 1,
  equippable: false,
  tags: ["material"],
  effect: "test",
  iconAssetId,
});

describe("asset provenance coverage contract", () => {
  it("audits the full canonical catalogs and fails closed on missing credits", () => {
    const result = buildAssetProvenanceCoverage({ seed: "coverage-seed", manifest: activeManifest });

    expect(result.artifact.manifestId).toBe("arcane-frontier-voxel-pixel");
    expect(result.artifact.manifestVersion).toBe("0.3.0");
    expect(result.artifact.coverageHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.summary.itemCount).toBe(ALL_ITEMS.length);
    expect(result.summary.plantCount).toBe(PLANT_CATALOG.length);
    expect(result.summary.referenceCount).toBe(ALL_ITEMS.length + PLANT_CATALOG.length * 2);
    expect(result.summary.uniqueAssetCount).toBeGreaterThan(0);
    expect(result.summary.missingManifestCount).toBe(0);
    expect(result.summary.missingSha256Count).toBe(0);
    expect(result.summary.missingCreditCount).toBeGreaterThan(0);
    expect(result.summary.valid).toBe(false);
    expect(result.issues.every(issue => issue.code === "MISSING_CREDIT")).toBe(true);
    expect(result.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("is deterministic and changes its coverage hash when credits change", () => {
    const first = buildAssetProvenanceCoverage({
      seed: "same-seed",
      manifest: activeManifest,
      items: [ALL_ITEMS[0]!],
      plants: [],
    });
    const second = buildAssetProvenanceCoverage({
      seed: "same-seed",
      manifest: activeManifest,
      items: [ALL_ITEMS[0]!],
      plants: [],
    });
    const withCredit = buildAssetProvenanceCoverage({
      seed: "same-seed",
      manifest: activeManifest,
      items: [ALL_ITEMS[0]!],
      plants: [],
      credits: [projectCredit(ALL_ITEMS[0]!.iconAssetId!)],
    });

    expect(second).toEqual(first);
    expect(withCredit.artifact.coverageHash).not.toBe(first.artifact.coverageHash);
    expect(withCredit.summary.creditMatchCount).toBe(1);
    expect(withCredit.summary.valid).toBe(true);
  });

  it("reports missing manifest entries and missing SHA-256 as required blockers", () => {
    const missingManifest = buildAssetProvenanceCoverage({
      seed: "missing-manifest",
      manifest: activeManifest,
      items: [itemWithIcon("items.unknown")],
      plants: [],
      credits: [projectCredit("items.unknown")],
    });
    const manifestWithoutSha = {
      ...activeManifest,
      entries: {
        ...activeManifest.entries,
        "items.blade": { ...activeManifest.entries["items.blade"], sha256: undefined },
      },
    };
    const missingSha = buildAssetProvenanceCoverage({
      seed: "missing-sha",
      manifest: manifestWithoutSha,
      items: [itemWithIcon("items.blade")],
      plants: [],
      credits: [projectCredit("items.blade")],
    });

    expect(missingManifest.summary.missingManifestCount).toBe(1);
    expect(missingManifest.issues.some(issue => issue.code === "MISSING_MANIFEST_ENTRY")).toBe(true);
    expect(missingManifest.summary.valid).toBe(false);
    expect(missingSha.summary.missingSha256Count).toBe(1);
    expect(missingSha.issues.some(issue => issue.code === "MISSING_SHA256")).toBe(true);
    expect(missingSha.summary.valid).toBe(false);
  });

  it("reports manifest kind mismatches and non-distributable credits", () => {
    const kindMismatch = buildAssetProvenanceCoverage({
      seed: "kind-mismatch",
      manifest: activeManifest,
      items: [{ ...itemWithIcon("items.blade"), iconAssetId: undefined, modelAssetId: "items.blade" }],
      plants: [],
      credits: [projectCredit("items.blade")],
    });
    const referenceOnlyCredit: AssetCredit = {
      ...projectCredit("items.blade"),
      status: "reference-only",
      license: "Reference only; not distributable",
    };
    const nonDistributable = buildAssetProvenanceCoverage({
      seed: "reference-only",
      manifest: activeManifest,
      items: [itemWithIcon("items.blade")],
      plants: [],
      credits: [referenceOnlyCredit],
    });

    expect(kindMismatch.summary.kindMismatchCount).toBe(1);
    expect(kindMismatch.issues.some(issue => issue.code === "MANIFEST_KIND_MISMATCH")).toBe(true);
    expect(kindMismatch.summary.valid).toBe(false);
    expect(nonDistributable.summary.nonDistributableCreditCount).toBe(1);
    expect(nonDistributable.issues.some(issue => issue.code === "NON_DISTRIBUTABLE_CREDIT")).toBe(true);
    expect(nonDistributable.summary.valid).toBe(false);
  });

  it("rejects non-active packs, empty seeds and unbounded catalog input", () => {
    expect(() => buildAssetProvenanceCoverage({ seed: "seed", manifest: { ...activeManifest, id: "future-pack" } })).toThrow("only accepts active pack");
    expect(() => buildAssetProvenanceCoverage({ seed: " ", manifest: activeManifest })).toThrow("seed must not be empty");
    expect(() => buildAssetProvenanceCoverage({ seed: "seed", manifest: activeManifest, items: Array.from({ length: 4097 }, () => ALL_ITEMS[0]!) })).toThrow("items must contain at most 4096 entries");
    expect(() => buildAssetProvenanceCoverage({ seed: "seed", manifest: activeManifest, rulesVersion: "asset-provenance-coverage-rules.v0" })).toThrow("Unsupported asset provenance coverage rules version");
  });
});
