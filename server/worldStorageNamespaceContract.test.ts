import { describe, expect, it } from "vitest";
import {
  buildPlayerGlobalKey,
  buildWorldStorageKey,
  evaluateWorldStorageNamespace,
  MAX_WORLD_STORAGE_CAPACITY,
  validateWorldStorageTransfer,
} from "./worldStorageNamespaceContract";

describe("world storage namespace contract", () => {
  it("creates a map-bound world storage namespace distinct from player-global state", () => {
    const result = evaluateWorldStorageNamespace({ scope: "world-map", mapId: "obsidian-frontier", storageId: "obsidian-frontier:starter-chest", capacity: 27 });

    expect(result).toMatchObject({
      contractVersion: "world-storage-namespace.v1",
      valid: true,
      issues: [],
      namespace: {
        scope: "world-map",
        mapId: "obsidian-frontier",
        storageId: "obsidian-frontier:starter-chest",
        key: "world-storage:obsidian-frontier:obsidian-frontier%3Astarter-chest",
        capacity: 27,
      },
    });
    expect(buildWorldStorageKey("obsidian-frontier", "obsidian-frontier:starter-chest")).not.toBe(buildPlayerGlobalKey("player-1"));
  });

  it("accepts same-map transfer and preserves player/global separation", () => {
    const namespace = evaluateWorldStorageNamespace({ scope: "world-map", mapId: "obsidian-frontier", storageId: "starter-chest", capacity: 27 }).namespace!;
    const result = validateWorldStorageTransfer({ action: "storage-deposit", actionMapId: "obsidian-frontier", storage: namespace, playerId: "player-1", sourceOrDestinationMapId: "obsidian-frontier" });

    expect(result).toEqual({ valid: true, issues: [], storageKey: "world-storage:obsidian-frontier:starter-chest", playerKey: "player-global:player-1", action: "storage-deposit" });
  });

  it("rejects cross-map and player-global namespace transfers", () => {
    const namespace = evaluateWorldStorageNamespace({ scope: "world-map", mapId: "obsidian-frontier", storageId: "starter-chest", capacity: 27 }).namespace!;
    const result = validateWorldStorageTransfer({
      action: "storage-withdraw",
      actionMapId: "crystalline-spires",
      storage: { ...namespace, scope: "player-global" as const, key: buildPlayerGlobalKey("player-1") },
      playerId: "player-1",
      sourceOrDestinationMapId: "crystalline-spires",
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "storage transfer requires world-map storage scope",
      "storage transfer mapId must match storage namespace mapId",
      "storage transfer cannot cross map namespaces",
      "storage transfer key does not match namespace identity",
      "player-global namespace cannot be used as world storage",
    ]));
  });

  it("rejects unsafe namespace configuration and capacity overflow", () => {
    const result = evaluateWorldStorageNamespace({ scope: "player-global", mapId: "../map", storageId: "", capacity: MAX_WORLD_STORAGE_CAPACITY + 1 });

    expect(result.valid).toBe(false);
    expect(result.namespace).toBeNull();
    expect(result.issues).toEqual(expect.arrayContaining([
      "mapId contains unsafe characters",
      "storageId must not be empty",
      "world storage scope must be world-map",
      "world storage capacity must be an integer from 1 to 64",
    ]));
  });
});
