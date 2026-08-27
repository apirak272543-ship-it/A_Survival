import { describe, expect, it } from "vitest";
import { defaultOfflineMapState, normalizeOfflineMapState } from "../client/src/game/storage/indexedDb";
import { CHEST_SLOT_LIMIT, STORAGE_CHEST_ID } from "../client/src/game/systems/worldStorageSystem";
import { DEFAULT_IN_MAP_SETTINGS } from "../client/src/game/systems/cameraModes";

const legacyState = { fogOfWar: "known", harvestedNodes: { nodeA: 1 }, worldBlockOverrides: {}, worldFarmState: {} };

describe("offline map storage persistence", () => {
  it("adds an empty 27-slot storage namespace to legacy map state", () => {
    const normalized = normalizeOfflineMapState(legacyState, "obsidian-frontier", "player-a");
    expect(normalized.worldStorageById).toEqual({});
    expect(normalized.inMapSettings).toEqual(DEFAULT_IN_MAP_SETTINGS);
    const defaults = defaultOfflineMapState("obsidian-frontier", "player-a");
    expect(defaults.worldStorageById).toEqual({});
    expect(defaults.inMapSettings).toEqual(DEFAULT_IN_MAP_SETTINGS);
    expect(CHEST_SLOT_LIMIT).toBe(27);
  });

  it("normalizes a valid camera preference without changing the map/player namespace", () => {
    const normalized = normalizeOfflineMapState({ ...legacyState, inMapSettings: { cameraMode: "side", viewDistanceBlocks: 50, targetFps: 120 } }, "obsidian-frontier", "player-a");
    expect(normalized).toMatchObject({ mapId: "obsidian-frontier", playerId: "player-a", inMapSettings: { cameraMode: "side", viewDistanceBlocks: 50, targetFps: 120 } });
  });

  it("keeps the same chest id isolated by the map+player identity supplied to normalization", () => {
    const chestState = { [STORAGE_CHEST_ID]: [null] };
    const first = normalizeOfflineMapState({ ...legacyState, worldStorageById: chestState }, "obsidian-frontier", "player-a");
    const second = normalizeOfflineMapState({ ...legacyState, worldStorageById: {} }, "obsidian-frontier", "player-b");
    const otherMap = normalizeOfflineMapState({ ...legacyState, worldStorageById: {} }, "future-map", "player-a");
    expect(first).toMatchObject({ mapId: "obsidian-frontier", playerId: "player-a", worldStorageById: { [STORAGE_CHEST_ID]: expect.any(Array) } });
    expect(second).toMatchObject({ mapId: "obsidian-frontier", playerId: "player-b", worldStorageById: {} });
    expect(otherMap).toMatchObject({ mapId: "future-map", playerId: "player-a", worldStorageById: {} });
    expect(first.worldStorageById).not.toBe(second.worldStorageById);
  });
});
