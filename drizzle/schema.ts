import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core Manus user table retained for project administration only. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "gm", "admin", "master"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Immutable server-side audit trail for Master authority changes. */
export const authorityAuditEvents = mysqlTable("authorityAuditEvents", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull().references(() => users.id),
  targetUserId: int("targetUserId").notNull().references(() => users.id),
  action: mysqlEnum("action", ["grant", "revoke"]).notNull(),
  fromRole: mysqlEnum("fromRole", ["user", "gm", "admin"]).notNull(),
  toRole: mysqlEnum("toRole", ["user", "gm", "admin"]).notNull(),
  reason: varchar("reason", { length: 512 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("authorityAuditEvents_actorUserId_idx").on(table.actorUserId),
  index("authorityAuditEvents_targetUserId_idx").on(table.targetUserId),
  index("authorityAuditEvents_createdAt_idx").on(table.createdAt),
]);

export type AuthorityAuditEvent = typeof authorityAuditEvents.$inferSelect;

/** Master-created email-bound invitation; acceptance remains server-reviewed because OAuth verification is not exposed here. */
export const authorityInvitations = mysqlTable("authorityInvitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  requestedRole: mysqlEnum("requestedRole", ["gm", "admin"]).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"]).default("pending").notNull(),
  invitedByUserId: int("invitedByUserId").notNull().references(() => users.id),
  acceptedUserId: int("acceptedUserId").references(() => users.id),
  note: varchar("note", { length: 512 }),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("authorityInvitations_email_idx").on(table.email),
  index("authorityInvitations_status_idx").on(table.status),
  index("authorityInvitations_createdAt_idx").on(table.createdAt),
]);

export type AuthorityInvitation = typeof authorityInvitations.$inferSelect;

/** Password-free player identity used by the game client. */
export const gameProfiles = mysqlTable("gameProfiles", {
  id: int("id").autoincrement().primaryKey(),
  playerId: varchar("playerId", { length: 24 }).notNull().unique(),
  deviceToken: varchar("deviceToken", { length: 96 }).notNull(),
  displayName: varchar("displayName", { length: 48 }).notNull(),
  health: int("health").notNull().default(100),
  currency: int("currency").notNull().default(0),
  lastMapId: varchar("lastMapId", { length: 128 }).notNull().default("obsidian-frontier"),
  syncVersion: int("syncVersion").notNull().default(1),
  vectorClock: json("vectorClock").$type<Record<string, number>>(),
  lastClientSaveAt: timestamp("lastClientSaveAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("gameProfiles_deviceToken_idx").on(table.deviceToken)]);

export type GameProfile = typeof gameProfiles.$inferSelect;

/** Offline-first snapshot; bytes remain in browser/S3, while this stores validated game state only. */
export const gameSaves = mysqlTable("gameSaves", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => gameProfiles.id, { onDelete: "cascade" }).unique(),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  checksum: varchar("checksum", { length: 128 }).notNull(),
  clientUpdatedAt: timestamp("clientUpdatedAt").notNull(),
  serverValidatedAt: timestamp("serverValidatedAt").defaultNow().notNull(),
});

export type GameSave = typeof gameSaves.$inferSelect;

/** Idempotency record for offline transaction envelopes accepted by batch sync. */
export const gameSyncTransactions = mysqlTable("gameSyncTransactions", {
  id: int("id").autoincrement().primaryKey(),
  txId: varchar("txId", { length: 96 }).notNull().unique(),
  profileId: int("profileId").notNull().references(() => gameProfiles.id, { onDelete: "cascade" }),
  actorId: varchar("actorId", { length: 96 }).notNull(),
  actionType: varchar("actionType", { length: 96 }).notNull(),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  vectorClock: json("vectorClock").$type<Record<string, number>>().notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
}, table => [index("gameSyncTransactions_profileId_idx").on(table.profileId)]);

export type GameSyncTransaction = typeof gameSyncTransactions.$inferSelect;

/** Each equippable item stays a separate instance and therefore cannot stack in one slot. */
export const gameItemInstances = mysqlTable("gameItemInstances", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => gameProfiles.id, { onDelete: "cascade" }),
  instanceId: varchar("instanceId", { length: 96 }).notNull().unique(),
  definitionId: varchar("definitionId", { length: 96 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  enhancement: int("enhancement").notNull().default(0),
  tier: varchar("tier", { length: 24 }).notNull(),
  quarantined: int("quarantined").notNull().default(0),
  acquiredAt: timestamp("acquiredAt").defaultNow().notNull(),
}, table => [index("gameItemInstances_profileId_idx").on(table.profileId)]);

export type GameItemInstance = typeof gameItemInstances.$inferSelect;

/** Immutable source trail for every item-producing action. */
export const itemProvenance = mysqlTable("itemProvenance", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => gameProfiles.id, { onDelete: "cascade" }),
  itemInstanceId: varchar("itemInstanceId", { length: 96 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["drop", "craft", "harvest", "reward", "starter"]).notNull(),
  sourceRef: varchar("sourceRef", { length: 128 }).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, table => [
  index("itemProvenance_profileId_idx").on(table.profileId),
  index("itemProvenance_instanceId_idx").on(table.itemInstanceId),
]);

/** Audit trail for invalid inventory shapes, unverifiable provenance, and sync conflicts. */
export const gameIntegrityLogs = mysqlTable("gameIntegrityLogs", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => gameProfiles.id, { onDelete: "cascade" }),
  severity: mysqlEnum("severity", ["info", "warning", "blocked"]).notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  details: json("details").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("gameIntegrityLogs_profileId_idx").on(table.profileId)]);

export type GameIntegrityLog = typeof gameIntegrityLogs.$inferSelect;

