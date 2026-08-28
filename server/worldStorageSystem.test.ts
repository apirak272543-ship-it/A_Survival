import { describe, expect, it } from "vitest";
import { createMapRewardInstance, createStarterInstance, type ItemInstance } from "../client/src/game/data/catalog";
import { createWorldStorage } from "../client/src/game/systems/inventorySystem";
import { CARRY_SLOT_LIMIT, CHEST_SLOT_LIMIT, OBSIDIAN_STORAGE_ID, STORAGE_CHEST_ID, createMapWorldStorage, depositInstanceToWorldStorage, depositIntoChest, getWorldStorageAnchor, getWorldStorageSlots, normalizeWorldStorage, storageSlotCount, withdrawFromChest, withdrawInstanceFromWorldStorage, type WorldStorageById } from "../client/src/game/systems/worldStorageSystem";

const emptyStorage = (): WorldStorageById => ({});

function item(definitionId: string, sequence: number): ItemInstance {
  return createStarterInstance(definitionId, sequence);
}

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
    expect(deposited.storage.slots.map(current => current.quantity)).toEqual([64, 4]);

    const withdrawn = withdrawInstanceFromWorldStorage(deposited.storage, [], deposited.storage.slots[1]!.instanceId, 4);
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

  it("uses exactly 27 map-local chest slots and stores a full item instance", () => {
    const carry = [item("structure-002", 1), item("material-001", 2)];
    const result = depositIntoChest({ mapId: "obsidian-frontier", chestId: STORAGE_CHEST_ID, carry, storage: emptyStorage(), itemInstanceId: carry[0]!.instanceId, now: 100 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getWorldStorageSlots(result.storage, STORAGE_CHEST_ID)).toHaveLength(CHEST_SLOT_LIMIT);
    expect(storageSlotCount(result.storage, STORAGE_CHEST_ID)).toBe(1);
    expect(result.storage[STORAGE_CHEST_ID]?.[0]).toEqual(carry[0]);
    expect(result.action).toMatchObject({ type: "storage-deposit", payload: { mapId: "obsidian-frontier", chestId: STORAGE_CHEST_ID, slot: 0, quantity: 1 } });
    expect(result.carry).toEqual([carry[1]]);
  });

  it("rejects a 28th item without mutating carry or storage", () => {
    const slots = Array.from({ length: CHEST_SLOT_LIMIT }, (_, index) => item("material-001", index + 1));
    const carry = slots.concat(item("material-001", 100));
    const storage = { [STORAGE_CHEST_ID]: slots };
    const result = depositIntoChest({ mapId: "obsidian-frontier", chestId: STORAGE_CHEST_ID, carry, storage, itemInstanceId: carry.at(-1)!.instanceId, now: 200 });
    expect(result).toMatchObject({ ok: false, reason: "หีบเต็มแล้ว · ต้องย้ายของออกก่อน" });
    expect(carry).toHaveLength(28);
    expect(storageSlotCount(storage, STORAGE_CHEST_ID)).toBe(CHEST_SLOT_LIMIT);
  });

  it("rejects withdrawal when carry already occupies all 40 slots", () => {
    const stored = item("material-001", 1);
    const carry = Array.from({ length: CARRY_SLOT_LIMIT }, (_, index) => item("material-001", index + 2));
    const storage = { [STORAGE_CHEST_ID]: [stored] };
    const result = withdrawFromChest({ mapId: "obsidian-frontier", chestId: STORAGE_CHEST_ID, carry, storage, itemInstanceId: stored.instanceId, now: 300 });
    expect(result).toMatchObject({ ok: false, reason: "ช่องติดตัวเต็มแล้ว · รับได้สูงสุด 40 ช่อง" });
    expect(storage[STORAGE_CHEST_ID]?.[0]).toEqual(stored);
    expect(carry).toHaveLength(CARRY_SLOT_LIMIT);
  });

  it("moves the exact stored instance back to carry and preserves provenance", () => {
    const stored = createMapRewardInstance("material-001", 8, "obsidian-frontier", "world-harvest-8", "harvest");
    const storage = { [STORAGE_CHEST_ID]: [stored] };
    const result = withdrawFromChest({ mapId: "obsidian-frontier", chestId: STORAGE_CHEST_ID, carry: [], storage, itemInstanceId: stored.instanceId, now: 400 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.moved).toEqual(stored);
    expect(result.carry[0]).toEqual(stored);
    expect(result.carry[0]?.provenance).toEqual(stored.provenance);
    expect(result.storage[STORAGE_CHEST_ID]?.[0]).toBeNull();
    expect(result.action).toMatchObject({ type: "storage-withdraw", payload: { mapId: "obsidian-frontier", chestId: STORAGE_CHEST_ID, slot: 0, itemInstanceId: stored.instanceId } });
  });

  it("normalizes legacy/malformed storage to fixed slots and removes duplicate instances", () => {
    const valid = item("material-001", 20);
    const normalized = normalizeWorldStorage({
      [STORAGE_CHEST_ID]: [valid, valid, { instanceId: "bad", definitionId: "unknown-001", quantity: 1 }],
      "future chest": [valid],
      "other-chest": "invalid",
    });
    expect(Object.keys(normalized)).toEqual([STORAGE_CHEST_ID, "other-chest"]);
    expect(normalized[STORAGE_CHEST_ID]).toHaveLength(CHEST_SLOT_LIMIT);
    expect(normalized[STORAGE_CHEST_ID]?.filter(Boolean)).toHaveLength(1);
    expect(normalized["other-chest"]).toHaveLength(CHEST_SLOT_LIMIT);
  });

  it("does not clone or duplicate the item when a transfer is rejected", () => {
    const stored = item("material-001", 30);
    const carry = [stored];
    const result = withdrawFromChest({ mapId: "obsidian-frontier", chestId: STORAGE_CHEST_ID, carry, storage: emptyStorage(), itemInstanceId: stored.instanceId, now: 500 });
    expect(result).toMatchObject({ ok: false });
    expect(carry).toEqual([stored]);
  });

  it("records map identity in each transfer action so the same chest id is not cross-map state", () => {
    const stored = item("material-001", 40);
    const result = depositIntoChest({ mapId: "obsidian-frontier", chestId: STORAGE_CHEST_ID, carry: [stored], storage: emptyStorage(), itemInstanceId: stored.instanceId, now: 600 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action.payload.mapId).toBe("obsidian-frontier");
    expect(result.action.payload.chestId).toBe(STORAGE_CHEST_ID);
  });

  it("fails closed on fractional or non-finite world-storage quantities", () => {
    const stored = createMapRewardInstance("material-001", 8, "obsidian-frontier", "quantity-guard", "drop");
    const storage = createMapWorldStorage("obsidian-frontier", OBSIDIAN_STORAGE_ID, [stored]);
    const inventory = [stored];
    for (const quantity of [0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const deposit = depositInstanceToWorldStorage(storage, inventory, stored.instanceId, quantity);
      expect(deposit.accepted).toBe(false);
      expect(deposit.storage).toBe(storage);
      expect(deposit.inventory).toBe(inventory);
      const withdraw = withdrawInstanceFromWorldStorage(storage, [], stored.instanceId, quantity);
      expect(withdraw.accepted).toBe(false);
      expect(withdraw.storage).toBe(storage);
    }
  });

  it("fails closed on invalid chest transfer timestamps", () => {
    const stored = item("material-001", 80);
    const storage = { [STORAGE_CHEST_ID]: [stored] };
    const carry = [item("material-002", 81)];
    for (const now of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      expect(depositIntoChest({ mapId: "obsidian-frontier", chestId: STORAGE_CHEST_ID, carry, storage, itemInstanceId: carry[0]!.instanceId, now })).toMatchObject({ ok: false, reason: "เวลาการย้ายของไม่ถูกต้อง" });
      expect(withdrawFromChest({ mapId: "obsidian-frontier", chestId: STORAGE_CHEST_ID, carry: [], storage, itemInstanceId: stored.instanceId, now })).toMatchObject({ ok: false, reason: "เวลาการย้ายของไม่ถูกต้อง" });
      expect(storage[STORAGE_CHEST_ID]?.[0]).toEqual(stored);
      expect(carry).toHaveLength(1);
    }
  });
});
