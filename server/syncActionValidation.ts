export type UseItemSyncPayload = {
  slot: number;
  instanceId: string;
  definitionId: string;
};

const DEFINITION_ID_PATTERN = /^(sword|bow|ranged|seed|material|furniture|decoration|structure|tool)-\d{3}$/;
const INSTANCE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const BLOCK_MODULE_ID_PATTERN = /^(terrain|obstacle|structure|flora|storage)\.[A-Za-z0-9._-]+$/;
const OBSIDIAN_MAP_ID = "obsidian-frontier";

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
