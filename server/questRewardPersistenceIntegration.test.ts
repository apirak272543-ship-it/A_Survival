import { describe, expect, it } from "vitest";
import { isSafeSyncAction } from "./db";
import { selectQueueableSessionActions } from "../client/src/game/storage/indexedDb";
import { isSafeQuestRewardPendingAction } from "../client/src/game/systems/questRewardPendingAction";
import type { HomeAction } from "../client/src/game/home/homeSystemV2";

function questRewardAction(overrides: Partial<HomeAction> = {}): HomeAction {
  return {
    id: "quest-reward-dispatch:story-map-001-quest-01:quest-reward:story-map-001-quest-01:1",
    type: "quest-reward-dispatch",
    createdAt: 1_000,
    payload: {
      mapId: "obsidian-frontier",
      questId: "story-map-001-quest-01",
      questOrder: 1,
      rewardEventIds: ["quest-reward:story-map-001-quest-01:1"],
      rewardInstanceIds: ["obsidian-frontier-material-001-4"],
      sequenceBase: 4,
    },
    ...overrides,
  };
}

describe("quest reward persistence integration boundary", () => {
  it("accepts a valid pending action at both client and server boundaries", () => {
    const action = questRewardAction();
    expect(isSafeQuestRewardPendingAction(action)).toBe(true);
    expect(isSafeSyncAction(action.type, action.payload)).toBe(true);
  });

  it("rejects a malformed quest action before queueing or sync acceptance", () => {
    const action = questRewardAction({
      payload: { ...questRewardAction().payload, questId: "story-map-001-quest-20", questOrder: 1 },
    });
    expect(isSafeQuestRewardPendingAction(action)).toBe(false);
    expect(isSafeSyncAction(action.type, action.payload)).toBe(false);

    const selection = selectQueueableSessionActions([action], 8);
    expect(selection.actions).toEqual([]);
    expect(selection.rejectedIds).toEqual([action.id]);
  });

  it("preserves legacy action compatibility while filtering only unsafe quest actions", () => {
    const valid = questRewardAction();
    const legacy: HomeAction = { id: "toggle-pet-follow-1000-a", type: "toggle-pet-follow", createdAt: 1_000, payload: {} };
    const selection = selectQueueableSessionActions([valid, legacy], 8);
    expect(selection.actions.map(action => action.id)).toEqual([valid.id, legacy.id]);
    expect(selection.rejectedIds).toEqual([]);
    expect(isSafeSyncAction("unknown-action", {})).toBe(false);
  });
});
