import { describe, expect, it } from "vitest";
import { evaluateReferenceUsageBoundary, MAX_REFERENCE_RECORDS, type ReferenceUsageRecord } from "./referenceUsageBoundaryContract";

const baseReferences: ReferenceUsageRecord[] = [
  {
    id: "minecraft-tree-rules",
    title: "Public tree-generation reference",
    sourceUrl: "https://minecraft.wiki/w/Tree_definition",
    sourceLabel: "Minecraft Wiki — Tree definition",
    usage: "design-reference",
    derivation: "mechanics-inspiration",
    usageNote: "Used only to understand bounded stem and foliage concepts.",
    licenseNote: "Reference only; no code or asset redistributed.",
    attribution: "Reference: Minecraft Wiki tree definition",
    copiedCode: false,
    copiedAsset: false,
    brandingReused: false,
    runtimeAssetAllowed: false,
  },
  {
    id: "terraria-biomes",
    title: "Public biome-design reference",
    sourceUrl: "https://terraria.wiki.gg/wiki/Biomes",
    sourceLabel: "Official Terraria Wiki — Biomes",
    usage: "design-reference",
    derivation: "concept-only",
    usageNote: "Used only to compare coordinated terrain and biome concepts.",
    licenseNote: "Reference only; no Terraria asset or code redistributed.",
    attribution: "Reference: Official Terraria Wiki biome documentation",
    copiedCode: false,
    copiedAsset: false,
    brandingReused: false,
    runtimeAssetAllowed: false,
  },
];

describe("reference usage boundary contract", () => {
  it("accepts documented design references without making them runtime assets", () => {
    const result = evaluateReferenceUsageBoundary({ references: baseReferences });

    expect(result).toMatchObject({
      contractVersion: "reference-usage-boundary.v1",
      valid: true,
      issues: [],
      acceptedReferenceIds: ["minecraft-tree-rules", "terraria-biomes"],
      summary: { totalCount: 2, designReferenceCount: 2, documentationOnlyCount: 0, copiedCodeCount: 0, copiedAssetCount: 0, brandingReuseCount: 0, runtimeAllowedCount: 0 },
    });
  });

  it("normalizes order deterministically and supports documentation-only usage", () => {
    const documentationOnly: ReferenceUsageRecord = { ...baseReferences[0]!, id: "license-note", usage: "documentation-only", derivation: "terminology" };
    const first = evaluateReferenceUsageBoundary({ references: [documentationOnly, baseReferences[1]!] });
    const second = evaluateReferenceUsageBoundary({ references: [baseReferences[1]!, documentationOnly] });

    expect(second).toEqual(first);
    expect(first.summary.documentationOnlyCount).toBe(1);
    expect(first.acceptedReferenceIds).toEqual(["license-note", "terraria-biomes"]);
  });

  it("rejects copied code/assets/branding and runtime reference use", () => {
    const result = evaluateReferenceUsageBoundary({ references: [{ ...baseReferences[0]!, copiedCode: true, copiedAsset: true, brandingReused: true, runtimeAssetAllowed: true }] });

    expect(result.valid).toBe(false);
    expect(result.summary).toMatchObject({ copiedCodeCount: 1, copiedAssetCount: 1, brandingReuseCount: 1, runtimeAllowedCount: 1 });
    expect(result.issues).toEqual(expect.arrayContaining([
      "reference cannot copy code: minecraft-tree-rules",
      "reference cannot copy asset: minecraft-tree-rules",
      "reference cannot reuse branding: minecraft-tree-rules",
      "reference-only material cannot be runtime asset: minecraft-tree-rules",
    ]));
  });

  it("rejects incomplete metadata, duplicate IDs and unbounded lists", () => {
    const incomplete = { ...baseReferences[0]!, id: "bad-reference", sourceUrl: "http://example.com", usageNote: "", licenseNote: "", attribution: "" };
    const result = evaluateReferenceUsageBoundary({ references: [incomplete, { ...incomplete }] });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "reference sourceUrl must use https: bad-reference",
      "reference usageNote is missing: bad-reference",
      "reference licenseNote is missing: bad-reference",
      "reference attribution is missing: bad-reference",
      "duplicate reference ID: bad-reference",
    ]));
    expect(() => evaluateReferenceUsageBoundary({ references: Array.from({ length: MAX_REFERENCE_RECORDS + 1 }, (_, index) => ({ ...baseReferences[0]!, id: `reference-${index}` })) })).toThrow("references must contain at most 128 entries");
  });
});
