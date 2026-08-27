import { getItemDefinition } from "@/game/data/catalog";
import { getPlantDefinition, PLANT_CATALOG, type PlantBiomeTag, type PlantDefinition, type PlantEffect } from "@/game/data/plantCatalog";
import type { SoilId } from "@/game/data/catalog";

export type WorldPlantStage = "seed" | "sprout" | "young" | "mature";

export type ObsidianFarmPlot = {
  key: string;
  x: number;
  y: number;
  z: number;
  soilId: SoilId;
  biome: PlantBiomeTag;
};

export type WorldPlantState = {
  key: string;
  plantId: string;
  seedItemId: string;
  x: number;
  y: number;
  z: number;
  soilId: SoilId;
  biome: PlantBiomeTag;
  plantedAt: number;
  growthDurationMs: number;
  seed: number;
};

export type WorldPlantReward = {
  definitionId: string;
  quantity: number;
  eventId: string;
};

export const WORLD_PLANT_EFFECT_CAPS = {
  power: 8,
  repellentRadiusMeters: 8,
} as const;

/**
 * The first Obsidian peaceful route exposes a small, deterministic garden patch
 * near spawn. The plot occupies one world cell, but its plant render remains
 * partial and non-solid. These are map-local affordances, not a second map.
 */
export const OBSIDIAN_FARM_PLOTS: readonly ObsidianFarmPlot[] = [
  { key: "obsidian-farm:-3:0:2", x: -3, y: 0, z: 2, soilId: "terra-loam", biome: "volcanic" },
  { key: "obsidian-farm:-2:0:2", x: -2, y: 0, z: 2, soilId: "terra-loam", biome: "volcanic" },
  { key: "obsidian-farm:-1:0:2", x: -1, y: 0, z: 2, soilId: "terra-loam", biome: "volcanic" },
  { key: "obsidian-farm:-3:0:3", x: -3, y: 0, z: 3, soilId: "terra-loam", biome: "volcanic" },
  { key: "obsidian-farm:-2:0:3", x: -2, y: 0, z: 3, soilId: "terra-loam", biome: "volcanic" },
  { key: "obsidian-farm:-1:0:3", x: -1, y: 0, z: 3, soilId: "terra-loam", biome: "volcanic" },
];

function numericSeed(value: string) {
  const digits = value.match(/(\d+)$/)?.[1];
  return digits ? Number(digits) : 1;
}

/** Generic starter seeds remain compatible, while generated plant seeds map directly. */
export function getPlantDefinitionForSeed(seedItemId: string): PlantDefinition | undefined {
  const direct = getPlantDefinition(seedItemId);
  if (direct) return direct;
  const definition = getItemDefinition(seedItemId);
  if (definition?.category !== "seed") return undefined;
  return PLANT_CATALOG[(numericSeed(seedItemId) - 1) % PLANT_CATALOG.length];
}

export function getObsidianFarmPlot(key: string) {
  return OBSIDIAN_FARM_PLOTS.find(plot => plot.key === key);
}

export function getWorldPlantStage(plant: WorldPlantState, now = Date.now()): WorldPlantStage {
  const elapsed = Math.max(0, now - plant.plantedAt);
  const progress = elapsed / Math.max(1, plant.growthDurationMs);
  if (progress < 0.25) return "seed";
  if (progress < 0.55) return "sprout";
  if (progress < 1) return "young";
  return "mature";
}

export function getSafeWorldPlantEffect(plantId: string): PlantEffect | undefined {
  const effect = getPlantDefinition(plantId)?.effect;
  if (!effect) return undefined;
  return {
    ...effect,
    power: Math.min(WORLD_PLANT_EFFECT_CAPS.power, Math.max(0, effect.power)),
    ...(effect.radiusMeters === undefined ? {} : { radiusMeters: Math.min(WORLD_PLANT_EFFECT_CAPS.repellentRadiusMeters, Math.max(0, effect.radiusMeters)) }),
  };
}

