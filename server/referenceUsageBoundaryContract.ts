export const REFERENCE_USAGE_BOUNDARY_VERSION = "reference-usage-boundary.v1" as const;
export const MAX_REFERENCE_RECORDS = 128;

export type ReferenceUsage = "design-reference" | "documentation-only";
export type ReferenceDerivation = "concept-only" | "mechanics-inspiration" | "terminology";

export type ReferenceUsageRecord = {
  id: string;
  title: string;
  sourceUrl: string;
  sourceLabel: string;
  usage: ReferenceUsage;
  derivation: ReferenceDerivation;
  usageNote: string;
  licenseNote: string;
  attribution: string;
  copiedCode: boolean;
  copiedAsset: boolean;
  brandingReused: boolean;
  runtimeAssetAllowed: boolean;
};

export type ReferenceUsageBoundaryResult = {
  contractVersion: typeof REFERENCE_USAGE_BOUNDARY_VERSION;
  valid: boolean;
  issues: string[];
  acceptedReferenceIds: string[];
  summary: {
    totalCount: number;
    designReferenceCount: number;
    documentationOnlyCount: number;
    copiedCodeCount: number;
    copiedAssetCount: number;
    brandingReuseCount: number;
    runtimeAllowedCount: number;
  };
};

function requiredText(value: string | undefined, field: string, id: string, issues: string[]) {
  const normalized = value?.trim() ?? "";
  if (!normalized) issues.push(`${field} is missing: ${id}`);
  return normalized;
}

export function evaluateReferenceUsageBoundary(input: { references: readonly ReferenceUsageRecord[] }): ReferenceUsageBoundaryResult {
  if (input.references.length > MAX_REFERENCE_RECORDS) throw new Error(`references must contain at most ${MAX_REFERENCE_RECORDS} entries`);
  const issues: string[] = [];
  const seenIds = new Set<string>();
  const acceptedReferenceIds: string[] = [];
  let designReferenceCount = 0;
  let documentationOnlyCount = 0;
  let copiedCodeCount = 0;
  let copiedAssetCount = 0;
  let brandingReuseCount = 0;
  let runtimeAllowedCount = 0;

  for (const reference of [...input.references].sort((left, right) => left.id.localeCompare(right.id))) {
    const id = reference.id.trim();
    if (!id) {
      issues.push("reference is missing id");
      continue;
    }
    if (seenIds.has(id)) {
      issues.push(`duplicate reference ID: ${id}`);
      continue;
    }
    seenIds.add(id);
    requiredText(reference.title, "reference title", id, issues);
    const sourceUrl = requiredText(reference.sourceUrl, "reference sourceUrl", id, issues);
    requiredText(reference.sourceLabel, "reference sourceLabel", id, issues);
    requiredText(reference.usageNote, "reference usageNote", id, issues);
    requiredText(reference.licenseNote, "reference licenseNote", id, issues);
    requiredText(reference.attribution, "reference attribution", id, issues);
    if (!/^https:\/\//i.test(sourceUrl)) issues.push(`reference sourceUrl must use https: ${id}`);
    if (reference.usage === "design-reference") designReferenceCount += 1;
    else if (reference.usage === "documentation-only") documentationOnlyCount += 1;
    else issues.push(`reference usage is unsupported: ${id}`);
    if (reference.copiedCode) {
      copiedCodeCount += 1;
      issues.push(`reference cannot copy code: ${id}`);
    }
    if (reference.copiedAsset) {
      copiedAssetCount += 1;
      issues.push(`reference cannot copy asset: ${id}`);
    }
    if (reference.brandingReused) {
      brandingReuseCount += 1;
      issues.push(`reference cannot reuse branding: ${id}`);
    }
    if (reference.runtimeAssetAllowed) {
      runtimeAllowedCount += 1;
      issues.push(`reference-only material cannot be runtime asset: ${id}`);
    }
    if (!reference.copiedCode && !reference.copiedAsset && !reference.brandingReused && !reference.runtimeAssetAllowed) acceptedReferenceIds.push(id);
  }

  return {
    contractVersion: REFERENCE_USAGE_BOUNDARY_VERSION,
    valid: issues.length === 0,
    issues,
    acceptedReferenceIds: acceptedReferenceIds.sort(),
    summary: { totalCount: input.references.length, designReferenceCount, documentationOnlyCount, copiedCodeCount, copiedAssetCount, brandingReuseCount, runtimeAllowedCount },
  };
}
