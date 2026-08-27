import { and, desc, eq } from "drizzle-orm";
import {
  creatorArtifactReviewEvents,
  creatorArtifacts,
  type CreatorArtifact,
  type CreatorArtifactReviewEvent,
} from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { transitionCreatorDomainArtifactReview, type CreatorArtifactReviewAction, type CreatorArtifactReviewStatus } from "./creatorDomainArtifactReview";
import type { TexturePackOutput } from "./generators/texturePackBuilder";

export type CreatorArtifactAssetRef = {
  assetId: string;
  relativePath: string;
  sha256: string;
  mime: "image/png";
  storageKey?: string;
  url?: string;
};

export type CreatorArtifactMetadata = {
  artifactKey: string;
  kind: "texture-pack";
  packId: string;
  packVersion: string;
  packSha256: string;
  manifest: TexturePackOutput["manifest"];
  assets: Record<string, CreatorArtifactAssetRef>;
  provenance: {
    schemaVersion: "a-survival.creator-artifact.v1";
    generatorId: "texture.pack";
    generatorVersion: "1.0.0";
    sources: string[];
    provenanceRefs: string[];
    usage: "developer-registry-only; not automatically imported by playable runtime";
  };
};

export class CreatorArtifactRegistryUnavailableError extends Error {
  constructor() {
    super("Creator artifact registry requires DATABASE_URL and configured object storage");
    this.name = "CreatorArtifactRegistryUnavailableError";
  }
}

function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

export function makeCreatorArtifactKey(output: TexturePackOutput) {
  return `texture-pack:${output.manifest.id}:${output.manifest.version}:${output.manifest.packSha256}`;
}

export function buildCreatorArtifactMetadata(output: TexturePackOutput): CreatorArtifactMetadata {
  const assets = Object.fromEntries(output.assets.map(asset => [asset.assetId, {
    assetId: asset.assetId,
    relativePath: asset.relativePath,
    sha256: asset.sha256,
    mime: asset.mime,
  } satisfies CreatorArtifactAssetRef]));
  return {
    artifactKey: makeCreatorArtifactKey(output),
    kind: "texture-pack",
    packId: output.manifest.id,
    packVersion: output.manifest.version,
    packSha256: output.manifest.packSha256,
    manifest: output.manifest,
    assets,
    provenance: {
      schemaVersion: "a-survival.creator-artifact.v1",
      generatorId: "texture.pack",
      generatorVersion: "1.0.0",
      sources: uniqueSorted(output.assets.map(asset => asset.source)),
      provenanceRefs: uniqueSorted(output.assets.map(asset => asset.provenanceRef)),
      usage: "developer-registry-only; not automatically imported by playable runtime",
    },
  };
}

export async function registerTexturePackArtifact(input: {
  output: TexturePackOutput;
  createdByUserId: number;
}): Promise<CreatorArtifact> {
  const db = await getDb();
  if (!db) throw new CreatorArtifactRegistryUnavailableError();

  const metadata = buildCreatorArtifactMetadata(input.output);
  const existing = await db.select().from(creatorArtifacts).where(eq(creatorArtifacts.artifactKey, metadata.artifactKey)).limit(1);
  if (existing[0]) return existing[0];

  const uploadedAssets: Record<string, CreatorArtifactAssetRef> = {};
  const storagePrefix = `creator-artifacts/${metadata.packId}/${metadata.packVersion}/${metadata.packSha256.slice(0, 16)}`;
  for (const asset of input.output.assets) {
    const stored = await storagePut(`${storagePrefix}/${asset.relativePath}`, Buffer.from(asset.pngBase64, "base64"), asset.mime);
    uploadedAssets[asset.assetId] = {
      ...metadata.assets[asset.assetId]!,
      storageKey: stored.key,
      url: stored.url,
    };
  }

  await db.insert(creatorArtifacts).values({
    artifactKey: metadata.artifactKey,
    kind: metadata.kind,
    packId: metadata.packId,
    packVersion: metadata.packVersion,
    packSha256: metadata.packSha256,
    manifest: metadata.manifest as unknown as Record<string, unknown>,
    assets: uploadedAssets,
    provenance: metadata.provenance,
    createdByUserId: input.createdByUserId,
  });

  const saved = await db.select().from(creatorArtifacts).where(eq(creatorArtifacts.artifactKey, metadata.artifactKey)).limit(1);
  if (!saved[0]) throw new Error("Creator artifact was not readable after registration");
  return saved[0];
}

