import { describe, expect, it } from "vitest";
import {
  BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT,
  BLOCK_SUPPORT_GRAVITY_RULES_VERSION,
} from "./generators/blockSupportGravityDependencyGraph";
import {
  auditBlockSupportGravityCoverage,
  BLOCK_SUPPORT_GRAVITY_COVERAGE_VERSION,
} from "./blockSupportGravityCoverageContract";

describe("block support gravity coverage contract", () => {
  it("audits the canonical B-03 source and dependency graph", () => {
    const report = auditBlockSupportGravityCoverage();

    expect(report.version).toBe(BLOCK_SUPPORT_GRAVITY_COVERAGE_VERSION);
    expect(report.source).toBe("block-support-gravity-generator");
    expect(report.input).toEqual({ seed: "block-support-gravity-b03", sampleCount: BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT });
    expect(report.coverage.definitionCount).toBeGreaterThan(0);
    expect(report.coverage.uniqueDefinitionCount).toBe(report.coverage.definitionCount);
    expect(report.coverage.supportRequiredCount).toBeGreaterThan(0);
    expect(report.coverage.gravityAffectedCount).toBeGreaterThan(0);
    expect(report.coverage.sampledDefinitionIds).toHaveLength(report.coverage.definitionCount);
    expect(report.graph).toMatchObject({ valid: true, nodeCount: 3, issueCount: 0 });
    expect(report.graph.topologicalOrder).toHaveLength(3);
    expect(report.hashes.artifactContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(report.hashes.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(report.blockers).toEqual([]);
    expect(report.status).toBe("complete");
  });

  it("preserves support/gravity invariants and audit-only policy", () => {
    const report = auditBlockSupportGravityCoverage({ seed: "fixture", sampleCount: 1 });

    expect(report.input).toEqual({ seed: "fixture", sampleCount: 1 });
    expect(report.coverage.sampledDefinitionIds).toHaveLength(1);
    expect(report.coverage.issueCounts).toEqual({});
    expect(report.policy).toEqual({
      supportsOnlySolidNonNoneCollision: true,
      gravityTargetsOnlyNonFloatingDefinitions: true,
      placementRejectsUnsupportedBlocks: true,
      brokenBlocksDoNotSupport: true,
      terrainSupportCallbackIsAllowed: true,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      outputIsAuditOnly: true,
    });
    expect(report.graph.topologicalOrder.every(key => key.includes(BLOCK_SUPPORT_GRAVITY_RULES_VERSION) || key.includes("b03"))).toBe(true);
  });

  it("is deterministic for identical seeds and sample counts", () => {
    const input = { seed: "deterministic-b03", sampleCount: 4 };
    const first = auditBlockSupportGravityCoverage(input);
    const second = auditBlockSupportGravityCoverage(input);

    expect(first).toEqual(second);
    expect(first.hashes).toEqual(second.hashes);
    expect(first.coverage.sampledDefinitionIds).toEqual([...first.coverage.sampledDefinitionIds].sort());
  });

  it("keeps the existing fail-closed input bounds", () => {
    expect(() => auditBlockSupportGravityCoverage({ seed: "" })).toThrow("B-03 seed must be 1–128 characters");
    expect(() => auditBlockSupportGravityCoverage({ seed: "fixture", sampleCount: 0 })).toThrow("B-03 sampleCount must be an integer from 1 to 32");
    expect(() => auditBlockSupportGravityCoverage({ seed: "fixture", sampleCount: 33 })).toThrow("B-03 sampleCount must be an integer from 1 to 32");
  });
});
