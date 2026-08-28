import { getItemDefinition, validateItemInstances, type ItemInstance } from "@/game/data/catalog";
import type { HomeAction } from "@/game/home/homeSystemV2";
import { addItemToContainer, createWorldStorage, removeItemInstanceQuantity, WORLD_STORAGE_DEFAULT_SLOTS, PLAYER_INVENTORY_SLOTS, type WorldStorage } from "@/game/systems/inventorySystem";

export const CARRY_SLOT_LIMIT = 40;
export const CHEST_SLOT_LIMIT = 27;
export const STORAGE_CHEST_ID = "obsidian-chest-01";
export const STORAGE_CHEST_MODULE_ID = "storage.obsidian.chest";

type StorageSlot = ItemInstance | null;
export type WorldStorageById = Record<string, StorageSlot[]>;

export type StorageTransferActionType = "storage-deposit" | "storage-withdraw";

export type StorageTransferAction = HomeAction & {
  type: StorageTransferActionType;
  payload: {
    mapId: string;
    chestId: string;
    itemInstanceId: string;
    slot: number;
    quantity: number;
  };
};

export type StorageTransferFailure = {
  ok: false;
  reason: string;
};

export type StorageTransferSuccess = {
  ok: true;
  carry: ItemInstance[];
  storage: WorldStorageById;
  moved: ItemInstance;
  action: StorageTransferAction;
};

export type StorageTransferResult = StorageTransferFailure | StorageTransferSuccess;

const CHEST_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

function emptyChestSlots(): StorageSlot[] {
  return Array.from({ length: CHEST_SLOT_LIMIT }, () => null);
}

function validChestId(chestId: string) {
  return CHEST_ID_PATTERN.test(chestId);
}

function cloneSlot(slot: StorageSlot): StorageSlot {
  return slot ? { ...slot, provenance: { ...slot.provenance } } : null;
}

function cloneStorage(storage: WorldStorageById): WorldStorageById {
  return Object.fromEntries(Object.entries(storage).map(([chestId, slots]) => [chestId, slots.map(cloneSlot)]));
}

function isValidStorageSlot(slot: unknown): slot is ItemInstance {
  return Boolean(slot && typeof slot === "object" && !Array.isArray(slot) && validateItemInstances([slot as ItemInstance]).valid);
}

function normalizeChestSlots(candidate: unknown, seenInstanceIds: Set<string>): StorageSlot[] {
  const source = Array.isArray(candidate) ? candidate : [];
  return Array.from({ length: CHEST_SLOT_LIMIT }, (_, index) => {
    const slot = source[index];
    if (!isValidStorageSlot(slot) || seenInstanceIds.has(slot.instanceId)) return null;
    seenInstanceIds.add(slot.instanceId);
    return cloneSlot(slot);
  });
}

export function createEmptyWorldStorage(): WorldStorageById {
  return {};
}

export function normalizeWorldStorage(candidate: unknown): WorldStorageById {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
  const seenInstanceIds = new Set<string>();
  const normalized: WorldStorageById = {};
  for (const [chestId, slots] of Object.entries(candidate)) {
    if (!validChestId(chestId)) continue;
    normalized[chestId] = normalizeChestSlots(slots, seenInstanceIds);
  }
  return normalized;
}

export function getWorldStorageSlots(storage: WorldStorageById, chestId: string): StorageSlot[] {
  if (!validChestId(chestId)) return emptyChestSlots();
  const existing = storage[chestId];
  return existing ? normalizeChestSlots(existing, new Set()) : emptyChestSlots();
}

export function storageSlotCount(storage: WorldStorageById, chestId: string): number {
  return getWorldStorageSlots(storage, chestId).filter(Boolean).length;
}

export function carrySlotCount(carry: ItemInstance[]): number {
  return carry.length;
}

export function hasCarryCapacity(carry: ItemInstance[], additionalSlots = 1): boolean {
  return carrySlotCount(carry) + additionalSlots <= CARRY_SLOT_LIMIT;
}

function actionId(type: StorageTransferActionType, now: number, chestId: string, instanceId: string) {
  return `${type}-${now}-${chestId}-${instanceId}`.slice(0, 128);
}

function transferAction(type: StorageTransferActionType, mapId: string, chestId: string, instance: ItemInstance, slot: number, now: number): StorageTransferAction {
  return {
    id: actionId(type, now, chestId, instance.instanceId),
    type,
    createdAt: now,
    payload: { mapId, chestId, itemInstanceId: instance.instanceId, slot, quantity: instance.quantity },
  };
}

export function depositIntoChest(input: {
  mapId: string;
  chestId: string;
  carry: ItemInstance[];
  storage: WorldStorageById;
  itemInstanceId: string;
  now?: number;
}): StorageTransferResult {
  const { mapId, chestId, carry, storage, itemInstanceId, now = Date.now() } = input;
  if (!validChestId(chestId)) return { ok: false, reason: "ไม่รู้จักหีบนี้" };
  const carryIndex = carry.findIndex(item => item.instanceId === itemInstanceId);
  if (carryIndex < 0) return { ok: false, reason: "ไม่พบไอเทมในช่องติดตัว" };
  const moved = carry[carryIndex]!;
  if (!getItemDefinition(moved.definitionId)) return { ok: false, reason: "ไอเทมนี้ไม่มีข้อมูลที่ใช้งานได้" };
  const slots = getWorldStorageSlots(storage, chestId);
  const destinationSlot = slots.findIndex(slot => slot === null);
  if (destinationSlot < 0) return { ok: false, reason: "หีบเต็มแล้ว · ต้องย้ายของออกก่อน" };
  slots[destinationSlot] = cloneSlot(moved);
  const nextCarry = carry.filter((_, index) => index !== carryIndex);
  const nextStorage = cloneStorage(storage);
  nextStorage[chestId] = slots;
  return { ok: true, carry: nextCarry, storage: nextStorage, moved: cloneSlot(moved)!, action: transferAction("storage-deposit", mapId, chestId, moved, destinationSlot, now) };
}

