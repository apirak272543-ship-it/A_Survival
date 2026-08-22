export const CATALOG_LIMIT_PER_CATEGORY = 400;

export type ItemCategory =
  | "sword"
  | "bow"
  | "ranged"
  | "seed"
  | "material"
  | "furniture"
  | "decoration"
  | "structure";

export type ItemTier = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
export type ProvenanceType = "drop" | "craft" | "harvest" | "reward" | "starter";

export type ItemDefinition = {
  id: string;
  category: ItemCategory;
  name: string;
  tier: ItemTier;
  stackLimit: number;
  equippable: boolean;
  tags: string[];
  soilId?: SoilId;
  effect: string;
};

export type ItemProvenance = {
  eventId: string;
  type: ProvenanceType;
  timestamp: number;
  mapId?: string;
  parentEventId?: string;
  integrityHash: string;
};

export type ItemInstance = {
  instanceId: string;
  definitionId: string;
  quantity: number;
  enhancement: number;
  provenance: ItemProvenance;
};

export type SoilId = "terra-loam" | "ashen-volcanic" | "red-dune" | "verdant-humus" | "aether-crystal";

export type SoilDefinition = {
  id: SoilId;
  name: string;
  description: string;
  color: string;
  compatiblePlantTags: string[];
};

export const SOILS: SoilDefinition[] = [
  {
    id: "terra-loam",
    name: "Terra Loam",
    description: "ดินร่วนพื้นฐานสำหรับพืชอาหารและสมุนไพรทั่วไป",
    color: "#8f6442",
    compatiblePlantTags: ["food", "herb"],
  },
  {
    id: "ashen-volcanic",
    name: "Ashen Volcanic",
    description: "ดินเถ้าภูเขาไฟสำหรับพืชทนร้อนและวัตถุดิบโลหะชีวภาพ",
    color: "#5a3c42",
    compatiblePlantTags: ["ember", "ore"],
  },
  {
    id: "red-dune",
    name: "Red Dune",
    description: "ดินทรายแดงสำหรับพืชทะเลทรายและพืชเก็บน้ำ",
    color: "#b4684b",
    compatiblePlantTags: ["desert", "water"],
  },
  {
    id: "verdant-humus",
    name: "Verdant Humus",
    description: "ดินอินทรีย์ชื้นสำหรับพืชป่าและเห็ดเรืองแสง",
    color: "#4d6f48",
    compatiblePlantTags: ["jungle", "fungus"],
  },
  {
    id: "aether-crystal",
    name: "Aether Crystal",
    description: "วัสดุปลูกพลังงานสำหรับดอกไม้เวทและพืชคริสตัล",
    color: "#456c9c",
    compatiblePlantTags: ["arcane", "crystal"],
  },
];

export const TIER_RULES: Record<ItemTier, { label: string; dropWeight: number; enhancementCap: number; color: string }> = {
  common: { label: "ธรรมดา", dropWeight: 7000, enhancementCap: 5, color: "#94a3b8" },
  uncommon: { label: "พิเศษ", dropWeight: 2000, enhancementCap: 8, color: "#5eead4" },
  rare: { label: "หายาก", dropWeight: 700, enhancementCap: 12, color: "#60a5fa" },
  epic: { label: "มหากาพย์", dropWeight: 230, enhancementCap: 15, color: "#c084fc" },
  legendary: { label: "ตำนาน", dropWeight: 60, enhancementCap: 18, color: "#fbbf24" },
  mythic: { label: "เทพ", dropWeight: 10, enhancementCap: 20, color: "#fb7185" },
};

const tierForPosition = (index: number): ItemTier => {
  if (index < 280) return "common";
  if (index < 360) return "uncommon";
  if (index < 388) return "rare";
  if (index < 396) return "epic";
  if (index < 399) return "legendary";
  return "mythic";
};

const palette = ["Aether", "Ember", "Void", "Solar", "Wild", "Chromatic", "Obsidian", "Lumen", "Xeno", "Storm"];
const swordNames = ["Blade", "Saber", "Katana", "Glaive", "Rapier", "Moonfang", "Greatblade", "Rune Edge"];
const bowNames = ["Bow", "Longbow", "Recurve", "Starbow", "Needle Arc", "Windstring", "Lunar Bow", "Sunsplitter"];
const rangedNames = ["Repeater", "Pulse Rifle", "Arc Cannon", "Shardcaster", "Beam Carbine", "Rune Pistol", "Void Driver", "Plasma Launcher"];
const seedNames = ["Berry Seed", "Herb Spore", "Root Pod", "Glowcap Culture", "Crystal Bloom", "Ember Fruit", "Sand Melon", "Starleaf"];
const materialNames = ["Alloy", "Fiber", "Crystal", "Circuit", "Essence", "Resin", "Core", "Pollen"];
const furnitureNames = ["Wardrobe", "Workbench", "Storage Chest", "Lantern", "Bedroll", "Field Kitchen", "Signal Table", "Pet Nook"];
const decorationNames = ["Rune Banner", "Holo Planter", "Crystal Vase", "Wall Sigil", "Garden Arch", "Wind Chime", "Star Map", "Portal Lamp"];
const structureNames = ["Foundation", "Wall Panel", "Roof Segment", "Door Frame", "Window Module", "Bridge Tile", "Fence Unit", "Power Pylon"];

const categoryNames: Record<ItemCategory, string[]> = {
  sword: swordNames,
  bow: bowNames,
  ranged: rangedNames,
  seed: seedNames,
  material: materialNames,
  furniture: furnitureNames,
  decoration: decorationNames,
  structure: structureNames,
};

const soilForSeed = (index: number): SoilId => SOILS[index % SOILS.length]!.id;

