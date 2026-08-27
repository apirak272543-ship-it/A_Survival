import type { CreatorDomainArtifact } from "../drizzle/schema";

export const PLAYABLE_RUNTIME_MAP_ID = "obsidian-frontier";
export const CREATOR_DOMAIN_ARTIFACT_COMPATIBILITY_VERSION = "0.1.0";

export type CreatorArtifactCompatibilityReasonCode =
  | "FUTURE_MAP_NOT_ALLOWED"
  | "REVIEW_NOT_APPROVED"
  | "REVIEW_AUDIT_MISSING"
  | "RUNTIME_POLICY_ENABLED"
  | "CONTENT_HASH_INVALID"
  | "PROVENANCE_MISSING"
  | "BINARY_PAYLOAD_PRESENT";

export type CreatorArtifactCompatibilityResult = {
  previewOnly: true;
  validatorVersion: string;
  targetMapId: string;
  artifactKey: string;
  decision: "reviewable" | "blocked";
  publishReady: false;
  runtimeImportAllowed: false;
  reasons: Array<{ code: CreatorArtifactCompatibilityReasonCode; detail: string }>;
};

function containsBinaryPayload(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsBinaryPayload);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => ["base64", "pngBase64", "bytes", "dataUri"].includes(key) || containsBinaryPayload(nested));
}

export function validateCreatorDomainArtifactCompatibility(input: { artifact: CreatorDomainArtifact; targetMapId: string }): CreatorArtifactCompatibilityResult {
  const { artifact, targetMapId } = input;
  const reasons: CreatorArtifactCompatibilityResult["reasons"] = [];
  if (targetMapId !== PLAYABLE_RUNTIME_MAP_ID) reasons.push({ code: "FUTURE_MAP_NOT_ALLOWED", detail: `Only ${PLAYABLE_RUNTIME_MAP_ID} is playable; target ${targetMapId} is not runtime-eligible` });
  if (artifact.reviewStatus !== "approved") reasons.push({ code: "REVIEW_NOT_APPROVED", detail: `Artifact review status is ${artifact.reviewStatus}` });
  if (!artifact.reviewedByUserId || !artifact.reviewedAt) reasons.push({ code: "REVIEW_AUDIT_MISSING", detail: "Approved runtime candidates require reviewer identity and timestamp" });
  const runtimePolicy = artifact.runtimePolicy as Partial<{ runtimeImportAllowed: boolean; playerVisible: boolean; cacheable: boolean }>;
  if (runtimePolicy.runtimeImportAllowed !== false || runtimePolicy.playerVisible !== false || runtimePolicy.cacheable !== false) reasons.push({ code: "RUNTIME_POLICY_ENABLED", detail: "Runtime import, player visibility and caching must remain disabled until an explicit publish workflow exists" });
  if (!/^[a-f0-9]{64}$/.test(artifact.contentSha256)) reasons.push({ code: "CONTENT_HASH_INVALID", detail: "contentSha256 must be a 64-character lowercase SHA-256 value" });
  const provenance = artifact.provenance as { schemaVersion?: unknown; generatorId?: unknown; generatorVersion?: unknown; sources?: unknown; provenanceRefs?: unknown };
  if (typeof provenance.schemaVersion !== "string" || typeof provenance.generatorId !== "string" || typeof provenance.generatorVersion !== "string" || !Array.isArray(provenance.sources) || provenance.sources.length === 0 || !Array.isArray(provenance.provenanceRefs) || provenance.provenanceRefs.length === 0) reasons.push({ code: "PROVENANCE_MISSING", detail: "generator identity, source and provenance references are required" });
  if (containsBinaryPayload(artifact.manifest) || containsBinaryPayload(artifact.summary) || containsBinaryPayload(artifact.provenance)) reasons.push({ code: "BINARY_PAYLOAD_PRESENT", detail: "Compatibility preview accepts metadata only; binary payload fields are not allowed" });
  return {
    previewOnly: true,
    validatorVersion: CREATOR_DOMAIN_ARTIFACT_COMPATIBILITY_VERSION,
    targetMapId,
    artifactKey: artifact.artifactKey,
    decision: reasons.length === 0 ? "reviewable" : "blocked",
    publishReady: false,
    runtimeImportAllowed: false,
    reasons,
  };
}
