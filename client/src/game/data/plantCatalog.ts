import type { ItemDefinition, ItemTier, SoilId } from "@/game/data/catalog";

export type PlantBiomeTag = "temperate" | "wetland" | "tropical" | "dry" | "desert" | "alpine" | "volcanic" | "arcane" | "void";
export type PlantFamily = "crop" | "herb" | "flower" | "tree" | "fungus" | "crystal";
export type PlantEffectKind = "food" | "healing" | "repellent" | "aether" | "crafting";

export type PlantEffect = {
  kind: PlantEffectKind;
  power: number;
  radiusMeters?: number;
};

export type PlantDefinition = {
  id: string;
  seedItemId: string;
  displayName: string;
  family: PlantFamily;
  botanicalReference: string;
  referenceSource: "Kew-POWO" | "USDA-PLANTS" | "original-game-variant";
  biomeTags: PlantBiomeTag[];
  compatibleSoils: SoilId[];
  growthStages: ["seed", "sprout", "young", "mature"];
  growthSeconds: number;
  yieldItemId: string;
  yieldQuantity: [number, number];
  effect: PlantEffect;
  assetId: string;
  seedStackLimit: number;
};

type BotanicalReference = {
  name: string;
  scientificName: string;
  family: PlantFamily;
  biomeTags: PlantBiomeTag[];
  soils: SoilId[];
  referenceSource: "Kew-POWO" | "USDA-PLANTS";
};

