import { describe, expect, it } from "vitest";
import { ASSET_CREDITS } from "../client/src/game/data/assetProvenance";
import {
  buildCreditsSupportersProvenanceDependencyGraph,
  buildCreditsSupportersProvenanceDependencyGraphFromSources,
  CREDITS_SUPPORTERS_PROVENANCE_GRAPH_RULES_VERSION,
  CREDITS_SUPPORTERS_PROVENANCE_MAX_RECORDS,
  readActiveCreditsSupportersProvenanceSources,
  type SupporterProvenanceRecord,
} from "./generators/creditsSupportersProvenanceDependencyGraph";

describe("credits and supporters provenance dependency graph", () => {
  it("audits canonical credits deterministically and blocks absent supporters/durable registry", () => {
    const input = { seed: "credits-supporters-provenance-seed" };
    const first = buildCreditsSupportersProvenanceDependencyGraph(input);
    const second = buildCreditsSupportersProvenanceDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({
      generatorId: "credits.supporters.provenance",
      generatorVersion: "1.0.0",
      schemaVersion: "a-survival.credits-supporters-provenance.v1",
      seed: input.seed,
      rulesVersion: CREDITS_SUPPORTERS_PROVENANCE_GRAPH_RULES_VERSION,
      creditCount: ASSET_CREDITS.length,
      supporterCount: 0,
    });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.creditHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.supporterHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.credits).toHaveLength(3);
    expect(first.summary).toMatchObject({
      creditCount: 3,
      verifiedCreditCount: 1,
      referenceOnlyCreditCount: 2,
      invalidCreditCount: 0,
      supporterRegistryPresent: false,
      supporterCount: 0,
      verifiedSupporterCount: 0,
      blockedSupporterCount: 0,
    });
    expect(first.summary.verifiedCreditIds).toEqual([]);
    expect(first.summary.blockedCreditIds).toEqual(["pack.arcane-frontier-voxel-pixel", "reference.minecraft-tree-rules", "reference.terraria.biomes"]);
    expect(first.summary.unresolvedReferenceTypes["credit-record"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["credit-status"]).toBe(2);
    expect(first.summary.unresolvedReferenceTypes["supporter-record"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["supporter-consent"]).toBe(0);
    expect(first.summary.unresolvedReferenceTypes["supporter-registry"]).toBe(1);
    expect(first.summary.unresolvedReferenceTypes["durable-registry"]).toBe(1);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "supporters:registry")).toBe(true);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "registry:credits-supporters")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("accepts explicit supporter consent and durable registry evidence without treating pending consent as verified", () => {
    const sources = readActiveCreditsSupportersProvenanceSources();
    const supporters: SupporterProvenanceRecord[] = [
      { supporterId: "supporter-accepted", displayName: "A_Survival Test Team", contribution: "testing", consentStatus: "granted", attribution: "Testing support acknowledged by the project" },
      { supporterId: "supporter-pending", displayName: "Pending Contributor", contribution: "community", consentStatus: "pending", attribution: "Consent has not been confirmed" },
      { supporterId: "supporter-withdrawn", displayName: "Withdrawn Contributor", contribution: "design", consentStatus: "withdrawn", attribution: "Attribution withdrawn" },
      { supporterId: "supporter-reference", displayName: "Reference Community", contribution: "reference", consentStatus: "reference-only", attribution: "Reference context only" },
    ];
    const output = buildCreditsSupportersProvenanceDependencyGraphFromSources(
      { seed: "credits-supporters-consent-seed" },
      { ...sources, supporters, durableRegistry: { registryId: "registry.credits-supporters.v1", contentHash: "a".repeat(64) } },
    );

    expect(output.summary.supporterRegistryPresent).toBe(true);
    expect(output.summary.supporterCount).toBe(4);
    expect(output.summary.verifiedSupporterCount).toBe(1);
    expect(output.summary.blockedSupporterCount).toBe(3);
    expect(output.summary.verifiedSupporterIds).toEqual(["supporter-accepted"]);
    expect(output.summary.blockedSupporterIds).toEqual(["supporter-pending", "supporter-reference", "supporter-withdrawn"]);
    expect(output.summary.unresolvedReferenceTypes["supporter-registry"]).toBe(0);
    expect(output.summary.unresolvedReferenceTypes["durable-registry"]).toBe(0);
    expect(output.summary.unresolvedReferenceTypes["supporter-consent"]).toBe(3);
    expect(output.graph.issues.some(issue => issue.dependencyKey === "supporter-consent:supporter-pending")).toBe(true);
    expect(output.graph.issues.some(issue => issue.dependencyKey === "supporter-consent:supporter-reference")).toBe(true);
    expect(output.graph.issues.some(issue => issue.dependencyKey === "supporter-consent:supporter-withdrawn")).toBe(true);
    expect(output.graph.issues.some(issue => issue.dependencyKey === "supporter-consent:supporter-accepted")).toBe(false);
  });

  it("blocks malformed and duplicate credit/supporter records instead of silently normalizing them", () => {
    const sources = readActiveCreditsSupportersProvenanceSources();
    const duplicateCredit = { ...sources.credits[0]! };
    const malformedSupporter: SupporterProvenanceRecord = { supporterId: "", displayName: "", contribution: "community", consentStatus: "granted", attribution: "" };
    const output = buildCreditsSupportersProvenanceDependencyGraphFromSources(
      { seed: "credits-supporters-record-seed" },
      { ...sources, credits: [...sources.credits, duplicateCredit], supporters: [malformedSupporter, { ...malformedSupporter }] },
    );

    expect(output.summary.invalidCreditCount).toBe(0);
    expect(output.summary.unresolvedReferenceTypes["credit-record"]).toBe(1);
    expect(output.summary.unresolvedReferenceTypes["supporter-record"]).toBe(2);
    expect(output.summary.unresolvedReferenceTypes["supporter-consent"]).toBe(2);
    expect(output.graph.issues.some(issue => issue.dependencyKey === "credit-record:pack.arcane-frontier-voxel-pixel")).toBe(true);
    expect(output.graph.issues.some(issue => issue.dependencyKey === "supporter-record:unknown")).toBe(true);
  });

  it("changes hashes when credits, supporters, or seed change", () => {
    const sources = readActiveCreditsSupportersProvenanceSources();
    const supporters: SupporterProvenanceRecord[] = [{ supporterId: "supporter-hash", displayName: "Hash Test", contribution: "testing", consentStatus: "granted", attribution: "Hash test attribution" }];
    const first = buildCreditsSupportersProvenanceDependencyGraphFromSources({ seed: "credits-hash-a" }, { ...sources, supporters, durableRegistry: { registryId: "registry.v1", contentHash: "a".repeat(64) } });
    const differentSeed = buildCreditsSupportersProvenanceDependencyGraphFromSources({ seed: "credits-hash-b" }, { ...sources, supporters, durableRegistry: { registryId: "registry.v1", contentHash: "a".repeat(64) } });
    const differentSupporter = buildCreditsSupportersProvenanceDependencyGraphFromSources({ seed: "credits-hash-a" }, { ...sources, supporters: [{ ...supporters[0]!, displayName: "Changed Hash Test" }], durableRegistry: { registryId: "registry.v1", contentHash: "a".repeat(64) } });
    const differentCredit = buildCreditsSupportersProvenanceDependencyGraphFromSources({ seed: "credits-hash-a" }, { ...sources, credits: [{ ...sources.credits[0]!, attribution: "Changed attribution" }], supporters, durableRegistry: { registryId: "registry.v1", contentHash: "a".repeat(64) } });

    expect(first.artifact.contentHash).not.toBe(differentSeed.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentSupporter.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentCredit.artifact.contentHash);
  });

  it("rejects unsupported rules, empty seeds, and unbounded record sources", () => {
    const sources = readActiveCreditsSupportersProvenanceSources();
    expect(() => buildCreditsSupportersProvenanceDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported credits/supporters provenance graph rules version");
    expect(() => buildCreditsSupportersProvenanceDependencyGraph({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildCreditsSupportersProvenanceDependencyGraphFromSources({ seed: "seed" }, { ...sources, credits: Array.from({ length: CREDITS_SUPPORTERS_PROVENANCE_MAX_RECORDS + 1 }, () => sources.credits[0]!) })).toThrow(`credits must contain at most ${CREDITS_SUPPORTERS_PROVENANCE_MAX_RECORDS} records`);
    expect(() => buildCreditsSupportersProvenanceDependencyGraphFromSources({ seed: "seed" }, { ...sources, supporters: Array.from({ length: CREDITS_SUPPORTERS_PROVENANCE_MAX_RECORDS + 1 }, (_, index) => ({ supporterId: `supporter-${index}`, displayName: "Bounded", contribution: "testing", consentStatus: "granted", attribution: "Bounded test" })) })).toThrow(`supporters must contain at most ${CREDITS_SUPPORTERS_PROVENANCE_MAX_RECORDS} records`);
  });
});
