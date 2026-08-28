import Dexie, { type Table } from "dexie";
import type { ItemInstance } from "@/game/data/catalog";
import { getBlockDefinition } from "@/game/data/blockModules";
import type { HomeAction } from "@/game/home/homeSystemV2";
import { isSafeQuestRewardPendingAction } from "@/game/systems/questRewardPendingAction";
import type { WorldPlantState } from "@/game/systems/worldFarmingSystem";
import type { LocalGameSession } from "./session";
import { incrementVectorClock, mergeVectorClocks, type VectorClock } from "./vectorClock";
import { isRuntimeMapAllowed } from "@/game/routing/directRoute";
import { normalizeWorldFarmState, createDefaultWorldFarmState, type WorldFarmState } from "@/game/systems/worldFarmSystem";
import { createEmptyWorldStorage, normalizeWorldStorage, type WorldStorageById } from "@/game/systems/worldStorageSystem";
import { DEFAULT_CAMERA_MODE, DEFAULT_IN_MAP_SETTINGS, normalizeCameraMode, normalizeInMapSettings, type CameraMode, type InMapSettings } from "@/game/systems/cameraModes";

export const OFFLINE_QUEUE_LIMIT = 1000;

export type OfflineProfileRecord = LocalGameSession & {
  lastSyncedAt: number | null;
  vectorClock: Record<string, number>;
  updatedAt: number;
};

export type OfflineTransaction = {
  id: string;
  playerId: string;
  type: string;
  actorId: string;
  createdAt: number;
  payload: Record<string, unknown>;
  vectorClock: VectorClock;
  syncedAt: number | null;
};

export type OfflineMapState = {
  mapId: string;
  playerId: string;
  fogOfWar: string;
  harvestedNodes: Record<string, number>;
  /** Persist only module IDs or explicit null tombstones, never generated meshes. */
  worldBlockOverrides: Record<string, string | null>;
  worldFarmState: WorldFarmState;
  worldStorageById: WorldStorageById;
  inMapSettings: InMapSettings;
  /** Legacy compatibility fields retained for recovered world-plant callers. */
  worldPlants: Record<string, WorldPlantState>;
  cameraMode: CameraMode;
  updatedAt: number;
};

function normalizeWorldBlockOverrideMap(candidate: unknown): Record<string, string | null> {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
  return Object.fromEntries(Object.entries(candidate).filter(([key, value]) => /^-?\d+:-?\d+:-?\d+$/.test(key) && (value === null || (typeof value === "string" && Boolean(getBlockDefinition(value)))))) as Record<string, string | null>;
}

function normalizeLegacyWorldPlants(candidate: unknown): Record<string, WorldPlantState> {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
  return Object.fromEntries(Object.entries(candidate).filter(([key, value]) => Boolean(key) && Boolean(value && typeof value === "object" && !Array.isArray(value)))) as Record<string, WorldPlantState>;
}

export function defaultOfflineMapState(mapId: string, playerId: string): OfflineMapState {
  return {
    mapId,
    playerId,
    fogOfWar: "",
    harvestedNodes: {},
    worldBlockOverrides: {},
    worldFarmState: createDefaultWorldFarmState(),
    worldStorageById: createEmptyWorldStorage(),
    inMapSettings: DEFAULT_IN_MAP_SETTINGS,
    worldPlants: {},
    cameraMode: DEFAULT_CAMERA_MODE,
    updatedAt: Date.now(),
  };
}

/** Backward-compatible alias retained for the recovered local runtime. */
export const createDefaultOfflineMapState = defaultOfflineMapState;

export function normalizeOfflineMapState(candidate: Partial<OfflineMapState> | null | undefined, mapId: string, playerId: string): OfflineMapState {
  const source = candidate ?? {};
  const inMapSettings = normalizeInMapSettings(source.inMapSettings);
  const cameraMode = normalizeCameraMode(source.cameraMode ?? inMapSettings.cameraMode);
  return {
    mapId,
    playerId,
    fogOfWar: typeof source.fogOfWar === "string" ? source.fogOfWar : "",
    harvestedNodes: source.harvestedNodes && typeof source.harvestedNodes === "object" ? source.harvestedNodes : {},
    worldBlockOverrides: normalizeWorldBlockOverrideMap(source.worldBlockOverrides),
    worldFarmState: normalizeWorldFarmState(source.worldFarmState),
    worldStorageById: normalizeWorldStorage(source.worldStorageById),
    inMapSettings: { ...inMapSettings, cameraMode },
    worldPlants: normalizeLegacyWorldPlants(source.worldPlants),
    cameraMode,
    updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : Date.now(),
  };
}

export async function loadOfflineMapState(mapId: string, playerId: string) {
  const state = await offlineDb.mapStates.get([mapId, playerId]);
  return state ? normalizeOfflineMapState(state, mapId, playerId) : defaultOfflineMapState(mapId, playerId);
}

