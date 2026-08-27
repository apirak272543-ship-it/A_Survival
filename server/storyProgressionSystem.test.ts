import { describe, expect, it } from "vitest";
import {
  canCompleteStoryQuest,
  completeStoryQuest,
  createDefaultStoryProgressState,
  getNextStoryQuestId,
  getRuntimeStoryMapId,
  getStoryMapRuntimeStatus,
  getStoryProgressSummary,
  normalizeStoryProgressState,
  STORY_PLAYABLE_MAP_ID,
  STORY_QUESTS_PER_MAP,
} from "../client/src/game/systems/storyProgressionSystem";
import { createSession, normalizeSession } from "../client/src/game/storage/session";

describe("Obsidian story progress", () => {
  it("starts with only the Obsidian runtime map available", () => {
    const state = createDefaultStoryProgressState();
    expect(getStoryMapRuntimeStatus(1)).toBe("playable");
    expect(getStoryMapRuntimeStatus(2)).toBe("planned");
    expect(getRuntimeStoryMapId(1)).toBe(STORY_PLAYABLE_MAP_ID);
    expect(getRuntimeStoryMapId(2)).toBeNull();
    expect(getNextStoryQuestId(state)).toBe("story-map-001-quest-01");
    expect(getStoryProgressSummary(state)).toMatchObject({ playableMapId: STORY_PLAYABLE_MAP_ID, completedQuestCount: 0, currentQuestId: "story-map-001-quest-01", futureMapsRuntimeImportAllowed: false });
  });

  it("requires the sequential 20-quest chain and marks the next map as planned only", () => {
    let state = createDefaultStoryProgressState();
    expect(canCompleteStoryQuest(state, "story-map-001-quest-02").accepted).toBe(false);
    for (let order = 1; order <= STORY_QUESTS_PER_MAP; order += 1) {
      const result = completeStoryQuest({ state, questId: `story-map-001-quest-${String(order).padStart(2, "0")}`, now: order });
      expect(result.accepted).toBe(true);
      state = result.state;
    }
    expect(state.completedQuestIds).toHaveLength(20);
    expect(state.completedMapIndex).toBe(1);
    expect(state.nextMapReadyIndex).toBe(2);
    expect(getNextStoryQuestId(state)).toBeNull();
    expect(canCompleteStoryQuest(state, "story-map-002-quest-01")).toMatchObject({ accepted: false, reason: "เควสของแผนที่อนาคตยังเป็นข้อมูล planned และยังเล่นไม่ได้" });
    expect(completeStoryQuest({ state, questId: "story-map-001-quest-20", now: 30 })).toMatchObject({ accepted: false, reason: "เควสนี้ผ่านไปแล้ว" });
  });

  it("normalizes legacy or malformed progress without accepting future-map completion", () => {
    const normalized = normalizeStoryProgressState({ completedQuestIds: ["story-map-001-quest-01", "story-map-001-quest-03", "story-map-002-quest-01", "unknown"] });
    expect(normalized).toEqual({ completedQuestIds: ["story-map-001-quest-01"], completedMapIndex: 0, nextMapReadyIndex: null });
    const session = normalizeSession({ ...createSession("ProgressProof"), storyProgress: { completedQuestIds: ["story-map-001-quest-01"] } });
    expect(session?.storyProgress).toEqual(normalized);
  });
});