export function canPlantWorldSeed(input: {
  seedItemId: string;
  plot: ObsidianFarmPlot;
  occupied: boolean;
}) {
  const plant = getPlantDefinitionForSeed(input.seedItemId);
  if (!plant) return { accepted: false as const, reason: "เมล็ดนี้ไม่มีข้อมูลพืชที่ตรวจสอบได้" };
  if (input.occupied) return { accepted: false as const, reason: "แปลงนี้มีพืชอยู่แล้ว" };
  if (!plant.compatibleSoils.includes(input.plot.soilId)) return { accepted: false as const, reason: `ดิน ${input.plot.soilId} ไม่เหมาะกับ ${plant.displayName}` };
  if (!plant.biomeTags.includes(input.plot.biome)) return { accepted: false as const, reason: `พืช ${plant.displayName} ไม่เข้ากับ biome ของแปลงนี้` };
  return { accepted: true as const, plant };
}

export function plantWorldSeed(input: {
  seedItemId: string;
  plot: ObsidianFarmPlot;
  occupied: boolean;
  now: number;
  seed?: number;
}) {
  const check = canPlantWorldSeed(input);
  if (!check.accepted) return check;
  const growthDurationMs = Math.min(30 * 60 * 1000, Math.max(30 * 1000, check.plant.growthSeconds * 1000));
  const state: WorldPlantState = {
    key: input.plot.key,
    plantId: check.plant.id,
    seedItemId: input.seedItemId,
    x: input.plot.x,
    y: input.plot.y,
    z: input.plot.z,
    soilId: input.plot.soilId,
    biome: input.plot.biome,
    plantedAt: input.now,
    growthDurationMs,
    seed: input.seed ?? numericSeed(input.seedItemId),
  };
  return { accepted: true as const, plant: check.plant, state };
}

export function harvestWorldPlant(plant: WorldPlantState, now: number): { accepted: true; reward: WorldPlantReward } | { accepted: false; reason: string } {
  const definition = getPlantDefinition(plant.plantId);
  if (!definition) return { accepted: false, reason: "ไม่พบข้อมูลพืช จึงยังเก็บเกี่ยวไม่ได้" };
  if (getWorldPlantStage(plant, now) !== "mature") return { accepted: false, reason: "พืชยังโตไม่เต็มที่" };
  const [minimum, maximum] = definition.yieldQuantity;
  const span = Math.max(0, maximum - minimum);
  const quantity = Math.max(1, minimum + (span === 0 ? 0 : Math.abs(plant.seed * 31 + plant.x * 17 + plant.z * 13) % (span + 1)));
  return { accepted: true, reward: { definitionId: definition.yieldItemId, quantity, eventId: `world-harvest-${plant.key}-${plant.plantedAt}` } };
}

export type WorldRepellentAura = {
  plantKey: string;
  plantId: string;
  x: number;
  z: number;
  radiusMeters: number;
  power: number;
};

export function getActiveRepellentAuras(plants: Record<string, WorldPlantState>, now = Date.now()): WorldRepellentAura[] {
  return Object.values(plants).flatMap(plant => {
    if (getWorldPlantStage(plant, now) !== "mature") return [];
    const effect = getSafeWorldPlantEffect(plant.plantId);
    if (!effect || effect.kind !== "repellent" || !effect.radiusMeters || effect.radiusMeters <= 0) return [];
    return [{ plantKey: plant.key, plantId: plant.plantId, x: plant.x + 0.5, z: plant.z + 0.5, radiusMeters: Math.min(WORLD_PLANT_EFFECT_CAPS.repellentRadiusMeters, effect.radiusMeters), power: Math.min(WORLD_PLANT_EFFECT_CAPS.power, effect.power) }];
  });
}

export function getRepellentInfluence(position: { x: number; z: number }, auras: WorldRepellentAura[]) {
  let strongest: { aura: WorldRepellentAura; distance: number } | undefined;
  for (const aura of auras) {
    const distance = Math.hypot(position.x - aura.x, position.z - aura.z);
    if (distance > aura.radiusMeters || (strongest && aura.power <= strongest.aura.power)) continue;
    strongest = { aura, distance };
  }
  return strongest ? { repelled: true as const, ...strongest } : { repelled: false as const };
}

export function countMatureWorldPlants(plants: Record<string, WorldPlantState>, now = Date.now()) {
  return Object.values(plants).filter(plant => getWorldPlantStage(plant, now) === "mature").length;
}
