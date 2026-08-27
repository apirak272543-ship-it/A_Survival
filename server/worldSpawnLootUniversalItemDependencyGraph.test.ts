import { describe, expect, it } from "vitest";
import { buildWorldSpawnLootUniversalItemDependencyGraph } from "./generators/worldSpawnLootUniversalItemDependencyGraph";

const input = {
  seed: "world-spawn-loot-universal-seed",
  radius: 32,
  sampleSpawnCount: 64,
  maxPowerBudget: 100,
};

describe("world spawn loot to Universal Item dependency graph", () => {
  it("reuses real world loot records and converts drops through item.universal deterministically", () => {
    const first = buildWorldSpawnLootUniversalItemDependencyGraph(input);
    const second = buildWorldSpawnLootUniversalItemDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: input.seed, lootGeneratorVersion: "0.1.0", universalItemGeneratorVersion: "1.0.0" });
    expect(first.summary.sampledSpawnCount).toBe(14);
    expect(first.summary.lootCount).toBeGreaterThan(0);
    expect(first.summary.dropCount).toBeGreaterThan(0);
    expect(first.summary.universalItemCount + first.summary.blockedItemCount).toBe(first.summary.dropCount);
    expect(first.summary.dropItemIds.length).toBeGreaterThan(0);
    expect(first.summary.assetIds).toEqual(expect.arrayContaining(["items.blade", "items.energy"]));
    expect(first.nodes.some(node => node.generatorId === "content.generator" && node.key.startsWith("loot:"))).toBe(true);
    expect(first.nodes.some(node => node.generatorId === "item.universal" && node.key.startsWith("item-universal:loot:"))).toBe(true);
    expect(first.nodes.every(node => node.rulesVersion === "world-spawn-loot-universal-item-graph-rules.v1")).toBe(true);
    expect(first.unresolvedReferences.some(reference => reference.referenceType === "asset-binding")).toBe(true);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("keeps Universal Item validation failures as blockers when the power budget is too low", () => {
    const result = buildWorldSpawnLootUniversalItemDependencyGraph({ ...input, maxPowerBudget: 1 });

    expect(result.summary.blockedItemCount).toBe(result.summary.dropCount);
    expect(result.summary.unresolvedReferenceTypes["universal-item-validation"]).toBe(result.summary.dropCount);
    expect(result.universalItems.every(item => !item.valid)).toBe(true);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey?.startsWith("item.universal.output:"))).toBe(true);
  });

  it("rejects unsupported rules and out-of-bounds inputs", () => {
    expect(() => buildWorldSpawnLootUniversalItemDependencyGraph({ ...input, rulesVersion: "wrong.v1" })).toThrow("Unsupported world spawn loot universal item graph rules version");
    expect(() => buildWorldSpawnLootUniversalItemDependencyGraph({ ...input, sampleSpawnCount: 0 })).toThrow("sampleSpawnCount must be an integer from 1 to 64");
    expect(() => buildWorldSpawnLootUniversalItemDependencyGraph({ ...input, maxPowerBudget: 101 })).toThrow("maxPowerBudget must be an integer from 1 to 100");
  });
});
