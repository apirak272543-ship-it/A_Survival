import { describe, expect, it } from "vitest";
import {
  INVENTORY_CAPACITY_MAX_SAMPLE_COUNT,
  buildInventoryCapacityDependencyGraph,
  buildInventoryCapacityDependencyGraphFromSources,
  readActiveInventoryCapacitySources,
  type InventoryCapacitySources,
} from "./generators/inventoryCapacityDependencyGraph";

describe("inventory capacity dependency graph", () => {
  it("audits canonical 40-slot carry, 64 normal block stack, and explicit cross-map boundary", () => {
    const first = buildInventoryCapacityDependencyGraph({ seed: "b06-canonical", sampleCount: 3 });
    const second = buildInventoryCapacityDependencyGraph({ seed: "b06-canonical", sampleCount: 3 });

    expect(first.summary).toMatchObject({
      playerSlotCapacity: 40,
      worldStorageSlotCapacity: 27,
      normalBlockStackLimit: 64,
      normalBlockItemCount: 10,
      playerSlotCapVerified: true,
      stackCapVerified: true,
      mergeVerified: true,
      overflowRemainderVerified: true,
      nonStackableSlotVerified: true,
      inventoryOwnerPresent: true,
      capacityArgumentOwnerPresent: true,
      crossMapCarryOwnerPresent: false,
      issueCounts: { "cross-map-carry-owner-missing": 1 },
      policy: {
        playerCarryUsesExactly40Slots: true,
        normalBlockStackUsesExactly64: true,
        overflowReturnsRemainder: true,
        sameDefinitionStacksMerge: true,
        nonStackableItemsConsumeOneSlot: true,
        crossMapCarryNeedsProfileOwner: true,
        runtimeImportAllowed: false,
        playerVisible: false,
        cacheable: false,
        outputIsAuditOnly: true,
      },
    });
    expect(first.summary.normalBlockItemIds).toHaveLength(10);
    expect(first.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("proves bounded overflow, merge, and non-stackable slot previews", () => {
    const output = buildInventoryCapacityDependencyGraph({ seed: "b06-preview", sampleCount: 1 });
    expect(output.summary.previews.blockOverflow).toEqual({
      accepted: true,
      slotCount: 1,
      quantities: [64],
      addedQuantity: 64,
      remainderQuantity: 1,
    });
    expect(output.summary.previews.blockMerge).toEqual({
      accepted: true,
      slotCount: 1,
      quantities: [64],
      addedQuantity: 1,
      remainderQuantity: 0,
    });
    expect(output.summary.previews.fullNonStackable).toEqual({
      accepted: false,
      slotCount: 40,
      quantities: Array.from({ length: 40 }, () => 1),
      addedQuantity: 0,
      remainderQuantity: 1,
    });
  });

  it("turns invalid caps, definitions, and missing owners into required blockers", () => {
    const source = readActiveInventoryCapacitySources();
    const invalid: InventoryCapacitySources = {
      ...source,
      playerSlotCapacity: 39,
      worldStorageSlotCapacity: 0,
      normalBlockStackLimit: 32,
      blockItems: source.blockItems.map(item => item.id === "block-obsidian-stone"
        ? { ...item, isBlockItem: false, stackLimit: 32 }
        : item),
      inventoryOwnerPresent: false,
      capacityArgumentOwnerPresent: false,
      crossMapCarryOwnerPresent: false,
    };
    const output = buildInventoryCapacityDependencyGraphFromSources({ seed: "b06-invalid", sampleCount: 2 }, invalid);

    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts).toMatchObject({
      "player-slot-cap-invalid": 1,
      "world-storage-slot-cap-invalid": 2,
      "block-stack-cap-invalid": 1,
      "block-stack-definition-invalid": 2,
      "inventory-owner-missing": 1,
      "capacity-argument-owner-missing": 1,
      "cross-map-carry-owner-missing": 1,
    });
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("changes the artifact hash when capacity policy changes and rejects invalid bounds", () => {
    const source = readActiveInventoryCapacitySources();
    const original = buildInventoryCapacityDependencyGraphFromSources({ seed: "b06-hash", sampleCount: 2 }, source);
    const changed = buildInventoryCapacityDependencyGraphFromSources(
      { seed: "b06-hash", sampleCount: 2 },
      { ...source, capacityArgumentOwnerPresent: false },
    );
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildInventoryCapacityDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildInventoryCapacityDependencyGraph({ seed: "b06", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildInventoryCapacityDependencyGraph({ seed: "b06", sampleCount: INVENTORY_CAPACITY_MAX_SAMPLE_COUNT + 1 })).toThrow(/sampleCount/);
  });

  it("keeps the graph bounded and audit-only for a one-sample run", () => {
    const output = buildInventoryCapacityDependencyGraph({ seed: "b06-bounded", sampleCount: 1 });
    expect(output.graph.nodes).toHaveLength(3);
    expect(output.summary.policy.outputIsAuditOnly).toBe(true);
  });
});
