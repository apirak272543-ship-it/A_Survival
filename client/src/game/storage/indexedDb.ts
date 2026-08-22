import Dexie, { type Table } from "dexie";
import type { LocalGameSession } from "./session";
import { incrementVectorClock, mergeVectorClocks, type VectorClock } from "./vectorClock";

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
  updatedAt: number;
};

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

export async function queueSessionPendingActions(session: LocalGameSession, profile?: OfflineProfileRecord) {
  const currentProfile = profile ?? await offlineDb.profiles.get(session.playerId);
  let nextClock = currentProfile?.vectorClock ?? { [session.deviceToken]: 0 };
  const queuedIds: string[] = [];
  const existingPending = await offlineDb.transactions.where("playerId").equals(session.playerId).filter(row => row.syncedAt === null).count();
  const actions = session.pendingActions.slice(0, Math.max(0, OFFLINE_QUEUE_LIMIT - existingPending));

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
  return { queuedIds, vectorClock: nextClock };
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