const BOTANICAL_REFERENCES: BotanicalReference[] = [
  { name: "Tomato", scientificName: "Solanum lycopersicum", family: "crop", biomeTags: ["temperate", "tropical"], soils: ["terra-loam", "verdant-humus"], referenceSource: "Kew-POWO" },
  { name: "Potato", scientificName: "Solanum tuberosum", family: "crop", biomeTags: ["temperate", "alpine"], soils: ["terra-loam", "ashen-volcanic"], referenceSource: "USDA-PLANTS" },
  { name: "Wheat", scientificName: "Triticum aestivum", family: "crop", biomeTags: ["temperate", "dry"], soils: ["terra-loam", "red-dune"], referenceSource: "USDA-PLANTS" },
  { name: "Rice", scientificName: "Oryza sativa", family: "crop", biomeTags: ["wetland", "tropical"], soils: ["verdant-humus", "terra-loam"], referenceSource: "Kew-POWO" },
  { name: "Maize", scientificName: "Zea mays", family: "crop", biomeTags: ["temperate", "tropical"], soils: ["terra-loam", "red-dune"], referenceSource: "USDA-PLANTS" },
  { name: "Carrot", scientificName: "Daucus carota", family: "crop", biomeTags: ["temperate", "alpine"], soils: ["terra-loam", "verdant-humus"], referenceSource: "USDA-PLANTS" },
  { name: "Beet", scientificName: "Beta vulgaris", family: "crop", biomeTags: ["temperate", "dry"], soils: ["terra-loam", "ashen-volcanic"], referenceSource: "USDA-PLANTS" },
  { name: "Onion", scientificName: "Allium cepa", family: "crop", biomeTags: ["temperate", "dry"], soils: ["terra-loam", "red-dune"], referenceSource: "USDA-PLANTS" },
  { name: "Garlic", scientificName: "Allium sativum", family: "herb", biomeTags: ["temperate", "dry"], soils: ["terra-loam", "ashen-volcanic"], referenceSource: "USDA-PLANTS" },
  { name: "Pea", scientificName: "Pisum sativum", family: "crop", biomeTags: ["temperate", "alpine"], soils: ["terra-loam", "verdant-humus"], referenceSource: "USDA-PLANTS" },
  { name: "Lentil", scientificName: "Lens culinaris", family: "crop", biomeTags: ["dry", "temperate"], soils: ["red-dune", "terra-loam"], referenceSource: "Kew-POWO" },
  { name: "Soybean", scientificName: "Glycine max", family: "crop", biomeTags: ["temperate", "tropical"], soils: ["terra-loam", "verdant-humus"], referenceSource: "USDA-PLANTS" },
  { name: "Cabbage", scientificName: "Brassica oleracea", family: "crop", biomeTags: ["temperate", "alpine"], soils: ["terra-loam", "verdant-humus"], referenceSource: "USDA-PLANTS" },
  { name: "Spinach", scientificName: "Spinacia oleracea", family: "crop", biomeTags: ["temperate", "alpine"], soils: ["terra-loam", "aether-crystal"], referenceSource: "USDA-PLANTS" },
  { name: "Lettuce", scientificName: "Lactuca sativa", family: "crop", biomeTags: ["temperate", "wetland"], soils: ["terra-loam", "verdant-humus"], referenceSource: "USDA-PLANTS" },
  { name: "Cucumber", scientificName: "Cucumis sativus", family: "crop", biomeTags: ["tropical", "wetland"], soils: ["verdant-humus", "terra-loam"], referenceSource: "Kew-POWO" },
  { name: "Pumpkin", scientificName: "Cucurbita pepo", family: "crop", biomeTags: ["temperate", "tropical"], soils: ["terra-loam", "verdant-humus"], referenceSource: "USDA-PLANTS" },
  { name: "Eggplant", scientificName: "Solanum melongena", family: "crop", biomeTags: ["tropical", "dry"], soils: ["red-dune", "terra-loam"], referenceSource: "Kew-POWO" },
  { name: "Strawberry", scientificName: "Fragaria × ananassa", family: "crop", biomeTags: ["temperate", "alpine"], soils: ["terra-loam", "verdant-humus"], referenceSource: "USDA-PLANTS" },
  { name: "Blueberry", scientificName: "Vaccinium corymbosum", family: "crop", biomeTags: ["temperate", "alpine"], soils: ["verdant-humus", "aether-crystal"], referenceSource: "USDA-PLANTS" },
  { name: "Grape", scientificName: "Vitis vinifera", family: "crop", biomeTags: ["dry", "temperate"], soils: ["red-dune", "terra-loam"], referenceSource: "Kew-POWO" },
  { name: "Apple", scientificName: "Malus domestica", family: "tree", biomeTags: ["temperate", "alpine"], soils: ["terra-loam", "verdant-humus"], referenceSource: "USDA-PLANTS" },
  { name: "Orange", scientificName: "Citrus sinensis", family: "tree", biomeTags: ["tropical", "dry"], soils: ["red-dune", "terra-loam"], referenceSource: "Kew-POWO" },
  { name: "Lemon", scientificName: "Citrus limon", family: "tree", biomeTags: ["tropical", "dry"], soils: ["red-dune", "ashen-volcanic"], referenceSource: "Kew-POWO" },
  { name: "Sunflower", scientificName: "Helianthus annuus", family: "flower", biomeTags: ["temperate", "dry"], soils: ["terra-loam", "red-dune"], referenceSource: "USDA-PLANTS" },
  { name: "Rose", scientificName: "Rosa spp.", family: "flower", biomeTags: ["temperate", "alpine"], soils: ["terra-loam", "aether-crystal"], referenceSource: "USDA-PLANTS" },
  { name: "Lavender", scientificName: "Lavandula angustifolia", family: "herb", biomeTags: ["dry", "alpine"], soils: ["red-dune", "aether-crystal"], referenceSource: "Kew-POWO" },
  { name: "Basil", scientificName: "Ocimum basilicum", family: "herb", biomeTags: ["tropical", "temperate"], soils: ["terra-loam", "verdant-humus"], referenceSource: "Kew-POWO" },
  { name: "Mint", scientificName: "Mentha spp.", family: "herb", biomeTags: ["wetland", "temperate"], soils: ["verdant-humus", "terra-loam"], referenceSource: "USDA-PLANTS" },
  { name: "Mushroom", scientificName: "Agaricus bisporus", family: "fungus", biomeTags: ["wetland", "temperate"], soils: ["verdant-humus", "aether-crystal"], referenceSource: "USDA-PLANTS" },
];

