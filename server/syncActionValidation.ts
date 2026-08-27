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
const STORAGE_CHEST_ID_PATTERN = /^obsidian-chest-\d{2}$/;
const QUEST_REWARD_QUEST_ID_PATTERN = /^story-map-001-quest-(0[1-9]|1\d|20)$/;
const QUEST_REWARD_EVENT_ID_PATTERN = /^quest-reward:story-map-001-quest-(0[1-9]|1\d|20):[1-9]\d{0,2}$/;

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

function isSafeStorageTransferPayload(payload: Record<string, unknown>) {
  return payload.mapId === OBSIDIAN_MAP_ID
    && typeof payload.chestId === "string"
    && STORAGE_CHEST_ID_PATTERN.test(payload.chestId)
    && typeof payload.itemInstanceId === "string"
    && INSTANCE_ID_PATTERN.test(payload.itemInstanceId)
    && Number.isInteger(payload.slot)
    && Number(payload.slot) >= 0
    && Number(payload.slot) < 27
    && Number.isInteger(payload.quantity)
    && Number(payload.quantity) >= 1
    && Number(payload.quantity) <= 64;
}

export function isSafeStorageDepositPayload(payload: Record<string, unknown>) {
  return isSafeStorageTransferPayload(payload);
}

export function isSafeStorageWithdrawPayload(payload: Record<string, unknown>) {
  return isSafeStorageTransferPayload(payload);
}

export type QuestRewardDispatchSyncPayload = {
  mapId: typeof OBSIDIAN_MAP_ID;
  questId: string;
  questOrder: number;
  rewardEventIds: string[];
  rewardInstanceIds: string[];
  sequenceBase: number;
};

export function isSafeQuestRewardDispatchPayload(payload: Record<string, unknown>): payload is QuestRewardDispatchSyncPayload {
  const rewardEventIds = payload.rewardEventIds;
  const rewardInstanceIds = payload.rewardInstanceIds;
  if (payload.mapId !== OBSIDIAN_MAP_ID || typeof payload.questId !== "string" || !QUEST_REWARD_QUEST_ID_PATTERN.test(payload.questId)) return false;
  if (!Number.isInteger(payload.questOrder) || Number(payload.questOrder) < 1 || Number(payload.questOrder) > 20) return false;
  const questIdOrder = Number(payload.questId.slice("story-map-001-quest-".length));
  if (payload.questOrder !== questIdOrder) return false;
  if (!Number.isInteger(payload.sequenceBase) || Number(payload.sequenceBase) < 0 || Number(payload.sequenceBase) > 1_000_000) return false;
  if (!Array.isArray(rewardEventIds) || !Array.isArray(rewardInstanceIds) || rewardEventIds.length < 1 || rewardEventIds.length > 8 || rewardEventIds.length !== rewardInstanceIds.length) return false;
  if (new Set(rewardEventIds).size !== rewardEventIds.length || new Set(rewardInstanceIds).size !== rewardInstanceIds.length) return false;
  return rewardEventIds.every(value => typeof value === "string" && QUEST_REWARD_EVENT_ID_PATTERN.test(value))
    && rewardInstanceIds.every(value => typeof value === "string" && INSTANCE_ID_PATTERN.test(value));
}