export async function saveOfflineMapState(state: OfflineMapState) {
  if (!isRuntimeMapAllowed(state.mapId)) throw new Error("Offline map state writes are blocked for maps that are not runtime-approved.");
  const normalized = normalizeOfflineMapState(state, state.mapId, state.playerId);
  normalized.updatedAt = Date.now();
  await offlineDb.mapStates.put(normalized);
  return normalized;
}

class ArcaneOfflineDatabase extends Dexie {
  profiles!: Table<OfflineProfileRecord, string>;
  transactions!: Table<OfflineTransaction, string>;
  mapStates!: Table<OfflineMapState, [string, string]>;

  constructor() {
    super("arcane-frontier-offline-v1");
    this.version(1).stores({
      profiles: "playerId, updatedAt, lastSyncedAt",
      transactions: "id, playerId, createdAt, syncedAt",
      mapStates: "[mapId+playerId], playerId, updatedAt",
    });
  }
}

export const offlineDb = new ArcaneOfflineDatabase();

export async function loadOfflineProfile(playerId?: string) {
  if (playerId) return offlineDb.profiles.get(playerId);
  return offlineDb.profiles.orderBy("updatedAt").last();
}

export async function saveOfflineProfile(session: LocalGameSession, existing?: OfflineProfileRecord | null) {
  const record: OfflineProfileRecord = {
    ...session,
    lastSyncedAt: existing?.lastSyncedAt ?? null,
    vectorClock: existing?.vectorClock ?? { [session.deviceToken]: 1 },
    updatedAt: Date.now(),
  };
  await offlineDb.profiles.put(record);
  return record;
}

export async function queueOfflineTransaction(input: Omit<OfflineTransaction, "syncedAt">) {
  const pendingCount = await offlineDb.transactions.where("playerId").equals(input.playerId).filter(row => row.syncedAt === null).count();
  if (pendingCount >= OFFLINE_QUEUE_LIMIT) throw new Error("Offline action queue is full. Connect to sync before continuing.");
  await offlineDb.transactions.put({ ...input, syncedAt: null });
}

export async function getPendingTransactions(playerId: string) {
  const pending = await offlineDb.transactions.where("playerId").equals(playerId).filter(row => row.syncedAt === null).toArray();
  return pending.sort((left, right) => left.createdAt - right.createdAt);
}

export async function markTransactionsSynced(ids: string[]) {
  await offlineDb.transaction("rw", offlineDb.transactions, async () => {
    for (const id of ids) await offlineDb.transactions.update(id, { syncedAt: Date.now() });
  });
}

export function selectQueueableSessionActions(pendingActions: HomeAction[], capacity: number) {
  const boundedCapacity = Math.max(0, Math.floor(capacity));
  const rejectedIds = pendingActions.filter(action => !isSafeQuestRewardPendingAction(action)).map(action => action.id);
  const actions = pendingActions.filter(isSafeQuestRewardPendingAction).slice(0, boundedCapacity);
  return { actions, rejectedIds };
}

export async function queueSessionPendingActions(session: LocalGameSession, profile?: OfflineProfileRecord) {
  const currentProfile = profile ?? await offlineDb.profiles.get(session.playerId);
  let nextClock = currentProfile?.vectorClock ?? { [session.deviceToken]: 0 };
  const queuedIds: string[] = [];
  const existingPending = await offlineDb.transactions.where("playerId").equals(session.playerId).filter(row => row.syncedAt === null).count();
  const selection = selectQueueableSessionActions(session.pendingActions, OFFLINE_QUEUE_LIMIT - existingPending);
  const actions = selection.actions;

  await offlineDb.transaction("rw", offlineDb.profiles, offlineDb.transactions, async () => {
    for (const action of actions) {
      if (await offlineDb.transactions.get(action.id)) continue;
      nextClock = incrementVectorClock(nextClock, session.deviceToken);
      await offlineDb.transactions.put({
        id: action.id,
        playerId: session.playerId,
        type: action.type,
        actorId: session.deviceToken,
        createdAt: action.createdAt,
        payload: action.payload,
        vectorClock: nextClock,
        syncedAt: null,
      });
      queuedIds.push(action.id);
    }
    if (currentProfile) await offlineDb.profiles.update(session.playerId, { vectorClock: nextClock, updatedAt: Date.now() });
  });
  return { queuedIds, rejectedIds: selection.rejectedIds, vectorClock: nextClock };
}

export async function discardSyncedTransactions(before = Date.now() - 7 * 24 * 60 * 60 * 1000) {
  const stale = await offlineDb.transactions.filter(row => row.syncedAt !== null && row.syncedAt < before).primaryKeys();
  await offlineDb.transactions.bulkDelete(stale);
}

export async function reconcileOfflineVectorClock(playerId: string, serverClock: VectorClock) {
  const profile = await offlineDb.profiles.get(playerId);
  if (!profile) return;
  await offlineDb.profiles.update(playerId, {
    vectorClock: mergeVectorClocks(profile.vectorClock, serverClock),
    lastSyncedAt: Date.now(),
    updatedAt: Date.now(),
  });
}
