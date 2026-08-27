import type { ItemInstance } from "@/game/data/catalog";
import { getItemDefinition } from "@/game/data/catalog";

export const PLAYER_INVENTORY_SLOTS = 40;
export const WORLD_STORAGE_DEFAULT_SLOTS = 27;

export type InventoryAddResult = {
  accepted: boolean;
  inventory: ItemInstance[];
  remainder: ItemInstance | null;
  addedQuantity: number;
  message: string;
};

export type WorldStorage = {
  id: string;
  mapId: string;
  slots: ItemInstance[];
  capacity: number;
};

function cloneInstance(instance: ItemInstance, quantity: number, instanceId = instance.instanceId): ItemInstance {
  return { ...instance, instanceId, quantity };
}

function allocateStackInstanceId(baseId: string, usedIds: Set<string>, sequence: number) {
  let suffix = sequence;
  let candidate = `${baseId}-stack-${suffix}`;
  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-stack-${suffix}`;
  }
  usedIds.add(candidate);
  return candidate;
}

/**
 * Adds a drop to a bounded container. Stackable items merge by definition until
 * their own stackLimit; non-stackable definitions consume one slot per instance.
 */
export function addItemToContainer(container: ItemInstance[], incoming: ItemInstance, capacity: number): InventoryAddResult {
  const definition = getItemDefinition(incoming.definitionId);
  if (!definition || incoming.quantity < 1) return { accepted: false, inventory: container, remainder: incoming, addedQuantity: 0, message: "ไม่พบ item definition หรือจำนวนไม่ถูกต้อง" };
  const stackLimit = definition.stackLimit;
  const next = container.map(item => ({ ...item }));
  const usedIds = new Set(next.map(item => item.instanceId));
  let remaining = incoming.quantity;
  let stackSequence = 1;

  if (stackLimit > 1) {
    for (const item of next) {
      if (item.definitionId !== incoming.definitionId || item.quantity >= stackLimit) continue;
      const room = stackLimit - item.quantity;
      const added = Math.min(room, remaining);
      item.quantity += added;
      remaining -= added;
      if (remaining === 0) break;
    }
  }

  while (remaining > 0 && next.length < capacity) {
    const quantity = Math.min(stackLimit, remaining);
    const instanceId = allocateStackInstanceId(incoming.instanceId, usedIds, stackSequence);
    stackSequence += 1;
    next.push(cloneInstance(incoming, quantity, instanceId));
    remaining -= quantity;
  }

  const addedQuantity = incoming.quantity - remaining;
  return {
    accepted: addedQuantity > 0,
    inventory: next,
    remainder: remaining > 0 ? cloneInstance(incoming, remaining) : null,
    addedQuantity,
    message: remaining > 0 ? `พื้นที่ไม่พอ เหลือ ${remaining} ชิ้น` : `เก็บ ${addedQuantity} ชิ้นแล้ว`,
  };
}

export function removeItemInstanceQuantity(container: ItemInstance[], instanceId: string, quantity: number) {
  if (quantity < 1) return { accepted: false, inventory: container, removedQuantity: 0, message: "จำนวนที่นำออกไม่ถูกต้อง" };
  const target = container.find(item => item.instanceId === instanceId);
  if (!target || target.quantity < quantity) return { accepted: false, inventory: container, removedQuantity: 0, message: "จำนวนใน item instance ไม่พอ" };
  const inventory = target.quantity === quantity
    ? container.filter(item => item.instanceId !== instanceId)
    : container.map(item => item.instanceId === instanceId ? { ...item, quantity: item.quantity - quantity } : item);
  return { accepted: true as const, inventory, removedQuantity: quantity, message: `นำ ${quantity} ชิ้นออกแล้ว` };
}

export function removeItemFromContainer(container: ItemInstance[], definitionId: string, quantity: number, capacity = Number.POSITIVE_INFINITY) {
  if (quantity < 1) return { accepted: false, inventory: container, removedQuantity: 0, message: "จำนวนที่นำออกไม่ถูกต้อง" };
  let remaining = quantity;
  const next: ItemInstance[] = [];
  for (const item of container) {
    if (item.definitionId !== definitionId || remaining === 0) {
      next.push(item);
      continue;
    }
    const removed = Math.min(item.quantity, remaining);
    remaining -= removed;
    if (item.quantity > removed) next.push({ ...item, quantity: item.quantity - removed });
  }
  return {
    accepted: remaining === 0,
    inventory: remaining === 0 ? next : container,
    removedQuantity: quantity - remaining,
    message: remaining === 0 ? `นำ ${quantity} ชิ้นออกแล้ว` : "จำนวนในคลังไม่พอ",
  };
}

export function createWorldStorage(mapId: string, id: string, capacity = WORLD_STORAGE_DEFAULT_SLOTS): WorldStorage {
  return { id, mapId, slots: [], capacity };
}

export function depositToWorldStorage(storage: WorldStorage, incoming: ItemInstance): { storage: WorldStorage; remainder: ItemInstance | null; accepted: boolean; message: string } {
  const result = addItemToContainer(storage.slots, incoming, storage.capacity);
  return { storage: { ...storage, slots: result.inventory }, remainder: result.remainder, accepted: result.accepted, message: result.message };
}

export function withdrawFromWorldStorage(storage: WorldStorage, definitionId: string, quantity: number, inventory: ItemInstance[]): { storage: WorldStorage; inventory: ItemInstance[]; accepted: boolean; message: string } {
  const removed = removeItemFromContainer(storage.slots, definitionId, quantity);
  if (!removed.accepted) return { storage, inventory, accepted: false, message: removed.message };
  const item = storage.slots.find(candidate => candidate.definitionId === definitionId);
  if (!item) return { storage, inventory, accepted: false, message: "ไม่พบ item ในหีบ" };
  const transfer = addItemToContainer(inventory, { ...item, quantity }, PLAYER_INVENTORY_SLOTS);
  if (!transfer.accepted || transfer.remainder) return { storage, inventory, accepted: false, message: "กระเป๋าเต็ม จึงนำของออกจากหีบไม่ได้" };
  return { storage: { ...storage, slots: removed.inventory }, inventory: transfer.inventory, accepted: true, message: `นำ ${quantity} ชิ้นออกจากหีบแล้ว` };
}
