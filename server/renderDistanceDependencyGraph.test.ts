import { describe, expect, it } from "vitest";
import { getBlockRenderDistanceConfig } from "../client/src/game/systems/renderDistance";
import {
  RENDER_DISTANCE_AUDIT_MAX_SAMPLE_COUNT,
  buildRenderDistanceDependencyGraph,
  buildRenderDistanceDependencyGraphFromSources,
  readActiveRenderDistanceAuditSources,
  type RenderDistanceAuditSources,
} from "./generators/renderDistanceDependencyGraph";

describe("render distance dependency graph", () => {
  it("audits the canonical 5–50 block steps and 5–60 plus 120 target FPS options", () => {
    const first = buildRenderDistanceDependencyGraph({ seed: "s03-canonical", sampleCount: 1 });
    const second = buildRenderDistanceDependencyGraph({ seed: "s03-canonical", sampleCount: 1 });

    expect(first.summary).toMatchObject({
      viewDistanceSteps: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
      targetFpsOptions: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 120],
      viewDistanceMin: 5,
      viewDistanceMax: 50,
      viewDistanceStep: 5,
      lowTargetFpsMin: 5,
      lowTargetFpsMax: 60,
      highRefreshTargetFps: 120,
      defaultViewDistanceBlocks: 25,
      defaultTargetFps: 60,
      persistenceOwnerPresent: true,
      streamingPolicyExplicit: true,
      highRefreshDisclaimerPresent: false,
      normalizationProof: {
        invalidViewDistanceFallsBackTo25: true,
        invalidTargetFpsFallsBackTo60: true,
        nearViewDistanceNormalizesTo5: true,
        nearTargetFpsNormalizesTo5: true,
        highTargetFpsNormalizesTo120: true,
      },
      issueCounts: { "high-refresh-disclaimer-missing": 1 },
      policy: {
        allowedViewDistanceRange: "5–50 blocks",
        allowedViewDistanceStep: 5,
        allowedTargetFpsRange: "5–60 plus 120 disclaimer",
        highRefreshIsAdvisoryOnly: true,
        persistenceIsNotWrittenByAudit: true,
        runtimeImportAllowed: false,
        playerVisible: false,
        cacheable: false,
        outputIsAuditOnly: true,
      },
    });
    expect(first.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("preserves the existing streaming configuration boundary without writing settings", () => {
    const source = readActiveRenderDistanceAuditSources();
    expect(getBlockRenderDistanceConfig(5)).toMatchObject({ visibleRadiusMeters: 5, prefetchRadiusMeters: 10, label: "5 blocks" });
    expect(getBlockRenderDistanceConfig(50)).toMatchObject({ visibleRadiusMeters: 50, prefetchRadiusMeters: 68, label: "50 blocks" });
    expect(source.persistenceOwnerPresent).toBe(true);
    expect(source.streamingPolicyExplicit).toBe(true);
  });

  it("accepts a complete source contract when the 120 FPS disclaimer is explicitly present", () => {
    const source = readActiveRenderDistanceAuditSources();
    const valid: RenderDistanceAuditSources = { ...source, highRefreshDisclaimerPresent: true };
    const output = buildRenderDistanceDependencyGraphFromSources({ seed: "s03-valid", sampleCount: 2 }, valid);

    expect(output.summary.issueCounts).toEqual({});
    expect(output.graph.valid).toBe(true);
  });

  it("turns malformed ranges, defaults, persistence, streaming, and disclaimer into required blockers", () => {
    const source = readActiveRenderDistanceAuditSources();
    const invalid: RenderDistanceAuditSources = {
      ...source,
      viewDistanceSteps: [5, 15, 50],
      targetFpsOptions: [5, 60, 120],
      defaultViewDistanceBlocks: 7,
      defaultTargetFps: 61,
      persistenceOwnerPresent: false,
      streamingPolicyExplicit: false,
      highRefreshDisclaimerPresent: false,
    };
    const output = buildRenderDistanceDependencyGraphFromSources({ seed: "s03-invalid", sampleCount: 2 }, invalid);

    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts).toMatchObject({
      "view-distance-range": 1,
      "view-distance-step": 1,
      "target-fps-range": 1,
      "high-refresh-disclaimer-missing": 1,
      "default-view-distance-invalid": 1,
      "default-target-fps-invalid": 1,
      "persistence-owner-missing": 1,
      "streaming-policy-missing": 1,
    });
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("changes the artifact hash when options change and rejects invalid bounds", () => {
    const source = readActiveRenderDistanceAuditSources();
    const original = buildRenderDistanceDependencyGraphFromSources({ seed: "s03-hash", sampleCount: 2 }, source);
    const changed = buildRenderDistanceDependencyGraphFromSources(
      { seed: "s03-hash", sampleCount: 2 },
      { ...source, targetFpsOptions: [...source.targetFpsOptions, 90] },
    );
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildRenderDistanceDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildRenderDistanceDependencyGraph({ seed: "s03", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildRenderDistanceDependencyGraph({ seed: "s03", sampleCount: RENDER_DISTANCE_AUDIT_MAX_SAMPLE_COUNT + 1 })).toThrow(/sampleCount/);
  });

  it("keeps the graph bounded and audit-only for a partial source sample", () => {
    const output = buildRenderDistanceDependencyGraph({ seed: "s03-partial", sampleCount: 1 });
    expect(output.graph.nodes).toHaveLength(3);
    expect(output.summary.policy.outputIsAuditOnly).toBe(true);
  });
});