const ORIGINAL_VARIANTS = ["Ashen", "Ember", "Crystal", "Moss", "Void", "Lumen", "Storm", "Dusk", "Solar", "Wild"] as const;
const EFFECTS: PlantEffect[] = [
  { kind: "food", power: 4 },
  { kind: "healing", power: 3 },
  { kind: "crafting", power: 2 },
  { kind: "aether", power: 5 },
  { kind: "repellent", power: 2, radiusMeters: 4 },
  { kind: "food", power: 6 },
  { kind: "healing", power: 5 },
  { kind: "repellent", power: 3, radiusMeters: 6 },
  { kind: "crafting", power: 4 },
  { kind: "aether", power: 7 },
];

function tierForPlant(index: number): ItemTier {
  if (index < 240) return "common";
  if (index < 280) return "uncommon";
  if (index < 295) return "rare";
  if (index < 299) return "epic";
  return "legendary";
}

export const PLANT_CATALOG: PlantDefinition[] = BOTANICAL_REFERENCES.flatMap((reference, referenceIndex) => ORIGINAL_VARIANTS.map((variant, variantIndex) => {
  const index = referenceIndex * ORIGINAL_VARIANTS.length + variantIndex;
  const id = `plant-${String(index + 1).padStart(3, "0")}`;
  const effect = EFFECTS[(referenceIndex + variantIndex) % EFFECTS.length]!;
  const biomeTags = Array.from(new Set([...reference.biomeTags, variantIndex === 0 ? "volcanic" : variantIndex === 2 ? "arcane" : variantIndex === 4 ? "void" : undefined].filter((tag): tag is PlantBiomeTag => Boolean(tag))));
  return {
    id,
    seedItemId: `seed-plant-${String(index + 1).padStart(3, "0")}`,
    displayName: `${variant} ${reference.name}`,
    family: reference.family,
    botanicalReference: `${reference.name} · ${reference.scientificName}`,
    referenceSource: "original-game-variant" as const,
    biomeTags,
    compatibleSoils: reference.soils,
    growthStages: ["seed", "sprout", "young", "mature"],
    growthSeconds: 90 + (index % 6) * 30,
    yieldItemId: reference.family === "flower" ? "material-008" : reference.family === "fungus" ? "material-005" : "material-002",
    yieldQuantity: [1 + (variantIndex % 2), 2 + (referenceIndex % 3)],
    effect: { ...effect },
    assetId: reference.family === "flower" ? "art.obsidian.crystal-fern" : "items.seed",
    seedStackLimit: 64,
  } satisfies PlantDefinition;
}));

export const PLANT_ITEMS: ItemDefinition[] = PLANT_CATALOG.map((plant, index) => ({
  id: plant.seedItemId,
  category: "seed",
  name: `${plant.displayName} Seed`,
  tier: tierForPlant(index),
  stackLimit: plant.seedStackLimit,
  equippable: false,
  tags: ["plant", "seed", plant.family, ...plant.biomeTags, ...plant.effect.kind === "repellent" ? ["repellent"] : []],
  soilId: plant.compatibleSoils[0],
  effect: `ปลูกได้บน ${plant.compatibleSoils.join(" หรือ ")} · โต ${plant.growthSeconds} วินาที · ${plant.effect.kind} +${plant.effect.power}${plant.effect.radiusMeters ? ` ในรัศมี ${plant.effect.radiusMeters}m` : ""}`,
  iconAssetId: "items.seed",
}));

export function getPlantDefinition(plantId: string): PlantDefinition | undefined {
  return PLANT_CATALOG.find(plant => plant.id === plantId || plant.seedItemId === plantId);
}

export function getPlantsForBiome(biome: PlantBiomeTag): PlantDefinition[] {
  return PLANT_CATALOG.filter(plant => plant.biomeTags.includes(biome));
}

export function getPlantsForSoil(soilId: SoilId): PlantDefinition[] {
  return PLANT_CATALOG.filter(plant => plant.compatibleSoils.includes(soilId));
}

export function getPlantEffect(plantId: string): PlantEffect | undefined {
  return getPlantDefinition(plantId)?.effect;
}
