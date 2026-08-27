import type { CreatorArtifactMetadata } from "../creatorArtifactRegistry";
import { hashStableJson } from "./commonGeneratorApi";

export const CREATOR_PUBLICATION_APPROVAL_VERSION = "1.0.0" as const;
export const CREATOR_PUBLICATION_APPROVAL_RULES_VERSION = "creator-publication-approval-rules.v1" as const;
export const CREATOR_ARTIFACT_USAGE = "developer-registry-only; not automatically imported by playable runtime" as const;

export type CreatorPublicationApprovalInput = {
  artifact: Pick<CreatorArtifactMetadata, "artifactKey" | "kind" | "packId" | "packVersion" | "packSha256" | "manifest" | "assets" | "provenance">;
  reviewStatus: "draft" | "approved" | "rejected";
  rulesVersion?: string;
};

export type CreatorPublicationApprovalIssueCode =
  | "ARTIFACT_KEY_MISMATCH"
  | "UNSUPPORTED_ARTIFACT_KIND"
  | "MANIFEST_ID_MISMATCH"
  | "MANIFEST_VERSION_MISMATCH"
  | "PACK_HASH_MISSING"
  | "PACK_HASH_MISMATCH"
  | "ASSET_SET_MISMATCH"
  | "ASSET_PATH_MISMATCH"
  | "ASSET_HASH_MISMATCH"
  | "ASSET_PROVENANCE_MISSING"
  | "PROVENANCE_SCHEMA_MISMATCH"
  | "PROVENANCE_GENERATOR_MISMATCH"
  | "PROVENANCE_USAGE_MISMATCH"
  | "PROVENANCE_SOURCES_MISSING"
  | "PROVENANCE_REFS_MISSING"
  | "REVIEW_NOT_APPROVED";

export type CreatorPublicationApprovalIssue = {
  code: CreatorPublicationApprovalIssueCode;
  recordId: string;
  detail: string;
};

export type CreatorPublicationApprovalOutput = {
  artifact: {
    generatorId: "creator.publication-approval";
    generatorVersion: typeof CREATOR_PUBLICATION_APPROVAL_VERSION;
    rulesVersion: typeof CREATOR_PUBLICATION_APPROVAL_RULES_VERSION;
    contentHash: string;
    artifactKey: string;
    assetCount: number;
  };
  summary: {
    valid: boolean;
    reviewStatus: CreatorPublicationApprovalInput["reviewStatus"];
    assetCount: number;
    issueCounts: Record<CreatorPublicationApprovalIssueCode, number>;
  };
  issues: CreatorPublicationApprovalIssue[];
  runtimePolicy: {
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    databaseWrite: false;
    storageWrite: false;
  };
};

const ISSUE_CODES: CreatorPublicationApprovalIssueCode[] = [
  "ARTIFACT_KEY_MISMATCH",
  "UNSUPPORTED_ARTIFACT_KIND",
  "MANIFEST_ID_MISMATCH",
  "MANIFEST_VERSION_MISMATCH",
  "PACK_HASH_MISSING",
  "PACK_HASH_MISMATCH",
  "ASSET_SET_MISMATCH",
  "ASSET_PATH_MISMATCH",
  "ASSET_HASH_MISMATCH",
  "ASSET_PROVENANCE_MISSING",
  "PROVENANCE_SCHEMA_MISMATCH",
  "PROVENANCE_GENERATOR_MISMATCH",
  "PROVENANCE_USAGE_MISMATCH",
  "PROVENANCE_SOURCES_MISSING",
  "PROVENANCE_REFS_MISSING",
  "REVIEW_NOT_APPROVED",
];

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function emptyIssueCounts(): Record<CreatorPublicationApprovalIssueCode, number> {
  return Object.fromEntries(ISSUE_CODES.map(code => [code, 0])) as Record<CreatorPublicationApprovalIssueCode, number>;
}

function addIssue(issues: CreatorPublicationApprovalIssue[], issue: CreatorPublicationApprovalIssue) {
  if (!issues.some(existing => existing.code === issue.code && existing.recordId === issue.recordId && existing.detail === issue.detail)) issues.push(issue);
}

function expectedArtifactKey(artifact: CreatorPublicationApprovalInput["artifact"]) {
  return `texture-pack:${artifact.packId}:${artifact.packVersion}:${artifact.packSha256}`;
}

function manifestHash(manifest: CreatorPublicationApprovalInput["artifact"]["manifest"]) {
  const { packSha256: _packSha256, ...manifestWithoutHash } = manifest;
  return hashStableJson(manifestWithoutHash as never);
}

