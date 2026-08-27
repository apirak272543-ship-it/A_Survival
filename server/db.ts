import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { authorityAuditEvents, authorityInvitations, gameIntegrityLogs, gameItemInstances, gameProfiles, gameSaves, gameSyncTransactions, itemProvenance, InsertUser, users } from "../drizzle/schema";
import { incrementServerClock, mergeServerClock, type ServerVectorClock } from "./syncVector";
import { ENV } from './_core/env';
import { canAcceptAuthorityInvitation, isAuthorityInvitationActive, normalizeAuthorityEmail, roleGrantedByMasterEmail, type AuthorityRole } from "../shared/authority";
import { isSafeBlockBreakPayload, isSafeBlockPlacePayload, isSafeHarvestWorldCropPayload, isSafePlantWorldSeedPayload, isSafeStorageDepositPayload, isSafeStorageWithdrawPayload, isSafeUseItemPayload } from "./syncActionValidation";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId || roleGrantedByMasterEmail({ email: user.email, masterEmail: ENV.masterEmail }) === "master") {
      values.role = 'master';
      updateSet.role = 'master';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type AuthorityMember = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: AuthorityRole;
  createdAt: Date;
  lastSignedIn: Date;
};

export async function listAuthorityMembers(limit = 100): Promise<{ available: boolean; members: AuthorityMember[] }> {
  const db = await getDb();
  if (!db) return { available: false, members: [] };

  const rows = await db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(users.createdAt).limit(limit);

  return { available: true, members: rows as AuthorityMember[] };
}

export async function setAuthorityMemberRole(input: {
  actorUserId: number;
  targetUserId: number;
  role: Exclude<AuthorityRole, "master">;
  reason: string;
}): Promise<AuthorityMember | null> {
  const db = await getDb();
  if (!db) throw new Error("Authority database is not available");

  return db.transaction(async tx => {
    const target = await tx.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, input.targetUserId)).limit(1);
    if (!target[0]) return null;
    if (target[0].role === "master") throw new Error("The master authority cannot be changed through this route");

    const action = input.role === "user" ? "revoke" : "grant";
    await tx.update(users).set({ role: input.role }).where(eq(users.id, input.targetUserId));
    await tx.insert(authorityAuditEvents).values({
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      action,
      fromRole: target[0].role,
      toRole: input.role,
      reason: input.reason,
    });
    const rows = await tx.select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users).where(eq(users.id, input.targetUserId)).limit(1);

    return (rows[0] as AuthorityMember | undefined) ?? null;
  });
}

export type AuthorityAuditMemberEvent = {
  id: number;
  actorUserId: number;
  targetUserId: number;
  action: "grant" | "revoke";
  fromRole: Exclude<AuthorityRole, "master">;
  toRole: Exclude<AuthorityRole, "master">;
  reason: string;
  createdAt: Date;
};

export async function listAuthorityAuditEvents(limit = 100): Promise<{ available: boolean; events: AuthorityAuditMemberEvent[] }> {
  const db = await getDb();
  if (!db) return { available: false, events: [] };

  const rows = await db.select({
    id: authorityAuditEvents.id,
    actorUserId: authorityAuditEvents.actorUserId,
    targetUserId: authorityAuditEvents.targetUserId,
    action: authorityAuditEvents.action,
    fromRole: authorityAuditEvents.fromRole,
    toRole: authorityAuditEvents.toRole,
    reason: authorityAuditEvents.reason,
    createdAt: authorityAuditEvents.createdAt,
  }).from(authorityAuditEvents).orderBy(authorityAuditEvents.createdAt).limit(limit);

  return { available: true, events: rows as AuthorityAuditMemberEvent[] };
}

export type AuthorityInvitationRecord = {
  id: number;
  email: string;
  requestedRole: "gm" | "admin";
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedByUserId: number;
  acceptedUserId: number | null;
  note: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
};

export async function createAuthorityInvitation(input: {
  email: string;
  requestedRole: "gm" | "admin";
  invitedByUserId: number;
  note?: string;
  expiresAt: Date;
}): Promise<AuthorityInvitationRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const email = normalizeAuthorityEmail(input.email);
  if (!email) throw new Error("Invitation email is required");

  await db.insert(authorityInvitations).values({
    email,
    requestedRole: input.requestedRole,
    invitedByUserId: input.invitedByUserId,
    note: input.note ?? null,
    expiresAt: input.expiresAt,
  });
  const rows = await db.select().from(authorityInvitations).where(and(eq(authorityInvitations.email, email), eq(authorityInvitations.invitedByUserId, input.invitedByUserId))).orderBy(desc(authorityInvitations.createdAt)).limit(1);
  return (rows[0] as AuthorityInvitationRecord | undefined) ?? null;
}

