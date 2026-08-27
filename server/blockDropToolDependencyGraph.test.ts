import { describe, expect, it } from "vitest";
import {
  BLOCK_DROP_TOOL_MAX_SAMPLE_COUNT,
  buildBlockDropToolDependencyGraph,
  buildBlockDropToolDependencyGraphFromSources,
  readActiveBlockDropToolSources,
  type BlockDropToolSources,
} from "./generators/blockDropToolDependencyGraph";

describe("block drop and tool dependency graph", () => {
  it("audits canonical block-item links and tool-aware drop behavior", () => {
    const first = buildBlockDropToolDependencyGraph({ seed: "b04-canonical", sampleCount: 3 });
    const second = buildBlockDropToolDependencyGraph({ seed: "b04-canonical", sampleCount: 3 });

    expect(first.summary).toMatchObject({
      definitionCount: 14,
      uniqueDefinitionCount: 14,
      sampledDefinitionIds: ["flora.obsidian.sprout", "flora.obsidian.thorn-cactus", "leaves.obsidian"],
      blockItemLinkCount: 12,
      toolAwarePlaceableDropCount: 10,
      correctToolDropVerifiedCount: 10,
      wrongToolNoDropVerifiedCount: 10,
      toolTagCount: 3,
      toolTags: ["pickaxe", "axe", "shears"],
      runtimeOwnerPresent: true,
      durabilityOwnerPresent: false,
      issueCounts: { "durability-owner-missing": 1 },
      policy: {
        wrongToolProducesNoBlockDrop: true,
        correctToolProducesOnlyCanonicalBlockItem: true,
        dropQuantityMustBePositiveInteger: true,
        placeableBlockStackLimitIs64: true,
        toolDurabilityIsNotInvented: true,
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

  it("keeps unknown and wrong tools from producing canonical block drops", () => {
    const source = readActiveBlockDropToolSources();
    const output = buildBlockDropToolDependencyGraphFromSources({ seed: "b04-behavior", sampleCount: 1 }, source);
    expect(output.summary.correctToolDropVerifiedCount).toBe(output.summary.toolAwarePlaceableDropCount);
    expect(output.summary.wrongToolNoDropVerifiedCount).toBe(output.summary.toolAwarePlaceableDropCount);
  });

  it("turns malformed links, quantities, tools, runtime, and durability into required blockers", () => {
    const source = readActiveBlockDropToolSources();
    const invalidDefinitions = source.definitions.map(definition => definition.id === "wood.obsidian.log"
      ? { ...definition, id: "", requiredToolTag: "laser" as never, blockItemDefinitionId: "missing-block", dropQuantity: 0 }
      : definition.id === "rock.obsidian.small"
        ? { ...definition, requiredToolTag: "axe", blockItemDefinitionId: "block-obsidian-log", dropQuantity: 2 }
        : definition);
    const invalidBlockItems = source.blockItems.map(item => item.id === "block-obsidian-log"
      ? { ...item, isBlockItem: false, placementBlockId: "wrong-placement", stackLimit: 1 }
      : item);
    const invalid: BlockDropToolSources = {
      ...source,
      definitions: invalidDefinitions,
      blockItems: invalidBlockItems,
      toolItems: source.toolItems.filter(item => item.toolTag !== "axe"),
      runtimeOwnerPresent: false,
      durabilityOwnerPresent: false,
    };
    const output = buildBlockDropToolDependencyGraphFromSources({ seed: "b04-invalid", sampleCount: 2 }, invalid);

    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts).toMatchObject({
      "definition-id-missing": 1,
      "required-tool-invalid": 1,
      "tool-tag-uncovered": 2,
      "block-item-missing": 2,
      "block-item-not-placeable": 1,
      "block-item-placement-mismatch": 2,
      "block-item-stack-invalid": 1,
      "drop-quantity-invalid": 3,
      "correct-tool-drop-missing": 2,
      "runtime-owner-missing": 1,
      "durability-owner-missing": 1,
    });
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("changes the artifact hash when drop metadata changes and rejects invalid bounds", () => {
    const source = readActiveBlockDropToolSources();
    const original = buildBlockDropToolDependencyGraphFromSources({ seed: "b04-hash", sampleCount: 2 }, source);
    const changed = buildBlockDropToolDependencyGraphFromSources(
      { seed: "b04-hash", sampleCount: 2 },
      { ...source, runtimeOwnerPresent: false },
    );
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildBlockDropToolDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildBlockDropToolDependencyGraph({ seed: "b04", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildBlockDropToolDependencyGraph({ seed: "b04", sampleCount: BLOCK_DROP_TOOL_MAX_SAMPLE_COUNT + 1 })).toThrow(/sampleCount/);
  });

  it("keeps the graph bounded and audit-only for a one-definition sample", () => {
    const output = buildBlockDropToolDependencyGraph({ seed: "b04-partial", sampleCount: 1 });
    expect(output.graph.nodes).toHaveLength(3);
    expect(output.summary.sampledDefinitionIds).toHaveLength(1);
    expect(output.summary.policy.outputIsAuditOnly).toBe(true);
  });
});
