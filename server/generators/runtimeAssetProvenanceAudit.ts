import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { ASSET_CREDITS, canDistributeAsset, type AssetCredit, type AssetCreditStatus } from "../../client/src/game/data/assetProvenance";
import { hashStableJson } from "./commonGeneratorApi";

export const RUNTIME_ASSET_PROVENANCE_RULES_VERSION = "runtime-asset-provenance-rules.v1" as const;
export const RUNTIME_ASSET_PROVENANCE_AUDIT_ID = "runtime.asset-provenance.audit" as const;
export const RUNTIME_ASSET_PROVENANCE_AUDIT_VERSION = "1.0.0" as const;
export const RUNTIME_ASSET_PROVENANCE_SCHEMA_VERSION = "a-survival.runtime-asset-provenance-audit.v1" as const;
export const ACTIVE_GAMEPLAY_PACK_ID = "arcane-frontier-voxel-pixel" as const;
export const ACTIVE_GAMEPLAY_PACK_ROOT = "client/public/assets/packs/arcane-frontier-voxel-pixel" as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ALLOWED_ENTRY_KINDS = new Set(["texture", "model", "data"]);

type RuntimeAssetManifestEntry = {
  kind: string;
  path: string;
  mime?: string;
  fallback?: string;
  sha256?: string;
};

type RuntimeAssetManifest = {
  schemaVersion?: number;
  id: string;
  namespace: string;
  displayName?: string;
  version: string;
  entries: Record<string, RuntimeAssetManifestEntry>;
  packSha256?: string;
};

type ProvenanceIssueCode =
  | "MANIFEST_ID_MISMATCH"
  | "MANIFEST_NAMESPACE_MISSING"
  | "ENTRY_KIND_UNSUPPORTED"
  | "ENTRY_PATH_UNSAFE"
  | "ENTRY_SHA_MISSING"
  | "ENTRY_SHA_INVALID"
  | "ENTRY_FILE_MISSING"
  | "ENTRY_SHA_MISMATCH"
  | "PACK_SHA_MISSING"
  | "PACK_SHA_MISMATCH"
  | "PACK_CREDIT_MISSING"
  | "PACK_CREDIT_NOT_DISTRIBUTABLE"
  | "REFERENCE_ONLY_RUNTIME_ENTRY";

type AuditIssue = {
  code: ProvenanceIssueCode;
  assetId?: string;
  detail: string;
};

type AuditBlocker = {
  id: "credits-ui-contact-workflow" | "per-entry-provenance-granularity";
  required: true;
  status: "missing-evidence";
  owner: string;
  reason: string;
};

export type RuntimeAssetProvenanceAuditInput = {
  manifest: RuntimeAssetManifest;
  packRoot: string;
  credits?: readonly AssetCredit[];
  expectedPackId?: string;
};

