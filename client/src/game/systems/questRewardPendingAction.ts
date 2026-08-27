import type { HomeAction } from "@/game/home/homeSystemV2";
import { STORY_PLAYABLE_MAP_ID } from "@/game/systems/storyProgressionSystem";
import type { QuestRewardDispatchResult } from "@/game/systems/questRewardDispatchSystem";

export type QuestRewardPendingActionPayload = {
  mapId: typeof STORY_PLAYABLE_MAP_ID;
  questId: string;
  questOrder: number;
  rewardEventIds: string[];
  rewardInstanceIds: string[];
  sequenceBase: number;
};

export type QuestRewardPendingActionResult =
  | { ok: true; action: HomeAction & { type: "quest-reward-dispatch"; payload: QuestRewardPendingActionPayload } }
  | { ok: false; reason: string };

const QUEST_ID_PATTERN = /^story-map-001-quest-(0[1-9]|1\d|20)$/;

function normalizedSequenceBase(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function questOrderFor(questId: string) {
  const match = QUEST_ID_PATTERN.exec(questId);
  return match ? Number(match[1]) : null;
}

/**
 * Converts only an accepted pure item reward transition into a queueable action.
 * The caller still owns persistence and must decide when to append this action.
 * No session, IndexedDB, network, or gameplay event is touched here.
 */
export function createQuestRewardPendingAction(input: {
  mapId: string;
  questId: string;
  questOrder?: number;
  dispatch: QuestRewardDispatchResult;
  sequenceBase: number;
  createdAt: number;
}): QuestRewardPendingActionResult {
  if (input.mapId !== STORY_PLAYABLE_MAP_ID) return { ok: false, reason: "pending reward action อนุญาตเฉพาะ Obsidian Frontier" };
  const parsedOrder = questOrderFor(input.questId);
  if (!parsedOrder) return { ok: false, reason: "ไม่พบ quest ID ของ MAP_001 ที่ตรวจสอบได้" };
  if (input.questOrder !== undefined && input.questOrder !== parsedOrder) return { ok: false, reason: "ลำดับ quest ไม่ตรงกับ quest ID" };
  if (!Number.isFinite(input.createdAt) || input.createdAt < 0) return { ok: false, reason: "createdAt ของ pending reward action ไม่ถูกต้อง" };
  if (!input.dispatch.accepted) return { ok: false, reason: `dispatch ยังไม่ผ่าน: ${input.dispatch.reason}` };

  const eventIds = input.dispatch.rewardEventIds;
  const rewards = input.dispatch.appliedRewards;
  if (eventIds.length === 0 || rewards.length !== eventIds.length) return { ok: false, reason: "ผล dispatch ไม่มี reward instance/event ที่ครบคู่กัน" };
  if (new Set(eventIds).size !== eventIds.length || new Set(rewards.map(reward => reward.instanceId)).size !== rewards.length) return { ok: false, reason: "พบ reward event หรือ instance ซ้ำ จึงไม่สร้าง pending action" };
  if (rewards.some((reward, index) => reward.provenance.eventId !== eventIds[index] || reward.provenance.type !== "reward")) return { ok: false, reason: "provenance ของ reward instance ไม่ตรงกับ dispatch event" };

  const sequenceBase = normalizedSequenceBase(input.sequenceBase);
  const payload: QuestRewardPendingActionPayload = {
    mapId: STORY_PLAYABLE_MAP_ID,
    questId: input.questId,
    questOrder: parsedOrder,
    rewardEventIds: [...eventIds],
    rewardInstanceIds: rewards.map(reward => reward.instanceId),
    sequenceBase,
  };
  return {
    ok: true,
    action: {
      id: `quest-reward-dispatch:${input.questId}:${eventIds.join(",")}`,
      type: "quest-reward-dispatch",
      createdAt: Math.floor(input.createdAt),
      payload,
    },
  };
}
