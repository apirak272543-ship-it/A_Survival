import { describe, expect, it } from "vitest";
import { buildQuestRewardDispatchDependencyGraph } from "./generators/questRewardDispatchDependencyGraph";

describe("quest reward dispatch dependency graph", () => {
  it("reports item/reputation dispatch blockers for the first MAP_001 quest", () => {
    const result = buildQuestRewardDispatchDependencyGraph({ seed: "dispatch-graph-seed", completedQuestCount: 0, sequenceBase: 10 });

    expect(result.previewOnly).toBe(true);
    expect(result.artifact).toMatchObject({ mapId: "obsidian-frontier", candidateQuestId: "story-map-001-quest-01", candidateQuestOrder: 1, completedQuestCount: 0, sequenceBase: 10 });
    expect(result.assessment).toMatchObject({ questId: "story-map-001-quest-01", questOrder: 1, accepted: false, code: "unsupported-reward", appliedRewardCount: 0, rewardEventIds: [] });
    expect(result.summary).toMatchObject({ accepted: false, persistenceOwnerCalled: false, gameplayEventEmitted: false, abilityRuntimeOwnerAvailable: false, requiredPersistenceCallerMissing: true, requiredAbilityCallerMissing: false, runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "MISSING_REQUIRED_DEPENDENCY", dependencyKey: "reward.dispatch:persistence-owner" })]));
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("adds an ability owner blocker for the final quest without opening a future map", () => {
    const result = buildQuestRewardDispatchDependencyGraph({ seed: "dispatch-final-seed", completedQuestCount: 19 });

    expect(result.artifact).toMatchObject({ mapId: "obsidian-frontier", candidateQuestId: "story-map-001-quest-20", candidateQuestOrder: 20, completedQuestCount: 19 });
    expect(result.assessment).toMatchObject({ accepted: false, code: "ability-runtime-missing" });
    expect(result.summary).toMatchObject({ requiredPersistenceCallerMissing: true, requiredAbilityCallerMissing: true, runtimeImportAllowed: false });
    expect(result.graph.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_REQUIRED_DEPENDENCY", dependencyKey: "reward.dispatch:persistence-owner" }),
      expect.objectContaining({ code: "MISSING_REQUIRED_DEPENDENCY", dependencyKey: "reward.dispatch:ability-owner" }),
    ]));
  });

  it("clamps preview inputs and remains deterministic", () => {
    const input = { seed: "dispatch-bounds-seed", completedQuestCount: -8, sequenceBase: -3 };
    const first = buildQuestRewardDispatchDependencyGraph(input);
    const second = buildQuestRewardDispatchDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ completedQuestCount: 0, candidateQuestOrder: 1, sequenceBase: 0 });
  });
});
