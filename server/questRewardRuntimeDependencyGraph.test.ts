import { describe, expect, it } from "vitest";
import { buildQuestRewardRuntimeDependencyGraph } from "./generators/questRewardRuntimeDependencyGraph";

describe("quest reward runtime dependency graph", () => {
  it("is deterministic and uses the canonical reward-instance factory without mutating runtime state", () => {
    const first = buildQuestRewardRuntimeDependencyGraph({ seed: "reward-graph-seed", sampleQuestCount: 8, completedQuestCount: 20 });
    const second = buildQuestRewardRuntimeDependencyGraph({ seed: "reward-graph-seed", sampleQuestCount: 8, completedQuestCount: 20 });

    expect(first).toEqual(second);
    expect(first.artifact.mapId).toBe("obsidian-frontier");
    expect(first.artifact.completedQuestCount).toBe(20);
    expect(first.summary.rewardCount).toBe(8);
    expect(first.summary.itemDefinitionAvailableCount).toBe(8);
    expect(first.summary.rewardInstanceFactoryAvailableCount).toBe(8);
    expect(first.summary.abilityRewardCount).toBe(0);
    expect(first.summary.questRewardDispatchBridgeMissingCount).toBe(8);
    expect(first.summary.unresolvedReferenceCount).toBe(8);
    expect(first.summary.runtimeImportAllowed).toBe(false);
    expect(first.summary.playerVisible).toBe(false);
    expect(first.summary.cacheable).toBe(false);
    expect(first.assessments[0]).toMatchObject({ itemDefinitionId: "material-001", itemDefinitionAvailable: true, rewardInstanceFactoryAvailable: true, supported: false });
    expect(first.graph.valid).toBe(false);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("exposes the final quest ability as a missing runtime owner rather than inventing an unlock", () => {
    const result = buildQuestRewardRuntimeDependencyGraph({ seed: "reward-ability-seed", sampleQuestCount: 20, completedQuestCount: 20 });

    expect(result.summary.rewardCount).toBe(20);
    expect(result.summary.itemDefinitionAvailableCount).toBe(20);
    expect(result.summary.abilityRewardCount).toBe(1);
    expect(result.summary.abilityRuntimeOwnerMissingCount).toBe(1);
    expect(result.summary.questRewardDispatchBridgeMissingCount).toBe(20);
    expect(result.summary.unresolvedReferenceCount).toBe(21);
    expect(result.assessments[19]).toMatchObject({ questId: "story-map-001-quest-20", abilityId: "ability.story.001", supported: false });
    expect(result.assessments[19]?.abilityRuntimeOwner).toBeUndefined();
    expect(result.graph.issues.some(issue => issue.dependencyKey === "ability-runtime-owner:ability.story.001")).toBe(true);
    expect(result.nodes.some(node => node.key === "ability-runtime-owner:ability.story.001")).toBe(false);
  });

  it("rejects out-of-range sample and completed counts", () => {
    expect(() => buildQuestRewardRuntimeDependencyGraph({ seed: "bounds", sampleQuestCount: 0 })).toThrow("sampleQuestCount must be between 1 and 20");
    expect(() => buildQuestRewardRuntimeDependencyGraph({ seed: "bounds", sampleQuestCount: 21 })).toThrow("sampleQuestCount must be between 1 and 20");
    expect(() => buildQuestRewardRuntimeDependencyGraph({ seed: "bounds", completedQuestCount: -1 })).toThrow("completedQuestCount must be between 0 and 20");
    expect(() => buildQuestRewardRuntimeDependencyGraph({ seed: "bounds", completedQuestCount: 21 })).toThrow("completedQuestCount must be between 0 and 20");
    expect(() => buildQuestRewardRuntimeDependencyGraph({ seed: "rules", rulesVersion: "other.v1" })).toThrow("Unsupported quest reward runtime graph rules version");
  });
});