export async function listAuthorityInvitations(limit = 100): Promise<{ available: boolean; invitations: AuthorityInvitationRecord[] }> {
  const db = await getDb();
  if (!db) return { available: false, invitations: [] };
  const now = new Date();
  const rows = await db.select().from(authorityInvitations).orderBy(desc(authorityInvitations.createdAt)).limit(limit);
  const invitations = rows.map(row => isAuthorityInvitationActive({ status: row.status, expiresAt: row.expiresAt, now }) ? row : row.status === "pending" ? { ...row, status: "expired" as const } : row);
  return { available: true, invitations: invitations as AuthorityInvitationRecord[] };
}

export async function revokeAuthorityInvitation(input: { invitationId: number }): Promise<AuthorityInvitationRecord | null> {
  const db = await getDb();
  if (!db) return null;
  await db.update(authorityInvitations).set({ status: "revoked" }).where(and(eq(authorityInvitations.id, input.invitationId), eq(authorityInvitations.status, "pending")));
  const rows = await db.select().from(authorityInvitations).where(eq(authorityInvitations.id, input.invitationId)).limit(1);
  return (rows[0] as AuthorityInvitationRecord | undefined) ?? null;
}

export async function acceptAuthorityInvitation(input: { userId: number; email: string }): Promise<{ invitation: AuthorityInvitationRecord; member: AuthorityMember } | null> {
  const db = await getDb();
  if (!db) return null;
  const email = normalizeAuthorityEmail(input.email);
  if (!email) return null;
  const now = new Date();

  return db.transaction(async tx => {
    const invitations = await tx.select().from(authorityInvitations).where(and(eq(authorityInvitations.email, email), eq(authorityInvitations.status, "pending"))).orderBy(desc(authorityInvitations.createdAt)).limit(20);
    const invitation = invitations.find(candidate => canAcceptAuthorityInvitation({ invitationEmail: candidate.email, userEmail: email, status: candidate.status, expiresAt: candidate.expiresAt, now }));
    if (!invitation) return null;

    const targets = await tx.select({ id: users.id, role: users.role, openId: users.openId, name: users.name, email: users.email, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.id, input.userId)).limit(1);
    const target = targets[0];
    if (!target || target.role === "master") return null;

    await tx.update(users).set({ role: invitation.requestedRole }).where(eq(users.id, input.userId));
    await tx.update(authorityInvitations).set({ status: "accepted", acceptedUserId: input.userId, acceptedAt: now }).where(eq(authorityInvitations.id, invitation.id));
    await tx.insert(authorityAuditEvents).values({
      actorUserId: invitation.invitedByUserId,
      targetUserId: input.userId,
      action: "grant",
      fromRole: target.role,
      toRole: invitation.requestedRole,
      reason: `Authority invitation ${invitation.id} accepted by OAuth user ${input.userId}`,
    });

    return {
      invitation: { ...invitation, status: "accepted" as const, acceptedUserId: input.userId, acceptedAt: now },
      member: { ...target, role: invitation.requestedRole } as AuthorityMember,
    };
  });
}

export type GameProfileOpenInput = {
  playerId: string;
  deviceToken: string;
  displayName: string;
};

const STARTER_ITEMS = [
  { definitionId: "sword-001", tier: "common", sourceRef: "starter-weapon" },
  { definitionId: "seed-001", tier: "common", sourceRef: "starter-seed" },
  { definitionId: "structure-001", tier: "common", sourceRef: "starter-build" },
] as const;

export async function getGameProfileByPlayerId(playerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(gameProfiles).where(eq(gameProfiles.playerId, playerId)).limit(1);
  return rows[0];
}

export async function getOrCreateGameProfile(input: GameProfileOpenInput) {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await getGameProfileByPlayerId(input.playerId);
  if (existing) return { profile: existing, created: false };

  await db.insert(gameProfiles).values({
    playerId: input.playerId,
    deviceToken: input.deviceToken,
    displayName: input.displayName,
  });
  const profile = await getGameProfileByPlayerId(input.playerId);
  if (!profile) throw new Error("Game profile could not be created");

  await db.insert(gameItemInstances).values(
    STARTER_ITEMS.map((item, index) => ({
      profileId: profile.id,
      instanceId: `profile-${profile.id}-starter-${index + 1}`,
      definitionId: item.definitionId,
      quantity: 1,
      enhancement: 0,
      tier: item.tier,
    })),
  );
  await db.insert(itemProvenance).values(
    STARTER_ITEMS.map((item, index) => ({
      profileId: profile.id,
      itemInstanceId: `profile-${profile.id}-starter-${index + 1}`,
      sourceType: "starter" as const,
      sourceRef: item.sourceRef,
      metadata: { grant: "profile-create" },
    })),
  );

  return { profile, created: true };
}

export async function getGameProfileBundle(playerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const profile = await getGameProfileByPlayerId(playerId);
  if (!profile) return undefined;
  const [saveRows, instances, integrity] = await Promise.all([
    db.select().from(gameSaves).where(eq(gameSaves.profileId, profile.id)).limit(1),
    db.select().from(gameItemInstances).where(eq(gameItemInstances.profileId, profile.id)),
    db.select().from(gameIntegrityLogs).where(eq(gameIntegrityLogs.profileId, profile.id)).limit(20),
  ]);
  return { profile, save: saveRows[0] ?? null, instances, integrity };
}