export function withdrawFromChest(input: {
  mapId: string;
  chestId: string;
  carry: ItemInstance[];
  storage: WorldStorageById;
  itemInstanceId: string;
  now?: number;
}): StorageTransferResult {
  const { mapId, chestId, carry, storage, itemInstanceId, now = Date.now() } = input;
  if (!validChestId(chestId)) return { ok: false, reason: "ไม่รู้จักหีบนี้" };
  if (!hasCarryCapacity(carry)) return { ok: false, reason: `ช่องติดตัวเต็มแล้ว · รับได้สูงสุด ${CARRY_SLOT_LIMIT} ช่อง` };
  const slots = getWorldStorageSlots(storage, chestId);
  const sourceSlot = slots.findIndex(slot => slot?.instanceId === itemInstanceId);
  if (sourceSlot < 0) return { ok: false, reason: "ไม่พบไอเทมในหีบนี้" };
  const moved = slots[sourceSlot];
  if (!moved) return { ok: false, reason: "ช่องหีบว่างแล้ว" };
  slots[sourceSlot] = null;
  const nextStorage = cloneStorage(storage);
  nextStorage[chestId] = slots;
  const nextCarry = carry.concat(cloneSlot(moved)!);
  return { ok: true, carry: nextCarry, storage: nextStorage, moved: cloneSlot(moved)!, action: transferAction("storage-withdraw", mapId, chestId, moved, sourceSlot, now) };
}

export const OBSIDIAN_STORAGE_ID = "obsidian-frontier:starter-chest";
export const WORLD_STORAGE_INTERACTION_REACH = 3.8;

export type WorldStorageAnchor = {
  id: string;
  mapId: string;
  x: number;
  z: number;
  label: string;
  capacity: number;
};

export const OBSIDIAN_STORAGE_ANCHORS: readonly WorldStorageAnchor[] = [
  { id: OBSIDIAN_STORAGE_ID, mapId: "obsidian-frontier", x: 2, z: 2, label: "หีบเก็บของ Obsidian", capacity: WORLD_STORAGE_DEFAULT_SLOTS },
];

export function getWorldStorageAnchor(storageId: string, mapId = "obsidian-frontier") {
  return OBSIDIAN_STORAGE_ANCHORS.find(anchor => anchor.id === storageId && anchor.mapId === mapId);
}

export function createMapWorldStorage(mapId: string, storageId: string, slots: ItemInstance[] = []): WorldStorage {
  const anchor = getWorldStorageAnchor(storageId, mapId);
  const capacity = anchor?.capacity ?? WORLD_STORAGE_DEFAULT_SLOTS;
  return { ...createWorldStorage(mapId, storageId, capacity), slots: slots.slice(0, capacity).map(item => ({ ...item })) };
}

export function depositInstanceToWorldStorage(storage: WorldStorage, inventory: ItemInstance[], instanceId: string, quantity: number) {
  const incoming = inventory.find(item => item.instanceId === instanceId);
  if (!incoming) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "ไม่พบ item ในกระเป๋า" };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > incoming.quantity) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "จำนวนที่จะใส่หีบไม่ถูกต้อง" };
  const transfer = addItemToContainer(storage.slots, { ...incoming, quantity }, storage.capacity);
  if (!transfer.accepted) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: transfer.message };
  const movedQuantity = quantity - (transfer.remainder?.quantity ?? 0);
  const removed = removeItemInstanceQuantity(inventory, instanceId, movedQuantity);
  if (!removed.accepted) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "ย้าย item ไม่สำเร็จ จึงไม่เปลี่ยนข้อมูล" };
  return { accepted: true as const, storage: { ...storage, slots: transfer.inventory }, inventory: removed.inventory, movedQuantity, message: `ใส่ ${movedQuantity} ชิ้นในหีบแล้ว` };
}

export function withdrawInstanceFromWorldStorage(storage: WorldStorage, inventory: ItemInstance[], instanceId: string, quantity: number) {
  const stored = storage.slots.find(item => item.instanceId === instanceId);
  if (!stored) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "ไม่พบ item ในหีบ" };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > stored.quantity) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "จำนวนที่จะหยิบไม่ถูกต้อง" };
  const transfer = addItemToContainer(inventory, { ...stored, quantity }, PLAYER_INVENTORY_SLOTS);
  if (!transfer.accepted || transfer.remainder) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "กระเป๋าเต็ม จึงหยิบของจากหีบไม่ได้" };
  const removed = removeItemInstanceQuantity(storage.slots, instanceId, quantity);
  if (!removed.accepted) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "ย้าย item ไม่สำเร็จ จึงไม่เปลี่ยนข้อมูล" };
  return { accepted: true as const, storage: { ...storage, slots: removed.inventory }, inventory: transfer.inventory, movedQuantity: quantity, message: `หยิบ ${quantity} ชิ้นจากหีบแล้ว` };
}
