import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { creatorDomainArtifactReviewEvents, creatorDomainArtifacts, type CreatorDomainArtifact, type CreatorDomainArtifactReviewEvent } from "../drizzle/schema";
import { getDb } from "./db";
import { buildCreatorDomainArtifactExport, type CreatorDomainArtifactExport } from "./creatorDomainArtifactExport";
import { transitionCreatorDomainArtifactReview, type CreatorArtifactReviewAction, type CreatorArtifactReviewStatus } from "./creatorDomainArtifactReview";
export class CreatorDomainArtifactRegistryUnavailableError extends Error {
  constructor() {
    super("Creator domain artifact registry requires DATABASE_URL");
    this.name = "CreatorDomainArtifactRegistryUnavailableError";
  }
}

export const CREATOR_DOMAIN_ARTIFACT_SCHEMA = "a-survival.creator-domain-artifact.v1";

export type CreatorArtifactDomain = "world" | "block" | "structure" | "item" | "weapon" | "animation" | "quest" | "profiler";

export type CreatorDomainArtifactInput = {
  domain: CreatorArtifactDomain;
  artifactId: string;
  artifactVersion: string;
  generatorId: string;
  generatorVersion: string;
  manifest: Record<string, unknown>;
  summary: Record<string, unknown>;
  sources: string[];
  provenanceRefs: string[];
};

export type CreatorDomainArtifactMetadata = {
  artifactKey: string;
  domain: CreatorArtifactDomain;
  artifactId: string;
  artifactVersion: string;
  generatorId: string;
  generatorVersion: string;
  contentSha256: string;
  manifest: Record<string, unknown>;
  summary: Record<string, unknown>;
  provenance: {
    schemaVersion: typeof CREATOR_DOMAIN_ARTIFACT_SCHEMA;
    generatorId: string;
    generatorVersion: string;
    sources: string[];
    provenanceRefs: string[];
    usage: "developer-registry-only; not automatically imported by playable runtime";
  };
  runtimePolicy: {
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
};

function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, canonicalize(nested)]));
}

function containsBinaryPayload(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsBinaryPayload);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => ["base64", "pngBase64", "bytes", "dataUri"].includes(key) || containsBinaryPayload(nested));
}

function hashContent(input: Omit<CreatorDomainArtifactMetadata, "contentSha256" | "artifactKey">) {
  return createHash("sha256").update(JSON.stringify(canonicalize(input))).digest("hex");
}

export function makeCreatorDomainArtifactKey(input: Pick<CreatorDomainArtifactMetadata, "domain" | "artifactId" | "artifactVersion" | "contentSha256">) {
  return `${input.domain}:${input.artifactId}:${input.artifactVersion}:${input.contentSha256}`;
}

export function buildCreatorDomainArtifactMetadata(input: CreatorDomainArtifactInput): CreatorDomainArtifactMetadata {
  if (containsBinaryPayload(input.manifest) || containsBinaryPayload(input.summary)) throw new Error("Creator domain artifact metadata cannot contain binary payload fields");
  const manifest = canonicalize(input.manifest) as Record<string, unknown>;
  const summary = canonicalize(input.summary) as Record<string, unknown>;
  const provenance: CreatorDomainArtifactMetadata["provenance"] = {
    schemaVersion: CREATOR_DOMAIN_ARTIFACT_SCHEMA,
    generatorId: input.generatorId,
    generatorVersion: input.generatorVersion,
    sources: uniqueSorted(input.sources),
    provenanceRefs: uniqueSorted(input.provenanceRefs),
    usage: "developer-registry-only; not automatically imported by playable runtime" as const,
  };
  const runtimePolicy = { runtimeImportAllowed: false as const, playerVisible: false as const, cacheable: false as const };
  const contentSha256 = hashContent({
    domain: input.domain,
    artifactId: input.artifactId,
    artifactVersion: input.artifactVersion,
    generatorId: input.generatorId,
    generatorVersion: input.generatorVersion,
    manifest,
    summary,
    provenance,
    runtimePolicy,
  });
  return {
    artifactKey: makeCreatorDomainArtifactKey({ domain: input.domain, artifactId: input.artifactId, artifactVersion: input.artifactVersion, contentSha256 }),
    domain: input.domain,
    artifactId: input.artifactId,
    artifactVersion: input.artifactVersion,
    generatorId: input.generatorId,
    generatorVersion: input.generatorVersion,
    contentSha256,
    manifest,
    summary,
    provenance,
    runtimePolicy,
  };
}

