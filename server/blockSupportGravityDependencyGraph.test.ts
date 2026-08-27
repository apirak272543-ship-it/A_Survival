import { describe, expect, it } from "vitest";
import {
  BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT,
  buildBlockSupportGravityDependencyGraph,
  buildBlockSupportGravityDependencyGraphFromSources,
  readActiveBlockSupportGravitySources,
  type BlockSupportGravitySources,
} from "./generators/blockSupportGravityDependencyGraph";

describe("block support and gravity dependency graph", () => {
  it("audits the canonical Obsidian support, gravity, float, and solid-collision counts", () => {
    const first = buildBlockSupportGravityDependencyGraph({ seed: "b03-canonical", sampleCount: 2 });
    const second = buildBlockSupportGravityDependencyGraph({ seed: "b03-canonical", sampleCount: 2 });

    expect(first.summary).toMatchObject({
      definitionCount: 14,
      uniqueDefinitionCount: 14,
      sampledDefinitionIds: ["flora.obsidian.sprout", "flora.obsidian.thorn-cactus"],
      supportRequiredCount: 10,
      gravityAffectedCount: 1,
      floatableCount: 4,
      solidSupportCount: 10,
      nonSolidCount: 4,
      brokenStateExcluded: true,
      adjacentOffsets: [
        { dx: 0, dy: -1, dz: 0 },
        { dx: 1, dy: 0, dz: 0 },
        { dx: -1, dy: 0, dz: 0 },
        { dx: 0, dy: 0, dz: 1 },
        { dx: 0, dy: 0, dz: -1 },
        { dx: 0, dy: 1, dz: 0 },
      ],
      supportPredicate: "solid-non-none-collision",
      terrainSupportCallbackAllowed: true,
      placementRejectReason: "requires-support",
      runtimeOwnerPresent: true,
      issueCounts: {},
      policy: {
        supportsOnlySolidNonNoneCollision: true,
        gravityTargetsOnlyNonFloatingDefinitions: true,
        placementRejectsUnsupportedBlocks: true,
        brokenBlocksDoNotSupport: true,
        terrainSupportCallbackIsAllowed: true,
        runtimeImportAllowed: false,
        playerVisible: false,
        cacheable: false,
        outputIsAuditOnly: true,
      },
    });
    expect(first.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.graph.valid).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("keeps the physics semantics bounded to adjacent support, broken exclusion, and terrain support callback", () => {
    const source = readActiveBlockSupportGravitySources();
    expect(source.adjacentOffsets).toHaveLength(6);
    expect(source.adjacentOffsets).toContainEqual({ dx: 0, dy: -1, dz: 0 });
    expect(source.adjacentOffsets).toContainEqual({ dx: 0, dy: 1, dz: 0 });
    expect(source.brokenStateExcluded).toBe(true);
    expect(source.terrainSupportCallbackAllowed).toBe(true);
    expect(source.placementRejectReason).toBe("requires-support");
  });

  it("turns malformed definitions and support policy into fail-closed required blockers", () => {
    const source = readActiveBlockSupportGravitySources();
    const invalidDefinitions = {
      ...source.definitions,
      "bad-support": {
        ...source.definitions["terrain.obsidian"],
        id: "terrain.obsidian",
        gravityAffected: true,
        requiresSupport: false,
        canFloat: true,
      },
    };
    const invalid: BlockSupportGravitySources = {
      ...source,
      definitions: invalidDefinitions,
      adjacentOffsets: [{ dx: 0, dy: -1, dz: 0 }],
      supportPredicate: "solid-only" as never,
      brokenStateExcluded: false,
      terrainSupportCallbackAllowed: false,
      placementRejectReason: "placed" as never,
      runtimeOwnerPresent: false,
    };
    const output = buildBlockSupportGravityDependencyGraphFromSources({ seed: "b03-invalid", sampleCount: 2 }, invalid);

    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts).toMatchObject({
      "definition-id-mismatch": 1,
      "duplicate-definition-id": 1,
      "support-predicate-invalid": 1,
      "adjacency-invalid": 1,
      "broken-state-not-excluded": 1,
      "terrain-callback-missing": 1,
      "placement-reason-invalid": 1,
      "gravity-float-contradiction": 1,
      "gravity-support-rule-missing": 1,
      "runtime-owner-missing": 1,
    });
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("changes the artifact hash when block rules change and rejects invalid bounds", () => {
    const source = readActiveBlockSupportGravitySources();
    const original = buildBlockSupportGravityDependencyGraphFromSources({ seed: "b03-hash", sampleCount: 2 }, source);
    const changed = buildBlockSupportGravityDependencyGraphFromSources(
      { seed: "b03-hash", sampleCount: 2 },
      { ...source, brokenStateExcluded: false },
    );
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildBlockSupportGravityDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildBlockSupportGravityDependencyGraph({ seed: "b03", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildBlockSupportGravityDependencyGraph({ seed: "b03", sampleCount: BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT + 1 })).toThrow(/sampleCount/);
  });

  it("keeps the graph bounded and audit-only when sampling one canonical definition", () => {
    const output = buildBlockSupportGravityDependencyGraph({ seed: "b03-partial", sampleCount: 1 });
    expect(output.graph.nodes).toHaveLength(3);
    expect(output.summary.sampledDefinitionIds).toHaveLength(1);
    expect(output.summary.policy.outputIsAuditOnly).toBe(true);
  });
});
