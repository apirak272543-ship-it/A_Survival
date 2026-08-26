import type { ItemInstance } from "@/game/data/catalog";
import {
  blockKey,
  canPlaceBlock,
  getBlockDefinition,
  getPlaceableBlockModule,
  isSolidSupport,
  resolveBlockBreak,
  type BlockTool,
} from "@/game/data/blockModules";

export type BlockCoordinate = { x: number; y: number; z: number };
export type WorldBlockOverrides = Record<string, string | null>;

export function getBlockAt(moduleId: string | null, coordinate: BlockCoordinate, overrides: WorldBlockOverrides) {
  const key = blockKey(coordinate.x, coordinate.y, coordinate.z);
  return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : moduleId;
}

export function getObsidianBaseBlock(coordinate: BlockCoordinate) {
  return coordinate.y === 0 ? "terrain.ash" : null;
}

export function getWorldBlockAt(coordinate: BlockCoordinate, overrides: WorldBlockOverrides) {
  return getBlockAt(getObsidianBaseBlock(coordinate), coordinate, overrides);
}

export function breakBlockAt(input: {
  moduleId: string;
  coordinate: BlockCoordinate;
  tool: BlockTool;
  overrides: WorldBlockOverrides;
}) {
  const result = resolveBlockBreak(input.moduleId, input.tool);
  if (!result.accepted || !result.removed) return { ...result, overrides: input.overrides };
  return {
    ...result,
    overrides: { ...input.overrides, [blockKey(input.coordinate.x, input.coordinate.y, input.coordinate.z)]: null },
  };
}

export function placeBlockAt(input: {
  moduleId: string;
  coordinate: BlockCoordinate;
  supportModuleId?: string | null;
  existingModuleId?: string | null;
  overrides: WorldBlockOverrides;
}) {
  const placement = canPlaceBlock(input.moduleId, input.supportModuleId, input.existingModuleId);
  if (!placement.accepted) return { ...placement, overrides: input.overrides };
  return {
    ...placement,
    overrides: { ...input.overrides, [blockKey(input.coordinate.x, input.coordinate.y, input.coordinate.z)]: input.moduleId },
  };
}

export function consumeOneFromStack(inventory: ItemInstance[], instanceId: string) {
  const instance = inventory.find(candidate => candidate.instanceId === instanceId && candidate.quantity > 0);
  if (!instance) return { accepted: false as const, inventory, reason: "ไม่พบไอเทมในช่องถือ" };
  const inventoryAfter = instance.quantity === 1
    ? inventory.filter(candidate => candidate.instanceId !== instanceId)
    : inventory.map(candidate => candidate.instanceId === instanceId ? { ...candidate, quantity: candidate.quantity - 1 } : candidate);
  return { accepted: true as const, inventory: inventoryAfter };
}

export function placeBlockWithInventory(input: {
  inventory: ItemInstance[];
  instanceId: string;
  coordinate: BlockCoordinate;
  supportModuleId?: string | null;
  existingModuleId?: string | null;
  overrides: WorldBlockOverrides;
}) {
  const item = input.inventory.find(candidate => candidate.instanceId === input.instanceId && candidate.quantity > 0);
  if (!item) return { accepted: false as const, reason: "ไม่พบไอเทมในช่องถือ", inventory: input.inventory, overrides: input.overrides };
  const moduleId = getPlaceableBlockModule(item.definitionId);
  if (!moduleId) return { accepted: false as const, reason: "ไอเทมนี้ยังไม่ใช่บล็อกที่วางในโลกได้", inventory: input.inventory, overrides: input.overrides };
  const placement = placeBlockAt({ ...input, moduleId });
  if (!placement.accepted) return { ...placement, inventory: input.inventory };
  const consumed = consumeOneFromStack(input.inventory, input.instanceId);
  if (!consumed.accepted) return { accepted: false as const, reason: consumed.reason, inventory: input.inventory, overrides: input.overrides };
  return { ...placement, inventory: consumed.inventory, definitionId: item.definitionId };
}

export function normalizeWorldBlockOverrides(candidate: unknown): WorldBlockOverrides {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
  return Object.fromEntries(Object.entries(candidate).filter(([key, value]) => /^-?\d+:-?\d+:-?\d+$/.test(key) && (value === null || (typeof value === "string" && Boolean(getBlockDefinition(value)))))) as WorldBlockOverrides;
}

export function canUseAsSupport(moduleId: string | null | undefined) {
  return isSolidSupport(moduleId);
}

export function getAdjacentSupportModule(coordinate: BlockCoordinate, overrides: WorldBlockOverrides) {
  return getWorldBlockAt({ x: coordinate.x, y: coordinate.y - 1, z: coordinate.z }, overrides);
}

export function getBlockModuleForPlacementItem(definitionId: string) {
  return getPlaceableBlockModule(definitionId);
}
