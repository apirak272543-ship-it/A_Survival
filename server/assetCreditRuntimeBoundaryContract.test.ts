import { describe, expect, it } from "vitest";
import { ASSET_CREDITS, type AssetCredit } from "../client/src/game/data/assetProvenance";
import {
  evaluateAssetCreditRuntimeBoundary,
  MAX_ASSET_CREDITS,
  MAX_REQUIRED_RUNTIME_ASSET_IDS,
} from "./assetCreditRuntimeBoundaryContract";

function evaluate(credits: readonly AssetCredit[] = ASSET_CREDITS, requiredRuntimeAssetIds?: readonly string[]) {
  return evaluateAssetCreditRuntimeBoundary({ credits, requiredRuntimeAssetIds });
}

describe("asset credit runtime boundary contract", () => {
  it("separates project runtime credit from reference-only credits", () => {
    const result = evaluate(ASSET_CREDITS, ["pack.arcane-frontier-voxel-pixel"]);

    expect(result.valid).toBe(true);
    expect(result.runtimeDistributionAllowed).toBe(true);
    expect(result.runtimeAssetIds).toEqual(["pack.arcane-frontier-voxel-pixel"]);
    expect(result.referenceOnlyAssetIds).toEqual(["reference.minecraft-tree-rules", "reference.terraria.biomes"]);
    expect(result.needsReviewAssetIds).toEqual([]);
    expect(result.summary).toMatchObject({ totalCount: 3, runtimeDistributableCount: 1, referenceOnlyCount: 2, needsReviewCount: 0, missingRequiredRuntimeAssetCount: 0 });
  });

  it("is deterministic and normalizes category counts", () => {
    const first = evaluate([...ASSET_CREDITS].reverse());
    const second = evaluate([...ASSET_CREDITS].reverse());

    expect(second).toEqual(first);
    expect(first.summary.categoryCounts).toMatchObject({ terrain: 1, tree: 1, tool: 1 });
  });

  it("keeps incomplete or awaiting-contact provenance out of runtime", () => {
    const incomplete: AssetCredit = {
      assetId: "audio.unreviewed",
      category: "audio",
      title: "Unreviewed voice",
      creator: "Unknown creator",
      status: "awaiting-contact",
      attribution: "Pending contact",
    };
    const missingLicense: AssetCredit = {
      assetId: "audio.licensed",
      category: "audio",
      title: "Licensed voice",
      creator: "Studio",
      sourceUrl: "https://example.com/license",
      status: "license-verified",
      attribution: "Studio · licensed voice",
    };
    const result = evaluate([incomplete, missingLicense], ["audio.unreviewed", "audio.licensed"]);

    expect(result.valid).toBe(false);
    expect(result.runtimeDistributionAllowed).toBe(false);
    expect(result.needsReviewAssetIds).toEqual(["audio.licensed", "audio.unreviewed"]);
    expect(result.summary.missingRequiredRuntimeAssetCount).toBe(2);
    expect(result.issues).toEqual(expect.arrayContaining([
      "runtime asset license is missing: audio.licensed",
      "required runtime asset credit is not distributable: audio.licensed",
      "required runtime asset credit is not distributable: audio.unreviewed",
    ]));
  });

  it("rejects duplicate IDs, incomplete references and unbounded lists", () => {
    const reference: AssetCredit = {
      assetId: "reference.missing",
      category: "terrain",
      title: "Reference",
      creator: "Source",
      status: "reference-only",
      attribution: "Reference only",
    };
    const result = evaluate([reference, { ...reference }]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "reference-only sourceUrl is missing: reference.missing",
      "reference-only sourceLabel is missing: reference.missing",
      "reference-only license is missing: reference.missing",
      "duplicate asset credit ID: reference.missing",
    ]));
    expect(() => evaluate(Array.from({ length: MAX_ASSET_CREDITS + 1 }, (_, index) => ({ ...ASSET_CREDITS[0]!, assetId: `asset.${index}` })))).toThrow("credits must contain at most 512 entries");
    expect(() => evaluate(ASSET_CREDITS, Array.from({ length: MAX_REQUIRED_RUNTIME_ASSET_IDS + 1 }, (_, index) => `asset.${index}`))).toThrow("requiredRuntimeAssetIds must contain at most 128 entries");
  });
});