function createCategory(category: ItemCategory): ItemDefinition[] {
  return Array.from({ length: CATALOG_LIMIT_PER_CATEGORY }, (_, index) => {
    const ordinal = index + 1;
    const prefix = palette[index % palette.length]!;
    const noun = categoryNames[category][Math.floor(index / palette.length) % categoryNames[category].length]!;
    const tier = tierForPosition(index);
    const equippable = category === "sword" || category === "bow" || category === "ranged";
    const soilId = category === "seed" ? soilForSeed(index) : undefined;
    const seedSoil = soilId ? SOILS.find(soil => soil.id === soilId) : undefined;

    return {
      id: `${category}-${String(ordinal).padStart(3, "0")}`,
      category,
      name: `${prefix} ${noun} ${String(ordinal).padStart(3, "0")}`,
      tier,
      stackLimit: equippable ? 1 : category === "furniture" || category === "decoration" || category === "structure" ? 1 : 99,
      equippable,
      tags: category === "seed" ? ["plant", ...(seedSoil?.compatiblePlantTags ?? [])] : [category, tier],
      soilId,
      effect:
        category === "sword"
          ? "โจมตีระยะประชิดและสะสมรอยแยกพลังงาน"
          : category === "bow"
            ? "ยิงระยะไกลและเพิ่มโอกาส critical ตามระยะ"
            : category === "ranged"
              ? "ยิงพลังงานและบริหารความร้อนของอาวุธ"
              : category === "seed"
                ? `เติบโตได้ดีบน ${seedSoil?.name ?? "ดินที่เหมาะสม"}`
                : category === "structure"
                  ? "ชิ้นส่วน modular ที่วาง หมุน ย้าย และเก็บคืนได้"
                  : "ใช้ในระบบคราฟต์ ตกแต่ง หรือเอาชีวิตรอด",
    };
  });
}

export const ITEM_CATALOG = Object.fromEntries(
  (Object.keys(categoryNames) as ItemCategory[]).map(category => [category, createCategory(category)]),
) as Record<ItemCategory, ItemDefinition[]>;

export const ALL_ITEMS = Object.values(ITEM_CATALOG).flat();

export const MAP_CATALOG = [
  { id: "obsidian-frontier", name: "Obsidian Frontier", biome: "Ruined alien volcanic frontier", radiusMeters: 1200, threat: 2, accent: "#00f3ff", status: "playable" },
  { id: "ashen-hellscape", name: "Ashen Hellscape", biome: "Infernal world", radiusMeters: 1350, threat: 5, accent: "#ff4d6d", status: "catalog" },
  { id: "mars-expanse", name: "Mars Expanse", biome: "Martian badlands", radiusMeters: 1500, threat: 4, accent: "#e76f51", status: "catalog" },
  { id: "saharan-glass", name: "Saharan Glass", biome: "Crystal desert", radiusMeters: 1300, threat: 3, accent: "#f4a261", status: "catalog" },
  { id: "congo-verdant", name: "Congo Verdant", biome: "Xenobotanical jungle", radiusMeters: 1450, threat: 4, accent: "#90be6d", status: "catalog" },
  { id: "stonecrest-range", name: "Stonecrest Range", biome: "Rocky mountain", radiusMeters: 1250, threat: 3, accent: "#a8dadc", status: "catalog" },
  { id: "wildpine-highlands", name: "Wildpine Highlands", biome: "Forest mountain", radiusMeters: 1400, threat: 4, accent: "#588157", status: "catalog" },
  { id: "astral-drift", name: "Astral Drift", biome: "Fractured space frontier", radiusMeters: 1000, threat: 5, accent: "#9d4edd", status: "catalog" },
] as const;

export function getItemDefinition(definitionId: string) {
  return ALL_ITEMS.find(item => item.id === definitionId);
}

export function isPlantCompatibleWithSoil(seed: ItemDefinition, soilId: SoilId) {
  return seed.category === "seed" && seed.soilId === soilId;
}

export function validateItemInstances(instances: ItemInstance[]) {
  const issues: string[] = [];
  const seenIds = new Set<string>();

  for (const instance of instances) {
    const definition = getItemDefinition(instance.definitionId);
    if (!definition) {
      issues.push(`Unknown item definition: ${instance.definitionId}`);
      continue;
    }
    if (seenIds.has(instance.instanceId)) issues.push(`Duplicate instance id: ${instance.instanceId}`);
    seenIds.add(instance.instanceId);
    if (instance.quantity < 1 || instance.quantity > definition.stackLimit) {
      issues.push(`Invalid stack quantity for ${instance.instanceId}`);
    }
    if (definition.equippable && instance.quantity !== 1) {
      issues.push(`Equippable item must be a single instance: ${instance.instanceId}`);
    }
    if (!instance.provenance.eventId || !instance.provenance.integrityHash || !instance.provenance.type) {
      issues.push(`Missing provenance for ${instance.instanceId}`);
    }
    if (instance.enhancement < 0 || instance.enhancement > TIER_RULES[definition.tier].enhancementCap) {
      issues.push(`Invalid enhancement level for ${instance.instanceId}`);
    }
  }

  return { valid: issues.length === 0, issues };
}

export function createStarterInstance(definitionId: string, sequence: number): ItemInstance {
  const definition = getItemDefinition(definitionId);
  if (!definition) throw new Error(`Unknown starter definition: ${definitionId}`);
  const stamp = 1700000000000 + sequence;
  return {
    instanceId: `inst-${definitionId}-${sequence}`,
    definitionId,
    quantity: 1,
    enhancement: 0,
    provenance: {
      eventId: `starter-${sequence}`,
      type: "starter",
      timestamp: stamp,
      integrityHash: `starter:${definitionId}:${stamp}`,
    },
  };
}
