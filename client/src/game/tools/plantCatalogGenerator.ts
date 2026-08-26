import { getItemDefinition, type SoilId } from "@/game/data/catalog";

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

const PREFIXES = ["เถ้า", "คริสตัล", "ลูเมน", "สปอร์", "หนาม", "เพลิง", "วอยด์", "ออบซิเดียน", "ดารา", "อีเธอร์"] as const;
const FORMS = ["เฟิร์น", "เถาวัลย์", "ดอกไม้", "เห็ด", "หัวพืช", "ผลึก", "ผลเบอร์รี", "มอส", "หญ้า", "ฝัก"] as const;

function padded(value: number) {
  return String(value).padStart(3, "0");
}

export function generateWorldPlantCatalog(count = WORLD_PLANT_CATALOG_SIZE): WorldPlantDefinition[] {
  return Array.from({ length: count }, (_, index) => {
    const ordinal = index + 1;
    const seedDefinitionId = `seed-${padded(ordinal)}`;
    const seed = getItemDefinition(seedDefinitionId);
    if (!seed?.soilId) throw new Error(`Seed ${seedDefinitionId} must have a soil link before plant generation`);
    const effect: WorldPlantEffect | undefined = ordinal % 12 === 0
      ? { kind: "repel", radius: Math.min(WORLD_FARM_MAX_REPEL_RADIUS, 3 + (ordinal % 4)), durationMs: 30_000, stackable: false, label: "แรงผลักสมมติอ่อน ๆ · ไม่ทำลายมอนสเตอร์" }
      : ordinal % 10 === 0
        ? { kind: "restore", amount: Math.min(WORLD_FARM_MAX_FICTIONAL_RESTORE, 4 + (ordinal % 5)), cap: WORLD_FARM_MAX_FICTIONAL_RESTORE, label: "ฟื้นพลังสมมติแบบจำกัด" }
        : undefined;
    return {
      id: `world-plant-${padded(ordinal)}`,
      seedDefinitionId,
      name: `${PREFIXES[index % PREFIXES.length]}${FORMS[Math.floor(index / PREFIXES.length) % FORMS.length]} ${padded(ordinal)}`,
      biomeId: "obsidian-frontier",
      soilId: seed.soilId,
      tags: Array.from(new Set(["world-plant", "obsidian", ...seed.tags])),
      harvestDefinitionId: `material-${padded(ordinal)}`,
      growthDurationMs: WORLD_FARM_DEFAULT_GROWTH_MS + (ordinal % 5) * 15_000,
      ...(effect ? { effect } : {}),
    };
  });
}

export const WORLD_PLANT_CATALOG = generateWorldPlantCatalog();

export function getWorldPlantBySeed(seedDefinitionId: string) {
  return WORLD_PLANT_CATALOG.find(plant => plant.seedDefinitionId === seedDefinitionId);
}

export function getWorldPlantDefinition(plantId: string) {
  return WORLD_PLANT_CATALOG.find(plant => plant.id === plantId);
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
    const seed = getItemDefinition(plant.seedDefinitionId);
    const harvest = getItemDefinition(plant.harvestDefinitionId);
    if (!seed || seed.category !== "seed") issues.push(`invalid seed link: ${plant.seedDefinitionId}`);
    if (seed?.soilId !== plant.soilId) issues.push(`soil mismatch: ${plant.id}`);
    if (!harvest || harvest.category !== "material") issues.push(`invalid harvest link: ${plant.harvestDefinitionId}`);
    if (plant.biomeId !== "obsidian-frontier") issues.push(`unsupported playable biome: ${plant.biomeId}`);
    if (!Number.isInteger(plant.growthDurationMs) || plant.growthDurationMs <= 0) issues.push(`invalid growth duration: ${plant.id}`);
    if (plant.effect?.kind === "repel" && (plant.effect.radius > WORLD_FARM_MAX_REPEL_RADIUS || plant.effect.durationMs <= 0 || plant.effect.stackable)) issues.push(`unsafe repel effect: ${plant.id}`);
    if (plant.effect?.kind === "restore" && (plant.effect.amount > WORLD_FARM_MAX_FICTIONAL_RESTORE || plant.effect.cap > WORLD_FARM_MAX_FICTIONAL_RESTORE)) issues.push(`unsafe restore effect: ${plant.id}`);
  }
  if (catalog.length !== WORLD_PLANT_CATALOG_SIZE) issues.push(`expected ${WORLD_PLANT_CATALOG_SIZE} plants, received ${catalog.length}`);
  return { valid: issues.length === 0, issues };
}
