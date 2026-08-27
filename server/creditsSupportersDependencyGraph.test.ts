import { describe, expect, it } from "vitest";
import { ASSET_CREDITS, type AssetCredit } from "../client/src/game/data/assetProvenance";
import {
  CREDITS_SUPPORTERS_MAX_SAMPLE_COUNT,
  buildCreditsSupportersDependencyGraph,
  buildCreditsSupportersDependencyGraphFromSources,
  readActiveCreditsSupportersSources,
} from "./generators/creditsSupportersDependencyGraph";

describe("credits supporters dependency graph", () => {
  it("audits the current runtime/reference-only split without claiming a Credits UI", () => {
    const first = buildCreditsSupportersDependencyGraph({ seed: "c03-canonical", sampleCount: ASSET_CREDITS.length });
    const second = buildCreditsSupportersDependencyGraph({ seed: "c03-canonical", sampleCount: ASSET_CREDITS.length });

    expect(first.summary).toMatchObject({
      creditCount: 3,
      sampleCount: 3,
      uniqueAssetIdCount: 3,
      distributableCount: 1,
      projectOriginalCount: 1,
      licenseVerifiedCount: 0,
      referenceOnlyCount: 2,
      awaitingContactCount: 0,
      categoryCounts: { tool: 1, tree: 1, terrain: 1 },
      statusCounts: { "project-original": 1, "reference-only": 2 },
      issueCounts: {},
      runtimeReferencePolicy: {
        projectOriginalOrLicenseVerifiedMayDistribute: true,
        referenceOnlyIsNeverRuntimeDistributable: true,
        awaitingContactIsNeverRuntimeDistributable: true,
        sourceAndLicenseDisclosureRequired: true,
        creditsUiNavigationPresent: false,
        supportersContactWorkflowPresent: false,
        outputIsAuditOnly: true,
      },
    });
    expect(first.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.graph.valid).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("keeps awaiting-contact rows non-distributable when source and license disclosure are present", () => {
    const source: AssetCredit = {
      assetId: "community.example-plant",
      category: "plant",
      title: "Community plant reference",
      creator: "Example creator",
      sourceUrl: "https://example.com/contact",
      sourceLabel: "Creator contact page",
      license: "Pending permission review",
      status: "awaiting-contact",
      attribution: "Example creator · pending contact",
      notes: "Reference is not runtime eligible until contact and license review complete.",
    };
    const output = buildCreditsSupportersDependencyGraphFromSources({ seed: "c03-contact", sampleCount: 1 }, { credits: [source] });
    expect(output.summary).toMatchObject({ creditCount: 1, sampleCount: 1, distributableCount: 0, awaitingContactCount: 1, issueCounts: {} });
    expect(output.graph.valid).toBe(true);
  });

  it("turns missing disclosure and invalid identity/category into blockers", () => {
    const invalid = {
      ...ASSET_CREDITS[0]!,
      assetId: "BAD ID",
      category: "unknown" as never,
      title: "",
      creator: "",
      attribution: "",
      license: undefined,
      status: "reference-only" as const,
      sourceUrl: undefined,
      sourceLabel: undefined,
    } satisfies AssetCredit;
    const output = buildCreditsSupportersDependencyGraphFromSources(
      { seed: "c03-invalid", sampleCount: 2 },
      { credits: [invalid, ASSET_CREDITS[1]!] },
    );

    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts["asset-id-invalid"]).toBe(1);
    expect(output.summary.issueCounts["category-invalid"]).toBe(1);
    expect(output.summary.issueCounts["title-missing"]).toBe(1);
    expect(output.summary.issueCounts["creator-missing"]).toBe(1);
    expect(output.summary.issueCounts["attribution-missing"]).toBe(1);
    expect(output.summary.issueCounts["license-missing"]).toBe(1);
    expect(output.summary.issueCounts["reference-source-missing"]).toBe(1);
    expect(output.summary.issueCounts["reference-license-missing"]).toBe(1);
  });

  it("rejects unknown statuses and duplicate asset IDs instead of normalizing them away", () => {
    const source = ASSET_CREDITS[1]!;
    const unknownStatus = { ...source, assetId: "community.unknown-status", status: "unknown" as never } satisfies AssetCredit;
    const output = buildCreditsSupportersDependencyGraphFromSources(
      { seed: "c03-identity", sampleCount: 3 },
      { credits: [source, source, unknownStatus] },
    );

    expect(output.summary.uniqueAssetIdCount).toBe(2);
    expect(output.summary.issueCounts["duplicate-asset-id"]).toBe(1);
    expect(output.summary.issueCounts["status-invalid"]).toBe(1);
    expect(output.graph.valid).toBe(false);
  });

  it("changes the artifact hash when provenance data changes and rejects invalid bounds", () => {
    const sources = readActiveCreditsSupportersSources();
    const original = buildCreditsSupportersDependencyGraphFromSources({ seed: "c03-hash", sampleCount: 2 }, sources);
    const changed = buildCreditsSupportersDependencyGraphFromSources(
      { seed: "c03-hash", sampleCount: 2 },
      { credits: sources.credits.map((credit, index) => index === 0 ? { ...credit, notes: "changed" } : credit) },
    );
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildCreditsSupportersDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildCreditsSupportersDependencyGraph({ seed: "c03", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildCreditsSupportersDependencyGraph({ seed: "c03", sampleCount: CREDITS_SUPPORTERS_MAX_SAMPLE_COUNT + 1 })).toThrow(/sampleCount/);
  });

  it("keeps partial source audits bounded while preserving the audit-only runtime policy", () => {
    const source = readActiveCreditsSupportersSources().credits[0]!;
    const output = buildCreditsSupportersDependencyGraphFromSources({ seed: "c03-partial", sampleCount: 1 }, { credits: [source] });
    expect(output.summary.creditCount).toBe(1);
    expect(output.summary.sampleCount).toBe(1);
    expect(output.summary.runtimeReferencePolicy.outputIsAuditOnly).toBe(true);
    expect(output.graph.valid).toBe(true);
  });
});
