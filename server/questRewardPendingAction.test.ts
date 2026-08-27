import { describe, expect, it } from "vitest";
import { createMapRewardInstance } from "@/game/data/catalog";
import { createDefaultStoryProgressState } from "@/game/systems/storyProgressionSystem";
import { createQuestRewardPendingAction } from "@/game/systems/questRewardPendingAction";

describe("quest reward pending action", () => {
  const eventId = "quest-reward:story-map-001-quest-01:1";

  function acceptedDispatch() {
    const reward = createMapRewardInstance("material-001", 4, "obsidian-frontier", eventId, "reward", 3);
    return {
      accepted: true as const,
      state: { ...createDefaultStoryProgressState(), completedQuestIds: ["story-map-001-quest-01"] },
      inventory: [reward],
      discoveredItemIds: [reward.definitionId],
      appliedRewards: [reward],
      rewardEventIds: [eventId],
      message: "รับ reward แล้ว",
    };
  }

  it("creates a deterministic JSON-safe action only from an accepted item dispatch", () => {
    const result = createQuestRewardPendingAction({ mapId: "obsidian-frontier", questId: "story-map-001-quest-01", dispatch: acceptedDispatch(), sequenceBase: 4, createdAt: 1000.8 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toMatchObject({
      id: "quest-reward-dispatch:story-map-001-quest-01:quest-reward:story-map-001-quest-01:1",
      type: "quest-reward-dispatch",
      createdAt: 1000,
      payload: {
        mapId: "obsidian-frontier",
        questId: "story-map-001-quest-01",
        questOrder: 1,
        rewardEventIds: [eventId],
        sequenceBase: 4,
      },
    });
    expect(result.action.payload.rewardInstanceIds).toHaveLength(1);
  });

  it("rejects failed dispatches, provenance mismatches, duplicate instances and future maps", () => {
    const failed = createQuestRewardPendingAction({ mapId: "obsidian-frontier", questId: "story-map-001-quest-01", dispatch: { accepted: false, state: createDefaultStoryProgressState(), inventory: [], discoveredItemIds: [], reason: "ยังไม่มี owner", code: "unsupported-reward" }, sequenceBase: 0, createdAt: 1000 });
    expect(failed).toMatchObject({ ok: false, reason: "dispatch ยังไม่ผ่าน: ยังไม่มี owner" });

    const dispatch = acceptedDispatch();
    dispatch.appliedRewards[0]!.provenance.eventId = "other-event";
    expect(createQuestRewardPendingAction({ mapId: "obsidian-frontier", questId: "story-map-001-quest-01", dispatch, sequenceBase: 0, createdAt: 1000 })).toMatchObject({ ok: false, reason: "provenance ของ reward instance ไม่ตรงกับ dispatch event" });

    const duplicate = acceptedDispatch();
    duplicate.appliedRewards = [duplicate.appliedRewards[0]!, duplicate.appliedRewards[0]!];
    duplicate.rewardEventIds = [eventId, eventId];
    expect(createQuestRewardPendingAction({ mapId: "obsidian-frontier", questId: "story-map-001-quest-01", dispatch: duplicate, sequenceBase: 0, createdAt: 1000 })).toMatchObject({ ok: false, reason: "พบ reward event หรือ instance ซ้ำ จึงไม่สร้าง pending action" });

    expect(createQuestRewardPendingAction({ mapId: "map-002-ashen-obsidian-plains", questId: "story-map-001-quest-01", dispatch: acceptedDispatch(), sequenceBase: 0, createdAt: 1000 })).toMatchObject({ ok: false, reason: "pending reward action อนุญาตเฉพาะ Obsidian Frontier" });
  });

  it("rejects malformed quest order and keeps sequence base bounded", () => {
    const mismatched = createQuestRewardPendingAction({ mapId: "obsidian-frontier", questId: "story-map-001-quest-01", questOrder: 2, dispatch: acceptedDispatch(), sequenceBase: -4, createdAt: 1000 });
    expect(mismatched).toMatchObject({ ok: false, reason: "ลำดับ quest ไม่ตรงกับ quest ID" });

    const result = createQuestRewardPendingAction({ mapId: "obsidian-frontier", questId: "story-map-001-quest-01", dispatch: acceptedDispatch(), sequenceBase: -4, createdAt: 1000 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action.payload.sequenceBase).toBe(0);
  });
});
