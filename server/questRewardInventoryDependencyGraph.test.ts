import { describe, expect, it } from "vitest";
import { buildQuestRewardInventoryDependencyGraph } from "./generators/questRewardInventoryDependencyGraph";

describe("quest reward inventory dependency graph", () => {
  it("deterministically dry-runs canonical reward instances into an empty 40-slot inventory", () => {
    const first = buildQuestRewardInventoryDependencyGraph({ seed: "reward-inventory-seed", sampleQuestCount: 8, completedQuestCount: 20, inventoryUsedSlots: 0 });
    const second = buildQuestRewardInventoryDependencyGraph({ seed: "reward-inventory-seed", sampleQuestCount: 8, completedQuestCount: 20, inventoryUsedSlots: 0 });

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", sampleQuestCount: 8, completedQuestCount: 20, inventoryUsedSlots: 0, inventoryCapacity: 40 });
    expect(first.summary).toMatchObject({ rewardCount: 8, itemDefinitionAvailableCount: 8, rewardInstanceFactoryAvailableCount: 8, inventoryDryRunAcceptedCount: 8, inventoryCapacityBlockedCount: 0, questRewardDispatchBridgeMissingCount: 8, abilityRewardCount: 0, abilityRuntimeOwnerMissingCount: 0, supportedRewardCount: 0, unsupportedRewardCount: 8, unresolvedReferenceCount: 8, runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.assessments[0]).toMatchObject({ questId: "story-map-001-quest-01", itemDefinitionId: "material-001", itemDefinitionAvailable: true, rewardInstanceFactoryAvailable: true, inventoryDryRunAccepted: true, supported: false });
    expect(first.assessments[0]?.inventoryMessage).toBe("เก็บ 3 ชิ้นแล้ว");
    expect(first.graph.valid).toBe(false);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("reports capacity blockers without mutating or fabricating quest completion", () => {
    const result = buildQuestRewardInventoryDependencyGraph({ seed: "full-inventory-seed", sampleQuestCount: 8, completedQuestCount: 20, inventoryUsedSlots: 40 });

    expect(result.summary.inventoryDryRunAcceptedCount).toBe(0);
    expect(result.summary.inventoryCapacityBlockedCount).toBe(8);
    expect(result.summary.questRewardDispatchBridgeMissingCount).toBe(8);
    expect(result.summary.unresolvedReferenceTypes["inventory-capacity"]).toBe(8);
    expect(result.summary.unresolvedReferenceTypes["quest-reward-dispatch"]).toBe(8);
    expect(result.summary.unresolvedReferenceCount).toBe(16);
    expect(result.assessments.every(assessment => assessment.supported === false)).toBe(true);
    expect(result.assessments[0]?.inventoryMessage).toBe("พื้นที่ไม่พอ เหลือ 3 ชิ้น");
    expect(result.assessments.every(assessment => assessment.inventoryMessage.startsWith("พื้นที่ไม่พอ เหลือ "))).toBe(true);
    expect(result.nodes.some(node => node.key === "inventory-capacity:story-map-001-quest-01:0")).toBe(false);
    expect(result.graph.issues.some(issue => issue.dependencyKey === "inventory-capacity:story-map-001-quest-01:0")).toBe(true);
  });

  it("exposes the final quest ability as a required missing runtime owner", () => {
    const result = buildQuestRewardInventoryDependencyGraph({ seed: "ability-inventory-seed", sampleQuestCount: 20, completedQuestCount: 20, inventoryUsedSlots: 0 });

    expect(result.summary.rewardCount).toBe(20);
    expect(result.summary.abilityRewardCount).toBe(1);
    expect(result.summary.abilityRuntimeOwnerMissingCount).toBe(1);
    expect(result.summary.inventoryDryRunAcceptedCount).toBe(20);
    expect(result.summary.unresolvedReferenceCount).toBe(21);
    expect(result.assessments[19]).toMatchObject({ questId: "story-map-001-quest-20", abilityId: "ability.story.001", inventoryDryRunAccepted: true, supported: false });
    expect(result.graph.issues.some(issue => issue.dependencyKey === "ability-runtime-owner:ability.story.001")).toBe(true);
  });

  it("rejects out-of-range inputs and unsupported rules", () => {
    expect(() => buildQuestRewardInventoryDependencyGraph({ seed: "bounds", sampleQuestCount: 0 })).toThrow("sampleQuestCount must be between 1 and 20");
    expect(() => buildQuestRewardInventoryDependencyGraph({ seed: "bounds", completedQuestCount: 21 })).toThrow("completedQuestCount must be between 0 and 20");
    expect(() => buildQuestRewardInventoryDependencyGraph({ seed: "bounds", inventoryUsedSlots: 41 })).toThrow("inventoryUsedSlots must be between 0 and 40");
    expect(() => buildQuestRewardInventoryDependencyGraph({ seed: "rules", rulesVersion: "other.v1" })).toThrow("Unsupported quest reward inventory graph rules version");
  });
});
