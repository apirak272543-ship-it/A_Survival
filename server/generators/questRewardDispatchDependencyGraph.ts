import { createDefaultStoryProgressState, normalizeStoryProgressState, type StoryProgressState } from "../../client/src/game/systems/storyProgressionSystem";
import { dispatchQuestReward, type QuestRewardDispatchQuest } from "../../client/src/game/systems/questRewardDispatchSystem";
import { generateQuestProgression, type QuestDefinition } from "./questProgressionGenerator";
import { validateGeneratorDependencyGraph, type DependencyGraphNode } from "./dependencyGraph";

export const QUEST_REWARD_DISPATCH_RULES_VERSION = "quest-reward-dispatch-rules.v1" as const;

export type QuestRewardDispatchDependencyGraphInput = {
  seed: string;
  completedQuestCount?: number;
  sequenceBase?: number;
};

type RewardDispatchAssessment = {
  questId: string;
  questOrder: number;
  requestedCompletedQuestCount: number;
  candidateCompletedQuestCount: number;
  accepted: boolean;
  code: string | null;
  rewardEventIds: string[];
  appliedRewardCount: number;
  reason: string;
};

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  const normalized = value ?? fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(normalized)));
}

function stateForCompletedPrefix(quests: QuestDefinition[], completedQuestCount: number): StoryProgressState {
  return normalizeStoryProgressState({ completedQuestIds: quests.slice(0, completedQuestCount).map(quest => quest.id) });
}

function dispatchQuestForPreview(quest: QuestDefinition): QuestRewardDispatchQuest {
  return { id: quest.id, mapIndex: quest.mapIndex, rewards: quest.rewards };
}

export function buildQuestRewardDispatchDependencyGraph(input: QuestRewardDispatchDependencyGraphInput) {
  const completedQuestCount = boundedInteger(input.completedQuestCount, 0, 0, 20);
  const sequenceBase = boundedInteger(input.sequenceBase, 0, 0, 1_000_000);
  const progression = generateQuestProgression({ mapCount: 1, seedLabel: input.seed });
  const candidateCompletedQuestCount = Math.min(completedQuestCount, progression.quests.length - 1);
  const candidateQuest = progression.quests[candidateCompletedQuestCount]!;
  const state = stateForCompletedPrefix(progression.quests, candidateCompletedQuestCount);
  const result = dispatchQuestReward({
    mapId: "obsidian-frontier",
    state,
    inventory: [],
    discoveredItemIds: [],
    quest: dispatchQuestForPreview(candidateQuest),
    now: 0,
    sequenceBase,
  });
  const assessment: RewardDispatchAssessment = {
    questId: candidateQuest.id,
    questOrder: candidateQuest.order,
    requestedCompletedQuestCount: completedQuestCount,
    candidateCompletedQuestCount,
    accepted: result.accepted,
    code: result.accepted ? null : result.code,
    rewardEventIds: result.accepted ? result.rewardEventIds : [],
    appliedRewardCount: result.accepted ? result.appliedRewards.length : 0,
    reason: result.accepted ? result.message : result.reason,
  };
  const nodes: DependencyGraphNode[] = [
    { key: "quest.progression:obsidian-frontier", kind: "quest", generatorId: "quest.progression", generatorVersion: "1.0.0", schemaVersion: progression.schemaVersion, seed: input.seed, rulesVersion: QUEST_REWARD_DISPATCH_RULES_VERSION, contentHash: "quest-progression-runtime-owner", dependencies: [] },
    { key: "story.progression:completion", kind: "simulation", generatorId: "story.progression.runtime", generatorVersion: "runtime", schemaVersion: "a-survival.story-progress.v1", seed: input.seed, rulesVersion: QUEST_REWARD_DISPATCH_RULES_VERSION, contentHash: "complete-story-quest-runtime-owner", dependencies: [{ key: "quest.progression:obsidian-frontier", kind: "quest", required: true }] },
    { key: "reward.dispatch:item-inventory", kind: "loot", generatorId: "quest.reward.dispatch", generatorVersion: "1.0.0", schemaVersion: "a-survival.quest-reward-dispatch.v1", seed: input.seed, rulesVersion: QUEST_REWARD_DISPATCH_RULES_VERSION, contentHash: "pure-item-inventory-transition", dependencies: [{ key: "story.progression:completion", kind: "simulation", required: true }, { key: "reward.dispatch:persistence-owner", kind: "simulation", required: true, generatorId: "quest.reward.persistence", generatorVersion: "missing", contentHash: "missing-runtime-caller" }] },
  ];
  if (candidateQuest.rewards.some(reward => reward.abilityId)) {
    nodes[2]!.dependencies.push({ key: "reward.dispatch:ability-owner", kind: "simulation", required: true, generatorId: "ability.runtime", generatorVersion: "missing", contentHash: "missing-runtime-owner" });
  }
  const graph = validateGeneratorDependencyGraph(nodes);
  return {
    previewOnly: true as const,
    artifact: { schemaVersion: "a-survival.quest-reward-dispatch-preview.v1", mapId: "obsidian-frontier", seed: input.seed, completedQuestCount, candidateQuestId: candidateQuest.id, candidateQuestOrder: candidateQuest.order, sequenceBase },
    assessment,
    summary: {
      requestedCompletedQuestCount: completedQuestCount,
      candidateCompletedQuestCount,
      candidateQuestOrder: candidateQuest.order,
      accepted: assessment.accepted,
      appliedRewardCount: assessment.appliedRewardCount,
      persistenceOwnerCalled: false,
      gameplayEventEmitted: false,
      abilityRuntimeOwnerAvailable: false,
      requiredPersistenceCallerMissing: true,
      requiredAbilityCallerMissing: candidateQuest.rewards.some(reward => Boolean(reward.abilityId)),
      runtimeImportAllowed: false as const,
      playerVisible: false as const,
      cacheable: false as const,
    },
    graph,
  };
}
