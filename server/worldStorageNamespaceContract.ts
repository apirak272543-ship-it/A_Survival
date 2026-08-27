export const WORLD_STORAGE_NAMESPACE_VERSION = "world-storage-namespace.v1" as const;
export const MAX_WORLD_STORAGE_CAPACITY = 64;

export type StorageScope = "world-map" | "player-global";
export type StorageTransferAction = "storage-deposit" | "storage-withdraw";

export type WorldStorageNamespace = {
  scope: "world-map";
  mapId: string;
  storageId: string;
  key: string;
  capacity: number;
};

export type WorldStorageNamespaceResult = {
  contractVersion: typeof WORLD_STORAGE_NAMESPACE_VERSION;
  valid: boolean;
  issues: string[];
  namespace: WorldStorageNamespace | null;
};

export type WorldStorageTransferResult = {
  valid: boolean;
  issues: string[];
  storageKey: string;
  playerKey: string;
  action: StorageTransferAction;
};

const ID_PATTERN = /^[a-z0-9][a-z0-9:._-]{0,95}$/i;

function normalizeId(value: string, field: string, issues: string[]) {
  const normalized = value.trim();
  if (!normalized) issues.push(`${field} must not be empty`);
  else if (!ID_PATTERN.test(normalized)) issues.push(`${field} contains unsafe characters`);
  return normalized;
}

export function buildWorldStorageKey(mapId: string, storageId: string) {
  return `world-storage:${encodeURIComponent(mapId)}:${encodeURIComponent(storageId)}`;
}

export function buildPlayerGlobalKey(playerId: string) {
  return `player-global:${encodeURIComponent(playerId)}`;
}

export function evaluateWorldStorageNamespace(input: {
  scope: StorageScope;
  mapId: string;
  storageId: string;
  capacity: number;
}): WorldStorageNamespaceResult {
  const issues: string[] = [];
  const mapId = normalizeId(input.mapId, "mapId", issues);
  const storageId = normalizeId(input.storageId, "storageId", issues);
  if (input.scope !== "world-map") issues.push("world storage scope must be world-map");
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > MAX_WORLD_STORAGE_CAPACITY) issues.push(`world storage capacity must be an integer from 1 to ${MAX_WORLD_STORAGE_CAPACITY}`);
  if (issues.length > 0) return { contractVersion: WORLD_STORAGE_NAMESPACE_VERSION, valid: false, issues, namespace: null };
  return {
    contractVersion: WORLD_STORAGE_NAMESPACE_VERSION,
    valid: true,
    issues: [],
    namespace: { scope: "world-map", mapId, storageId, key: buildWorldStorageKey(mapId, storageId), capacity: input.capacity },
  };
}

export function validateWorldStorageTransfer(input: {
  action: StorageTransferAction;
  actionMapId: string;
  storage: WorldStorageNamespace;
  playerId: string;
  sourceOrDestinationMapId?: string;
}): WorldStorageTransferResult {
  const issues: string[] = [];
  const actionMapId = input.actionMapId.trim();
  const playerId = input.playerId.trim();
  const storageKey = input.storage.key;
  const playerKey = buildPlayerGlobalKey(playerId);
  if (input.storage.scope !== "world-map") issues.push("storage transfer requires world-map storage scope");
  if (!actionMapId || actionMapId !== input.storage.mapId) issues.push("storage transfer mapId must match storage namespace mapId");
  if (input.sourceOrDestinationMapId !== undefined && input.sourceOrDestinationMapId !== input.storage.mapId) issues.push("storage transfer cannot cross map namespaces");
  if (!playerId) issues.push("storage transfer playerId must not be empty");
  if (!storageKey || storageKey !== buildWorldStorageKey(input.storage.mapId, input.storage.storageId)) issues.push("storage transfer key does not match namespace identity");
  if (storageKey.startsWith("player-global:")) issues.push("player-global namespace cannot be used as world storage");
  return { valid: issues.length === 0, issues, storageKey, playerKey, action: input.action };
}
