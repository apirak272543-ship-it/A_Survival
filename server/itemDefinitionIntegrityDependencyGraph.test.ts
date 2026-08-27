import { describe, expect, it } from "vitest";
import { ALL_ITEMS, type ItemDefinition, type ItemInstance } from "../client/src/game/data/catalog";
import {
  ITEM_DEFINITION_INTEGRITY_MAX_DEFINITIONS,
  ITEM_DEFINITION_INTEGRITY_MAX_SAMPLE,
  ITEM_DEFINITION_INTEGRITY_RULES_VERSION,
  buildItemDefinitionIntegrityDependencyGraph,
  buildItemDefinitionIntegrityDependencyGraphFromSources,
  readActiveItemDefinitionIntegritySources,
  type ItemDefinitionIntegritySources,
} from "./generators/itemDefinitionIntegrityDependencyGraph";

describe("item definition integrity dependency graph", () => {
  it("audits the current catalog deterministically and keeps the valid source contract bounded", () => {
    const input = { seed: "item-integrity-seed", sampleCount: 48 };
    const first = buildItemDefinitionIntegrityDependencyGraph(input);
    const second = buildItemDefinitionIntegrityDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({
      generatorId: "item.definition.integrity",
      generatorVersion: "1.0.0",
      schemaVersion: "a-survival.item-definition-integrity.v1",
      seed: input.seed,
      rulesVersion: ITEM_DEFINITION_INTEGRITY_RULES_VERSION,
      itemCount: ALL_ITEMS.length,
      plantCount: 300,
      instanceCount: 0,
      sampleCount: 48,
    });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary).toMatchObject({
      itemCount: ALL_ITEMS.length,
      plantCount: 300,
      instanceCount: 0,
      sampleCount: 48,
      validDefinitionCount: ALL_ITEMS.length,
      invalidDefinitionCount: 0,
      duplicateIdCount: 0,
      invalidIdCount: 0,
      invalidCategoryCount: 0,
      invalidTextCount: 0,
      invalidStackCount: 0,
      equipmentRuleViolationCount: 0,
      missingIconCount: 0,
      plantLinkViolationCount: 0,
      blockLinkViolationCount: 0,
      itemInstanceIssueCount: 0,
      unresolvedReferenceTotal: 0,
      unresolvedReferenceCount: 0,
    });
    expect(first.summary.categoryCounts.seed).toBe(700);
    expect(first.summary.categoryCounts.structure).toBe(410);
    expect(first.summary.categoryCounts.sword).toBe(400);
    expect(first.records).toHaveLength(48);
    expect(first.graph.valid).toBe(true);
    expect(first.graph.issues).toEqual([]);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("blocks duplicate, malformed, equipment, plant-link, block-link, and missing-icon violations", () => {
    const sources = readActiveItemDefinitionIntegritySources();
    const invalidSword: ItemDefinition = { ...sources.items.find(item => item.id === "sword-001")!, equippable: false, stackLimit: 2 };
    const invalidBlock: ItemDefinition = { ...sources.items.find(item => item.id === "block-obsidian-stone")!, placementBlockId: undefined, stackLimit: 65 };
    const invalidText: ItemDefinition = { ...sources.items[0]!, id: "BAD ID", name: "", effect: "", stackLimit: 0, iconAssetId: undefined };
    const invalidCategory = { ...sources.items[1]!, category: "unknown-category" } as ItemDefinition;
    const invalidPlant = { ...sources.plants[0]!, seedItemId: "seed-missing", yieldItemId: "material-missing" };
    const output = buildItemDefinitionIntegrityDependencyGraphFromSources(
      { seed: "item-integrity-invalid-seed", sampleCount: 8 },
      { ...sources, items: [...sources.items, { ...sources.items[0]! }, invalidSword, invalidBlock, invalidText, invalidCategory], plants: [invalidPlant] },
    );

    expect(output.summary.duplicateIdCount).toBeGreaterThan(0);
    expect(output.summary.invalidIdCount).toBeGreaterThan(0);
    expect(output.summary.invalidCategoryCount).toBeGreaterThan(0);
    expect(output.summary.invalidTextCount).toBeGreaterThan(0);
    expect(output.summary.invalidStackCount).toBeGreaterThan(0);
    expect(output.summary.equipmentRuleViolationCount).toBeGreaterThan(0);
    expect(output.summary.missingIconCount).toBeGreaterThan(0);
    expect(output.summary.plantLinkViolationCount).toBeGreaterThan(0);
    expect(output.summary.blockLinkViolationCount).toBeGreaterThan(0);
    expect(output.summary.unresolvedReferenceTotal).toBeGreaterThan(0);
    expect(output.graph.valid).toBe(false);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey.startsWith("item-integrity-blocker:"))).toBe(true);
    expect(output.unresolvedReferences.some(reference => reference.referenceType === "plant-link")).toBe(true);
  });

  it("uses the canonical item-instance validator without mutating or accepting invalid provenance", () => {
    const sources = readActiveItemDefinitionIntegritySources();
    const validInstance: ItemInstance = {
      instanceId: "instance-valid",
      definitionId: "sword-001",
      quantity: 1,
      enhancement: 0,
      provenance: { eventId: "event-valid", type: "starter", timestamp: 1700000000000, integrityHash: "hash-valid" },
    };
    const invalidInstance: ItemInstance = {
      instanceId: "instance-invalid",
      definitionId: "not-in-catalog",
      quantity: 0,
      enhancement: -1,
      provenance: { eventId: "", type: "starter", timestamp: 0, integrityHash: "" },
    };
    const output = buildItemDefinitionIntegrityDependencyGraphFromSources(
      { seed: "item-integrity-instance-seed", sampleCount: 4 },
      { ...sources, itemInstances: [validInstance, invalidInstance] },
    );

    expect(output.summary.instanceCount).toBe(2);
    expect(output.summary.itemInstanceIssueCount).toBeGreaterThan(0);
    expect(output.summary.issueCounts["item-instance"]).toBeGreaterThan(0);
    expect(output.graph.valid).toBe(false);
    expect(output.unresolvedReferences.some(reference => reference.referenceType === "item-instance" && reference.reason.includes("Unknown item definition"))).toBe(true);
  });

  it("changes hashes when seed, catalog, plant, or instance input changes", () => {
    const sources = readActiveItemDefinitionIntegritySources();
    const first = buildItemDefinitionIntegrityDependencyGraphFromSources({ seed: "item-integrity-hash-a", sampleCount: 4 }, sources);
    const differentSeed = buildItemDefinitionIntegrityDependencyGraphFromSources({ seed: "item-integrity-hash-b", sampleCount: 4 }, sources);
    const differentCatalog = buildItemDefinitionIntegrityGraphWithMutation(sources, { items: [{ ...sources.items[0]!, effect: "Changed item effect" }] });
    const differentPlant = buildItemDefinitionIntegrityGraphWithMutation(sources, { plants: [{ ...sources.plants[0]!, displayName: "Changed plant display" }] });
    const differentInstance = buildItemDefinitionIntegrityGraphWithMutation(sources, { itemInstances: [{ instanceId: "changed-instance", definitionId: "sword-001", quantity: 1, enhancement: 0, provenance: { eventId: "changed", type: "starter", timestamp: 1, integrityHash: "changed" } }] });

    expect(first.artifact.contentHash).not.toBe(differentSeed.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentCatalog.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentPlant.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(differentInstance.artifact.contentHash);
  });

  it("rejects unsupported rules, empty sources, invalid samples, and unbounded catalogs", () => {
    const sources = readActiveItemDefinitionIntegritySources();
    expect(() => buildItemDefinitionIntegrityDependencyGraph({ seed: "seed", rulesVersion: "wrong.v1" })).toThrow("Unsupported item definition integrity rules version");
    expect(() => buildItemDefinitionIntegrityDependencyGraph({ seed: "   " })).toThrow("seed must be 1–128 characters");
    expect(() => buildItemDefinitionIntegrityDependencyGraph({ seed: "seed", sampleCount: 0 })).toThrow(`sampleCount must be an integer from 1 to ${ITEM_DEFINITION_INTEGRITY_MAX_SAMPLE}`);
    expect(() => buildItemDefinitionIntegrityGraphWithMutation({ ...sources, items: [] }, {})).toThrow(`items must contain 1 to ${ITEM_DEFINITION_INTEGRITY_MAX_DEFINITIONS} definitions`);
    expect(() => buildItemDefinitionIntegrityGraphWithMutation(sources, { items: Array.from({ length: ITEM_DEFINITION_INTEGRITY_MAX_DEFINITIONS + 1 }, (_, index) => ({ ...sources.items[0]!, id: `bounded-${index}` })) })).toThrow(`items must contain 1 to ${ITEM_DEFINITION_INTEGRITY_MAX_DEFINITIONS} definitions`);
  });
});

function buildItemDefinitionIntegrityGraphWithMutation(sources: ItemDefinitionIntegritySources, mutation: Partial<ItemDefinitionIntegritySources>) {
  return buildItemDefinitionIntegrityDependencyGraphFromSources({ seed: "item-integrity-mutation-seed", sampleCount: 4 }, { ...sources, ...mutation });
}