export type RuntimeAssetProvenanceAuditOutput = {
  artifact: {
    auditId: typeof RUNTIME_ASSET_PROVENANCE_AUDIT_ID;
    auditVersion: typeof RUNTIME_ASSET_PROVENANCE_AUDIT_VERSION;
    schemaVersion: typeof RUNTIME_ASSET_PROVENANCE_SCHEMA_VERSION;
    rulesVersion: typeof RUNTIME_ASSET_PROVENANCE_RULES_VERSION;
    packId: string;
    packVersion: string;
    contentHash: string;
  };
  manifest: {
    id: string;
    namespace: string;
    version: string;
    packSha256: string | null;
    entryCount: number;
    orderedEntryIds: string[];
    recomputedPackSha256: string;
    packShaVerified: boolean;
  };
  entries: Array<{
    assetId: string;
    kind: string;
    relativePath: string;
    sha256: string | null;
    actualSha256: string | null;
    fileExists: boolean;
    hashVerified: boolean;
    creditScope: "pack" | "entry" | "none";
    runtimeAllowed: boolean;
  }>;
  credits: {
    packCreditAssetId: string;
    packCreditStatus: AssetCreditStatus | null;
    packCreditDistributable: boolean;
    referenceOnlyCreditIds: string[];
    referenceOnlyOutsideRuntime: boolean;
  };
  blockers: AuditBlocker[];
  issues: AuditIssue[];
  summary: {
    valid: boolean;
    bounded: true;
    deterministic: true;
    entryCount: number;
    verifiedFileCount: number;
    missingFileCount: number;
    hashMismatchCount: number;
    referenceOnlyRuntimeCount: number;
    blockerCount: number;
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
  claims: {
    runtimeWrite: false;
    generatorCall: false;
    assetGeneration: false;
    cacheWrite: false;
    runtimePublish: false;
    creditsUi: false;
    deviceAcceptance: false;
  };
};

function sha256File(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function sha256Text(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isSafeRelativePath(value: string) {
  if (!value || value.startsWith("/") || value.includes("\\")) return false;
  const segments = value.split("/");
  return segments.every(segment => segment.length > 0 && segment !== "." && segment !== "..");
}

function isWithinPack(packRoot: string, relativePath: string) {
  const root = resolve(packRoot);
  const filePath = resolve(root, relativePath);
  return filePath === root || filePath.startsWith(`${root}${sep}`);
}

function computeManifestPackSha(manifest: RuntimeAssetManifest) {
  return sha256Text(Object.values(manifest.entries).map(entry => entry.sha256 ?? "").join(""));
}

function getPackCredit(credits: readonly AssetCredit[], packId: string) {
  return credits.find(credit => credit.assetId === `pack.${packId}`);
}

function buildBlockers(): AuditBlocker[] {
  return [
    {
      id: "credits-ui-contact-workflow",
      required: true,
      status: "missing-evidence",
      owner: "client/src/game/data/assetProvenance.ts and player credits UI",
      reason: "the current audit proves runtime-readable credit metadata, but no Credits/Supporters navigation or owner-contact workflow is claimed by this read-only adapter",
    },
    {
      id: "per-entry-provenance-granularity",
      required: true,
      status: "missing-evidence",
      owner: "client/src/game/data/assetProvenance.ts",
      reason: "the active gameplay pack has a project-original pack-level credit; individual entries inherit that scope and do not each carry a separate credit row",
    },
  ];
}

export function auditAssetPackProvenance(input: RuntimeAssetProvenanceAuditInput): RuntimeAssetProvenanceAuditOutput {
  const expectedPackId = input.expectedPackId ?? ACTIVE_GAMEPLAY_PACK_ID;
  const credits = input.credits ?? ASSET_CREDITS;
  const manifest = input.manifest;
  const packCredit = getPackCredit(credits, manifest.id);
  const issues: AuditIssue[] = [];
  const orderedEntryIds = Object.keys(manifest.entries);
  const entries: RuntimeAssetProvenanceAuditOutput["entries"] = [];

  if (manifest.id !== expectedPackId) issues.push({ code: "MANIFEST_ID_MISMATCH", detail: `expected ${expectedPackId}, received ${manifest.id}` });
  if (!manifest.namespace) issues.push({ code: "MANIFEST_NAMESPACE_MISSING", detail: "manifest namespace is empty" });
  if (!packCredit) issues.push({ code: "PACK_CREDIT_MISSING", detail: `missing runtime pack credit for pack.${manifest.id}` });
  else if (!canDistributeAsset(packCredit)) issues.push({ code: "PACK_CREDIT_NOT_DISTRIBUTABLE", detail: `pack credit status ${packCredit.status} is not distributable` });

  for (const assetId of orderedEntryIds) {
    const entry = manifest.entries[assetId]!;
    const filePath = resolve(input.packRoot, entry.path);
    const safePath = isSafeRelativePath(entry.path) && isWithinPack(input.packRoot, entry.path);
    const fileExists = safePath && existsSync(filePath);
    const actualSha256 = fileExists ? sha256File(filePath) : null;
    const hashVerified = Boolean(entry.sha256 && SHA256_PATTERN.test(entry.sha256) && actualSha256 && entry.sha256 === actualSha256);
    const runtimeAllowed = Boolean(packCredit && canDistributeAsset(packCredit) && hashVerified);

    if (!ALLOWED_ENTRY_KINDS.has(entry.kind)) issues.push({ code: "ENTRY_KIND_UNSUPPORTED", assetId, detail: `unsupported manifest kind ${entry.kind}` });
    if (!safePath) issues.push({ code: "ENTRY_PATH_UNSAFE", assetId, detail: `entry path is not a safe relative path: ${entry.path}` });
    if (!entry.sha256) issues.push({ code: "ENTRY_SHA_MISSING", assetId, detail: "manifest entry has no sha256" });
    else if (!SHA256_PATTERN.test(entry.sha256)) issues.push({ code: "ENTRY_SHA_INVALID", assetId, detail: "manifest entry sha256 is not a lowercase 64-character digest" });
    if (safePath && !fileExists) issues.push({ code: "ENTRY_FILE_MISSING", assetId, detail: `file does not exist under ${input.packRoot}: ${entry.path}` });
    if (fileExists && entry.sha256 && SHA256_PATTERN.test(entry.sha256) && actualSha256 !== entry.sha256) issues.push({ code: "ENTRY_SHA_MISMATCH", assetId, detail: `manifest ${entry.sha256} does not match file ${actualSha256}` });
    if (credits.some(credit => credit.assetId === assetId && credit.status === "reference-only")) issues.push({ code: "REFERENCE_ONLY_RUNTIME_ENTRY", assetId, detail: "reference-only credit is not allowed to become a runtime entry" });

    entries.push({
      assetId,
      kind: entry.kind,
      relativePath: entry.path,
      sha256: entry.sha256 ?? null,
      actualSha256,
      fileExists,
      hashVerified,
      creditScope: packCredit ? "pack" : "none",
      runtimeAllowed,
    });
  }

  const recomputedPackSha256 = computeManifestPackSha(manifest);
  const packShaVerified = Boolean(manifest.packSha256 && manifest.packSha256 === recomputedPackSha256);
  if (!manifest.packSha256) issues.push({ code: "PACK_SHA_MISSING", detail: "manifest has no packSha256" });
  else if (!packShaVerified) issues.push({ code: "PACK_SHA_MISMATCH", detail: `manifest ${manifest.packSha256} does not match recomputed ${recomputedPackSha256}` });

  const referenceOnlyCreditIds = credits.filter(credit => credit.status === "reference-only").map(credit => credit.assetId).sort((left, right) => left.localeCompare(right));
  const entryById = new Set(orderedEntryIds);
  const referenceOnlyOutsideRuntime = referenceOnlyCreditIds.every(assetId => !entryById.has(assetId));
  const blockers = buildBlockers();
  const verifiedFileCount = entries.filter(entry => entry.hashVerified).length;
  const missingFileCount = entries.filter(entry => !entry.fileExists).length;
  const hashMismatchCount = entries.filter(entry => entry.fileExists && !entry.hashVerified).length;
  const referenceOnlyRuntimeCount = issues.filter(issue => issue.code === "REFERENCE_ONLY_RUNTIME_ENTRY").length;
  const valid = issues.length === 0;
  const canonicalPayload = {
    schemaVersion: RUNTIME_ASSET_PROVENANCE_SCHEMA_VERSION,
    auditId: RUNTIME_ASSET_PROVENANCE_AUDIT_ID,
    auditVersion: RUNTIME_ASSET_PROVENANCE_AUDIT_VERSION,
    rulesVersion: RUNTIME_ASSET_PROVENANCE_RULES_VERSION,
    manifest: { id: manifest.id, namespace: manifest.namespace, version: manifest.version, packSha256: manifest.packSha256, orderedEntryIds, recomputedPackSha256 },
    entries,
    credits: { packCreditAssetId: `pack.${manifest.id}`, packCreditStatus: packCredit?.status ?? null, packCreditDistributable: Boolean(packCredit && canDistributeAsset(packCredit)), referenceOnlyCreditIds, referenceOnlyOutsideRuntime },
    blockers,
    issues,
  };

  return {
    artifact: {
      auditId: RUNTIME_ASSET_PROVENANCE_AUDIT_ID,
      auditVersion: RUNTIME_ASSET_PROVENANCE_AUDIT_VERSION,
      schemaVersion: RUNTIME_ASSET_PROVENANCE_SCHEMA_VERSION,
      rulesVersion: RUNTIME_ASSET_PROVENANCE_RULES_VERSION,
      packId: manifest.id,
      packVersion: manifest.version,
      contentHash: hashStableJson(canonicalPayload as never),
    },
    manifest: {
      id: manifest.id,
      namespace: manifest.namespace,
      version: manifest.version,
      packSha256: manifest.packSha256 ?? null,
      entryCount: orderedEntryIds.length,
      orderedEntryIds,
      recomputedPackSha256,
      packShaVerified,
    },
    entries,
    credits: {
      packCreditAssetId: `pack.${manifest.id}`,
      packCreditStatus: packCredit?.status ?? null,
      packCreditDistributable: Boolean(packCredit && canDistributeAsset(packCredit)),
      referenceOnlyCreditIds,
      referenceOnlyOutsideRuntime,
    },
    blockers,
    issues,
    summary: {
      valid,
      bounded: true,
      deterministic: true,
      entryCount: entries.length,
      verifiedFileCount,
      missingFileCount,
      hashMismatchCount,
      referenceOnlyRuntimeCount,
      blockerCount: blockers.length,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
    },
    claims: {
      runtimeWrite: false,
      generatorCall: false,
      assetGeneration: false,
      cacheWrite: false,
      runtimePublish: false,
      creditsUi: false,
      deviceAcceptance: false,
    },
  };
}

export function auditActiveArcaneFrontierPack(packRoot = resolve(process.cwd(), ACTIVE_GAMEPLAY_PACK_ROOT)): RuntimeAssetProvenanceAuditOutput {
  const manifestPath = resolve(packRoot, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as RuntimeAssetManifest;
  return auditAssetPackProvenance({ manifest, packRoot, expectedPackId: ACTIVE_GAMEPLAY_PACK_ID });
}
