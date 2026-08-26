export type UseItemSyncPayload = {
  slot: number;
  instanceId: string;
  definitionId: string;
};

const DEFINITION_ID_PATTERN = /^(sword|bow|ranged|seed|material|furniture|decoration|structure|tool)-\d{3}$/;
const INSTANCE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const BLOCK_MODULE_ID_PATTERN = /^(terrain|obstacle|structure|flora|storage)\.[A-Za-z0-9._-]+$/;
const OBSIDIAN_MAP_ID = "obsidian-frontier";
const FARM_PLOT_ID_PATTERN = /^farm-plot-0[1-4]$/;
const WORLD_PLANT_ID_PATTERN = /^world-plant-\d{3}$/;

export function isSafeUseItemPayload(payload: Record<string, unknown>): payload is UseItemSyncPayload {
  return Number.isInteger(payload.slot)
    && Number(payload.slot) >= 0
    && Number(payload.slot) <= 5
    && typeof payload.instanceId === "string"
    && INSTANCE_ID_PATTERN.test(payload.instanceId)
    && typeof payload.definitionId === "string"
    && DEFINITION_ID_PATTERN.test(payload.definitionId);
}

function isSafeBlockCoordinate(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const coordinate = value as Record<string, unknown>;
  return [coordinate.x, coordinate.y, coordinate.z].every(axis => Number.isInteger(axis) && Number(axis) >= -500 && Number(axis) <= 500);
}

export function isSafeBlockPlacePayload(payload: Record<string, unknown>) {
  return payload.mapId === OBSIDIAN_MAP_ID
    && payload.moduleId === "player.placed"
    && typeof payload.itemInstanceId === "string"
    && INSTANCE_ID_PATTERN.test(payload.itemInstanceId)
    && payload.itemDefinitionId === "structure-001"
    && isSafeBlockCoordinate(payload.coordinate);
}

export function isSafeBlockBreakPayload(payload: Record<string, unknown>) {
  return payload.mapId === OBSIDIAN_MAP_ID
    && typeof payload.moduleId === "string"
    && BLOCK_MODULE_ID_PATTERN.test(payload.moduleId)
    && isSafeBlockCoordinate(payload.coordinate);
}

export function isSafePlantWorldSeedPayload(payload: Record<string, unknown>) {
  return payload.mapId === OBSIDIAN_MAP_ID
    && typeof payload.plotId === "string"
    && FARM_PLOT_ID_PATTERN.test(payload.plotId)
    && typeof payload.plantId === "string"
    && WORLD_PLANT_ID_PATTERN.test(payload.plantId)
    && typeof payload.seedDefinitionId === "string"
    && /^seed-\d{3}$/.test(payload.seedDefinitionId)
    && typeof payload.seedInstanceId === "string"
    && INSTANCE_ID_PATTERN.test(payload.seedInstanceId)
    && isSafeBlockCoordinate(payload.coordinate)
    && Number.isFinite(Number(payload.plantedAt));
}

export function isSafeHarvestWorldCropPayload(payload: Record<string, unknown>) {
  return payload.mapId === OBSIDIAN_MAP_ID
    && typeof payload.plotId === "string"
    && FARM_PLOT_ID_PATTERN.test(payload.plotId)
    && typeof payload.rewardInstanceId === "string"
    && INSTANCE_ID_PATTERN.test(payload.rewardInstanceId)
    && isSafeBlockCoordinate(payload.coordinate)
    && Number.isFinite(Number(payload.harvestedAt));
}
