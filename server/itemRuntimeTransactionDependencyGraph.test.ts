import { describe, expect, it } from "vitest";
import { ALL_ITEMS, type ItemDefinition } from "../client/src/game/data/catalog";
import {
  ITEM_RUNTIME_TRANSACTION_MAX_QUANTITY,
  ITEM_RUNTIME_TRANSACTION_MAX_SAMPLE_COUNT,
  buildItemRuntimeTransactionDependencyGraph,
  buildItemRuntimeTransactionDependencyGraphFromSources,
  previewAtomicItemTransaction,
  readActiveItemRuntimeTransactionSources,
  type ItemRuntimeTransactionSources,
} from "./generators/itemRuntimeTransactionDependencyGraph";

function validTransactionSources(): ItemRuntimeTransactionSources {
  const combatProfileDefinitionIds = ALL_ITEMS.filter(item => ["sword", "bow", "ranged"].includes(item.category)).map(item => item.id);
  return {
    itemDefinitions: ALL_ITEMS,
    equippableDefinitionIds: ALL_ITEMS.filter(item => item.equippable).map(item => item.id),
    combatProfileDefinitionIds,
    craftingRules: [{ id: "craft:starter", inputDefinitionIds: [ALL_ITEMS[0]!.id], outputDefinitionIds: [ALL_ITEMS[1]!.id], atomic: true }],
    assemblyRules: [{ id: "assemble:starter", inputDefinitionIds: [ALL_ITEMS[1]!.id], outputDefinitionIds: [ALL_ITEMS[2]!.id], atomic: true }],
    transactionOwners: { equip: "server-authoritative", combat: "server-authoritative", craft: "server-authoritative", assemble: "server-authoritative" },
  };
}

