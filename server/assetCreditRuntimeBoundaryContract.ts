import { canDistributeAsset, type AssetCredit, type AssetCreditCategory } from "../client/src/game/data/assetProvenance";

export const ASSET_CREDIT_RUNTIME_BOUNDARY_VERSION = "asset-credit-runtime-boundary.v1" as const;
export const MAX_ASSET_CREDITS = 512;
export const MAX_REQUIRED_RUNTIME_ASSET_IDS = 128;

export type AssetCreditDisposition = "runtime-distributable" | "reference-only" | "needs-review";

export type AssetCreditRuntimeBoundaryResult = {
  contractVersion: typeof ASSET_CREDIT_RUNTIME_BOUNDARY_VERSION;
  valid: boolean;
  runtimeDistributionAllowed: boolean;
  issues: string[];
  runtimeAssetIds: string[];
  referenceOnlyAssetIds: string[];
  needsReviewAssetIds: string[];
  summary: {
    totalCount: number;
    runtimeDistributableCount: number;
    referenceOnlyCount: number;
    needsReviewCount: number;
    missingRequiredRuntimeAssetCount: number;
    categoryCounts: Record<AssetCreditCategory, number>;
  };
};

function normalizeText(value: string | undefined, field: string, assetId: string, issues: string[]) {
  const normalized = value?.trim() ?? "";
  if (!normalized) issues.push(`${field} is missing: ${assetId}`);
  return normalized;
}

function emptyCategoryCounts(): Record<AssetCreditCategory, number> {
  return { terrain: 0, block: 0, plant: 0, tree: 0, item: 0, character: 0, monster: 0, sky: 0, audio: 0, tool: 0 };
}

function disposition(credit: AssetCredit, issues: string[]): AssetCreditDisposition {
  if (credit.status === "reference-only") return "reference-only";
  if (credit.status === "awaiting-contact") return "needs-review";
  if (credit.status !== "project-original" && credit.status !== "license-verified") {
    issues.push(`asset credit has unsupported status: ${credit.assetId}`);
    return "needs-review";
  }
  return canDistributeAsset(credit) ? "runtime-distributable" : "needs-review";
}

export function evaluateAssetCreditRuntimeBoundary(input: {
  credits: readonly AssetCredit[];
  requiredRuntimeAssetIds?: readonly string[];
}): AssetCreditRuntimeBoundaryResult {
  if (input.credits.length > MAX_ASSET_CREDITS) throw new Error(`credits must contain at most ${MAX_ASSET_CREDITS} entries`);
  const requiredRuntimeAssetIds = input.requiredRuntimeAssetIds ?? [];
  if (requiredRuntimeAssetIds.length > MAX_REQUIRED_RUNTIME_ASSET_IDS) throw new Error(`requiredRuntimeAssetIds must contain at most ${MAX_REQUIRED_RUNTIME_ASSET_IDS} entries`);

  const issues: string[] = [];
  const categoryCounts = emptyCategoryCounts();
  const runtimeAssetIds: string[] = [];
  const referenceOnlyAssetIds: string[] = [];
  const needsReviewAssetIds: string[] = [];
  const seenIds = new Set<string>();
  const distributableIds = new Set<string>();
  const normalizedCredits = [...input.credits].sort((left, right) => left.assetId.localeCompare(right.assetId));

  for (const credit of normalizedCredits) {
    const assetId = credit.assetId.trim();
    if (!assetId) {
      issues.push("asset credit is missing assetId");
      continue;
    }
    if (seenIds.has(assetId)) {
      issues.push(`duplicate asset credit ID: ${assetId}`);
      continue;
    }
    seenIds.add(assetId);
    const title = normalizeText(credit.title, "asset credit title", assetId, issues);
    const creator = normalizeText(credit.creator, "asset credit creator", assetId, issues);
    const attribution = normalizeText(credit.attribution, "asset credit attribution", assetId, issues);
    const creditDisposition = disposition({ ...credit, assetId, title, creator, attribution }, issues);
    if (!(credit.category in categoryCounts)) issues.push(`asset credit has unsupported category: ${assetId}`);
    else categoryCounts[credit.category] += 1;

    if (creditDisposition === "runtime-distributable") {
      normalizeText(credit.license, "runtime asset license", assetId, issues);
      if (credit.status === "license-verified") normalizeText(credit.sourceUrl, "license-verified sourceUrl", assetId, issues);
      if (issues.some(issue => issue.endsWith(`: ${assetId}`) && (issue.startsWith("runtime asset license") || issue.startsWith("license-verified sourceUrl")))) {
        needsReviewAssetIds.push(assetId);
      } else {
        runtimeAssetIds.push(assetId);
        distributableIds.add(assetId);
      }
    } else if (creditDisposition === "reference-only") {
      normalizeText(credit.sourceUrl, "reference-only sourceUrl", assetId, issues);
      normalizeText(credit.sourceLabel, "reference-only sourceLabel", assetId, issues);
      normalizeText(credit.license, "reference-only license", assetId, issues);
      referenceOnlyAssetIds.push(assetId);
    } else {
      needsReviewAssetIds.push(assetId);
    }
  }

  const requiredIds = Array.from(new Set(requiredRuntimeAssetIds.map(assetId => assetId.trim()).filter(Boolean))).sort();
  const missingRequiredRuntimeAssetIds = requiredIds.filter(assetId => !distributableIds.has(assetId));
  for (const assetId of missingRequiredRuntimeAssetIds) issues.push(`required runtime asset credit is not distributable: ${assetId}`);
  const valid = issues.length === 0;
  return {
    contractVersion: ASSET_CREDIT_RUNTIME_BOUNDARY_VERSION,
    valid,
    runtimeDistributionAllowed: valid && missingRequiredRuntimeAssetIds.length === 0,
    issues,
    runtimeAssetIds: runtimeAssetIds.sort(),
    referenceOnlyAssetIds: referenceOnlyAssetIds.sort(),
    needsReviewAssetIds: Array.from(new Set(needsReviewAssetIds)).sort(),
    summary: {
      totalCount: input.credits.length,
      runtimeDistributableCount: runtimeAssetIds.length,
      referenceOnlyCount: referenceOnlyAssetIds.length,
      needsReviewCount: Array.from(new Set(needsReviewAssetIds)).length,
      missingRequiredRuntimeAssetCount: missingRequiredRuntimeAssetIds.length,
      categoryCounts,
    },
  };
}
