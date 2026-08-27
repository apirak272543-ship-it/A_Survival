import { TIER_RULES, type ItemDefinition, type ItemInstance } from "@/game/data/catalog";

export const ITEM_DETAIL_HOLD_MS = 3500;

export type ItemShortDetail = {
  definitionId: string;
  title: string;
  category: string;
  tier: string;
  summary: string;
};

export type ItemLongDetail = ItemShortDetail & {
  effect: string;
  stackLimit: number;
  tags: string[];
  provenanceType: string;
  provenanceEventId: string;
  enhancement: number;
  placeableBlockId?: string;
};

export type ItemDetailFact = {
  key: "usage" | "stack-limit" | "attack-damage" | "plant-soil" | "plant-effect" | "placeable-block" | "tool-tag";
  label: string;
  value: string;
  available: boolean;
  reason?: string;
};

export type ItemCategoryDetail = {
  definitionId: string;
  category: "weapon" | "tool" | "plant" | "block" | "material" | "structure" | "other";
  facts: ItemDetailFact[];
  unavailable: Array<"attack-damage">;
  provenanceType?: string;
  enhancement?: number;
};

export function getItemShortDetail(definition: ItemDefinition): ItemShortDetail {
  const tier = TIER_RULES[definition.tier];
  return {
    definitionId: definition.id,
    title: definition.name,
    category: definition.category,
    tier: tier.label,
    summary: definition.effect,
  };
}

export function getItemLongDetail(definition: ItemDefinition, instance: ItemInstance): ItemLongDetail {
  return {
    ...getItemShortDetail(definition),
    effect: definition.effect,
    stackLimit: definition.stackLimit,
    tags: definition.tags,
    provenanceType: instance.provenance.type,
    provenanceEventId: instance.provenance.eventId,
    enhancement: instance.enhancement,
    ...(definition.placementBlockId ? { placeableBlockId: definition.placementBlockId } : {}),
  };
}

function categoryFor(definition: ItemDefinition): ItemCategoryDetail["category"] {
  if (definition.category === "sword" || definition.category === "bow" || definition.category === "ranged") return "weapon";
  if (definition.category === "tool") return "tool";
  if (definition.category === "seed") return "plant";
  if (definition.isBlockItem || definition.placementBlockId) return "block";
  if (definition.category === "material") return "material";
  if (definition.category === "structure" || definition.category === "furniture" || definition.category === "decoration") return "structure";
  return "other";
}

function fact(key: ItemDetailFact["key"], label: string, value: string, available = true, reason?: string): ItemDetailFact {
  return { key, label, value, available, ...(reason ? { reason } : {}) };
}

export function getItemCategoryDetail(definition: ItemDefinition, instance?: ItemInstance): ItemCategoryDetail {
  const category = categoryFor(definition);
  const facts: ItemDetailFact[] = [fact("usage", "การใช้งาน", definition.effect), fact("stack-limit", "จำนวนซ้อนสูงสุด", String(definition.stackLimit))];
  const unavailable: ItemCategoryDetail["unavailable"] = [];

  if (category === "weapon") {
    unavailable.push("attack-damage");
    facts.push(fact("attack-damage", "พลังโจมตี", "ยังไม่มีข้อมูล", false, "ItemDefinition ปัจจุบันยังไม่มี field เจ้าของค่าความเสียหาย จึงไม่คำนวณหรือสร้างตัวเลขแทน"));
  }
  if (category === "plant") {
    facts.push(fact("plant-soil", "ดินที่ใช้ปลูก", definition.soilId ?? "ยังไม่มีข้อมูล", Boolean(definition.soilId), definition.soilId ? undefined : "seed definition ไม่มี soilId ที่ยืนยันได้"));
    facts.push(fact("plant-effect", "ผลของพืช", definition.effect));
  }
  if (category === "block" && definition.placementBlockId) facts.push(fact("placeable-block", "บล็อกที่วางได้", definition.placementBlockId));
  if (category === "tool") facts.push(fact("tool-tag", "ประเภทเครื่องมือ", definition.toolTag ?? "ยังไม่มีข้อมูล", Boolean(definition.toolTag), definition.toolTag ? undefined : "tool definition ไม่มี toolTag ที่ยืนยันได้"));

  return {
    definitionId: definition.id,
    category,
    facts,
    unavailable,
    ...(instance ? { provenanceType: instance.provenance.type, enhancement: instance.enhancement } : {}),
  };
}
