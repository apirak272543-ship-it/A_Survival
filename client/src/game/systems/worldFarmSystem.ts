import { createMapRewardInstance, getItemDefinition, type ItemInstance, type SoilId } from "@/game/data/catalog";
import { consumeOneFromStack } from "@/game/systems/blockActionSystem";
import { addItemToContainer, PLAYER_INVENTORY_SLOTS } from "@/game/systems/inventorySystem";
import {
  getWorldPlantBySeed,
  getWorldPlantDefinition,
  WORLD_FARM_MAX_FICTIONAL_RESTORE,
  WORLD_FARM_MAX_REPEL_RADIUS,
  type WorldPlantEffect,
  type WorldPlantDefinition,
} from "@/game/tools/plantCatalogGenerator";

export type WorldFarmCropStage = "empty" | "seed" | "sprout" | "young" | "mature";

export type WorldFarmPlot = {
  id: string;
  coordinate: { x: number; y: number; z: number };
  soilId: SoilId;
  plantId?: string;
  seedDefinitionId?: string;
  seedInstanceId?: string;
  plantedAt?: number;
  growthDurationMs?: number;
  updatedAt: number;
};

export type WorldFarmState = Record<string, WorldFarmPlot>;

export const OBSIDIAN_FARM_PLOTS: ReadonlyArray<WorldFarmPlot> = [
  { id: "farm-plot-01", coordinate: { x: 3, y: 0, z: 1 }, soilId: "terra-loam", updatedAt: 0 },
  { id: "farm-plot-02", coordinate: { x: 4, y: 0, z: 1 }, soilId: "ashen-volcanic", updatedAt: 0 },
  { id: "farm-plot-03", coordinate: { x: 3, y: 0, z: 2 }, soilId: "terra-loam", updatedAt: 0 },
  { id: "farm-plot-04", coordinate: { x: 4, y: 0, z: 2 }, soilId: "ashen-volcanic", updatedAt: 0 },
];

export function createDefaultWorldFarmState(): WorldFarmState {
  return Object.fromEntries(OBSIDIAN_FARM_PLOTS.map(plot => [plot.id, { ...plot }])) as WorldFarmState;
}

export function normalizeWorldFarmState(candidate: unknown): WorldFarmState {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return createDefaultWorldFarmState();
  const source = candidate as Record<string, unknown>;
  const defaults = createDefaultWorldFarmState();
  const normalized: WorldFarmState = {};
  for (const [plotId, fallback] of Object.entries(defaults)) {
    const raw = source[plotId];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      normalized[plotId] = fallback;
      continue;
    }
    const value = raw as Record<string, unknown>;
    const coordinate = value.coordinate && typeof value.coordinate === "object" && !Array.isArray(value.coordinate) ? value.coordinate as Record<string, unknown> : {};
    const x = Number(coordinate.x);
    const y = Number(coordinate.y);
    const z = Number(coordinate.z);
    const soilId = value.soilId;
    const plant = typeof value.plantId === "string" ? getWorldPlantDefinition(value.plantId) : undefined;
    normalized[plotId] = {
      ...fallback,
      coordinate: [x, y, z].every(Number.isInteger) ? { x, y, z } : fallback.coordinate,
      soilId: soilId === "terra-loam" || soilId === "ashen-volcanic" || soilId === "red-dune" || soilId === "verdant-humus" || soilId === "aether-crystal" ? soilId : fallback.soilId,
      ...(plant ? { plantId: plant.id } : {}),
      ...(typeof value.seedDefinitionId === "string" && getItemDefinition(value.seedDefinitionId)?.category === "seed" ? { seedDefinitionId: value.seedDefinitionId } : {}),
      ...(typeof value.seedInstanceId === "string" ? { seedInstanceId: value.seedInstanceId } : {}),
      ...(Number.isFinite(Number(value.plantedAt)) ? { plantedAt: Number(value.plantedAt) } : {}),
      ...(Number.isFinite(Number(value.growthDurationMs)) && Number(value.growthDurationMs) > 0 ? { growthDurationMs: Number(value.growthDurationMs) } : {}),
      updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : 0,
    };
    if (!normalized[plotId].plantId) {
      delete normalized[plotId].seedDefinitionId;
      delete normalized[plotId].seedInstanceId;
      delete normalized[plotId].plantedAt;
      delete normalized[plotId].growthDurationMs;
    }
  }
  return normalized;
}

