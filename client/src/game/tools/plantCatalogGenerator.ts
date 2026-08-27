import { PLANT_CATALOG, getPlantDefinition, type PlantDefinition } from "../data/plantCatalog";
import type { SoilId } from "../data/catalog";

export const WORLD_PLANT_CATALOG_SIZE = 300;
export const WORLD_FARM_DEFAULT_GROWTH_MS = 90_000;
export const WORLD_FARM_MAX_REPEL_RADIUS = 6;
export const WORLD_FARM_MAX_FICTIONAL_RESTORE = 12;

export type WorldPlantEffect =
  | { kind: "repel"; radius: number; durationMs: number; stackable: false; label: string }
  | { kind: "restore"; amount: number; cap: number; label: string };

export type WorldPlantDefinition = {
  id: string;
  seedDefinitionId: string;
  name: string;
  biomeId: "obsidian-frontier";
  soilId: SoilId;
  tags: string[];
  harvestDefinitionId: string;
  growthDurationMs: number;
  effect?: WorldPlantEffect;
};

function toWorldEffect(plant: PlantDefinition): WorldPlantEffect | undefined {
  if (plant.effect.kind === "repellent") {
    return {
      kind: "repel",
      radius: Math.min(WORLD_FARM_MAX_REPEL_RADIUS, Math.max(0, plant.effect.radiusMeters ?? 0)),
      durationMs: 30_000,
      stackable: false,
      label: "แรงผลักสมมติอ่อน ๆ · ไม่ทำลายมอนสเตอร์",
    };
  }
  if (plant.effect.kind === "healing") {
    return {
      kind: "restore",
      amount: Math.min(WORLD_FARM_MAX_FICTIONAL_RESTORE, Math.max(0, plant.effect.power)),
      cap: WORLD_FARM_MAX_FICTIONAL_RESTORE,
      label: "ฟื้นพลังสมมติแบบจำกัด",
    };
  }
  return undefined;
}

/**
 * The runtime plant catalog owns the 300 playable Obsidian plant records. This
 * adapter only exposes the older farming-shaped view; it does not create a
 * second set of seed, harvest, soil, or asset definitions.
 */
export function generateWorldPlantCatalog(count = WORLD_PLANT_CATALOG_SIZE): WorldPlantDefinition[] {
  return PLANT_CATALOG.slice(0, Math.max(0, Math.min(WORLD_PLANT_CATALOG_SIZE, Math.trunc(count)))).map(plant => ({
    id: plant.id,
    seedDefinitionId: plant.seedItemId,
    name: plant.displayName,
    biomeId: "obsidian-frontier",
    soilId: plant.compatibleSoils[0]!,
    tags: Array.from(new Set(["world-plant", "obsidian", plant.family, ...plant.biomeTags, plant.effect.kind])),
    harvestDefinitionId: plant.yieldItemId,
    growthDurationMs: Math.max(1, Math.trunc(plant.growthSeconds * 1000)),
    ...(toWorldEffect(plant) ? { effect: toWorldEffect(plant) } : {}),
  }));
}

export const WORLD_PLANT_CATALOG = generateWorldPlantCatalog();

export function getWorldPlantBySeed(seedDefinitionId: string) {
  const direct = WORLD_PLANT_CATALOG.find(plant => plant.seedDefinitionId === seedDefinitionId);
  if (direct) return direct;
  const legacyOrdinal = /^seed-(\d{3})$/.exec(seedDefinitionId)?.[1];
  return legacyOrdinal ? WORLD_PLANT_CATALOG[Number(legacyOrdinal) - 1] : undefined;
}

export function getWorldPlantDefinition(plantId: string) {
  const direct = WORLD_PLANT_CATALOG.find(plant => plant.id === plantId);
  if (direct) return direct;
  const legacyOrdinal = /^world-plant-(\d{3})$/.exec(plantId)?.[1];
  return legacyOrdinal ? WORLD_PLANT_CATALOG[Number(legacyOrdinal) - 1] : undefined;
}

export function validateWorldPlantCatalog(catalog: WorldPlantDefinition[] = WORLD_PLANT_CATALOG) {
  const issues: string[] = [];
  const ids = new Set<string>();
  const seedIds = new Set<string>();
  for (const plant of catalog) {
    if (ids.has(plant.id)) issues.push(`duplicate plant id: ${plant.id}`);
    ids.add(plant.id);
    if (seedIds.has(plant.seedDefinitionId)) issues.push(`duplicate seed link: ${plant.seedDefinitionId}`);
    seedIds.add(plant.seedDefinitionId);
    const seed = getPlantDefinition(plant.seedDefinitionId);
    const harvest = getPlantDefinition(plant.id)?.yieldItemId;
    if (!seed || seed.seedItemId !== plant.seedDefinitionId) issues.push(`invalid seed link: ${plant.seedDefinitionId}`);
    if (seed?.compatibleSoils[0] !== plant.soilId) issues.push(`soil mismatch: ${plant.id}`);
    if (!harvest || harvest !== plant.harvestDefinitionId) issues.push(`invalid harvest link: ${plant.harvestDefinitionId}`);
    if (plant.biomeId !== "obsidian-frontier") issues.push(`unsupported playable biome: ${plant.biomeId}`);
    if (!Number.isInteger(plant.growthDurationMs) || plant.growthDurationMs <= 0) issues.push(`invalid growth duration: ${plant.id}`);
    if (plant.effect?.kind === "repel" && (plant.effect.radius > WORLD_FARM_MAX_REPEL_RADIUS || plant.effect.durationMs <= 0 || plant.effect.stackable)) issues.push(`unsafe repel effect: ${plant.id}`);
    if (plant.effect?.kind === "restore" && (plant.effect.amount > WORLD_FARM_MAX_FICTIONAL_RESTORE || plant.effect.cap > WORLD_FARM_MAX_FICTIONAL_RESTORE)) issues.push(`unsafe restore effect: ${plant.id}`);
  }
  if (catalog.length !== WORLD_PLANT_CATALOG_SIZE) issues.push(`expected ${WORLD_PLANT_CATALOG_SIZE} plants, received ${catalog.length}`);
  return { valid: issues.length === 0, issues };
}
