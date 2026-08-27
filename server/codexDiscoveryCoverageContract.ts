import { CODEX_CATEGORIES, CODEX_ENTRIES, getDiscoveredCodexEntries, type CodexCategoryId, type CodexEntry, type CodexSubcategoryId } from "../client/src/game/systems/codexSystem";
import { hashStableJson } from "./generators/commonGeneratorApi";

export const CODEX_DISCOVERY_COVERAGE_SCHEMA_VERSION = "a-survival.codex-discovery-coverage.v1" as const;
export const CODEX_DISCOVERY_COVERAGE_CONTRACT_VERSION = "1.0.0" as const;
const MAX_DISCOVERED_ID_SAMPLES = 512;
const CATEGORY_IDS = CODEX_CATEGORIES.map(category => category.id) as readonly CodexCategoryId[];
const SUBCATEGORY_IDS = ["melee", "ranged", "magic", "technology", "harvesting", "terrain", "rock", "building", "seed", "crop", "resource", "other"] as const satisfies readonly CodexSubcategoryId[];

type DiscoveryIssueCode =
  | "DISCOVERED_IDS_NOT_ARRAY"
  | "DISCOVERED_IDS_TRUNCATED"
  | "DISCOVERED_ID_INVALID"
  | "UNKNOWN_DISCOVERED_ID"
  | "DUPLICATE_DISCOVERED_ID"
  | "CANONICAL_DUPLICATE_ID"
  | "INVALID_CANONICAL_ENTRY"
  | "UNDISCOVERED_ENTRY_LEAK";

type DiscoveryIssue = {
  code: DiscoveryIssueCode;
  detail: string;
  itemId?: string;
};

export type CodexDiscoveryCoverageInput = {
  discoveredItemIds?: unknown;
};

export type CodexDiscoveryCoverageReport = {
  schemaVersion: typeof CODEX_DISCOVERY_COVERAGE_SCHEMA_VERSION;
  contractVersion: typeof CODEX_DISCOVERY_COVERAGE_CONTRACT_VERSION;
  auditOnly: true;
  readOnly: true;
  exportOnly: true;
  publishReady: false;
  valid: boolean;
  catalogEntryCount: number;
  canonicalDuplicateIdCount: number;
  discoveredInputCount: number;
  discoveredUniqueKnownCount: number;
  unknownDiscoveredIdCount: number;
  duplicateDiscoveredIdCount: number;
  undiscoveredEntryLeakCount: number;
  emptyState: boolean;
  categories: Array<{
    id: CodexCategoryId;
    label: string;
    description: string;
    catalogEntryCount: number;
    discoveredEntryCount: number;
  }>;
  subcategories: Record<CodexSubcategoryId, number>;
  discoveredSubcategories: Record<CodexSubcategoryId, number>;
  discoveredEntries: Array<Pick<CodexEntry, "id" | "category" | "subcategory" | "title" | "description" | "effect" | "tags" | "stackLimit" | "iconAssetId" | "blockId">>;
  issues: DiscoveryIssue[];
  blockers: [
    {
      id: "discovery-persistence";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
    {
      id: "player-codex-ui";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
    {
      id: "reload-and-duplicate-playtest";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
  ];
  claims: {
    discoveryWrite: false;
    persistence: false;
    playerUi: false;
    undiscoveredVisible: false;
    itemFactFabrication: false;
  };
  contentSha256: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function countByCategory(entries: readonly CodexEntry[]) {
  return Object.fromEntries(CATEGORY_IDS.map(categoryId => [categoryId, entries.filter(entry => entry.category === categoryId).length])) as Record<CodexCategoryId, number>;
}

function countBySubcategory(entries: readonly CodexEntry[]) {
  return Object.fromEntries(SUBCATEGORY_IDS.map(subcategoryId => [subcategoryId, entries.filter(entry => entry.subcategory === subcategoryId).length])) as Record<CodexSubcategoryId, number>;
}

function validateCanonicalEntries(entries: readonly CodexEntry[], issues: DiscoveryIssue[]) {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) issues.push({ code: "CANONICAL_DUPLICATE_ID", detail: `canonical Codex entry id ${entry.id} occurs more than once`, itemId: entry.id });
    ids.add(entry.id);
    if (!isNonEmptyString(entry.id) || !isNonEmptyString(entry.title) || !isNonEmptyString(entry.description) || !isNonEmptyString(entry.effect) || !Number.isInteger(entry.stackLimit) || entry.stackLimit < 1 || !Array.isArray(entry.tags)) {
      issues.push({ code: "INVALID_CANONICAL_ENTRY", detail: `canonical Codex entry ${entry.id || "<empty>"} has an invalid bounded display shape`, itemId: entry.id });
    }
  }
  return { ids, duplicateCount: entries.length - ids.size };
}

function normalizeDiscoveredIds(input: unknown, issues: DiscoveryIssue[]) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    issues.push({ code: "DISCOVERED_IDS_NOT_ARRAY", detail: "discoveredItemIds must be an array; empty discovered state was used" });
    return [];
  }
  const bounded = input.slice(0, MAX_DISCOVERED_ID_SAMPLES);
  if (input.length > MAX_DISCOVERED_ID_SAMPLES) issues.push({ code: "DISCOVERED_IDS_TRUNCATED", detail: `discoveredItemIds was truncated to ${MAX_DISCOVERED_ID_SAMPLES} entries` });
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of bounded) {
    if (!isNonEmptyString(value)) {
      issues.push({ code: "DISCOVERED_ID_INVALID", detail: "each discovered item id must be a non-empty string" });
      continue;
    }
    if (seen.has(value)) {
      issues.push({ code: "DUPLICATE_DISCOVERED_ID", detail: `discovered item id ${value} appeared more than once`, itemId: value });
      continue;
    }
    seen.add(value);
    ids.push(value);
  }
  return ids;
}