export function isWorldFarmSoilAllowed(mapId: string, soilId: SoilId) {
  return mapId === "obsidian-frontier" && (soilId === "terra-loam" || soilId === "ashen-volcanic");
}

export function getWorldFarmCropStage(plot: WorldFarmPlot, now = Date.now()): WorldFarmCropStage {
  if (!plot.plantId || !plot.plantedAt || !plot.growthDurationMs) return "empty";
  const progress = Math.max(0, (now - plot.plantedAt) / plot.growthDurationMs);
  if (progress < 0.25) return "seed";
  if (progress < 0.55) return "sprout";
  if (progress < 1) return "young";
  return "mature";
}

export function getWorldFarmPlant(plot: WorldFarmPlot): WorldPlantDefinition | undefined {
  return plot.plantId ? getWorldPlantDefinition(plot.plantId) : undefined;
}

export type WorldFarmAction = {
  id: string;
  type: "plant-world-seed" | "harvest-world-crop";
  createdAt: number;
  payload: Record<string, unknown>;
};

export type WorldFarmPlan = {
  accepted: boolean;
  reason?: string;
  state: WorldFarmState;
  plot?: WorldFarmPlot;
  plant?: WorldPlantDefinition;
  reward?: ItemInstance;
  effect?: WorldPlantEffect;
  action?: WorldFarmAction;
  message: string;
};

function emptyPlan(state: WorldFarmState, reason: string): WorldFarmPlan {
  return { accepted: false, reason, state, message: reason };
}

export function planPlantWorldSeed(input: { mapId: string; state: WorldFarmState; plotId: string; seedDefinitionId: string; seedInstanceId: string; now?: number }): WorldFarmPlan {
  const plot = input.state[input.plotId];
  const seed = getItemDefinition(input.seedDefinitionId);
  const plant = getWorldPlantBySeed(input.seedDefinitionId);
  const now = input.now ?? Date.now();
  if (!plot) return emptyPlan(input.state, "ไม่พบแปลงปลูกนี้");
  if (getWorldFarmCropStage(plot, now) !== "empty") return emptyPlan(input.state, "แปลงนี้มีพืชอยู่แล้ว");
  if (!seed || seed.category !== "seed" || !plant) return emptyPlan(input.state, "ไอเทมนี้ยังไม่ใช่เมล็ดพืชของโลก");
  if (!isWorldFarmSoilAllowed(input.mapId, plot.soilId)) return emptyPlan(input.state, "ดินชนิดนี้ยังไม่เปิดใช้ใน Obsidian Frontier");
  if (seed.soilId !== plot.soilId || plant.soilId !== plot.soilId) return emptyPlan(input.state, `เมล็ดนี้ต้องใช้ดิน ${plot.soilId} เท่านั้น`);
  const nextPlot: WorldFarmPlot = { ...plot, plantId: plant.id, seedDefinitionId: input.seedDefinitionId, seedInstanceId: input.seedInstanceId, plantedAt: now, growthDurationMs: plant.growthDurationMs, updatedAt: now };
  return {
    accepted: true,
    state: { ...input.state, [plot.id]: nextPlot },
    plot: nextPlot,
    plant,
    action: { id: `plant-world-${plot.id}-${now}`, type: "plant-world-seed", createdAt: now, payload: { mapId: input.mapId, plotId: plot.id, plantId: plant.id, seedDefinitionId: input.seedDefinitionId, seedInstanceId: input.seedInstanceId, plantedAt: now } },
    message: `ปลูก${plant.name}แล้ว · รอให้โตตามเวลาออฟไลน์`,
  };
}

