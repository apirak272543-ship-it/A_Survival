import { DEFAULT_AI_NPC_MODEL, readAiNpcConfig, SPECIAL_AI_NPC_MAPS, type AiNpcActionType } from "./aiNpcService";
import { hashStableJson } from "./generators/commonGeneratorApi";

export const AI_NPC_POLICY_SCHEMA_VERSION = "a-survival.ai-npc-policy.v1" as const;
export const AI_NPC_POLICY_CONTRACT_VERSION = "1.0.0" as const;
const MAX_POSITION = 500;
const MAX_ACTION_DISTANCE = 24;
const DEFAULT_MAX_MESSAGE_CHARS = 300;
const DEFAULT_MAX_SPEECH_CHARS = 360;
const ALLOWED_ACTIONS = ["none", "wander-to-safe-point", "inspect-local-block", "offer-hint", "return-to-home"] as const satisfies readonly AiNpcActionType[];
const DEFAULT_CONFIG = readAiNpcConfig({ AI_NPC_ENABLED: "false", AI_NPC_MODEL: DEFAULT_AI_NPC_MODEL });

type PolicyIssueCode =
  | "MAP_ID_INVALID"
  | "UNSUPPORTED_MAP"
  | "NPC_ID_INVALID"
  | "NPC_ID_MISMATCH"
  | "MESSAGE_INVALID"
  | "MESSAGE_TRUNCATED"
  | "POSITION_INVALID"
  | "ACTION_INVALID"
  | "ACTION_TYPE_UNSUPPORTED"
  | "ACTION_POSITION_INVALID"
  | "ACTION_OUTSIDE_LOCAL_BOUNDS"
  | "HINT_ID_INVALID";

type PolicyIssue = {
  code: PolicyIssueCode;
  detail: string;
};

type NormalizedPosition = { x: number; z: number };
type NormalizedAction = { type: AiNpcActionType; x?: number; z?: number; hintId?: string };

export type AiNpcPolicyInput = {
  requestedEnabled?: unknown;
  mapId?: unknown;
  npcId?: unknown;
  message?: unknown;
  position?: unknown;
  action?: unknown;
};

export type AiNpcPolicyReport = {
  schemaVersion: typeof AI_NPC_POLICY_SCHEMA_VERSION;
  contractVersion: typeof AI_NPC_POLICY_CONTRACT_VERSION;
  auditOnly: true;
  readOnly: true;
  exportOnly: true;
  publishReady: false;
  valid: boolean;
  requestedEnabled: boolean;
  eligibleForOnDemandCall: boolean;
  eligibilityReason: "disabled-by-default" | "eligible-policy-only" | "unsupported-map" | "invalid-request" | "invalid-action";
  allowedMaps: readonly string[];
  npcIdentity: { mapId: string; npcId: string; mapAccepted: boolean; identityAccepted: boolean };
  request: { messageChars: number; maxMessageChars: number; position: NormalizedPosition; positionAccepted: boolean };
  action: { accepted: boolean; maxActionsPerTurn: 1; value: NormalizedAction; issues: PolicyIssue[] };
  provider: { provider: "gemini"; model: string; callPerformed: false; credentialRead: false; backgroundLoop: false; timeoutMs: number; cooldownMs: number; maxTurns: number };
  responseBounds: { maxSpeechChars: number; allowedActionTypes: readonly AiNpcActionType[] };
  issues: PolicyIssue[];
  blockers: [
    { id: "provider-runtime-call"; required: true; status: "missing-evidence"; reason: string },
    { id: "gameplay-action-executor"; required: true; status: "missing-evidence"; reason: string },
    { id: "server-auth-and-rate-limit-acceptance"; required: true; status: "missing-evidence"; reason: string },
  ];
  claims: { providerCall: false; secretRead: false; backgroundLoop: false; persistenceWrite: false; gameplayMutation: false; multiNpc: false; playerVisible: false };
  contentSha256: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maxLength) : "";
}

function normalizePosition(value: unknown): NormalizedPosition | null {
  if (!isRecord(value)) return { x: 0, z: 0 };
  const x = Number(value.x);
  const z = Number(value.z);
  if (!Number.isFinite(x) || !Number.isFinite(z) || x < -MAX_POSITION || x > MAX_POSITION || z < -MAX_POSITION || z > MAX_POSITION) return null;
  return { x: Number(x.toFixed(2)), z: Number(z.toFixed(2)) };
}

function buildBlockers(): AiNpcPolicyReport["blockers"] {
  return [
    { id: "provider-runtime-call", required: true, status: "missing-evidence", reason: "this checkpoint never calls Gemini or any external provider" },
    { id: "gameplay-action-executor", required: true, status: "missing-evidence", reason: "allow-listed actions are projected only; no NPC movement, hint grant, combat, inventory, quest, or world mutation is executed" },
    { id: "server-auth-and-rate-limit-acceptance", required: true, status: "missing-evidence", reason: "router and production auth/rate-limit behavior are outside this pure contract and require separate evidence" },
  ];
}

