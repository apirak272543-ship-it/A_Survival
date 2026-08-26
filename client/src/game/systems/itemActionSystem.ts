import type { ItemInstance, ItemCategory } from "@/game/data/catalog";
import { getItemDefinition } from "@/game/data/catalog";

export type HotbarSlot = 0 | 1 | 2 | 3 | 4 | 5;
export type HotbarActionKind = "equip" | "consume" | "harvest" | "deploy" | "inspect";

export type HotbarActionResult = {
  accepted: boolean;
  kind: HotbarActionKind | "empty";
  instance?: ItemInstance;
  definitionId?: string;
  inventory: ItemInstance[];
  message: string;
};

export type HotbarBindings = Partial<Record<HotbarSlot, string>>;

const CONSUMABLE_CATEGORIES = new Set<ItemCategory>(["seed"]);
const DEPLOYABLE_CATEGORIES = new Set<ItemCategory>(["structure", "furniture", "decoration"]);
const HARVEST_TOOL_TAGS = new Set(["material", "structure", "tool"]);

export const DEFAULT_HOTBAR_BINDINGS: HotbarBindings = {
  0: "sword-001",
  1: "seed-001",
  2: "structure-001",
  3: "material-001",
};

export function getHotbarInstance(inventory: ItemInstance[], bindings: HotbarBindings, slot: HotbarSlot) {
  const definitionId = bindings[slot] ?? DEFAULT_HOTBAR_BINDINGS[slot];
  if (!definitionId) return undefined;
  return inventory.find(instance => instance.definitionId === definitionId && instance.quantity > 0);
}

export function getHotbarActionKind(category?: ItemCategory): HotbarActionKind {
  if (!category) return "inspect";
  if (category === "sword" || category === "bow" || category === "ranged" || category === "tool") return "equip";
  if (CONSUMABLE_CATEGORIES.has(category)) return "consume";
  if (DEPLOYABLE_CATEGORIES.has(category)) return "deploy";
  if (HARVEST_TOOL_TAGS.has(category)) return "harvest";
  return "inspect";
}

export function dispatchHotbarAction(inventory: ItemInstance[], bindings: HotbarBindings, slot: HotbarSlot): HotbarActionResult {
  const instance = getHotbarInstance(inventory, bindings, slot);
  if (!instance) return { accepted: false, kind: "empty", inventory, message: "ช่องลัดนี้ยังไม่มีไอเทม" };
  const definition = getItemDefinition(instance.definitionId);
  if (!definition) return { accepted: false, kind: "empty", inventory, message: "ไม่พบคำจำกัดความของไอเทมนี้" };
  const kind = getHotbarActionKind(definition.category);
  if (kind === "consume") {
    const nextInventory = instance.quantity <= 1
      ? inventory.filter(candidate => candidate.instanceId !== instance.instanceId)
      : inventory.map(candidate => candidate.instanceId === instance.instanceId ? { ...candidate, quantity: candidate.quantity - 1 } : candidate);
    return { accepted: true, kind, instance, definitionId: definition.id, inventory: nextInventory, message: `${definition.name} ถูกใช้แล้ว` };
  }
  if (kind === "deploy") return { accepted: true, kind, instance, definitionId: definition.id, inventory, message: `${definition.name} พร้อมวางใน Home grid` };
  if (kind === "harvest") return { accepted: true, kind, instance, definitionId: definition.id, inventory, message: `${definition.name} พร้อมทุบ/ขุด/เก็บทรัพยากร` };
  if (kind === "equip") return { accepted: true, kind, instance, definitionId: definition.id, inventory, message: `${definition.name} พร้อมใช้งาน` };
  return { accepted: true, kind, instance, definitionId: definition.id, inventory, message: `ตรวจสอบ ${definition.name} แล้ว` };
}
