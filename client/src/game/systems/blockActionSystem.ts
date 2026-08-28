import type { ItemInstance } from "@/game/data/catalog";
import {
  blockKey,
  canPlaceBlock,
  getBlockDefinition,
  getPlaceableBlockModule,
  isSolidSupport,
  type BlockTool,
  type BlockToolTag,
  type WorldBlock,
} from "@/game/data/blockModules";

export type BlockDropKind = "none" | "material" | "block-item";

export type BlockBreakResult = {
  accepted: boolean;
  blockKey: string;
  blockId: string;
  action: "break" | "chop" | "harvest";
  removed: boolean;
  usedCorrectTool: boolean;
  dropKind: BlockDropKind;
  dropDefinitionId?: string;
  dropQuantity: number;
  message: string;
};

export function resolveBlockBreak(block: WorldBlock, toolTag?: BlockToolTag): BlockBreakResult {
  const definition = getBlockDefinition(block.blockId);
  if (!definition || block.state === "broken") {
    return {
      accepted: false,
      blockKey: block.key,
      blockId: block.blockId,
      action: definition?.action ?? "break",
      removed: false,
      usedCorrectTool: false,
      dropKind: "none",
      dropQuantity: 0,
      message: "บล็อกนี้ถูกทำลายไปแล้วหรือไม่พบคำจำกัดความ",
    };
  }

  const usedCorrectTool = definition.requiredToolTag === toolTag;
  if (usedCorrectTool && definition.blockItemDefinitionId) {
    return {
      accepted: true,
      blockKey: block.key,
      blockId: block.blockId,
      action: definition.action,
      removed: true,
      usedCorrectTool,
      dropKind: "block-item",
      dropDefinitionId: definition.blockItemDefinitionId,
      dropQuantity: definition.dropQuantity,
      message: "เครื่องมือถูกประเภท: ได้บล็อกกลับมาเพื่อวางสร้าง",
    };
  }

  return {
    accepted: true,
    blockKey: block.key,
    blockId: block.blockId,
    action: definition.action,
    removed: true,
    usedCorrectTool,
    dropKind: "none",
    dropQuantity: 0,
    message: "บล็อกถูกทำลาย แต่เครื่องมือไม่ตรงประเภทจึงไม่ได้บล็อกกลับมา",
  };
}

export type BlockCoordinate = { x: number; y: number; z: number };
export type WorldBlockOverrides = Record<string, string | null>;

function hasFiniteCoordinates(coordinate: BlockCoordinate) {
  return Number.isFinite(coordinate.x) && Number.isFinite(coordinate.y) && Number.isFinite(coordinate.z);
}

export function getBlockAt(moduleId: string | null, coordinate: BlockCoordinate, overrides: WorldBlockOverrides) {
  if (!hasFiniteCoordinates(coordinate)) return null;
  const key = blockKey(coordinate.x, coordinate.y, coordinate.z);
  return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : moduleId;
}

export function getObsidianBaseBlock(coordinate: BlockCoordinate) {
  return coordinate.y === 0 ? "terrain.ash" : null;
}

export function getWorldBlockAt(coordinate: BlockCoordinate, overrides: WorldBlockOverrides) {
  return getBlockAt(getObsidianBaseBlock(coordinate), coordinate, overrides);
}

function asBlockToolTag(tool: BlockTool): BlockToolTag | undefined {
  if (tool === "hand" || tool === "shovel") return undefined;
  return tool;
}

function worldBlockForCoordinate(moduleId: string, coordinate: BlockCoordinate): WorldBlock {
  const definition = getBlockDefinition(moduleId);
  const hardness = Math.max(1, definition?.hardness ?? 1);
  return {
    key: blockKey(coordinate.x, coordinate.y, coordinate.z),
    blockId: moduleId,
    moduleId,
    x: Math.round(coordinate.x),
    y: Math.round(coordinate.y),
    z: Math.round(coordinate.z),
    state: "intact",
    hitPoints: hardness,
    maxHitPoints: hardness,
    solid: Boolean(definition?.solid),
    seed: 0,
  };
}

export function breakBlockAt(input: {
  moduleId: string;
  coordinate: BlockCoordinate;
  tool: BlockTool;
  overrides: WorldBlockOverrides;
}) {
  if (!hasFiniteCoordinates(input.coordinate)) return { accepted: false as const, blockKey: "invalid-coordinate", blockId: input.moduleId, action: "break" as const, removed: false, usedCorrectTool: false, dropKind: "none" as const, dropQuantity: 0, message: "พิกัดบล็อกไม่ถูกต้อง", overrides: input.overrides };
  const result = resolveBlockBreak(worldBlockForCoordinate(input.moduleId, input.coordinate), asBlockToolTag(input.tool));
  if (!result.accepted || !result.removed) return { ...result, overrides: input.overrides };
  return {
    ...result,
    droppedDefinitionId: result.dropKind === "block-item" ? result.dropDefinitionId : undefined,
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
  if (!hasFiniteCoordinates(input.coordinate)) return { accepted: false as const, reason: "พิกัดบล็อกไม่ถูกต้อง", overrides: input.overrides };
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
