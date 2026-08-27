export type AssetCreditStatus = "project-original" | "license-verified" | "awaiting-contact" | "reference-only";
export type AssetCreditCategory = "terrain" | "block" | "plant" | "tree" | "item" | "character" | "monster" | "sky" | "audio" | "tool";

export type AssetCredit = {
  assetId: string;
  category: AssetCreditCategory;
  title: string;
  creator: string;
  sourceUrl?: string;
  sourceLabel?: string;
  license?: string;
  status: AssetCreditStatus;
  attribution: string;
  notes?: string;
};

/**
 * Credits are runtime-readable data, while the manifest remains the asset
 * resolver. A reference-only row never becomes a distributable asset by itself.
 */
export const ASSET_CREDITS: AssetCredit[] = [
  {
    assetId: "pack.arcane-frontier-voxel-pixel",
    category: "tool",
    title: "Arcane Frontier Voxel Pixel starter pack",
    creator: "A_Survival project",
    license: "Project-authored pack; see repository license/terms",
    status: "project-original",
    attribution: "A_Survival project · starter pack assembled for this game",
    notes: "Some starter visuals were produced with built-in generation from the project visual brief; they are not claimed as Google Gemini Image API output.",
  },
  {
    assetId: "reference.minecraft-tree-rules",
    category: "tree",
    title: "Public tree-generation reference",
    creator: "Minecraft Wiki community documentation",
    sourceUrl: "https://minecraft.wiki/w/Tree_definition",
    sourceLabel: "Minecraft Wiki — Tree definition",
    license: "Reference only; no Minecraft asset/code redistributed",
    status: "reference-only",
    attribution: "Reference: Minecraft Wiki tree definition",
    notes: "Used only to understand bounded stem/foliage template concepts. A_Survival generation and assets are original.",
  },
  {
    assetId: "reference.terraria.biomes",
    category: "terrain",
    title: "Public biome-design reference",
    creator: "Official Terraria Wiki contributors",
    sourceUrl: "https://terraria.wiki.gg/wiki/Biomes",
    sourceLabel: "Official Terraria Wiki — Biomes",
    license: "Reference only; no Terraria asset/code redistributed",
    status: "reference-only",
    attribution: "Reference: Official Terraria Wiki biome documentation",
    notes: "Used only to compare coordinated terrain, flora, items and enemies across biomes.",
  },
];

export type AssetCreditAuditIssueType =
  | "duplicate-id"
  | "invalid-id"
  | "invalid-category"
  | "invalid-status"
  | "missing-title"
  | "missing-creator"
  | "missing-attribution"
  | "missing-license"
  | "missing-source-url"
  | "invalid-source-url"
  | "missing-source-label"
  | "reference-only-runtime"
  | "awaiting-contact-runtime";

export type AssetCreditAuditRecord = {
  assetId: string;
  category: string;
  status: string;
  distributable: boolean;
  runtimeEligible: boolean;
  referenceOnly: boolean;
  issueTypes: AssetCreditAuditIssueType[];
};

export type AssetCreditAudit = {
  contentFingerprint: string;
  records: AssetCreditAuditRecord[];
  issueCounts: Record<AssetCreditAuditIssueType, number>;
  summary: {
    total: number;
    valid: number;
    blocked: number;
    distributable: number;
    runtimeEligible: number;
    referenceOnly: number;
    awaitingContact: number;
    issueCount: number;
  };
};

export type AssetCreditAuditOptions = {
  maxCredits?: number;
};

const ASSET_CREDIT_CATEGORIES: readonly AssetCreditCategory[] = ["terrain", "block", "plant", "tree", "item", "character", "monster", "sky", "audio", "tool"];
const ASSET_CREDIT_STATUSES: readonly AssetCreditStatus[] = ["project-original", "license-verified", "awaiting-contact", "reference-only"];
const ASSET_CREDIT_ID_PATTERN = /^[a-z0-9][a-z0-9.-]{2,95}$/;
const DEFAULT_MAX_CREDITS = 256;

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length >= 3;
}

