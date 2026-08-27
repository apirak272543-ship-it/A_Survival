import {
  CODEX_CATEGORIES,
  CODEX_ENTRIES,
  getDiscoveredCodexEntries,
  type CodexCategoryId,
  type CodexEntry,
} from "@/game/systems/codexSystem";

export const CODEX_DISCOVERY_CONTRACT_VERSION = "codex-discovery-contract.v1" as const;

export type CodexDiscoveryRejection = {
  value: string | null;
  reason: "input-not-array" | "unknown-entry" | "duplicate-entry" | "unknown-category";
};

export type CodexDiscoveryNormalization = {
  valid: boolean;
  discoveredItemIds: string[];
  rejected: CodexDiscoveryRejection[];
};

export type CodexDiscoveryPolicy = {
  readOnly: true;
  persistenceWriteAllowed: false;
  playerUiIntegration: false;
  runtimeImportAllowed: false;
  cacheable: false;
};

export type CodexDiscoverySnapshot = {
  contractVersion: typeof CODEX_DISCOVERY_CONTRACT_VERSION;
  valid: boolean;
  discoveredItemIds: string[];
  entries: CodexEntry[];
  categoryCounts: Record<CodexCategoryId, number>;
  rejected: CodexDiscoveryRejection[];
  policy: CodexDiscoveryPolicy;
};

export type CodexDiscoveryTransition = CodexDiscoverySnapshot & {
  addedItemIds: string[];
};

const DISCOVERY_POLICY: CodexDiscoveryPolicy = {
  readOnly: true,
  persistenceWriteAllowed: false,
  playerUiIntegration: false,
  runtimeImportAllowed: false,
  cacheable: false,
};

const CANONICAL_ENTRY_IDS = new Set(CODEX_ENTRIES.map(entry => entry.id));

function rejectedInput(): CodexDiscoveryRejection {
  return { value: null, reason: "input-not-array" };
}

function categoryCounts(entries: readonly CodexEntry[]): Record<CodexCategoryId, number> {
  return Object.fromEntries(CODEX_CATEGORIES.map(category => [category.id, entries.filter(entry => entry.category === category.id).length])) as Record<CodexCategoryId, number>;
}

export function normalizeCodexDiscoveryIds(candidate: unknown): CodexDiscoveryNormalization {
  if (!Array.isArray(candidate)) return { valid: false, discoveredItemIds: [], rejected: [rejectedInput()] };
  const discoveredItemIds = new Set<string>();
  const rejected: CodexDiscoveryRejection[] = [];
  for (const value of candidate) {
    if (typeof value !== "string" || !CANONICAL_ENTRY_IDS.has(value)) {
      rejected.push({ value: typeof value === "string" ? value : null, reason: "unknown-entry" });
      continue;
    }
    if (discoveredItemIds.has(value)) {
      rejected.push({ value, reason: "duplicate-entry" });
      continue;
    }
    discoveredItemIds.add(value);
  }
  const canonicalIds = CODEX_ENTRIES.filter(entry => discoveredItemIds.has(entry.id)).map(entry => entry.id);
  return { valid: rejected.length === 0, discoveredItemIds: canonicalIds, rejected };
}

function snapshotFromNormalization(normalization: CodexDiscoveryNormalization): CodexDiscoverySnapshot {
  const entries = getDiscoveredCodexEntries(normalization.discoveredItemIds);
  return {
    contractVersion: CODEX_DISCOVERY_CONTRACT_VERSION,
    valid: normalization.valid,
    discoveredItemIds: normalization.discoveredItemIds,
    entries,
    categoryCounts: categoryCounts(entries),
    rejected: normalization.rejected,
    policy: DISCOVERY_POLICY,
  };
}

export function createCodexDiscoverySnapshot(candidate: unknown): CodexDiscoverySnapshot {
  return snapshotFromNormalization(normalizeCodexDiscoveryIds(candidate));
}

export function applyCodexDiscovery(current: unknown, newlyDiscovered: unknown): CodexDiscoveryTransition {
  const currentNormalization = normalizeCodexDiscoveryIds(current);
  const incomingNormalization = normalizeCodexDiscoveryIds(newlyDiscovered);
  if (!currentNormalization.valid || !incomingNormalization.valid) {
    const snapshot = snapshotFromNormalization({
      valid: false,
      discoveredItemIds: currentNormalization.discoveredItemIds,
      rejected: [...currentNormalization.rejected, ...incomingNormalization.rejected],
    });
    return { ...snapshot, addedItemIds: [] };
  }
  const currentIds = new Set(currentNormalization.discoveredItemIds);
  const addedItemIds = incomingNormalization.discoveredItemIds.filter(id => !currentIds.has(id));
  const nextIds = [...currentNormalization.discoveredItemIds, ...addedItemIds];
  const snapshot = snapshotFromNormalization({ valid: true, discoveredItemIds: nextIds, rejected: [] });
  return { ...snapshot, addedItemIds };
}

export function selectDiscoveredCodexCategory(candidate: unknown, category: unknown): { accepted: boolean; category: CodexCategoryId | null; entries: CodexEntry[]; reason?: string; policy: CodexDiscoveryPolicy } {
  const snapshot = createCodexDiscoverySnapshot(candidate);
  const normalizedCategory = typeof category === "string" && CODEX_CATEGORIES.some(item => item.id === category) ? category as CodexCategoryId : null;
  if (!normalizedCategory) return { accepted: false, category: null, entries: [], reason: "unknown-category", policy: DISCOVERY_POLICY };
  if (!snapshot.valid) return { accepted: false, category: normalizedCategory, entries: [], reason: "discovery-input-rejected", policy: DISCOVERY_POLICY };
  return { accepted: true, category: normalizedCategory, entries: snapshot.entries.filter(entry => entry.category === normalizedCategory), policy: DISCOVERY_POLICY };
}