function buildBlockers(): CodexDiscoveryCoverageReport["blockers"] {
  return [
    {
      id: "discovery-persistence",
      required: true,
      status: "missing-evidence",
      reason: "this contract filters caller-provided IDs in memory; it does not write or restore discovery state",
    },
    {
      id: "player-codex-ui",
      required: true,
      status: "missing-evidence",
      reason: "the report is server-side metadata and does not integrate a player Vault/Codex screen",
    },
    {
      id: "reload-and-duplicate-playtest",
      required: true,
      status: "missing-evidence",
      reason: "no browser, reload, duplicate-discovery or device acceptance is executed by this contract",
    },
  ];
}

export function buildCodexDiscoveryCoverageReport(input: CodexDiscoveryCoverageInput = {}): CodexDiscoveryCoverageReport {
  const issues: DiscoveryIssue[] = [];
  const canonical = validateCanonicalEntries(CODEX_ENTRIES, issues);
  const discoveredIds = normalizeDiscoveredIds(input.discoveredItemIds, issues);
  const knownIds = new Set(canonical.ids);
  const unknownIds = discoveredIds.filter(id => !knownIds.has(id));
  for (const itemId of unknownIds) issues.push({ code: "UNKNOWN_DISCOVERED_ID", detail: `discovered item id ${itemId} is not present in the canonical Codex catalog`, itemId });
  const discoveredEntries = getDiscoveredCodexEntries(discoveredIds);
  const discoveredIdSet = new Set(discoveredIds);
  const undiscoveredEntryLeakCount = discoveredEntries.filter(entry => !discoveredIdSet.has(entry.id)).length;
  if (undiscoveredEntryLeakCount > 0) issues.push({ code: "UNDISCOVERED_ENTRY_LEAK", detail: `${undiscoveredEntryLeakCount} Codex entries were projected without their IDs being discovered` });
  const catalogCounts = countByCategory(CODEX_ENTRIES);
  const discoveredCounts = countByCategory(discoveredEntries);
  const categories = CODEX_CATEGORIES.map(category => ({ id: category.id, label: category.label, description: category.description, catalogEntryCount: catalogCounts[category.id], discoveredEntryCount: discoveredCounts[category.id] }));
  const subcategories = countBySubcategory(CODEX_ENTRIES);
  const discoveredSubcategories = countBySubcategory(discoveredEntries);
  const payload = {
    schemaVersion: CODEX_DISCOVERY_COVERAGE_SCHEMA_VERSION,
    contractVersion: CODEX_DISCOVERY_COVERAGE_CONTRACT_VERSION,
    auditOnly: true,
    readOnly: true,
    exportOnly: true,
    publishReady: false,
    valid: issues.length === 0,
    catalogEntryCount: CODEX_ENTRIES.length,
    canonicalDuplicateIdCount: canonical.duplicateCount,
    discoveredInputCount: Array.isArray(input.discoveredItemIds) ? input.discoveredItemIds.length : 0,
    discoveredUniqueKnownCount: discoveredEntries.length,
    unknownDiscoveredIdCount: unknownIds.length,
    duplicateDiscoveredIdCount: issues.filter(issue => issue.code === "DUPLICATE_DISCOVERED_ID").length,
    undiscoveredEntryLeakCount,
    emptyState: discoveredEntries.length === 0,
    categories,
    subcategories,
    discoveredSubcategories,
    discoveredEntries,
    issues,
    blockers: buildBlockers(),
    claims: { discoveryWrite: false, persistence: false, playerUi: false, undiscoveredVisible: false, itemFactFabrication: false },
  } satisfies Omit<CodexDiscoveryCoverageReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}
