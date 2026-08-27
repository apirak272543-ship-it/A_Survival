import { ALL_ITEMS, type ItemDefinition } from "@/game/data/catalog";

export type CodexCategoryId = "weapons" | "tools" | "blocks" | "plants" | "materials" | "structures" | "companions" | "creatures";
export type CodexSubcategoryId = "melee" | "ranged" | "magic" | "technology" | "harvesting" | "terrain" | "rock" | "building" | "seed" | "crop" | "resource" | "other";

export type CodexCategory = {
  id: CodexCategoryId;
  label: string;
  description: string;
};

export type CodexEntry = {
  id: string;
  category: CodexCategoryId;
  subcategory: CodexSubcategoryId;
  title: string;
  description: string;
  effect: string;
  tags: string[];
  stackLimit: number;
  iconAssetId?: string;
  blockId?: string;
};

export const CODEX_CATEGORIES: CodexCategory[] = [
  { id: "weapons", label: "อาวุธ", description: "อาวุธประชิด ระยะไกล เวทมนตร์ และเทคโนโลยี" },
  { id: "tools", label: "เครื่องมือ", description: "เครื่องมือเก็บเกี่ยว ทุบ ตัด และใช้งานกับบล็อก" },
  { id: "blocks", label: "บล็อก", description: "บล็อกดิน หิน แร่ ลำต้น และใบที่วางในโลกได้" },
  { id: "plants", label: "พืช", description: "เมล็ด ต้นอ่อน พืชฟาร์ม และพืชพิเศษ" },
  { id: "materials", label: "วัสดุ", description: "ทรัพยากรที่เก็บได้และใช้คราฟต์" },
  { id: "structures", label: "สิ่งปลูกสร้าง", description: "ชิ้นส่วนบ้าน เฟอร์นิเจอร์ และของตกแต่ง" },
  { id: "companions", label: "คู่หู", description: "สิ่งมีชีวิตและอุปกรณ์ที่เกี่ยวข้องกับ companion" },
  { id: "creatures", label: "สิ่งมีชีวิต", description: "สัตว์ ศัตรู และสิ่งมีชีวิตที่พบในโลก" },
];

function weaponSubcategory(definition: ItemDefinition): CodexSubcategoryId {
  if (definition.category === "sword") return definition.tags.includes("magic") ? "magic" : "melee";
  if (definition.category === "bow") return "ranged";
  return "technology";
}

function classify(definition: ItemDefinition): { category: CodexCategoryId; subcategory: CodexSubcategoryId } {
  if (definition.isBlockItem || definition.placementBlockId) return { category: "blocks", subcategory: definition.tags.includes("rock") || definition.tags.includes("stone") ? "rock" : "building" };
  if (definition.category === "sword" || definition.category === "bow" || definition.category === "ranged") return { category: "weapons", subcategory: weaponSubcategory(definition) };
  if (definition.category === "tool") return { category: "tools", subcategory: "harvesting" };
  if (definition.category === "seed") return { category: "plants", subcategory: "seed" };
  if (definition.category === "material") return { category: "materials", subcategory: "resource" };
  if (definition.category === "structure" || definition.category === "furniture" || definition.category === "decoration") return { category: "structures", subcategory: "building" };
  return { category: "materials", subcategory: "other" };
}

export function createCodexEntry(definition: ItemDefinition): CodexEntry {
  const classification = classify(definition);
  return {
    id: definition.id,
    category: classification.category,
    subcategory: classification.subcategory,
    title: definition.name,
    description: definition.isBlockItem ? `${definition.name} เป็น block item ที่วางกลับในโลกได้` : definition.effect,
    effect: definition.effect,
    tags: definition.tags,
    stackLimit: definition.stackLimit,
    iconAssetId: definition.iconAssetId,
    blockId: definition.placementBlockId,
  };
}

export const CODEX_ENTRIES: CodexEntry[] = ALL_ITEMS.map(createCodexEntry);

export function getDiscoveredCodexEntries(discoveredItemIds: Iterable<string>): CodexEntry[] {
  const discovered = new Set(discoveredItemIds);
  return CODEX_ENTRIES.filter(entry => discovered.has(entry.id));
}

export function getCodexEntry(entryId: string): CodexEntry | undefined {
  return CODEX_ENTRIES.find(entry => entry.id === entryId);
}
