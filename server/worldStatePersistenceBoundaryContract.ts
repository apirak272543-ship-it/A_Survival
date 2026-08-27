import { isRuntimeMapAllowed, RUNTIME_MAP_ID } from "../client/src/game/routing/directRoute";

export const WORLD_STATE_PERSISTENCE_BOUNDARY_VERSION = "world-state-persistence-boundary.v1" as const;
export const WORLD_STATE_SCOPE = "map-local-world-state" as const;
const WORLD_BLOCK_KEY_PATTERN = /^-?\d+:-?\d+:-?\d+$/;
const MAX_PLAYER_ID_LENGTH = 128;
const MAX_MODULE_ID_LENGTH = 128;

export type WorldStateNamespace = {
  mapId: string;
  playerId: string;
  key: string | null;
  valid: boolean;
  writeEligible: boolean;
  issues: string[];
  scope: typeof WORLD_STATE_SCOPE;
};

export type WorldStateOverridePatch = {
  valid: boolean;
  overrides: Record<string, string | null>;
  invalidKeys: string[];
  issues: string[];
};

export type WorldStatePersistenceBoundaryResult = {
  contractVersion: typeof WORLD_STATE_PERSISTENCE_BOUNDARY_VERSION;
  valid: boolean;
  namespace: WorldStateNamespace;
  patch: WorldStateOverridePatch;
  writeEligible: boolean;
  runtimePolicy: {
    persistenceWritePerformed: false;
    playerGlobalStateTouched: false;
    futureMapWriteAllowed: false;
    generatedModuleMutated: false;
  };
};

function normalizePlayerId(candidate: unknown) {
  if (typeof candidate !== "string") return null;
  const normalized = candidate.trim();
  return normalized.length > 0 && normalized.length <= MAX_PLAYER_ID_LENGTH ? normalized : null;
}

export function createWorldStateNamespace(mapId: unknown, playerId: unknown): WorldStateNamespace {
  const normalizedMapId = typeof mapId === "string" ? mapId.trim() : "";
  const normalizedPlayerId = normalizePlayerId(playerId);
  const issues: string[] = [];
  if (!isRuntimeMapAllowed(normalizedMapId)) issues.push(`map ${normalizedMapId || "<missing>"} is not runtime-approved for world-state writes`);
  if (!normalizedPlayerId) issues.push("playerId must be a non-empty string with at most 128 characters");
  const valid = issues.length === 0;
  return {
    mapId: normalizedMapId,
    playerId: normalizedPlayerId ?? "",
    key: valid ? `${normalizedMapId}::${normalizedPlayerId}` : null,
    valid,
    writeEligible: valid && normalizedMapId === RUNTIME_MAP_ID,
    issues,
    scope: WORLD_STATE_SCOPE,
  };
}

export function normalizeWorldStateOverridePatch(candidate: unknown): WorldStateOverridePatch {
  if (candidate === undefined || candidate === null) return { valid: true, overrides: {}, invalidKeys: [], issues: [] };
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { valid: false, overrides: {}, invalidKeys: [], issues: ["worldBlockOverrides must be a record"] };
  }

  const overrides: Record<string, string | null> = {};
  const invalidKeys: string[] = [];
  const issues: string[] = [];
  for (const [key, value] of Object.entries(candidate)) {
    if (!WORLD_BLOCK_KEY_PATTERN.test(key)) {
      invalidKeys.push(key);
      issues.push(`invalid world block coordinate key: ${key}`);
      continue;
    }
    if (value !== null && (typeof value !== "string" || value.trim().length === 0 || value.length > MAX_MODULE_ID_LENGTH)) {
      issues.push(`world block override ${key} must be null or a non-empty module id up to 128 characters`);
      continue;
    }
    overrides[key] = typeof value === "string" ? value.trim() : null;
  }
  invalidKeys.sort();
  issues.sort();
  return { valid: issues.length === 0, overrides, invalidKeys, issues };
}

export function evaluateWorldStatePersistenceBoundary(input: { mapId: unknown; playerId: unknown; worldBlockOverrides?: unknown }): WorldStatePersistenceBoundaryResult {
  const namespace = createWorldStateNamespace(input.mapId, input.playerId);
  const patch = normalizeWorldStateOverridePatch(input.worldBlockOverrides);
  const issues = [...namespace.issues, ...patch.issues];
  return {
    contractVersion: WORLD_STATE_PERSISTENCE_BOUNDARY_VERSION,
    valid: issues.length === 0,
    namespace: { ...namespace, issues },
    patch,
    writeEligible: issues.length === 0 && namespace.writeEligible,
    runtimePolicy: {
      persistenceWritePerformed: false,
      playerGlobalStateTouched: false,
      futureMapWriteAllowed: false,
      generatedModuleMutated: false,
    },
  };
}

export function sameWorldStateNamespace(left: Pick<WorldStateNamespace, "mapId" | "playerId">, right: Pick<WorldStateNamespace, "mapId" | "playerId">) {
  return left.mapId === right.mapId && left.playerId === right.playerId;
}