/** Admin-only registry for Builder outputs; image bytes live in object storage, not in the database. */
export const creatorArtifacts = mysqlTable("creatorArtifacts", {
  id: int("id").autoincrement().primaryKey(),
  artifactKey: varchar("artifactKey", { length: 191 }).notNull().unique(),
  kind: mysqlEnum("kind", ["texture-pack"]).notNull(),
  packId: varchar("packId", { length: 128 }).notNull(),
  packVersion: varchar("packVersion", { length: 32 }).notNull(),
  packSha256: varchar("packSha256", { length: 64 }).notNull(),
  manifest: json("manifest").$type<Record<string, unknown>>().notNull(),
  assets: json("assets").$type<Record<string, unknown>>().notNull(),
  provenance: json("provenance").$type<Record<string, unknown>>().notNull(),
  reviewStatus: mysqlEnum("reviewStatus", ["draft", "approved", "rejected"]).default("draft").notNull(),
  reviewNote: varchar("reviewNote", { length: 512 }),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("creatorArtifacts_packId_idx").on(table.packId),
  index("creatorArtifacts_createdByUserId_idx").on(table.createdByUserId),
  index("creatorArtifacts_reviewStatus_idx").on(table.reviewStatus),
]);

export type CreatorArtifact = typeof creatorArtifacts.$inferSelect;

/** Immutable admin audit events for texture-pack artifact review transitions. */
export const creatorArtifactReviewEvents = mysqlTable("creatorArtifactReviewEvents", {
  id: int("id").autoincrement().primaryKey(),
  artifactRecordId: int("artifactRecordId").notNull().references(() => creatorArtifacts.id),
  artifactKey: varchar("artifactKey", { length: 191 }).notNull(),
  action: mysqlEnum("action", ["approve", "reject", "reopen"]).notNull(),
  fromStatus: mysqlEnum("fromStatus", ["draft", "approved", "rejected"]).notNull(),
  toStatus: mysqlEnum("toStatus", ["draft", "approved", "rejected"]).notNull(),
  note: varchar("note", { length: 512 }),
  reviewerUserId: int("reviewerUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("creatorArtifactReviewEvents_artifactRecordId_idx").on(table.artifactRecordId),
  index("creatorArtifactReviewEvents_artifactKey_idx").on(table.artifactKey),
  index("creatorArtifactReviewEvents_reviewerUserId_idx").on(table.reviewerUserId),
  index("creatorArtifactReviewEvents_createdAt_idx").on(table.createdAt),
]);

export type CreatorArtifactReviewEvent = typeof creatorArtifactReviewEvents.$inferSelect;

/** Admin-only metadata registry for non-texture Builder previews; runtime import remains explicitly disabled. */
export const creatorDomainArtifacts = mysqlTable("creatorDomainArtifacts", {
  id: int("id").autoincrement().primaryKey(),
  artifactKey: varchar("artifactKey", { length: 191 }).notNull().unique(),
  domain: mysqlEnum("domain", ["world", "block", "structure", "item", "weapon", "animation", "quest", "profiler"]).notNull(),
  artifactId: varchar("artifactId", { length: 128 }).notNull(),
  artifactVersion: varchar("artifactVersion", { length: 32 }).notNull(),
  generatorId: varchar("generatorId", { length: 128 }).notNull(),
  generatorVersion: varchar("generatorVersion", { length: 32 }).notNull(),
  contentSha256: varchar("contentSha256", { length: 64 }).notNull(),
  manifest: json("manifest").$type<Record<string, unknown>>().notNull(),
  summary: json("summary").$type<Record<string, unknown>>().notNull(),
  provenance: json("provenance").$type<Record<string, unknown>>().notNull(),
  runtimePolicy: json("runtimePolicy").$type<Record<string, unknown>>().notNull(),
  reviewStatus: mysqlEnum("reviewStatus", ["draft", "approved", "rejected"]).default("draft").notNull(),
  reviewNote: varchar("reviewNote", { length: 512 }),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("creatorDomainArtifacts_domain_idx").on(table.domain),
  index("creatorDomainArtifacts_createdByUserId_idx").on(table.createdByUserId),
  index("creatorDomainArtifacts_reviewStatus_idx").on(table.reviewStatus),
  index("creatorDomainArtifacts_createdAt_idx").on(table.createdAt),
]);

export type CreatorDomainArtifact = typeof creatorDomainArtifacts.$inferSelect;

/** Immutable admin audit events for creator domain artifact review transitions. */
export const creatorDomainArtifactReviewEvents = mysqlTable("creatorDomainArtifactReviewEvents", {
  id: int("id").autoincrement().primaryKey(),
  artifactRecordId: int("artifactRecordId").notNull().references(() => creatorDomainArtifacts.id),
  artifactKey: varchar("artifactKey", { length: 191 }).notNull(),
  action: mysqlEnum("action", ["approve", "reject", "reopen"]).notNull(),
  fromStatus: mysqlEnum("fromStatus", ["draft", "approved", "rejected"]).notNull(),
  toStatus: mysqlEnum("toStatus", ["draft", "approved", "rejected"]).notNull(),
  note: varchar("note", { length: 512 }),
  reviewerUserId: int("reviewerUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("creatorDomainArtifactReviewEvents_artifactRecordId_idx").on(table.artifactRecordId),
  index("creatorDomainArtifactReviewEvents_artifactKey_idx").on(table.artifactKey),
  index("creatorDomainArtifactReviewEvents_reviewerUserId_idx").on(table.reviewerUserId),
  index("creatorDomainArtifactReviewEvents_createdAt_idx").on(table.createdAt),
]);

export type CreatorDomainArtifactReviewEvent = typeof creatorDomainArtifactReviewEvents.$inferSelect;
