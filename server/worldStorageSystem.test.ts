import { describe, expect, it } from "vitest";
import { createStarterInstance, createMapRewardInstance, type ItemInstance } from "../client/src/game/data/catalog";
import { CARRY_SLOT_LIMIT, CHEST_SLOT_LIMIT, STORAGE_CHEST_ID, depositIntoChest, getWorldStorageSlots, normalizeWorldStorage, storageSlotCount, withdrawFromChest, type WorldStorageById } from "../client/src/game/systems/worldStorageSystem";

const emptyStorage = (): WorldStorageById => ({});

function item(definitionId: string, sequence: number): ItemInstance {
  return createStarterInstance(definitionId, sequence);
}

describe("world storage contract", () => {
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
});
