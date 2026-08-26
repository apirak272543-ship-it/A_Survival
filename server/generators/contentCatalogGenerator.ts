import {
  CommonGeneratorRegistry,
  type GeneratorAssetRef,
  type GeneratorPlugin,
  type GeneratorValidationResult,
} from "./commonGeneratorApi";

export const MINIMUM_DEFINITIONS_PER_CATEGORY = 300;
export const MAXIMUM_DEFINITIONS_PER_CATEGORY = 400;

export type ContentCategory =
  | "weapon-sword"
  | "weapon-bow"
  | "weapon-ranged"
  | "plant"
  | "seed"
  | "material"
  | "furniture"
  | "decoration"
  | "structure"
  | "tool";

export type ContentTier = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export type GeneratedContentDefinition = {
  id: string;
  category: ContentCategory;
  ordinal: number;
  name: string;
  tier: ContentTier;
  stackLimit: number;
  equippable: boolean;
  tags: string[];
  effect: string;
  assetId: string;
  soilAffinity?: string;
  combat?: { baseDamage: number; reach: number; attackSpeed: number };
};

export type ContentCatalogInput = {
  categories: ContentCategory[];
  countPerCategory: number;
  assetNamespace: string;
};

export type ContentCatalogOutput = {
  schemaVersion: "a-survival.content-catalog.v1";
  assetRefs: GeneratorAssetRef[];
  categoryCounts: Record<ContentCategory, number>;
  definitions: GeneratedContentDefinition[];
};

const ALL_CONTENT_CATEGORIES: ContentCategory[] = [
  "weapon-sword",
  "weapon-bow",
  "weapon-ranged",
  "plant",
  "seed",
  "material",
  "furniture",
  "decoration",
  "structure",
  "tool",
];