export function buildAiNpcPolicyReport(input: AiNpcPolicyInput = {}): AiNpcPolicyReport {
  const issues: PolicyIssue[] = [];
  const requestedEnabled = input.requestedEnabled === true;
  const mapId = cleanString(input.mapId ?? SPECIAL_AI_NPC_MAPS[0], 64);
  const npcId = cleanString(input.npcId ?? `${mapId}:special-ai`, 96);
  const mapAccepted = SPECIAL_AI_NPC_MAPS.includes(mapId as (typeof SPECIAL_AI_NPC_MAPS)[number]);
  const identityAccepted = mapAccepted && npcId === `${mapId}:special-ai`;
  if (!mapId) issues.push({ code: "MAP_ID_INVALID", detail: "mapId must be a non-empty string" });
  else if (!mapAccepted) issues.push({ code: "UNSUPPORTED_MAP", detail: `mapId ${mapId} is not in the special AI-NPC allow-list` });
  if (!npcId) issues.push({ code: "NPC_ID_INVALID", detail: "npcId must be a non-empty string" });
  else if (!identityAccepted) issues.push({ code: "NPC_ID_MISMATCH", detail: `npcId must be exactly ${mapId}:special-ai for the selected map` });
  const rawMessage = typeof input.message === "string" ? input.message : "";
  const message = cleanString(rawMessage, DEFAULT_MAX_MESSAGE_CHARS);
  if (requestedEnabled && !message) issues.push({ code: "MESSAGE_INVALID", detail: "an enabled on-demand request requires a non-empty message" });
  if (rawMessage.length > DEFAULT_MAX_MESSAGE_CHARS) issues.push({ code: "MESSAGE_TRUNCATED", detail: `message was bounded to ${DEFAULT_MAX_MESSAGE_CHARS} characters` });
  const position = normalizePosition(input.position);
  const positionAccepted = position !== null;
  if (requestedEnabled && !positionAccepted) issues.push({ code: "POSITION_INVALID", detail: "position must contain finite x/z values within -500..500" });
  const actionIssues: PolicyIssue[] = [];
  let action: NormalizedAction = { type: "none" };
  if (input.action !== undefined) {
    if (!isRecord(input.action) || typeof input.action.type !== "string") actionIssues.push({ code: "ACTION_INVALID", detail: "action must be an object with an allow-listed type" });
    else if (!ALLOWED_ACTIONS.includes(input.action.type as AiNpcActionType)) actionIssues.push({ code: "ACTION_TYPE_UNSUPPORTED", detail: `action type ${input.action.type} is not allow-listed` });
    else {
      const type = input.action.type as AiNpcActionType;
      action = { type };
      if (type === "wander-to-safe-point" || type === "inspect-local-block") {
        const x = Number(input.action.x);
        const z = Number(input.action.z);
        if (!Number.isFinite(x) || !Number.isFinite(z)) actionIssues.push({ code: "ACTION_POSITION_INVALID", detail: `${type} requires finite x/z values` });
        else if (!position || Math.abs(x - position.x) > MAX_ACTION_DISTANCE || Math.abs(z - position.z) > MAX_ACTION_DISTANCE) actionIssues.push({ code: "ACTION_OUTSIDE_LOCAL_BOUNDS", detail: `${type} must remain within ${MAX_ACTION_DISTANCE} blocks per axis of the request position` });
        else action = { type, x: Number(x.toFixed(2)), z: Number(z.toFixed(2)) };
      }
      if (type === "offer-hint") {
        const hintId = cleanString(input.action.hintId, 64);
        if (!hintId || !/^[a-z0-9._-]+$/i.test(hintId)) actionIssues.push({ code: "HINT_ID_INVALID", detail: "offer-hint requires a bounded alphanumeric hintId" });
        else action = { type, hintId };
      }
    }
  }
  issues.push(...actionIssues);
  const actionAccepted = actionIssues.length === 0;
  const eligibleForOnDemandCall = requestedEnabled && mapAccepted && identityAccepted && Boolean(message) && positionAccepted && actionAccepted && issues.length === 0;
  const eligibilityReason: AiNpcPolicyReport["eligibilityReason"] = !requestedEnabled ? "disabled-by-default" : eligibleForOnDemandCall ? "eligible-policy-only" : actionIssues.length > 0 ? "invalid-action" : (!mapAccepted || !identityAccepted) ? "unsupported-map" : "invalid-request";
  const payload = {
    schemaVersion: AI_NPC_POLICY_SCHEMA_VERSION,
    contractVersion: AI_NPC_POLICY_CONTRACT_VERSION,
    auditOnly: true,
    readOnly: true,
    exportOnly: true,
    publishReady: false,
    valid: issues.length === 0,
    requestedEnabled,
    eligibleForOnDemandCall,
    eligibilityReason,
    allowedMaps: [...SPECIAL_AI_NPC_MAPS],
    npcIdentity: { mapId, npcId, mapAccepted, identityAccepted },
    request: { messageChars: message.length, maxMessageChars: DEFAULT_MAX_MESSAGE_CHARS, position: position ?? { x: 0, z: 0 }, positionAccepted },
    action: { accepted: actionAccepted, maxActionsPerTurn: 1 as const, value: action, issues: actionIssues },
    provider: { provider: "gemini" as const, model: DEFAULT_CONFIG.model, callPerformed: false as const, credentialRead: false as const, backgroundLoop: false as const, timeoutMs: DEFAULT_CONFIG.timeoutMs, cooldownMs: DEFAULT_CONFIG.cooldownMs, maxTurns: DEFAULT_CONFIG.maxTurns },
    responseBounds: { maxSpeechChars: DEFAULT_MAX_SPEECH_CHARS, allowedActionTypes: ALLOWED_ACTIONS },
    issues,
    blockers: buildBlockers(),
    claims: { providerCall: false as const, secretRead: false as const, backgroundLoop: false as const, persistenceWrite: false as const, gameplayMutation: false as const, multiNpc: false as const, playerVisible: false as const },
  } satisfies Omit<AiNpcPolicyReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}
