import { isAssetPackManifest, type AssetPackEntry, type AssetPackManifest } from "../client/src/game/assets/assetPackLoader";
import { hashStableJson } from "./generators/commonGeneratorApi";

export const RUNTIME_ASSET_PACK_BOUNDARY_VERSION = "runtime-asset-pack-boundary.v1" as const;
export const ACTIVE_RUNTIME_ASSET_PACK_ID = "arcane-frontier-voxel-pixel" as const;
export const MAX_REQUIRED_ASSET_IDS = 64;

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const ASSET_ENTRY_KINDS = new Set<AssetPackEntry["kind"]>(["texture", "model", "animation", "audio", "data"]);

type AssetEntryReport = {
  assetId: string;
  kind: AssetPackEntry["kind"] | "unknown";
  path: string;
  sha256: string | null;
  fallback: string | null;
  runtimeEligible: boolean;
};

export type RuntimeAssetPackBoundaryInput = {
  manifest: AssetPackManifest;
  requiredAssetIds?: readonly string[];
};

export type RuntimeAssetPackBoundaryResult = {
  contractVersion: typeof RUNTIME_ASSET_PACK_BOUNDARY_VERSION;
  valid: boolean;
  runtimeImportAllowed: boolean;
  issues: string[];
  manifest: {
    id: string;
    version: string;
    manifestHash: string | null;
    packSha256: string | null;
    entryCount: number;
  };
  summary: {
    entryCount: number;
    requiredAssetCount: number;
    requiredAssetMissingCount: number;
    sha256PresentCount: number;
    invalidSha256Count: number;
    fallbackMissingCount: number;
    kindCounts: Record<AssetPackEntry["kind"], number>;
  };
  entries: AssetEntryReport[];
};

function isSafeRelativeAssetPath(path: string) {
  return path.length > 0 && !path.startsWith("/") && !path.includes("\\") && !path.split("/").some(segment => segment === ".." || segment === "");
}

function normalizeRequiredAssetIds(assetIds: readonly string[]) {
  if (assetIds.length > MAX_REQUIRED_ASSET_IDS) throw new Error(`requiredAssetIds must contain at most ${MAX_REQUIRED_ASSET_IDS} entries`);
  return Array.from(new Set(assetIds.map(assetId => assetId.trim()).filter(Boolean))).sort();
}

function emptyKindCounts(): Record<AssetPackEntry["kind"], number> {
  return { texture: 0, model: 0, animation: 0, audio: 0, data: 0 };
}

export function evaluateRuntimeAssetPackBoundary(input: RuntimeAssetPackBoundaryInput): RuntimeAssetPackBoundaryResult {
  const candidate = input.manifest as Partial<AssetPackManifest>;
  const requiredAssetIds = normalizeRequiredAssetIds(input.requiredAssetIds ?? []);
  const issues: string[] = [];
  const kindCounts = emptyKindCounts();
  const candidateEntries = candidate.entries && typeof candidate.entries === "object" && !Array.isArray(candidate.entries)
    ? Object.entries(candidate.entries)
    : [];
  const entryIds = new Set(candidateEntries.map(([assetId]) => assetId));
  const entries: AssetEntryReport[] = [];
  let sha256PresentCount = 0;
  let invalidSha256Count = 0;
  let fallbackMissingCount = 0;

  if (!isAssetPackManifest(input.manifest)) issues.push("asset pack manifest shape is invalid");
  if (candidate.id !== ACTIVE_RUNTIME_ASSET_PACK_ID) issues.push(`runtime asset pack must be ${ACTIVE_RUNTIME_ASSET_PACK_ID}`);
  if (typeof candidate.packSha256 !== "string" || !SHA256_PATTERN.test(candidate.packSha256)) issues.push("runtime asset pack requires a valid packSha256");
  if (typeof candidate.version !== "string" || !candidate.version.trim()) issues.push("runtime asset pack requires a version");

  for (const [assetId, rawEntry] of candidateEntries.sort(([left], [right]) => left.localeCompare(right))) {
    const entry = rawEntry as Partial<AssetPackEntry>;
    const kind = typeof entry.kind === "string" && ASSET_ENTRY_KINDS.has(entry.kind as AssetPackEntry["kind"]) ? entry.kind as AssetPackEntry["kind"] : "unknown";
    const path = typeof entry.path === "string" ? entry.path : "";
    const sha256 = typeof entry.sha256 === "string" ? entry.sha256 : null;
    const fallback = typeof entry.fallback === "string" ? entry.fallback : null;
    let runtimeEligible = true;
    if (kind === "unknown") {
      issues.push(`asset entry has unsupported kind: ${assetId}`);
      runtimeEligible = false;
    } else {
      kindCounts[kind] += 1;
    }
    if (!isSafeRelativeAssetPath(path)) {
      issues.push(`asset entry has unsafe relative path: ${assetId}`);
      runtimeEligible = false;
    }
    if (!sha256) {
      issues.push(`asset entry is missing sha256: ${assetId}`);
      runtimeEligible = false;
    } else if (!SHA256_PATTERN.test(sha256)) {
      issues.push(`asset entry has invalid sha256: ${assetId}`);
      invalidSha256Count += 1;
      runtimeEligible = false;
    } else {
      sha256PresentCount += 1;
    }
    if (fallback && !entryIds.has(fallback)) {
      issues.push(`asset entry fallback is missing: ${assetId} -> ${fallback}`);
      fallbackMissingCount += 1;
      runtimeEligible = false;
    }
    entries.push({ assetId, kind, path, sha256, fallback, runtimeEligible });
  }

  const missingRequiredAssetIds = requiredAssetIds.filter(assetId => !entryIds.has(assetId));
  for (const assetId of missingRequiredAssetIds) issues.push(`required runtime asset is missing from manifest: ${assetId}`);

  const manifestHash = isAssetPackManifest(input.manifest) ? hashStableJson(input.manifest as never) : null;
  const valid = issues.length === 0;
  return {
    contractVersion: RUNTIME_ASSET_PACK_BOUNDARY_VERSION,
    valid,
    runtimeImportAllowed: valid,
    issues,
    manifest: {
      id: typeof candidate.id === "string" ? candidate.id : "",
      version: typeof candidate.version === "string" ? candidate.version : "",
      manifestHash,
      packSha256: typeof candidate.packSha256 === "string" ? candidate.packSha256 : null,
      entryCount: entries.length,
    },
    summary: {
      entryCount: entries.length,
      requiredAssetCount: requiredAssetIds.length,
      requiredAssetMissingCount: missingRequiredAssetIds.length,
      sha256PresentCount,
      invalidSha256Count,
      fallbackMissingCount,
      kindCounts,
    },
    entries,
  };
}