describe("item runtime transaction dependency graph", () => {
  it("audits canonical definitions and keeps missing combat/crafting/assembly owners explicit", () => {
    const first = buildItemRuntimeTransactionDependencyGraph({ seed: "t03-canonical", sampleCount: ITEM_RUNTIME_TRANSACTION_MAX_SAMPLE_COUNT });
    const second = buildItemRuntimeTransactionDependencyGraph({ seed: "t03-canonical", sampleCount: ITEM_RUNTIME_TRANSACTION_MAX_SAMPLE_COUNT });

    expect(first.summary).toMatchObject({
      itemCount: ALL_ITEMS.length,
      sampleCount: ITEM_RUNTIME_TRANSACTION_MAX_SAMPLE_COUNT,
      uniqueDefinitionIdCount: ALL_ITEMS.length,
      equippableCount: ALL_ITEMS.filter(item => item.equippable).length,
      combatCandidateCount: ALL_ITEMS.filter(item => ["sword", "bow", "ranged"].includes(item.category)).length,
      combatProfileCount: 0,
      craftingRuleCount: 0,
      assemblyRuleCount: 0,
      authoritativeOwnerCount: 0,
      atomicCraftingRuleCount: 0,
      atomicAssemblyRuleCount: 0,
      issueCounts: expect.objectContaining({ "crafting-rules-missing": 1, "assembly-rules-missing": 1, "transaction-owner-missing": 4 }),
      behavior: {
        failedTransactionsLeaveInventoryUnchanged: true,
        validTransactionsConsumeAndProduceAtomically: true,
        unknownDefinitionsAreRejected: true,
        outputIsAuditOnly: true,
      },
    });
    expect(first.summary.issueCounts["combat-profile-missing"]).toBeGreaterThan(first.summary.combatCandidateCount);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("previews a valid atomic item transaction without mutating the caller inventory", () => {
    const source = readActiveItemRuntimeTransactionSources();
    const before = [{ definitionId: ALL_ITEMS[0]!.id, quantity: 1 }];
    const result = previewAtomicItemTransaction({
      inventory: before,
      consumes: [{ definitionId: ALL_ITEMS[0]!.id, quantity: 1 }],
      produces: [{ definitionId: ALL_ITEMS[1]!.id, quantity: 1 }],
      itemDefinitions: source.itemDefinitions,
    });

    expect(result).toMatchObject({ accepted: true, reason: "ok", consumed: before, produced: [{ definitionId: ALL_ITEMS[1]!.id, quantity: 1 }] });
    expect(result.before).toEqual(before);
    expect(result.after).toEqual([{ definitionId: ALL_ITEMS[1]!.id, quantity: 1 }]);
    expect(before).toEqual([{ definitionId: ALL_ITEMS[0]!.id, quantity: 1 }]);
  });

  it("leaves inventory unchanged on insufficient, unknown, invalid, or overflow transactions", () => {
    const source = readActiveItemRuntimeTransactionSources();
    const inventory = [{ definitionId: ALL_ITEMS[0]!.id, quantity: 1 }];
    const insufficient = previewAtomicItemTransaction({ inventory, consumes: [{ definitionId: ALL_ITEMS[0]!.id, quantity: 2 }], produces: [], itemDefinitions: source.itemDefinitions });
    const unknown = previewAtomicItemTransaction({ inventory, consumes: [{ definitionId: "not-a-real-item", quantity: 1 }], produces: [], itemDefinitions: source.itemDefinitions });
    const invalid = previewAtomicItemTransaction({ inventory, consumes: [{ definitionId: ALL_ITEMS[0]!.id, quantity: ITEM_RUNTIME_TRANSACTION_MAX_QUANTITY + 1 }], produces: [], itemDefinitions: source.itemDefinitions });
    const stackable = ALL_ITEMS.find(item => item.stackLimit > 1)!;
    const overflow = previewAtomicItemTransaction({ inventory: [{ definitionId: stackable.id, quantity: stackable.stackLimit }], consumes: [], produces: [{ definitionId: stackable.id, quantity: 1 }], itemDefinitions: source.itemDefinitions });

    expect(insufficient).toMatchObject({ accepted: false, reason: "insufficient-input", after: inventory, consumed: [], produced: [] });
    expect(unknown).toMatchObject({ accepted: false, reason: "unknown-input", after: inventory, consumed: [], produced: [] });
    expect(invalid).toMatchObject({ accepted: false, reason: "invalid-input-quantity", after: inventory, consumed: [], produced: [] });
    expect(overflow).toMatchObject({ accepted: false, reason: "output-stack-overflow", consumed: [], produced: [] });
  });

  it("accepts a complete server-authoritative transaction source contract", () => {
    const output = buildItemRuntimeTransactionDependencyGraphFromSources({ seed: "t03-valid", sampleCount: 3 }, validTransactionSources());
    expect(output.summary).toMatchObject({
      itemCount: ALL_ITEMS.length,
      sampleCount: 3,
      uniqueDefinitionIdCount: ALL_ITEMS.length,
      combatProfileCount: ALL_ITEMS.filter(item => ["sword", "bow", "ranged"].includes(item.category)).length,
      craftingRuleCount: 1,
      assemblyRuleCount: 1,
      authoritativeOwnerCount: 4,
      atomicCraftingRuleCount: 1,
      atomicAssemblyRuleCount: 1,
      issueCounts: {},
    });
    expect(output.graph.valid).toBe(true);
  });

  it("turns duplicate definitions, invalid stack/links, malformed rules, and missing owners into blockers", () => {
    const item = ALL_ITEMS.find(candidate => candidate.equippable)!;
    const invalidDefinition: ItemDefinition = { ...item, id: "BAD ID", stackLimit: 0 };
    const output = buildItemRuntimeTransactionDependencyGraphFromSources(
      { seed: "t03-invalid", sampleCount: 2 },
      {
        itemDefinitions: [item, item, invalidDefinition],
        equippableDefinitionIds: [],
        combatProfileDefinitionIds: [],
        craftingRules: [{ id: "craft:bad", inputDefinitionIds: ["missing-input"], outputDefinitionIds: [item.id], atomic: false as never }],
        assemblyRules: [{ id: "", inputDefinitionIds: [], outputDefinitionIds: [], atomic: true }],
        transactionOwners: { equip: "missing", combat: "missing", craft: "missing", assemble: "missing" },
      },
    );

    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts["duplicate-definition-id"]).toBe(1);
    expect(output.summary.issueCounts["invalid-definition-id"]).toBe(1);
    expect(output.summary.issueCounts["stack-limit-invalid"]).toBe(1);
    expect(output.summary.issueCounts["equipment-link-mismatch"]).toBe(3);
    expect(output.summary.issueCounts["crafting-rule-invalid"]).toBe(1);
    expect(output.summary.issueCounts["transaction-not-atomic"]).toBe(1);
    expect(output.summary.issueCounts["assembly-rule-invalid"]).toBe(1);
    expect(output.summary.issueCounts["transaction-owner-missing"]).toBe(4);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("changes the artifact hash when transaction source changes and rejects invalid bounds", () => {
    const originalSource = validTransactionSources();
    const original = buildItemRuntimeTransactionDependencyGraphFromSources({ seed: "t03-hash", sampleCount: 2 }, originalSource);
    const changed = buildItemRuntimeTransactionDependencyGraphFromSources(
      { seed: "t03-hash", sampleCount: 2 },
      { ...originalSource, transactionOwners: { ...originalSource.transactionOwners, craft: "missing" } },
    );
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildItemRuntimeTransactionDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildItemRuntimeTransactionDependencyGraph({ seed: "t03", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildItemRuntimeTransactionDependencyGraph({ seed: "t03", sampleCount: ITEM_RUNTIME_TRANSACTION_MAX_SAMPLE_COUNT + 1 })).toThrow(/sampleCount/);
  });
});
