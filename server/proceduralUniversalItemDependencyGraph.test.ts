import { describe, expect, it } from "vitest";
import { buildProceduralUniversalItemDependencyGraph, PROCEDURAL_UNIVERSAL_ITEM_GRAPH_RULES_VERSION } from "./generators/proceduralUniversalItemDependencyGraph";

describe("procedural universal item dependency graph", () => {
  it("converts real procedural weapons through item.universal deterministically without runtime import", () => {
    const input = { seed: 829173, count: 8, category: "melee" as const, maxPowerBudget: 100 };
    const first = buildProceduralUniversalItemDependencyGraph(input);
    const second = buildProceduralUniversalItemDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ generatorId: "content.generator", generatorVersion: "0.1.0", seed: 829173, generatedWeaponCount: 8, universalItemCount: 8, blockedItemCount: 0 });
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary.generatedWeaponCount).toBe(8);
    expect(first.summary.universalItemCount).toBe(8);
    expect(first.summary.blockedItemCount).toBe(0);
    expect(first.summary.assetIds).toEqual(["items.blade"]);
    expect(first.summary.universalItemIds).toHaveLength(8);
    expect(first.summary.balanceScores).toHaveLength(8);
    expect(first.summary.balanceScores.every(score => score >= 0 && score <= 100)).toBe(true);
    expect(first.summary.unresolvedReferenceTypes["asset-binding"]).toBe(8);
    expect(first.summary.unresolvedReferenceTypes["universal-item-validation"]).toBe(0);
    expect(first.summary.unresolvedReferenceCount).toBe(8);
    expect(first.nodes.some(node => node.key.startsWith("procedural-content:"))).toBe(true);
    expect(first.nodes.filter(node => node.key.startsWith("procedural-item:")).length).toBe(8);
    expect(first.nodes.filter(node => node.key.startsWith("item-universal:")).length).toBe(8);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("keeps universal item contract failures visible instead of inventing a resolved item", () => {
    const result = buildProceduralUniversalItemDependencyGraph({ seed: 829173, count: 8, category: "magic", maxPowerBudget: 1 });

    expect(result.summary.generatedWeaponCount).toBe(8);
    expect(result.summary.blockedItemCount).toBe(8);
    expect(result.summary.universalItemCount).toBe(0);
    expect(result.summary.unresolvedReferenceTypes["asset-binding"]).toBe(8);
    expect(result.summary.unresolvedReferenceTypes["universal-item-validation"]).toBe(8);
    expect(result.unresolvedReferences.some(reference => reference.referenceType === "universal-item-validation" && reference.reason.includes("exceeds power budget"))).toBe(true);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("enforces bounded input and graph rules", () => {
    expect(() => buildProceduralUniversalItemDependencyGraph({ seed: 1, rulesVersion: "wrong.v1" })).toThrow("Unsupported procedural universal item graph rules version");
    expect(() => buildProceduralUniversalItemDependencyGraph({ seed: 1.5 })).toThrow("seed must be an integer");
    expect(() => buildProceduralUniversalItemDependencyGraph({ seed: 1, count: 0 })).toThrow("count must be an integer from 1 to 8");
    expect(() => buildProceduralUniversalItemDependencyGraph({ seed: 1, count: 9 })).toThrow("count must be an integer from 1 to 8");
    expect(() => buildProceduralUniversalItemDependencyGraph({ seed: 1, maxPowerBudget: 0 })).toThrow("maxPowerBudget must be an integer from 1 to 100");
    expect(() => buildProceduralUniversalItemDependencyGraph({ seed: 1, maxPowerBudget: 101 })).toThrow("maxPowerBudget must be an integer from 1 to 100");
    expect(PROCEDURAL_UNIVERSAL_ITEM_GRAPH_RULES_VERSION).toBe("procedural-universal-item-graph-rules.v1");
  });
});