export async function registerCreatorDomainArtifact(input: { metadata: CreatorDomainArtifactMetadata; createdByUserId: number }): Promise<CreatorDomainArtifact> {
  const db = await getDb();
  if (!db) throw new CreatorDomainArtifactRegistryUnavailableError();
  const existing = await db.select().from(creatorDomainArtifacts).where(eq(creatorDomainArtifacts.artifactKey, input.metadata.artifactKey)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(creatorDomainArtifacts).values({
    artifactKey: input.metadata.artifactKey,
    domain: input.metadata.domain,
    artifactId: input.metadata.artifactId,
    artifactVersion: input.metadata.artifactVersion,
    generatorId: input.metadata.generatorId,
    generatorVersion: input.metadata.generatorVersion,
    contentSha256: input.metadata.contentSha256,
    manifest: input.metadata.manifest,
    summary: input.metadata.summary,
    provenance: input.metadata.provenance,
    runtimePolicy: input.metadata.runtimePolicy,
    createdByUserId: input.createdByUserId,
  });
  const saved = await db.select().from(creatorDomainArtifacts).where(eq(creatorDomainArtifacts.artifactKey, input.metadata.artifactKey)).limit(1);
  if (!saved[0]) throw new Error("Creator domain artifact was not readable after registration");
  return saved[0];
}

export async function reviewCreatorDomainArtifact(input: { artifactKey: string; action: CreatorArtifactReviewAction; note?: string; reviewedByUserId: number }): Promise<CreatorDomainArtifact> {
  const db = await getDb();
  if (!db) throw new CreatorDomainArtifactRegistryUnavailableError();
  return db.transaction(async tx => {
    const existing = await tx.select().from(creatorDomainArtifacts).where(eq(creatorDomainArtifacts.artifactKey, input.artifactKey)).limit(1);
    const current = existing[0];
    if (!current) throw new Error("Creator domain artifact was not found");
    const transition = transitionCreatorDomainArtifactReview({ status: current.reviewStatus as CreatorArtifactReviewStatus, action: input.action, note: input.note });
    const reviewedAt = new Date();
    await tx.update(creatorDomainArtifacts).set({ reviewStatus: transition.to, reviewNote: transition.note, reviewedByUserId: input.reviewedByUserId, reviewedAt }).where(and(eq(creatorDomainArtifacts.artifactKey, input.artifactKey), eq(creatorDomainArtifacts.reviewStatus, transition.from)));
    const savedRows = await tx.select().from(creatorDomainArtifacts).where(eq(creatorDomainArtifacts.artifactKey, input.artifactKey)).limit(1);
    const saved = savedRows[0];
    if (!saved) throw new Error("Creator domain artifact was not readable after review");
    if (saved.reviewStatus !== transition.to || saved.reviewedByUserId !== input.reviewedByUserId) throw new Error("Creator domain artifact review was changed concurrently");
    await tx.insert(creatorDomainArtifactReviewEvents).values({ artifactRecordId: saved.id, artifactKey: saved.artifactKey, action: transition.action, fromStatus: transition.from, toStatus: transition.to, note: transition.note, reviewerUserId: input.reviewedByUserId });
    return saved;
  });
}

export async function getCreatorDomainArtifact(input: { artifactKey: string }): Promise<CreatorDomainArtifact> {
  const db = await getDb();
  if (!db) throw new CreatorDomainArtifactRegistryUnavailableError();
  const rows = await db.select().from(creatorDomainArtifacts).where(eq(creatorDomainArtifacts.artifactKey, input.artifactKey)).limit(1);
  const artifact = rows[0];
  if (!artifact) throw new Error("Creator domain artifact was not found");
  return artifact;
}

export async function exportCreatorDomainArtifact(input: { artifactKey: string }): Promise<CreatorDomainArtifactExport> {
  return buildCreatorDomainArtifactExport(await getCreatorDomainArtifact(input));
}

export async function listCreatorDomainArtifactReviewEvents(input: { artifactKey: string; limit?: number }): Promise<CreatorDomainArtifactReviewEvent[]> {
  const db = await getDb();
  if (!db) throw new CreatorDomainArtifactRegistryUnavailableError();
  return db.select().from(creatorDomainArtifactReviewEvents).where(eq(creatorDomainArtifactReviewEvents.artifactKey, input.artifactKey)).orderBy(desc(creatorDomainArtifactReviewEvents.createdAt)).limit(Math.max(1, Math.min(100, Math.trunc(input.limit ?? 50))));
}

export async function listCreatorDomainArtifacts(input: { limit?: number; domain?: CreatorArtifactDomain; reviewStatus?: CreatorArtifactReviewStatus } = {}): Promise<CreatorDomainArtifact[]> {
  const db = await getDb();
  if (!db) throw new CreatorDomainArtifactRegistryUnavailableError();
  const limit = Math.max(1, Math.min(100, Math.trunc(input.limit ?? 50)));
  const filters = [input.domain ? eq(creatorDomainArtifacts.domain, input.domain) : undefined, input.reviewStatus ? eq(creatorDomainArtifacts.reviewStatus, input.reviewStatus) : undefined].filter(Boolean) as Array<ReturnType<typeof eq>>;
  if (filters.length === 2) return db.select().from(creatorDomainArtifacts).where(and(...filters)).orderBy(desc(creatorDomainArtifacts.createdAt)).limit(limit);
  if (filters.length === 1) return db.select().from(creatorDomainArtifacts).where(filters[0]!).orderBy(desc(creatorDomainArtifacts.createdAt)).limit(limit);
  return db.select().from(creatorDomainArtifacts).orderBy(desc(creatorDomainArtifacts.createdAt)).limit(limit);
}