function isHttpUrl(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

export function getAssetCredit(assetId: string): AssetCredit | undefined {
  return ASSET_CREDITS.find(credit => credit.assetId === assetId);
}

export function canDistributeAsset(credit: AssetCredit | undefined): boolean {
  return credit?.status === "project-original" || credit?.status === "license-verified";
}

export function validateAssetCredit(credit: AssetCredit, duplicateIds = new Set<string>()): AssetCreditAuditIssueType[] {
  const issues: AssetCreditAuditIssueType[] = [];
  if (duplicateIds.has(credit.assetId)) issues.push("duplicate-id");
  if (!ASSET_CREDIT_ID_PATTERN.test(credit.assetId)) issues.push("invalid-id");
  if (!ASSET_CREDIT_CATEGORIES.includes(credit.category)) issues.push("invalid-category");
  if (!ASSET_CREDIT_STATUSES.includes(credit.status)) issues.push("invalid-status");
  if (!hasText(credit.title)) issues.push("missing-title");
  if (!hasText(credit.creator)) issues.push("missing-creator");
  if (!hasText(credit.attribution)) issues.push("missing-attribution");
  if (!hasText(credit.license)) issues.push("missing-license");
  const requiresSource = credit.status === "license-verified" || credit.status === "awaiting-contact" || credit.status === "reference-only";
  if (requiresSource && !credit.sourceUrl) issues.push("missing-source-url");
  if (credit.sourceUrl && !isHttpUrl(credit.sourceUrl)) issues.push("invalid-source-url");
  if (requiresSource && !hasText(credit.sourceLabel)) issues.push("missing-source-label");
  if (credit.status === "reference-only") issues.push("reference-only-runtime");
  if (credit.status === "awaiting-contact") issues.push("awaiting-contact-runtime");
  return Array.from(new Set(issues));
}

function emptyIssueCounts(): Record<AssetCreditAuditIssueType, number> {
  return {
    "duplicate-id": 0,
    "invalid-id": 0,
    "invalid-category": 0,
    "invalid-status": 0,
    "missing-title": 0,
    "missing-creator": 0,
    "missing-attribution": 0,
    "missing-license": 0,
    "missing-source-url": 0,
    "invalid-source-url": 0,
    "missing-source-label": 0,
    "reference-only-runtime": 0,
    "awaiting-contact-runtime": 0,
  };
}

function fingerprint(credits: readonly AssetCredit[], records: readonly AssetCreditAuditRecord[]) {
  return credits.map((credit, index) => {
    const fields = [credit.assetId, credit.category, credit.title, credit.creator, credit.sourceUrl ?? "", credit.sourceLabel ?? "", credit.license ?? "", credit.status, credit.attribution, credit.notes ?? "", records[index]?.issueTypes.join(",") ?? ""];
    return fields.map(value => encodeURIComponent(value)).join("|");
  }).join("\n");
}

export function auditAssetCredits(credits: readonly AssetCredit[] = ASSET_CREDITS, options: AssetCreditAuditOptions = {}): AssetCreditAudit {
  const maxCredits = options.maxCredits ?? DEFAULT_MAX_CREDITS;
  if (!Number.isInteger(maxCredits) || maxCredits < 1 || maxCredits > DEFAULT_MAX_CREDITS) throw new Error(`maxCredits must be an integer from 1 to ${DEFAULT_MAX_CREDITS}`);
  if (credits.length > maxCredits) throw new Error(`credits must contain at most ${maxCredits} records`);
  const sortedCredits = [...credits].sort((left, right) => compareStrings(left.assetId, right.assetId));
  const duplicateIds = new Set(sortedCredits.filter((credit, index) => sortedCredits.findIndex(candidate => candidate.assetId === credit.assetId) !== index).map(credit => credit.assetId));
  const issueCounts = emptyIssueCounts();
  const records = sortedCredits.map(credit => {
    const issueTypes = validateAssetCredit(credit, duplicateIds).sort(compareStrings);
    for (const issueType of issueTypes) issueCounts[issueType] += 1;
    const distributable = canDistributeAsset(credit) && issueTypes.every(issue => issue !== "reference-only-runtime" && issue !== "awaiting-contact-runtime");
    const runtimeEligible = distributable && issueTypes.length === 0;
    return { assetId: credit.assetId, category: credit.category, status: credit.status, distributable, runtimeEligible, referenceOnly: credit.status === "reference-only", issueTypes };
  });
  const valid = records.filter(record => record.issueTypes.length === 0 && record.status !== "reference-only" && record.status !== "awaiting-contact").length;
  const distributable = records.filter(record => record.distributable).length;
  return {
    contentFingerprint: fingerprint(sortedCredits, records),
    records,
    issueCounts,
    summary: {
      total: records.length,
      valid,
      blocked: records.filter(record => record.issueTypes.length > 0).length,
      distributable,
      runtimeEligible: records.filter(record => record.runtimeEligible).length,
      referenceOnly: records.filter(record => record.referenceOnly).length,
      awaitingContact: records.filter(record => record.status === "awaiting-contact").length,
      issueCount: Object.values(issueCounts).reduce((sum, count) => sum + count, 0),
    },
  };
}
