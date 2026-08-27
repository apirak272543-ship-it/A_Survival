import { DEFAULT_IN_MAP_SETTINGS, normalizeInMapSettings, type InMapSettings } from "../client/src/game/systems/cameraModes";
import { hashStableJson } from "./generators/commonGeneratorApi";

export const SETTINGS_SCOPE_COVERAGE_SCHEMA_VERSION = "a-survival.settings-scope-coverage.v1" as const;
export const SETTINGS_SCOPE_COVERAGE_CONTRACT_VERSION = "1.0.0" as const;
export const IN_MAP_SETTINGS_KEYS = ["cameraMode", "viewDistanceBlocks", "targetFps"] as const;
export const GLOBAL_SETTINGS_KEYS = [] as const;

export type SettingsScope = "global" | "in-map";

type SettingsScopeIssue = {
  code: "SCOPE_FALLBACK" | "CANDIDATE_FALLBACK" | "GLOBAL_SCOPE_UNOWNED";
  detail: string;
};

export type SettingsScopeCoverageInput = {
  scope?: unknown;
  candidate?: unknown;
};

export type SettingsScopeCoverageReport = {
  schemaVersion: typeof SETTINGS_SCOPE_COVERAGE_SCHEMA_VERSION;
  contractVersion: typeof SETTINGS_SCOPE_COVERAGE_CONTRACT_VERSION;
  auditOnly: true;
  readOnly: true;
  exportOnly: true;
  publishReady: false;
  valid: true;
  requestedScope: SettingsScope;
  scopeSource: "caller" | "default-fallback";
  inMapSettingsOwner: "cameraModes.ts";
  globalSettingsOwner: "unowned-in-repository-scan";
  inMapSettingsSupported: true;
  globalSettingsSupported: false;
  inMapSettingsKeys: readonly ["cameraMode", "viewDistanceBlocks", "targetFps"];
  globalSettingsKeys: readonly [];
  defaultInMapSettings: InMapSettings;
  normalizedInMapSettings: InMapSettings | null;
  candidateSource: "canonical-normalization" | "default-fallback" | "not-applicable";
  candidateKeys: string[];
  issues: SettingsScopeIssue[];
  persistence: {
    writeAllowed: false;
    writeAttempted: false;
    reloadVerified: false;
    callerConnected: false;
  };
  blockers: [
    { id: "global-settings-owner"; required: true; status: "missing-evidence"; reason: string },
    { id: "settings-persistence-caller"; required: true; status: "missing-evidence"; reason: string },
    { id: "all-entry-routes"; required: true; status: "missing-evidence"; reason: string },
    { id: "pause-focus-integration"; required: true; status: "missing-evidence"; reason: string },
  ];
  claims: {
    inMapSettingsNormalized: boolean;
    globalSettingsNormalized: false;
    settingsWritten: false;
    persistenceConnected: false;
    uiConnected: false;
    playerVisible: false;
    deviceAccepted: false;
    futureMapMutated: false;
  };
  contentSha256: string;
};

function isSettingsScope(value: unknown): value is SettingsScope {
  return value === "global" || value === "in-map";
}

function normalizeCandidateKeys(candidate: unknown) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return [];
  return Object.keys(candidate).filter(key => key.length <= 64).sort().slice(0, 16);
}

function buildBlockers(): SettingsScopeCoverageReport["blockers"] {
  return [
    { id: "global-settings-owner", required: true, status: "missing-evidence", reason: "the repository scan identifies cameraModes.ts as the in-map owner but no canonical global-settings owner" },
    { id: "settings-persistence-caller", required: true, status: "missing-evidence", reason: "this contract normalizes metadata only and does not connect localStorage, IndexedDB, or another persistence caller" },
    { id: "all-entry-routes", required: true, status: "missing-evidence", reason: "settings scope has not been verified across landing, pause, direct-map, and reload entry routes" },
    { id: "pause-focus-integration", required: true, status: "missing-evidence", reason: "pause/focus and route handoff behavior are outside this pure scope projection" },
  ];
}

export function buildSettingsScopeCoverageReport(input: SettingsScopeCoverageInput = {}): SettingsScopeCoverageReport {
  const candidateScope = input.scope;
  const scopeRecognized = isSettingsScope(candidateScope);
  const requestedScope: SettingsScope = scopeRecognized ? candidateScope : "in-map";
  const scopeSource = input.scope === undefined || !scopeRecognized ? "default-fallback" as const : "caller" as const;
  const issues: SettingsScopeIssue[] = [];
  if (!scopeRecognized && input.scope !== undefined) issues.push({ code: "SCOPE_FALLBACK", detail: "unknown settings scope fell back to canonical in-map scope" });
  const candidateKeys = normalizeCandidateKeys(input.candidate);
  const isObjectCandidate = input.candidate !== null && typeof input.candidate === "object" && !Array.isArray(input.candidate);
  const normalizedInMapSettings = requestedScope === "in-map" ? normalizeInMapSettings(isObjectCandidate ? input.candidate as Partial<InMapSettings> : undefined) : null;
  const candidateSource = requestedScope === "global"
    ? "not-applicable" as const
    : isObjectCandidate || input.candidate === undefined
      ? input.candidate === undefined || normalizedInMapSettings === DEFAULT_IN_MAP_SETTINGS
        ? "default-fallback" as const
        : "canonical-normalization" as const
      : "default-fallback" as const;
  if (requestedScope === "global") issues.push({ code: "GLOBAL_SCOPE_UNOWNED", detail: "no canonical global settings owner was found; no global value is normalized or written" });
  else if (!isObjectCandidate && input.candidate !== undefined) issues.push({ code: "CANDIDATE_FALLBACK", detail: "non-object in-map settings candidate fell back to canonical defaults" });
  const payload = {
    schemaVersion: SETTINGS_SCOPE_COVERAGE_SCHEMA_VERSION,
    contractVersion: SETTINGS_SCOPE_COVERAGE_CONTRACT_VERSION,
    auditOnly: true,
    readOnly: true,
    exportOnly: true,
    publishReady: false,
    valid: true,
    requestedScope,
    scopeSource,
    inMapSettingsOwner: "cameraModes.ts" as const,
    globalSettingsOwner: "unowned-in-repository-scan" as const,
    inMapSettingsSupported: true,
    globalSettingsSupported: false,
    inMapSettingsKeys: IN_MAP_SETTINGS_KEYS,
    globalSettingsKeys: GLOBAL_SETTINGS_KEYS,
    defaultInMapSettings: DEFAULT_IN_MAP_SETTINGS,
    normalizedInMapSettings,
    candidateSource,
    candidateKeys,
    issues,
    persistence: { writeAllowed: false as const, writeAttempted: false as const, reloadVerified: false as const, callerConnected: false as const },
    blockers: buildBlockers(),
    claims: { inMapSettingsNormalized: requestedScope === "in-map", globalSettingsNormalized: false as const, settingsWritten: false as const, persistenceConnected: false as const, uiConnected: false as const, playerVisible: false as const, deviceAccepted: false as const, futureMapMutated: false as const },
  } satisfies Omit<SettingsScopeCoverageReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}