export function plantWorldSeed(input: { mapId: string; state: WorldFarmState; inventory: ItemInstance[]; plotId: string; seedInstanceId: string; now?: number }): WorldFarmPlan & { inventory: ItemInstance[] } {
  const seed = input.inventory.find(item => item.instanceId === input.seedInstanceId && item.quantity > 0);
  if (!seed) return { ...emptyPlan(input.state, "ไม่พบเมล็ดในช่องถือ"), inventory: input.inventory };
  const plan = planPlantWorldSeed({ mapId: input.mapId, state: input.state, plotId: input.plotId, seedDefinitionId: seed.definitionId, seedInstanceId: seed.instanceId, now: input.now });
  if (!plan.accepted) return { ...plan, inventory: input.inventory };
  const consumed = consumeOneFromStack(input.inventory, input.seedInstanceId);
  if (!consumed.accepted) return { ...emptyPlan(input.state, consumed.reason), inventory: input.inventory };
  return { ...plan, inventory: consumed.inventory };
}

export function planHarvestWorldPlant(input: { mapId: string; state: WorldFarmState; plotId: string; now?: number }): WorldFarmPlan {
  const plot = input.state[input.plotId];
  const now = input.now ?? Date.now();
  if (!plot || !plot.plantId) return emptyPlan(input.state, "แปลงนี้ยังไม่มีพืช");
  if (getWorldFarmCropStage(plot, now) !== "mature") return emptyPlan(input.state, "พืชยังไม่โตเต็มที่");
  const plant = getWorldPlantDefinition(plot.plantId);
  if (!plant) return emptyPlan(input.state, "ข้อมูลพืชเสียหาย จึงยังเก็บเกี่ยวไม่ได้");
  const eventId = `world-harvest-${input.mapId}-${plot.id}-${plot.plantedAt}`;
  const reward = createMapRewardInstance(plant.harvestDefinitionId, now % 100000, input.mapId, eventId, "harvest");
  const effect = plant.effect;
  const cleared: WorldFarmPlot = { id: plot.id, coordinate: plot.coordinate, soilId: plot.soilId, updatedAt: now };
  return {
    accepted: true,
    state: { ...input.state, [plot.id]: cleared },
    plot: cleared,
    plant,
    reward,
    effect,
    action: { id: `harvest-world-${plot.id}-${plot.plantedAt}`, type: "harvest-world-crop", createdAt: now, payload: { mapId: input.mapId, plotId: plot.id, plantId: plant.id, rewardInstanceId: reward.instanceId, harvestedAt: now } },
    message: `เก็บเกี่ยว${plant.name}แล้ว · ได้ ${plant.harvestDefinitionId}`,
  };
}

export function harvestWorldPlant(input: { mapId: string; state: WorldFarmState; inventory: ItemInstance[]; plotId: string; now?: number }) {
  const plan = planHarvestWorldPlant(input);
  if (!plan.accepted || !plan.reward) return { ...plan, inventory: input.inventory };
  const added = addItemToContainer(input.inventory, plan.reward, PLAYER_INVENTORY_SLOTS);
  if (!added.accepted || added.remainder) {
    return {
      ...emptyPlan(input.state, `กระเป๋าไม่พอรับผลผลิตจาก ${input.plotId}`),
      inventory: input.inventory,
    };
  }
  return { ...plan, inventory: added.inventory };
}

export function validateWorldFarmEffect(effect: WorldPlantEffect | undefined) {
  if (!effect) return { valid: true, issues: [] as string[] };
  const issues: string[] = [];
  if (effect.kind === "repel" && (effect.radius > WORLD_FARM_MAX_REPEL_RADIUS || effect.stackable || effect.durationMs <= 0)) issues.push("unsafe mature-only repel effect");
  if (effect.kind === "restore" && (effect.amount > WORLD_FARM_MAX_FICTIONAL_RESTORE || effect.cap > WORLD_FARM_MAX_FICTIONAL_RESTORE)) issues.push("unsafe fictional restore effect");
  return { valid: issues.length === 0, issues };
}
