import { makeCreatorDomainArtifactKey, type CreatorDomainArtifactMetadata } from "./creatorDomainArtifactRegistry";

export const CREATOR_PACKAGE_VALIDATION_VERSION = "0.1.0" as const;
export const PLAYABLE_CREATOR_PACKAGE_MAP_ID = "obsidian-frontier" as const;
const MAX_METADATA_NODES = 512;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

type CreatorPackageValidationReasonCode =
  | "FUTURE_MAP_NOT_ALLOWED"
  | "ARTIFACT_KEY_MISMATCH"
  | "CONTENT_HASH_INVALID"
  | "IDENTITY_MISMATCH"
  | "PROVENANCE_MISSING"
  | "RUNTIME_POLICY_ENABLED"
  | "BINARY_PAYLOAD_PRESENT"
  | "METADATA_BOUNDS_EXCEEDED";

export type CreatorPackageValidationReason = {
  code: CreatorPackageValidationReasonCode;
  detail: string;
};

export type CreatorPackageValidationResult = {
  previewOnly: true;
  validatorVersion: typeof CREATOR_PACKAGE_VALIDATION_VERSION;
  targetMapId: string;
  artifactKey: string;
  metadataHash: string;
  decision: "reviewable" | "blocked";
  publishReady: false;
  runtimeImportAllowed: false;
  playerVisible: false;
  cacheable: false;
  reasons: CreatorPackageValidationReason[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function inspectMetadata(value: unknown, seen: Set<object>, state: { nodes: number; binary: boolean; bounded: boolean }, depth = 0) {
  if (state.nodes >= MAX_METADATA_NODES || depth > MAX_METADATA_NODES) {
    state.bounded = false;
    return;
  }
  if (Array.isArray(value)) {
    state.nodes += 1;
    if (seen.has(value)) return;
    seen.add(value);
    for (const nested of value) inspectMetadata(nested, seen, state, depth + 1);
    return;
  }
  if (!value || typeof value !== "object") return;
  const objectValue = value as Record<string, unknown>;
  if (seen.has(objectValue)) return;
  seen.add(objectValue);
  state.nodes += 1;
  for (const [key, nested] of Object.entries(objectValue)) {
    if (["base64", "pngBase64", "bytes", "dataUri"].includes(key)) state.binary = true;
    inspectMetadata(nested, seen, state, depth + 1);
  }
}

function metadataHasBinaryOrExceedsBounds(value: unknown) {
  const state = { nodes: 0, binary: false, bounded: true };
  inspectMetadata(value, new Set<object>(), state);
  return state;
}

function pushReason(reasons: CreatorPackageValidationReason[], code: CreatorPackageValidationReasonCode, detail: string) {
  reasons.push({ code, detail });
}

export function validateCreatorPackageMetadata(input: { artifact: CreatorDomainArtifactMetadata; targetMapId: string }): CreatorPackageValidationResult {
  const { artifact, targetMapId } = input;
  const reasons: CreatorPackageValidationReason[] = [];

  if (targetMapId !== PLAYABLE_CREATOR_PACKAGE_MAP_ID) {
    pushReason(reasons, "FUTURE_MAP_NOT_ALLOWED", `Only ${PLAYABLE_CREATOR_PACKAGE_MAP_ID} is an eligible review target; target ${targetMapId} is blocked`);
  }

  const expectedArtifactKey = makeCreatorDomainArtifactKey({
    domain: artifact.domain,
    artifactId: artifact.artifactId,
    artifactVersion: artifact.artifactVersion,
    contentSha256: artifact.contentSha256,
  });
  if (artifact.artifactKey !== expectedArtifactKey) {
    pushReason(reasons, "ARTIFACT_KEY_MISMATCH", "artifactKey must be the canonical domain:id:version:contentSha256 key");
  }
  if (!SHA256_PATTERN.test(artifact.contentSha256)) {
    pushReason(reasons, "CONTENT_HASH_INVALID", "contentSha256 must be a 64-character lowercase SHA-256 value");
  }
  if (!artifact.artifactId.trim() || !artifact.artifactVersion.trim() || !artifact.generatorId.trim() || !artifact.generatorVersion.trim()) {
    pushReason(reasons, "IDENTITY_MISMATCH", "domain artifact identity and generator fields must not be empty");
  }

  const provenance = artifact.provenance as Partial<CreatorDomainArtifactMetadata["provenance"]> | undefined;
  if (
    !provenance
    || provenance.schemaVersion !== "a-survival.creator-domain-artifact.v1"
    || provenance.generatorId !== artifact.generatorId
    || provenance.generatorVersion !== artifact.generatorVersion
    || !Array.isArray(provenance.sources)
    || provenance.sources.length === 0
    || !Array.isArray(provenance.provenanceRefs)
    || provenance.provenanceRefs.length === 0
  ) {
    pushReason(reasons, "PROVENANCE_MISSING", "metadata requires matching generator identity, source and provenance references");
  }

  if (artifact.runtimePolicy.runtimeImportAllowed !== false || artifact.runtimePolicy.playerVisible !== false || artifact.runtimePolicy.cacheable !== false) {
    pushReason(reasons, "RUNTIME_POLICY_ENABLED", "runtime import, player visibility and cache must remain disabled in this metadata-only checkpoint");
  }

  for (const value of [artifact.manifest, artifact.summary, artifact.provenance]) {
    const inspection = metadataHasBinaryOrExceedsBounds(value);
    if (inspection.binary) {
      pushReason(reasons, "BINARY_PAYLOAD_PRESENT", "metadata-only package validation rejects binary payload fields");
      break;
    }
    if (!inspection.bounded) {
      pushReason(reasons, "METADATA_BOUNDS_EXCEEDED", `metadata traversal is limited to ${MAX_METADATA_NODES} nodes/depth`);
      break;
    }
  }

  const uniqueReasons = Array.from(new Map(reasons.map(reason => [reason.code, reason])).values()).sort((left, right) => left.code.localeCompare(right.code));
  return {
    previewOnly: true,
    validatorVersion: CREATOR_PACKAGE_VALIDATION_VERSION,
    targetMapId,
    artifactKey: artifact.artifactKey,
    metadataHash: artifact.contentSha256,
    decision: uniqueReasons.length === 0 ? "reviewable" : "blocked",
    publishReady: false,
    runtimeImportAllowed: false,
    playerVisible: false,
    cacheable: false,
    reasons: uniqueReasons,
  };
}