export function auditCreatorPublicationApproval(input: CreatorPublicationApprovalInput): CreatorPublicationApprovalOutput {
  const rulesVersion = input.rulesVersion ?? CREATOR_PUBLICATION_APPROVAL_RULES_VERSION;
  if (rulesVersion !== CREATOR_PUBLICATION_APPROVAL_RULES_VERSION) throw new Error(`Unsupported creator publication approval rules version: ${rulesVersion}`);
  const issues: CreatorPublicationApprovalIssue[] = [];
  const issueCounts = emptyIssueCounts();
  const artifact = input.artifact;
  const assetIds = Object.keys(artifact.assets).sort(compareStrings);
  const manifestIds = Object.keys(artifact.manifest.entries).sort(compareStrings);
  if (artifact.artifactKey !== expectedArtifactKey(artifact)) addIssue(issues, { code: "ARTIFACT_KEY_MISMATCH", recordId: "artifact", detail: `Artifact key must be ${expectedArtifactKey(artifact)}` });
  if (artifact.kind !== "texture-pack") addIssue(issues, { code: "UNSUPPORTED_ARTIFACT_KIND", recordId: "artifact", detail: `Only texture-pack artifacts are approval-compatible, found ${artifact.kind}` });
  if (artifact.manifest.id !== artifact.packId) addIssue(issues, { code: "MANIFEST_ID_MISMATCH", recordId: "manifest", detail: `Manifest id ${artifact.manifest.id} does not match pack id ${artifact.packId}` });
  if (artifact.manifest.version !== artifact.packVersion) addIssue(issues, { code: "MANIFEST_VERSION_MISMATCH", recordId: "manifest", detail: `Manifest version ${artifact.manifest.version} does not match pack version ${artifact.packVersion}` });
  if (!artifact.packSha256) addIssue(issues, { code: "PACK_HASH_MISSING", recordId: "manifest", detail: "Creator artifact requires a pack SHA-256" });
  else if (artifact.packSha256 !== manifestHash(artifact.manifest) || artifact.manifest.packSha256 !== artifact.packSha256) addIssue(issues, { code: "PACK_HASH_MISMATCH", recordId: "manifest", detail: "Pack hash does not match the ordered manifest contents" });
  if (assetIds.join("\u0000") !== manifestIds.join("\u0000")) addIssue(issues, { code: "ASSET_SET_MISMATCH", recordId: "assets", detail: "Creator artifact assets and manifest entries must have the same exact asset IDs" });
  for (const assetId of assetIds) {
    const asset = artifact.assets[assetId]!;
    const entry = artifact.manifest.entries[assetId];
    if (!entry) continue;
    if (asset.relativePath !== entry.path) addIssue(issues, { code: "ASSET_PATH_MISMATCH", recordId: assetId, detail: `Asset path ${asset.relativePath} does not match manifest path ${entry.path}` });
    if (asset.sha256 !== entry.sha256) addIssue(issues, { code: "ASSET_HASH_MISMATCH", recordId: assetId, detail: "Asset SHA-256 does not match the manifest entry" });
    if (!entry.source || !entry.provenanceRef) addIssue(issues, { code: "ASSET_PROVENANCE_MISSING", recordId: assetId, detail: "Manifest entry requires source and provenanceRef before approval" });
  }
  if (artifact.provenance.schemaVersion !== "a-survival.creator-artifact.v1") addIssue(issues, { code: "PROVENANCE_SCHEMA_MISMATCH", recordId: "provenance", detail: "Creator artifact provenance schema is unsupported" });
  if (artifact.provenance.generatorId !== "texture.pack") addIssue(issues, { code: "PROVENANCE_GENERATOR_MISMATCH", recordId: "provenance", detail: "Creator artifact provenance must come from texture.pack" });
  if (artifact.provenance.usage !== CREATOR_ARTIFACT_USAGE) addIssue(issues, { code: "PROVENANCE_USAGE_MISMATCH", recordId: "provenance", detail: "Creator artifact must remain developer-registry-only and not be automatically imported by playable runtime" });
  if (artifact.provenance.sources.length === 0) addIssue(issues, { code: "PROVENANCE_SOURCES_MISSING", recordId: "provenance", detail: "Creator artifact provenance requires at least one source" });
  if (artifact.provenance.provenanceRefs.length === 0) addIssue(issues, { code: "PROVENANCE_REFS_MISSING", recordId: "provenance", detail: "Creator artifact provenance requires at least one provenance reference" });
  if (input.reviewStatus !== "approved") addIssue(issues, { code: "REVIEW_NOT_APPROVED", recordId: "review", detail: `Creator artifact review status must be approved, found ${input.reviewStatus}` });
  const sortedIssues = issues.sort((left, right) => compareStrings(left.code, right.code) || compareStrings(left.recordId, right.recordId) || compareStrings(left.detail, right.detail));
  for (const issue of sortedIssues) issueCounts[issue.code] += 1;
  const contentHash = hashStableJson({ rulesVersion, artifact, reviewStatus: input.reviewStatus, issues: sortedIssues } as never);
  return {
    artifact: {
      generatorId: "creator.publication-approval",
      generatorVersion: CREATOR_PUBLICATION_APPROVAL_VERSION,
      rulesVersion: CREATOR_PUBLICATION_APPROVAL_RULES_VERSION,
      contentHash,
      artifactKey: artifact.artifactKey,
      assetCount: assetIds.length,
    },
    summary: { valid: sortedIssues.length === 0, reviewStatus: input.reviewStatus, assetCount: assetIds.length, issueCounts },
    issues: sortedIssues,
    runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false, databaseWrite: false, storageWrite: false },
  };
}
