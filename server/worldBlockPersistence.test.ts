import { describe, expect, it } from "vitest";
import { createDefaultOfflineMapState } from "../client/src/game/storage/indexedDb";
import { applyWorldBlockOverrides } from "../client/src/game/storage/obsidianWorldModule";
import type { WorldBlock } from "../client/src/game/data/blockModules";

const generated: WorldBlock = {
  key: "2:1:2",
  blockId: "rock.obsidian.small",
  moduleId: "rock.cluster.obsidian",
  groupId: "rock-test",
  x: 2,
  y: 1,
  z: 2,
  state: "intact",
  hitPoints: 2,
  maxHitPoints: 2,
  solid: true,
  seed: 9107,
};

const placed: WorldBlock = {
  key: "3:1:2",
  blockId: "rock.obsidian.small",
  moduleId: "player.placed",
  groupId: "placed:3:1:2",
  x: 3,
  y: 1,
  z: 2,
  state: "intact",
  hitPoints: 2,
  maxHitPoints: 2,
  solid: true,
  seed: 9107,
};

describe("map-local world block persistence contract", () => {
  it("creates a map-scoped default without leaking carried or world storage", () => {
    const state = createDefaultOfflineMapState("obsidian-frontier", "player-a");
    expect(state.mapId).toBe("obsidian-frontier");
    expect(state.playerId).toBe("player-a");
    expect(state.fogOfWar).toBe("");
    expect(state.harvestedNodes).toEqual({});
    expect(state.worldStorageById).toEqual({});
    expect(state.worldBlockOverrides).toEqual({});
    expect(state.worldPlants).toEqual({});
    expect(state.cameraMode).toBe("overhead");
    expect(state.inMapSettings).toEqual({ cameraMode: "overhead", viewDistanceBlocks: 20, targetFps: 60 });
    expect(Object.keys(state.worldFarmState)).toEqual(["farm-plot-01", "farm-plot-02", "farm-plot-03", "farm-plot-04"]);
    expect(state.updatedAt).toBeGreaterThan(0);
  });

  it("keeps a broken generated block absent after reload hydration", () => {
    const saved = { ...createDefaultOfflineMapState("obsidian-frontier", "player-a"), worldBlockOverrides: { [generated.key]: null } };
    const hydrated = applyWorldBlockOverrides([generated], saved.worldBlockOverrides);
    expect(hydrated).toEqual([]);
  });

  it("restores a player-placed block after reload hydration", () => {
    const saved = { ...createDefaultOfflineMapState("obsidian-frontier", "player-a"), worldBlockOverrides: { [placed.key]: placed } };
    const hydrated = applyWorldBlockOverrides([generated], saved.worldBlockOverrides);
    expect(hydrated).toContainEqual(placed);
    expect(hydrated).toContainEqual(generated);
  });

  it("does not leak overrides across map or player composite identities", () => {
    const mapAPlayerA = { ...createDefaultOfflineMapState("obsidian-frontier", "player-a"), worldBlockOverrides: { [generated.key]: null } };
    const mapAPlayerB = createDefaultOfflineMapState("obsidian-frontier", "player-b");
    const mapBPlayerA = createDefaultOfflineMapState("future-map", "player-a");
    expect(applyWorldBlockOverrides([generated], mapAPlayerA.worldBlockOverrides)).toEqual([]);
    expect(applyWorldBlockOverrides([generated], mapAPlayerB.worldBlockOverrides)).toEqual([generated]);
    expect(applyWorldBlockOverrides([generated], mapBPlayerA.worldBlockOverrides)).toEqual([generated]);
  });
});
