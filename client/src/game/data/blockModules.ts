import { getItemDefinition, type ItemDefinition } from "./catalog";

export type BlockTool = "hand" | "pickaxe" | "axe" | "shovel";
export type BlockKind = "terrain" | "obstacle" | "structure" | "flora" | "storage";

export type BlockDefinition = {
  id: string;
  kind: BlockKind;
  label: string;
  tool: BlockTool;
  solid: boolean;
  partial: boolean;
  requiresSupport: boolean;
  canFloat: boolean;
  placeable: boolean;
  dropDefinitionId?: string;
  tint: string;
};

export const BLOCK_MODULES: Record<string, BlockDefinition> = {
  "terrain.ash": {
    id: "terrain.ash",
    kind: "terrain",
    label: "เถ้าภูเขาไฟ",
    tool: "shovel",
    solid: true,
    partial: false,
    requiresSupport: false,
    canFloat: false,
    placeable: true,
    dropDefinitionId: "material-001",
    tint: "#332942",
  },
  "obstacle.obsidian.slab": {
    id: "obstacle.obsidian.slab",
    kind: "obstacle",
    label: "แผ่นออบซิเดียน",
    tool: "pickaxe",
    solid: true,
    partial: false,
    requiresSupport: true,
    canFloat: false,
    placeable: true,
    dropDefinitionId: "structure-001",
    tint: "#4b3c78",
  },
  "player.placed": {
    id: "player.placed",
    kind: "structure",
    label: "บล็อกที่ผู้เล่นวาง",
    tool: "pickaxe",
    solid: true,
    partial: false,
    requiresSupport: true,
    canFloat: false,
    placeable: true,
    dropDefinitionId: "structure-001",
    tint: "#6e5aa8",
  },
  "flora.obsidian.seed": {
    id: "flora.obsidian.seed",
    kind: "flora",
    label: "เมล็ดออบซิเดียน",
    tool: "hand",
    solid: false,
    partial: true,
    requiresSupport: true,
    canFloat: false,
    placeable: false,
    tint: "#6b4e39",
  },
  "flora.obsidian.sprout": {
    id: "flora.obsidian.sprout",
    kind: "flora",
    label: "ต้นอ่อนออบซิเดียน",
    tool: "axe",
    solid: false,
    partial: true,
    requiresSupport: true,
    canFloat: false,
    placeable: false,
    tint: "#4fa58a",
  },
  "flora.obsidian.young": {
    id: "flora.obsidian.young",
    kind: "flora",
    label: "พืชออบซิเดียนวัยอ่อน",
    tool: "axe",
    solid: false,
    partial: true,
    requiresSupport: true,
    canFloat: false,
    placeable: false,
    tint: "#66c27a",
  },
  "flora.obsidian.mature": {
    id: "flora.obsidian.mature",
    kind: "flora",
    label: "พืชออบซิเดียนโตเต็มที่",
    tool: "axe",
    solid: false,
    partial: true,
    requiresSupport: true,
    canFloat: false,
    placeable: false,
    tint: "#b8df75",
  },
  "storage.obsidian.chest": {
    id: "storage.obsidian.chest",
    kind: "storage",
    label: "หีบออบซิเดียน",
    tool: "pickaxe",
    solid: true,
    partial: false,
    requiresSupport: true,
    canFloat: false,
    placeable: false,
    dropDefinitionId: "structure-002",
    tint: "#b56a35",
  },
};

export function getBlockDefinition(moduleId: string) {
  return BLOCK_MODULES[moduleId];
}

const PLACEABLE_ITEM_TO_MODULE: Record<string, string> = {
  "structure-001": "player.placed",
};

export function getPlaceableBlockModule(definitionId: string) {
  const definition = getItemDefinition(definitionId);
  const moduleId = PLACEABLE_ITEM_TO_MODULE[definitionId];
  return definition && moduleId && definition.stackLimit >= 64 ? moduleId : undefined;
}

export function isSolidSupport(moduleId: string | null | undefined) {
  if (!moduleId) return false;
  return Boolean(getBlockDefinition(moduleId)?.solid);
}

export function getBlockToolForItem(definitionId: string): BlockTool | null {
  if (!definitionId.startsWith("tool-")) return null;
  const ordinal = Number(definitionId.slice("tool-".length));
  if (ordinal === 1 || ordinal === 7) return "pickaxe";
  if (ordinal === 2 || ordinal === 8) return "axe";
  if (ordinal === 3 || ordinal === 6) return "shovel";
  return "hand";
}

export function blockKey(x: number, y: number, z: number) {
  return `${Math.round(x)}:${Math.round(y)}:${Math.round(z)}`;
}

export function parseBlockKey(key: string) {
  const [x, y, z] = key.split(":").map(Number);
  if (![x, y, z].every(Number.isFinite)) return null;
  return { x, y, z };
}

export type BlockBreakResult = {
  accepted: boolean;
  removed: boolean;
  droppedDefinitionId?: ItemDefinition["id"];
  message: string;
};

export function resolveBlockBreak(moduleId: string, tool: BlockTool): BlockBreakResult {
  const definition = getBlockDefinition(moduleId);
  if (!definition) return { accepted: false, removed: false, message: "ไม่รู้จักบล็อกนี้" };
  if (tool === definition.tool) {
    return {
      accepted: true,
      removed: true,
      droppedDefinitionId: definition.dropDefinitionId,
      message: definition.dropDefinitionId ? `ทุบบล็อกสำเร็จ · ได้ ${definition.label} กลับมา` : `ทุบบล็อก ${definition.label} แล้ว`,
    };
  }
  return { accepted: true, removed: true, message: `ทุบบล็อก ${definition.label} แล้ว แต่เครื่องมือไม่ตรงจึงไม่ได้บล็อกคืน` };
}

export type BlockPlacementResult = {
  accepted: boolean;
  reason?: string;
};

export function canPlaceBlock(moduleId: string, supportModuleId?: string | null, existingModuleId?: string | null): BlockPlacementResult {
  const definition = getBlockDefinition(moduleId);
  if (!definition || !definition.placeable) return { accepted: false, reason: "บล็อกนี้ยังวางไม่ได้" };
  if (existingModuleId) return { accepted: false, reason: "ตำแหน่งนี้มีบล็อกอยู่แล้ว" };
  if (definition.requiresSupport && !isSolidSupport(supportModuleId)) return { accepted: false, reason: "ต้องวางบล็อกต่อจากพื้นหรือบล็อกทึบที่รองรับ" };
  return { accepted: true };
}
