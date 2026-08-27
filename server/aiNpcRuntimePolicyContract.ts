export const AI_NPC_RUNTIME_POLICY_VERSION = "ai-npc-runtime-policy.v1" as const;
export const MAX_AI_NPCS_PER_MAP = 1;
export const MAX_ACTIONS_PER_TURN = 1;
export const MIN_COOLDOWN_MS = 1_000;
export const MAX_COOLDOWN_MS = 120_000;
export const MAX_TURNS = 16;
export const MAX_MESSAGE_CHARS = 1_000;

export const AI_NPC_ACTIONS = ["none", "wander-to-safe-point", "inspect-local-block", "offer-hint", "return-to-home"] as const;
export type AiNpcAction = (typeof AI_NPC_ACTIONS)[number];
export type AiNpcProvider = "gemini";
export type AiNpcRequestSource = "player-interaction" | "background-loop";
export type AiNpcMutationDomain = "block" | "inventory" | "chest" | "currency" | "quest" | "database";

export type AiNpcRuntimePolicyInput = {
  enabled: boolean;
  defaultEnabled: boolean;
  provider: AiNpcProvider;
  providerConfigured: boolean;
  model: string;
  maxNpcsPerMap: number;
  requestSource: AiNpcRequestSource;
  backgroundLoop: boolean;
  maxActionsPerTurn: number;
  cooldownMs: number;
  maxTurns: number;
  maxMessageChars: number;
  browserSecretExposure: boolean;
  allowedMutationDomains: readonly AiNpcMutationDomain[];
};

export type AiNpcTurnBoundaryInput = {
  playerId: string;
  mapId: string;
  npcId: string;
  requestSource: AiNpcRequestSource;
  distance: number;
  action: AiNpcAction;
  requestedMutations: readonly AiNpcMutationDomain[];
};

export type AiNpcRuntimePolicyResult = {
  policyVersion: typeof AI_NPC_RUNTIME_POLICY_VERSION;
  valid: boolean;
  enabled: boolean;
  issues: string[];
  runtimePolicy: {
    npcPerMap: 1;
    serverOnly: true;
    onDemand: true;
    backgroundLoop: false;
    playerCanCreateAgent: false;
    maxActionsPerTurn: 1;
    allowedActions: readonly AiNpcAction[];
    allowedMutationDomains: readonly [];
  };
};

function normalizeText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must not be empty`);
  return normalized;
}

export function evaluateAiNpcRuntimePolicy(input: AiNpcRuntimePolicyInput): AiNpcRuntimePolicyResult {
  const model = normalizeText(input.model, "model");
  if (!Number.isInteger(input.maxNpcsPerMap) || input.maxNpcsPerMap < 1) throw new Error("maxNpcsPerMap must be a positive integer");
  if (!Number.isInteger(input.maxActionsPerTurn) || input.maxActionsPerTurn < 1) throw new Error("maxActionsPerTurn must be a positive integer");
  if (!Number.isInteger(input.cooldownMs) || input.cooldownMs < 0) throw new Error("cooldownMs must be a non-negative integer");
  if (!Number.isInteger(input.maxTurns) || input.maxTurns < 1) throw new Error("maxTurns must be a positive integer");
  if (!Number.isInteger(input.maxMessageChars) || input.maxMessageChars < 1) throw new Error("maxMessageChars must be a positive integer");

  const issues: string[] = [];
  if (input.defaultEnabled) issues.push("AI NPC defaultEnabled must be false");
  if (input.provider !== "gemini") issues.push("AI NPC provider must be gemini");
  if (input.enabled && !input.providerConfigured) issues.push("enabled AI NPC requires server provider configuration");
  if (input.maxNpcsPerMap !== MAX_AI_NPCS_PER_MAP) issues.push("AI NPC maxNpcsPerMap must be 1");
  if (input.requestSource !== "player-interaction") issues.push("AI NPC requests must be player-interaction sourced");
  if (input.backgroundLoop) issues.push("AI NPC backgroundLoop must be false");
  if (input.maxActionsPerTurn !== MAX_ACTIONS_PER_TURN) issues.push("AI NPC maxActionsPerTurn must be 1");
  if (input.cooldownMs < MIN_COOLDOWN_MS || input.cooldownMs > MAX_COOLDOWN_MS) issues.push(`AI NPC cooldownMs must be between ${MIN_COOLDOWN_MS} and ${MAX_COOLDOWN_MS}`);
  if (input.maxTurns > MAX_TURNS) issues.push(`AI NPC maxTurns must be at most ${MAX_TURNS}`);
  if (input.maxMessageChars > MAX_MESSAGE_CHARS) issues.push(`AI NPC maxMessageChars must be at most ${MAX_MESSAGE_CHARS}`);
  if (input.browserSecretExposure) issues.push("AI NPC provider secret must not be exposed to browser");
  if (input.allowedMutationDomains.length > 0) issues.push("AI NPC allowedMutationDomains must be empty");

  return {
    policyVersion: AI_NPC_RUNTIME_POLICY_VERSION,
    valid: issues.length === 0,
    enabled: input.enabled && input.providerConfigured && issues.length === 0,
    issues,
    runtimePolicy: {
      npcPerMap: 1,
      serverOnly: true,
      onDemand: true,
      backgroundLoop: false,
      playerCanCreateAgent: false,
      maxActionsPerTurn: 1,
      allowedActions: AI_NPC_ACTIONS,
      allowedMutationDomains: [],
    },
  };
}

export function validateAiNpcTurnBoundary(input: AiNpcTurnBoundaryInput) {
  const issues: string[] = [];
  normalizeText(input.playerId, "playerId");
  normalizeText(input.mapId, "mapId");
  normalizeText(input.npcId, "npcId");
  if (input.requestSource !== "player-interaction") issues.push("AI NPC turn must be player-interaction sourced");
  if (!Number.isFinite(input.distance) || input.distance < 0) issues.push("AI NPC turn distance must be finite and non-negative");
  if (!AI_NPC_ACTIONS.includes(input.action)) issues.push(`AI NPC action is not allow-listed: ${input.action}`);
  if (input.requestedMutations.length > 0) issues.push("AI NPC turn cannot request direct game mutations");
  return { valid: issues.length === 0, issues, acceptedAction: issues.length === 0 ? input.action : "none" as const };
}