const TIER_ORDER: ContentTier[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const PALETTE = ["Aether", "Ember", "Void", "Solar", "Wild", "Chromatic", "Obsidian", "Lumen", "Xeno", "Storm"];
const CATEGORY_NOUNS: Record<ContentCategory, string[]> = {
  "weapon-sword": ["Blade", "Saber", "Katana", "Glaive", "Rapier", "Moonfang", "Greatblade", "Rune Edge"],
  "weapon-bow": ["Bow", "Longbow", "Recurve", "Starbow", "Needle Arc", "Windstring", "Lunar Bow", "Sunsplitter"],
  "weapon-ranged": ["Repeater", "Pulse Rifle", "Arc Cannon", "Shardcaster", "Beam Carbine", "Rune Pistol", "Void Driver", "Plasma Launcher"],
  plant: ["Bloom", "Moss", "Fern", "Vine", "Spore", "Root", "Lily", "Canopy"],
  seed: ["Berry Seed", "Herb Spore", "Root Pod", "Glowcap Culture", "Crystal Bloom", "Ember Fruit", "Sand Melon", "Starleaf"],
  material: ["Alloy", "Fiber", "Crystal", "Circuit", "Essence", "Resin", "Core", "Pollen"],
  furniture: ["Wardrobe", "Workbench", "Storage Chest", "Lantern", "Bedroll", "Field Kitchen", "Signal Table", "Pet Nook"],
  decoration: ["Rune Banner", "Holo Planter", "Crystal Vase", "Wall Sigil", "Garden Arch", "Wind Chime", "Star Map", "Portal Lamp"],
  structure: ["Foundation", "Wall Panel", "Roof Segment", "Door Frame", "Window Module", "Bridge Tile", "Fence Unit", "Power Pylon"],
  tool: ["Pickaxe", "Hand Axe", "Field Shovel", "Builder Hammer", "Rune Chisel", "Survey Spade", "Obsidian Drill", "Aether Cutter"],
};

const SOIL_IDS = ["terra-loam", "ashen-volcanic", "red-dune", "verdant-humus", "aether-crystal"];

function tierForOrdinal(ordinal: number, count: number): ContentTier {
  const ratio = ordinal / count;
  if (ratio <= 0.7) return "common";
  if (ratio <= 0.9) return "uncommon";
  if (ratio <= 0.97) return "rare";
  if (ratio <= 0.99) return "epic";
  if (ratio <= 0.9975) return "legendary";
  return "mythic";
}

function isWeapon(category: ContentCategory) {
  return category === "weapon-sword" || category === "weapon-bow" || category === "weapon-ranged";
}

function assetIdFor(category: ContentCategory, namespace: string) {
  return `${namespace}.${category}`;
}

function categoryTags(category: ContentCategory, tier: ContentTier) {
  if (category === "plant" || category === "seed") return ["plant", category, tier];
  if (category.startsWith("weapon-")) return ["weapon", category.slice("weapon-".length), tier];
  return [category, tier];
}

function createDefinition(category: ContentCategory, ordinal: number, count: number, namespace: string): GeneratedContentDefinition {
  const tier = tierForOrdinal(ordinal, count);
  const equippable = isWeapon(category) || category === "tool";
  const assetId = assetIdFor(category, namespace);
  const baseDefinition: GeneratedContentDefinition = {
    id: `${category}-${String(ordinal).padStart(3, "0")}`,
    category,
    ordinal,
    name: `${PALETTE[(ordinal - 1) % PALETTE.length]} ${CATEGORY_NOUNS[category][Math.floor((ordinal - 1) / PALETTE.length) % CATEGORY_NOUNS[category].length]} ${String(ordinal).padStart(3, "0")}`,
    tier,
    stackLimit: equippable ? 1 : category === "structure" ? 64 : 99,
    equippable,
    tags: categoryTags(category, tier),
    effect: category === "plant" ? "วัตถุดิบพืชสำหรับการเติบโต การเก็บเกี่ยว และการแปรรูป" : category === "seed" ? "เมล็ดพันธุ์ที่ต้องใช้ดินและ biome ที่เข้ากัน" : category.startsWith("weapon-") ? "อาวุธที่มีค่าพลังและจังหวะโจมตีแยกตาม definition" : category === "tool" ? "เครื่องมือเฉพาะทางสำหรับทุบ ขุด ตัด หรือสร้าง" : "คำจำกัดความ content สำหรับ generator และ registry",
    assetId,
  };
  if (category === "plant" || category === "seed") baseDefinition.soilAffinity = SOIL_IDS[(ordinal - 1) % SOIL_IDS.length];
  if (isWeapon(category)) {
    baseDefinition.combat = {
      baseDamage: 4 + Math.floor(ordinal / 12) + TIER_ORDER.indexOf(tier) * 3,
      reach: category === "weapon-sword" ? 2 : 12,
      attackSpeed: category === "weapon-sword" ? Math.max(0.5, 1.4 - ordinal / (count * 2)) : Math.max(0.35, 1.1 - ordinal / (count * 3)),
    };
  }
  return baseDefinition;
}

function validateInput(input: ContentCatalogInput): GeneratorValidationResult {
  const issues: string[] = [];
  if (input.categories.length === 0) issues.push("at least one content category is required");
  if (new Set(input.categories).size !== input.categories.length) issues.push("content categories must be unique");
  if (input.categories.some(category => !ALL_CONTENT_CATEGORIES.includes(category))) issues.push("content category is not supported");
  if (!Number.isInteger(input.countPerCategory) || input.countPerCategory < MINIMUM_DEFINITIONS_PER_CATEGORY || input.countPerCategory > MAXIMUM_DEFINITIONS_PER_CATEGORY) {
    issues.push(`countPerCategory must be an integer from ${MINIMUM_DEFINITIONS_PER_CATEGORY} to ${MAXIMUM_DEFINITIONS_PER_CATEGORY}`);
  }
  if (!/^[a-z0-9][a-z0-9.-]{1,63}$/.test(input.assetNamespace)) issues.push("assetNamespace must be a lowercase identifier");
  return { valid: issues.length === 0, issues };
}

export function generateContentCatalog(input: ContentCatalogInput): ContentCatalogOutput {
  const inputValidation = validateInput(input);
  if (!inputValidation.valid) throw new Error(`Content catalog input is invalid: ${inputValidation.issues.join("; ")}`);

  const definitions = input.categories.flatMap(category => Array.from({ length: input.countPerCategory }, (_, index) => createDefinition(category, index + 1, input.countPerCategory, input.assetNamespace)));
  const categoryCounts = Object.fromEntries(input.categories.map(category => [category, input.countPerCategory])) as Record<ContentCategory, number>;
  const assetRefs = input.categories.map(category => ({ assetId: assetIdFor(category, input.assetNamespace), kind: "icon" as const, source: "starter-authored" as const, provenanceRef: "ASSETS.md#logical-content-pack" }));
  return { schemaVersion: "a-survival.content-catalog.v1", assetRefs, categoryCounts, definitions };
}

export function validateContentCatalog(output: ContentCatalogOutput, input?: ContentCatalogInput): GeneratorValidationResult {
  const issues: string[] = [];
  if (output.schemaVersion !== "a-survival.content-catalog.v1") issues.push("unsupported content catalog schema");
  const ids = output.definitions.map(definition => definition.id);
  if (new Set(ids).size !== ids.length) issues.push("content definition ids must be unique");
  for (const definition of output.definitions) {
    if (!ALL_CONTENT_CATEGORIES.includes(definition.category)) issues.push(`unsupported content category: ${definition.category}`);
    if (!Number.isInteger(definition.ordinal) || definition.ordinal < 1) issues.push(`invalid content ordinal: ${definition.id}`);
    if (!definition.assetId) issues.push(`content definition is missing assetId: ${definition.id}`);
    if (definition.equippable && definition.stackLimit !== 1) issues.push(`equippable content must have stackLimit 1: ${definition.id}`);
    if (isWeapon(definition.category) && !definition.combat) issues.push(`weapon content is missing combat profile: ${definition.id}`);
    if ((definition.category === "plant" || definition.category === "seed") && !definition.soilAffinity) issues.push(`plant content is missing soil affinity: ${definition.id}`);
  }
  for (const category of input?.categories ?? ALL_CONTENT_CATEGORIES) {
    const count = output.definitions.filter(definition => definition.category === category).length;
    if (count < MINIMUM_DEFINITIONS_PER_CATEGORY) issues.push(`${category} has only ${count} definitions; minimum is ${MINIMUM_DEFINITIONS_PER_CATEGORY}`);
    if (input && count !== input.countPerCategory) issues.push(`${category} count does not match input countPerCategory`);
  }
  const assetIds = output.assetRefs.map(asset => asset.assetId);
  if (new Set(assetIds).size !== assetIds.length) issues.push("content asset references must be unique");
  return { valid: issues.length === 0, issues };
}

export const contentCatalogGeneratorPlugin: GeneratorPlugin<ContentCatalogInput, ContentCatalogOutput> = {
  id: "content.catalog",
  version: "1.0.0",
  kind: "item",
  generate: input => generateContentCatalog(input),
  validate: (output, input) => validateContentCatalog(output, input),
  preview: output => ({
    recordCount: output.definitions.length,
    ids: output.definitions.slice(0, 100).map(definition => definition.id),
    assetRefs: output.assetRefs,
  }),
};

export const DEFAULT_CONTENT_CATALOG_INPUT: ContentCatalogInput = {
  categories: ALL_CONTENT_CATEGORIES,
  countPerCategory: MINIMUM_DEFINITIONS_PER_CATEGORY,
  assetNamespace: "a-survival.content",
};

export function createContentCatalogRegistry() {
  return new CommonGeneratorRegistry().register(contentCatalogGeneratorPlugin);
}