export async function writeGameSave(input: {
  playerId: string;
  payload: Record<string, unknown>;
  checksum: string;
  clientUpdatedAt: Date;
  health: number;
  currency: number;
  lastMapId: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const profile = await getGameProfileByPlayerId(input.playerId);
  if (!profile) return undefined;

  await db.update(gameProfiles).set({
    health: input.health,
    currency: input.currency,
    lastMapId: input.lastMapId,
    lastClientSaveAt: input.clientUpdatedAt,
    syncVersion: profile.syncVersion + 1,
  }).where(eq(gameProfiles.id, profile.id));
  await db.insert(gameSaves).values({
    profileId: profile.id,
    payload: input.payload,
    checksum: input.checksum,
    clientUpdatedAt: input.clientUpdatedAt,
  }).onDuplicateKeyUpdate({
    set: {
      payload: input.payload,
      checksum: input.checksum,
      clientUpdatedAt: input.clientUpdatedAt,
      serverValidatedAt: new Date(),
    },
  });
  return getGameProfileBundle(input.playerId);
}

export type SyncBatchTransaction = {
  txId: string;
  actorId: string;
  actionType: string;
  payload: Record<string, unknown>;
  vectorClock: ServerVectorClock;
};

export async function writeGameSyncBatch(input: {
  playerId: string;
  clientClock: ServerVectorClock;
  transactions: SyncBatchTransaction[];
}) {
  const db = await getDb();
  if (!db) return undefined;
  const profile = await getGameProfileByPlayerId(input.playerId);
  if (!profile) return undefined;

  const acceptedTxIds: string[] = [];
  const duplicateTxIds: string[] = [];
  const rejectedTxIds: string[] = [];
  let mergedClock = mergeServerClock(profile.vectorClock ?? {}, input.clientClock);

  await db.transaction(async tx => {
    for (const transaction of input.transactions) {
      const existing = await tx.select({ txId: gameSyncTransactions.txId }).from(gameSyncTransactions).where(eq(gameSyncTransactions.txId, transaction.txId)).limit(1);
      if (existing[0]) {
        duplicateTxIds.push(transaction.txId);
        continue;
      }
      const supportedAction = ["place-structure", "move-structure", "rotate-structure", "recall-structure", "plant-seed", "harvest-crop", "equip-pet-item", "unequip-pet-item"].includes(transaction.actionType)
        || (transaction.actionType === "use-item" && isSafeUseItemPayload(transaction.payload))
        || (transaction.actionType === "block-place" && isSafeBlockPlacePayload(transaction.payload))
        || (transaction.actionType === "block-break" && isSafeBlockBreakPayload(transaction.payload))
        || (transaction.actionType === "plant-world-seed" && isSafePlantWorldSeedPayload(transaction.payload))
        || (transaction.actionType === "harvest-world-crop" && isSafeHarvestWorldCropPayload(transaction.payload))
        || (transaction.actionType === "storage-deposit" && isSafeStorageDepositPayload(transaction.payload))
        || (transaction.actionType === "storage-withdraw" && isSafeStorageWithdrawPayload(transaction.payload));
      if (transaction.actorId !== profile.deviceToken || !supportedAction) {
        rejectedTxIds.push(transaction.txId);
        continue;
      }
      mergedClock = mergeServerClock(mergedClock, transaction.vectorClock);
      await tx.insert(gameSyncTransactions).values({
        txId: transaction.txId,
        profileId: profile.id,
        actorId: transaction.actorId,
        actionType: transaction.actionType,
        payload: transaction.payload,
        vectorClock: transaction.vectorClock,
      });
      acceptedTxIds.push(transaction.txId);
    }
    const serverClock = incrementServerClock(mergedClock);
    await tx.update(gameProfiles).set({
      vectorClock: serverClock,
      syncVersion: profile.syncVersion + (acceptedTxIds.length > 0 ? 1 : 0),
    }).where(eq(gameProfiles.id, profile.id));
    mergedClock = serverClock;
  });

  return {
    acceptedTxIds: acceptedTxIds.concat(duplicateTxIds),
    rejectedTxIds,
    serverClock: mergedClock,
    syncVersion: profile.syncVersion + (acceptedTxIds.length > 0 ? 1 : 0),
  };
}

export async function recordIntegrityLog(input: {
  playerId: string;
  severity: "info" | "warning" | "blocked";
  code: string;
  details: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const profile = await getGameProfileByPlayerId(input.playerId);
  if (!profile) return undefined;
  await db.insert(gameIntegrityLogs).values({
    profileId: profile.id,
    severity: input.severity,
    code: input.code,
    details: input.details,
  });
  return { success: true } as const;
}
