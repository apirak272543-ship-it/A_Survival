import { describe, expect, it } from "vitest";
import { ASSET_CREDITS, type AssetCredit } from "../client/src/game/data/assetProvenance";
import { createCreditsPresentation, getCreditsSection } from "../client/src/game/systems/creditsPresentationContract";

describe("credits presentation contract", () => {
  it("separates the real project and reference credits without changing provenance", () => {
    const presentation = createCreditsPresentation();
    expect(presentation).toMatchObject({ contractVersion: "credits-presentation-contract.v1", valid: true, rejected: [], policy: { runtimeAssetDistributionAllowed: false, runtimeAssetPublishAllowed: false, referenceOnlySeparated: true, playerUiIntegration: false, persistenceWriteAllowed: false } });
    expect(presentation.acceptedEntries).toHaveLength(ASSET_CREDITS.length);
    expect(getCreditsSection(presentation, "project-assets")?.entries.map(entry => entry.assetId)).toEqual(["pack.arcane-frontier-voxel-pixel"]);
    expect(getCreditsSection(presentation, "reference-only")?.entries.map(entry => entry.assetId)).toEqual(["reference.minecraft-tree-rules", "reference.terraria.biomes"]);
    expect(getCreditsSection(presentation, "reference-only")?.entries.every(entry => entry.distributionAllowed === false && entry.reviewRequired === false && entry.sourceStatus === "linked")).toBe(true);
  });

  it("marks only project-original and license-verified rows as distributable", () => {
    const custom: AssetCredit[] = [
      { assetId: "asset.project", category: "item", title: "Project", creator: "A_Survival", status: "project-original", attribution: "Original" },
      { assetId: "asset.licensed", category: "tool", title: "Licensed", creator: "Creator", status: "license-verified", license: "CC-BY", attribution: "Licensed", sourceUrl: "https://example.test/licensed" },
      { assetId: "asset.pending", category: "item", title: "Pending", creator: "Creator", status: "awaiting-contact", attribution: "Pending" },
      { assetId: "asset.reference", category: "tree", title: "Reference", creator: "Docs", status: "reference-only", attribution: "Reference", sourceUrl: "https://example.test/reference" },
    ];
    const presentation = createCreditsPresentation(custom);
    expect(presentation.valid).toBe(true);
    expect(presentation.acceptedEntries.filter(entry => entry.distributionAllowed).map(entry => entry.assetId)).toEqual(["asset.licensed", "asset.project"]);
    expect(getCreditsSection(presentation, "needs-review")?.entries.map(entry => entry.assetId)).toEqual(["asset.pending"]);
    expect(getCreditsSection(presentation, "needs-review")?.entries[0]?.reviewRequired).toBe(true);
    expect(getCreditsSection(presentation, "reference-only")?.entries[0]?.distributionAllowed).toBe(false);
  });

  it("rejects malformed, unknown and duplicate rows while preserving valid sections", () => {
    const valid: AssetCredit = { assetId: "asset.valid", category: "item", title: "Valid", creator: "Creator", status: "project-original", attribution: "Original" };
    const presentation = createCreditsPresentation([valid, valid, { assetId: "asset.bad-category", category: "future", title: "Bad category", creator: "Creator", status: "project-original", attribution: "Bad" }, { assetId: "asset.bad-status", category: "item", title: "Bad", creator: "Creator", status: "future", attribution: "Bad" }, { assetId: "asset.bad-url", category: "item", title: "Bad URL", creator: "Creator", status: "reference-only", sourceUrl: "javascript:alert(1)", attribution: "Bad" }]);
    expect(presentation.valid).toBe(false);
    expect(presentation.acceptedEntries.map(entry => entry.assetId)).toEqual(["asset.valid"]);
    expect(presentation.rejected).toEqual([{ value: "asset.valid", reason: "duplicate-asset-id" }, { value: "asset.bad-category", reason: "unknown-category" }, { value: "asset.bad-status", reason: "unknown-status" }, { value: "asset.bad-url", reason: "malformed-row" }]);
    expect(getCreditsSection(presentation, "project-assets")).toBeUndefined();
  });

  it("returns empty sections and a rejection for non-array input", () => {
    const presentation = createCreditsPresentation({ credits: [] });
    expect(presentation.valid).toBe(false);
    expect(presentation.acceptedEntries).toEqual([]);
    expect(presentation.sections).toHaveLength(4);
    expect(presentation.sections.every(section => section.entries.length === 0)).toBe(true);
    expect(presentation.rejected).toEqual([{ value: null, reason: "input-not-array" }]);
  });

  it("keeps section ordering deterministic and rejects invalid section lookup", () => {
    const presentation = createCreditsPresentation([...ASSET_CREDITS].reverse());
    expect(presentation.sections.map(section => section.id)).toEqual(["project-assets", "licensed-assets", "reference-only", "needs-review"]);
    expect(presentation.acceptedEntries.map(entry => entry.assetId)).toEqual(["pack.arcane-frontier-voxel-pixel", "reference.minecraft-tree-rules", "reference.terraria.biomes"]);
    expect(getCreditsSection(presentation, "future-section")).toBeUndefined();
    expect(getCreditsSection({ ...presentation, valid: false }, "project-assets")).toBeUndefined();
  });
});