export async function reviewTexturePackArtifact(input: {
  artifactKey: string;
  action: CreatorArtifactReviewAction;
  note?: string;
  reviewedByUserId: number;
}): Promise<CreatorArtifact> {
  const db = await getDb();
  if (!db) throw new CreatorArtifactRegistryUnavailableError();

  return db.transaction(async tx => {
    const existing = await tx.select().from(creatorArtifacts).where(eq(creatorArtifacts.artifactKey, input.artifactKey)).limit(1);
    const current = existing[0];
    if (!current) throw new Error("Creator artifact was not found");
    const transition = transitionCreatorDomainArtifactReview({
      status: current.reviewStatus as CreatorArtifactReviewStatus,
      action: input.action,
      note: input.note,
    });
    const reviewedAt = new Date();
    await tx.update(creatorArtifacts).set({
      reviewStatus: transition.to,
      reviewNote: transition.note,
      reviewedByUserId: input.reviewedByUserId,
      reviewedAt,
    }).where(and(
      eq(creatorArtifacts.artifactKey, input.artifactKey),
      eq(creatorArtifacts.reviewStatus, transition.from),
    ));
    const savedRows = await tx.select().from(creatorArtifacts).where(eq(creatorArtifacts.artifactKey, input.artifactKey)).limit(1);
    const saved = savedRows[0];
    if (!saved) throw new Error("Creator artifact was not readable after review");
    if (saved.reviewStatus !== transition.to || saved.reviewedByUserId !== input.reviewedByUserId) throw new Error("Creator artifact review was changed concurrently");
    await tx.insert(creatorArtifactReviewEvents).values({
      artifactRecordId: saved.id,
      artifactKey: saved.artifactKey,
      action: transition.action,
      fromStatus: transition.from,
      toStatus: transition.to,
      note: transition.note,
      reviewerUserId: input.reviewedByUserId,
    });
    return saved;
  });
}

export async function listCreatorArtifactReviewEvents(input: { artifactKey: string; limit?: number }): Promise<CreatorArtifactReviewEvent[]> {
  const db = await getDb();
  if (!db) throw new CreatorArtifactRegistryUnavailableError();
  return db.select().from(creatorArtifactReviewEvents)
    .where(eq(creatorArtifactReviewEvents.artifactKey, input.artifactKey))
    .orderBy(desc(creatorArtifactReviewEvents.createdAt))
    .limit(Math.max(1, Math.min(100, Math.trunc(input.limit ?? 50))));
}

export async function listCreatorArtifacts(input: number | { limit?: number; reviewStatus?: CreatorArtifactReviewStatus } = 50): Promise<CreatorArtifact[]> {
  const db = await getDb();
  if (!db) throw new CreatorArtifactRegistryUnavailableError();
  const options = typeof input === "number" ? { limit: input } : input;
  const limit = Math.max(1, Math.min(100, Math.trunc(options.limit ?? 50)));
  const statusFilter = options.reviewStatus ? eq(creatorArtifacts.reviewStatus, options.reviewStatus) : undefined;
  if (statusFilter) return db.select().from(creatorArtifacts).where(statusFilter).orderBy(desc(creatorArtifacts.createdAt)).limit(limit);
  return db.select().from(creatorArtifacts).orderBy(desc(creatorArtifacts.createdAt)).limit(limit);
}
