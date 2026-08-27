import { describe, expect, it } from "vitest";
import { createMapRewardInstance } from "@/game/data/catalog";
import { createWorldStorage } from "@/game/systems/inventorySystem";
import { createMapWorldStorage, depositInstanceToWorldStorage, getWorldStorageAnchor, OBSIDIAN_STORAGE_ID, withdrawInstanceFromWorldStorage } from "@/game/systems/worldStorageSystem";

describe("world storage system", () => {
  it("defines one deterministic Obsidian chest with 27 map-local slots", () => {
    const anchor = getWorldStorageAnchor(OBSIDIAN_STORAGE_ID, "obsidian-frontier");
    const storage = createMapWorldStorage("obsidian-frontier", OBSIDIAN_STORAGE_ID);
    expect(anchor).toMatchObject({ id: OBSIDIAN_STORAGE_ID, mapId: "obsidian-frontier", x: 2, z: 2, capacity: 27 });
    expect(storage).toMatchObject({ id: OBSIDIAN_STORAGE_ID, mapId: "obsidian-frontier", capacity: 27, slots: [] });
    expect(getWorldStorageAnchor(OBSIDIAN_STORAGE_ID, "map-002")).toBeUndefined();
  });

  it("deposits a stack without mutating carry inventory and preserves provenance", () => {
    const incoming = createMapRewardInstance("material-002", 1, "obsidian-frontier", "chest-test-drop", "drop", 6);
    const storage = createMapWorldStorage("obsidian-frontier", OBSIDIAN_STORAGE_ID);
    const result = depositInstanceToWorldStorage(storage, [incoming], incoming.instanceId, 6);
    expect(result.accepted).toBe(true);
    expect(result.movedQuantity).toBe(6);
    expect(result.inventory).toEqual([]);
    expect(result.storage.slots).toHaveLength(1);
    expect(result.storage.slots[0]).toMatchObject({ definitionId: "material-002", quantity: 6, provenance: incoming.provenance });
  });

  it("merges compatible stacks and withdraws through the same bounded inventory helper", () => {
    const first = createMapRewardInstance("block-obsidian-ash", 2, "obsidian-frontier", "chest-stack-a", "drop", 60);
    const second = createMapRewardInstance("block-obsidian-ash", 3, "obsidian-frontier", "chest-stack-b", "harvest", 8);
    const storage = createMapWorldStorage("obsidian-frontier", OBSIDIAN_STORAGE_ID, [first]);
    const deposited = depositInstanceToWorldStorage(storage, [second], second.instanceId, 8);
    expect(deposited.accepted).toBe(true);
    expect(deposited.storage.slots).toHaveLength(2);
    expect(deposited.storage.slots.map(item => item.quantity)).toEqual([64, 4]);

    const withdrawn = withdrawInstanceFromWorldStorage(deposited.storage, [], deposited.storage.slots[1].instanceId, 4);
    expect(withdrawn.accepted).toBe(true);
    expect(withdrawn.storage.slots).toHaveLength(1);
    expect(withdrawn.inventory).toHaveLength(1);
    expect(withdrawn.inventory[0]).toMatchObject({ definitionId: "block-obsidian-ash", quantity: 4, provenance: second.provenance });
  });

  it("refuses partial deposit when the storage has no remaining slot and leaves both sides unchanged", () => {
    const storage = { ...createWorldStorage("obsidian-frontier", "tiny-chest", 1), slots: [createMapRewardInstance("material-002", 4, "obsidian-frontier", "full-chest", "drop", 64)] };
    const incoming = createMapRewardInstance("material-003", 5, "obsidian-frontier", "overflow", "drop", 1);
    const result = depositInstanceToWorldStorage(storage, [incoming], incoming.instanceId, 1);
    expect(result.accepted).toBe(false);
    expect(result.movedQuantity).toBe(0);
    expect(result.inventory).toEqual([incoming]);
    expect(result.storage).toBe(storage);
  });

  it("refuses withdrawal when carry inventory is full and does not remove chest contents", () => {
    const stored = createMapRewardInstance("block-obsidian-ash", 6, "obsidian-frontier", "full-carry", "drop", 3);
    const storage = createMapWorldStorage("obsidian-frontier", OBSIDIAN_STORAGE_ID, [stored]);
    const fullInventory = Array.from({ length: 40 }, (_, index) => createMapRewardInstance(`material-${String(index + 1).padStart(3, "0")}`, 20 + index, "obsidian-frontier", `carry-${index}`, "drop", 1));
    const result = withdrawInstanceFromWorldStorage(storage, fullInventory, stored.instanceId, 1);
    expect(result.accepted).toBe(false);
    expect(result.storage).toBe(storage);
    expect(result.inventory).toBe(fullInventory);
  });
});
