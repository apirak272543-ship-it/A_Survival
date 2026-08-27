import type { ItemInstance } from "@/game/data/catalog";
import { createWorldStorage, type WorldStorage, WORLD_STORAGE_DEFAULT_SLOTS, addItemToContainer, removeItemInstanceQuantity, PLAYER_INVENTORY_SLOTS } from "@/game/systems/inventorySystem";

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

/**
 * The first vertical slice keeps one deterministic chest close to spawn. Its
 * contents live in OfflineMapState.worldStorageById, never in the carried
 * profile, so map/player composite-key isolation remains the source of truth.
 */
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
  if (quantity < 1 || quantity > incoming.quantity) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "จำนวนที่จะใส่หีบไม่ถูกต้อง" };
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
  if (quantity < 1 || quantity > stored.quantity) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "จำนวนที่จะหยิบไม่ถูกต้อง" };
  const transfer = addItemToContainer(inventory, { ...stored, quantity }, PLAYER_INVENTORY_SLOTS);
  if (!transfer.accepted || transfer.remainder) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "กระเป๋าเต็ม จึงหยิบของจากหีบไม่ได้" };
  const removed = removeItemInstanceQuantity(storage.slots, instanceId, quantity);
  if (!removed.accepted) return { accepted: false as const, storage, inventory, movedQuantity: 0, message: "ย้าย item ไม่สำเร็จ จึงไม่เปลี่ยนข้อมูล" };
  return { accepted: true as const, storage: { ...storage, slots: removed.inventory }, inventory: transfer.inventory, movedQuantity: quantity, message: `หยิบ ${quantity} ชิ้นจากหีบแล้ว` };
}
