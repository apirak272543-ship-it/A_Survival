import { describe, expect, it } from "vitest";
import {
  ASSET_CREDITS,
  auditAssetCredits,
  canDistributeAsset,
  validateAssetCredit,
  type AssetCredit,
} from "../client/src/game/data/assetProvenance";

describe("asset credit runtime/reference-only boundary", () => {
  it("audits canonical credits without treating references as distributable assets", () => {
    const audit = auditAssetCredits();

    expect(audit).toEqual(auditAssetCredits());
    expect(audit.summary).toMatchObject({
      total: 3,
      valid: 1,
      blocked: 2,
      distributable: 1,
      runtimeEligible: 1,
      referenceOnly: 2,
      awaitingContact: 0,
    });
    expect(audit.records.find(record => record.assetId === "pack.arcane-frontier-voxel-pixel")).toMatchObject({
      status: "project-original",
      distributable: true,
      runtimeEligible: true,
      referenceOnly: false,
      issueTypes: [],
    });
    expect(audit.records.filter(record => record.referenceOnly)).toHaveLength(2);
    expect(audit.records.filter(record => record.referenceOnly).every(record => !record.distributable && !record.runtimeEligible && record.issueTypes.includes("reference-only-runtime"))).toBe(true);
    expect(audit.contentFingerprint).toContain("reference.minecraft-tree-rules");
  });

  it("requires source, license, attribution, and labels for non-original credits", () => {
    const validLicense: AssetCredit = {
      assetId: "asset.verified.example",
      category: "item",
      title: "Verified item art",
      creator: "Example creator",
      sourceUrl: "https://example.com/license",
      sourceLabel: "Example license page",
      license: "CC BY 4.0",
      status: "license-verified",
      attribution: "Example creator · CC BY 4.0",
    };
    const awaitingContact: AssetCredit = { ...validLicense, assetId: "asset.awaiting.example", status: "awaiting-contact" };
    const missingEvidence: AssetCredit = { ...validLicense, assetId: "asset.missing.example", sourceUrl: undefined, sourceLabel: undefined, license: undefined, attribution: "" };
    const audit = auditAssetCredits([validLicense, awaitingContact, missingEvidence]);

    expect(audit.records.find(record => record.assetId === validLicense.assetId)).toMatchObject({ distributable: true, runtimeEligible: true, issueTypes: [] });
    expect(audit.records.find(record => record.assetId === awaitingContact.assetId)).toMatchObject({ distributable: false, runtimeEligible: false, issueTypes: ["awaiting-contact-runtime"] });
    expect(audit.records.find(record => record.assetId === missingEvidence.assetId)?.issueTypes).toEqual(expect.arrayContaining(["missing-attribution", "missing-license", "missing-source-url", "missing-source-label"]));
    expect(audit.summary.awaitingContact).toBe(1);
    expect(audit.summary.runtimeEligible).toBe(1);
  });

  it("blocks duplicate IDs, malformed status/category/URLs, and never mutates input", () => {
    const duplicate: AssetCredit = { ...ASSET_CREDITS[0]! };
    const malformed = { ...ASSET_CREDITS[1]!, assetId: "BAD ID", category: "unknown" as AssetCredit["category"], status: "unknown" as AssetCredit["status"], sourceUrl: "ftp://not-http.example", creator: "", title: "", attribution: "" };
    const source = [duplicate, { ...duplicate }, malformed];
    const before = JSON.stringify(source);
    const audit = auditAssetCredits(source);

    expect(JSON.stringify(source)).toBe(before);
    expect(audit.summary.blocked).toBe(3);
    expect(audit.issueCounts["duplicate-id"]).toBeGreaterThan(0);
    expect(audit.issueCounts["invalid-id"]).toBeGreaterThan(0);
    expect(audit.issueCounts["invalid-category"]).toBeGreaterThan(0);
    expect(audit.issueCounts["invalid-status"]).toBeGreaterThan(0);
    expect(audit.issueCounts["invalid-source-url"]).toBeGreaterThan(0);
    expect(validateAssetCredit(malformed)).toEqual(expect.arrayContaining(["invalid-id", "invalid-category", "invalid-status", "missing-title", "missing-creator", "missing-attribution", "invalid-source-url"]));
  });

  it("preserves the simple runtime gate for the canonical statuses", () => {
    expect(canDistributeAsset({ ...ASSET_CREDITS[0]!, status: "project-original" })).toBe(true);
    expect(canDistributeAsset({ ...ASSET_CREDITS[0]!, status: "license-verified" })).toBe(true);
    expect(canDistributeAsset({ ...ASSET_CREDITS[0]!, status: "awaiting-contact" })).toBe(false);
    expect(canDistributeAsset({ ...ASSET_CREDITS[0]!, status: "reference-only" })).toBe(false);
    expect(canDistributeAsset(undefined)).toBe(false);
  });

  it("changes the deterministic fingerprint when credit evidence changes and enforces bounds", () => {
    const original = auditAssetCredits();
    const changed = auditAssetCredits([{ ...ASSET_CREDITS[0]!, attribution: "Changed attribution" }, ...ASSET_CREDITS.slice(1)]);

    expect(original.contentFingerprint).not.toBe(changed.contentFingerprint);
    expect(() => auditAssetCredits([], { maxCredits: 0 })).toThrow("maxCredits must be an integer from 1 to 256");
    expect(() => auditAssetCredits(Array.from({ length: 257 }, (_, index) => ({ ...ASSET_CREDITS[0]!, assetId: `asset-${index}` })))).toThrow("credits must contain at most 256 records");
    expect(() => auditAssetCredits(ASSET_CREDITS, { maxCredits: 2 })).toThrow("credits must contain at most 2 records");
  });
});
