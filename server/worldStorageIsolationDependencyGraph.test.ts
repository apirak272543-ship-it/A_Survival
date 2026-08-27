import { describe, expect, it } from "vitest";
import { OBSIDIAN_STORAGE_ID, STORAGE_CHEST_ID } from "../client/src/game/systems/worldStorageSystem";
import {
  WORLD_STORAGE_ISOLATION_GRAPH_RULES_VERSION,
  WORLD_STORAGE_ISOLATION_MAX_SAMPLE_ITEMS,
  buildWorldStorageIsolationDependencyGraph,
  getDefaultWorldStorageIsolationDependencyGraphInput,
} from "./generators/worldStorageIsolationDependencyGraph";

describe("world storage isolation dependency graph", () => {
  it("audits the canonical separate 27-slot chest and 40-slot carry boundary", () => {
    const result = buildWorldStorageIsolationDependencyGraph(getDefaultWorldStorageIsolationDependencyGraphInput());

    expect(result.summary).toMatchObject({
      mapId: "obsidian-frontier",
      storageId: OBSIDIAN_STORAGE_ID,
      canonicalChestId: STORAGE_CHEST_ID,
      mapIsRuntimeApproved: true,
      storageAnchorPresent: true,
      storageAnchorCapacity: 27,
      chestSlotLimit: 27,
      carrySlotLimit: 40,
      storageUsesSeparateContainer: true,
      storageNamespace: "mapId+playerId",
      storageStateKey: "worldStorageById",
      transferActionIsMapScoped: true,
      transferActionValidationOwnerPresent: true,
      mapPlayerPersistenceOwnerPresent: true,
      sameChestIdAcrossMapsIsolated: true,
      normalizedDuplicateInstanceRemoved: true,
      sampledChestCapacity: 27,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
    });
    expect(result.blockers).toEqual(["universal-world-storage-integration-owner-missing"]);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues).toContainEqual(expect.objectContaining({ code: "MISSING_REQUIRED_DEPENDENCY", dependencyKey: "owner:world-storage:universal-world-state-integration" }));
  });

  it("records map identity in transfer previews and keeps same chest ids isolated by map/player namespace", () => {
    const first = buildWorldStorageIsolationDependencyGraph({ mapId: "obsidian-frontier", storageId: OBSIDIAN_STORAGE_ID, playerId: "player-a", sampleItemCount: 1 });
    const second = buildWorldStorageIsolationDependencyGraph({ mapId: "obsidian-frontier", storageId: OBSIDIAN_STORAGE_ID, playerId: "player-b", sampleItemCount: 1 });

    expect(first.summary.transferActionMapId).toBe("obsidian-frontier");
    expect(first.summary.transferActionChestId).toBe(STORAGE_CHEST_ID);
    expect(first.summary.storageNamespace).toBe("mapId+playerId");
    expect(second.summary.playerId).toBe("player-b");
    expect(second.summary.transferActionMapId).toBe("obsidian-frontier");
    expect(first.nodes.find(node => node.key.startsWith("world-storage-isolation:"))?.contentHash).not.toBe(second.nodes.find(node => node.key.startsWith("world-storage-isolation:"))?.contentHash);
  });

  it("fails closed for a non-canonical map or storage anchor without enabling future-map storage", () => {
    const result = buildWorldStorageIsolationDependencyGraph({ mapId: "future-map", storageId: OBSIDIAN_STORAGE_ID });

    expect(result.summary.mapIsRuntimeApproved).toBe(false);
    expect(result.summary.storageAnchorPresent).toBe(false);
    expect(result.summary.transferActionIsMapScoped).toBe(true);
    expect(result.blockers).toEqual([
      "requested-map-not-runtime-approved",
      "storage-anchor-missing",
      "universal-world-storage-integration-owner-missing",
    ]);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("is deterministic and changes the graph hash when bounded audit input changes", () => {
    const input = { mapId: "obsidian-frontier", storageId: OBSIDIAN_STORAGE_ID, playerId: "player-a", sampleItemCount: 3, rulesVersion: WORLD_STORAGE_ISOLATION_GRAPH_RULES_VERSION };
    const first = buildWorldStorageIsolationDependencyGraph(input);
    const second = buildWorldStorageIsolationDependencyGraph(input);
    const changed = buildWorldStorageIsolationDependencyGraph({ ...input, sampleItemCount: 4 });

    expect(first).toEqual(second);
    expect(first.nodes.find(node => node.key.startsWith("world-storage-isolation:"))?.contentHash).not.toBe(changed.nodes.find(node => node.key.startsWith("world-storage-isolation:"))?.contentHash);
  });

  it("rejects unbounded identifiers, unsupported rules, and sample counts outside the chest limit", () => {
    expect(() => buildWorldStorageIsolationDependencyGraph({ sampleItemCount: 0 })).toThrow(/sampleItemCount/);
    expect(() => buildWorldStorageIsolationDependencyGraph({ sampleItemCount: WORLD_STORAGE_ISOLATION_MAX_SAMPLE_ITEMS + 1 })).toThrow(/sampleItemCount/);
    expect(() => buildWorldStorageIsolationDependencyGraph({ playerId: "" })).toThrow(/playerId/);
    expect(() => buildWorldStorageIsolationDependencyGraph({ rulesVersion: "future-rules" })).toThrow(/Unsupported/);
  });
});
