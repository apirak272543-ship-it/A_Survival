import { AI_NPC_RESPONSE_SCHEMA, DEFAULT_AI_NPC_MODEL, SPECIAL_AI_NPC_MAPS, readAiNpcConfig, type AiNpcConfig } from "../aiNpcService";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const AI_NPC_PROVIDER_GENERATOR_ID = "ai-npc-provider-audit";
export const AI_NPC_PROVIDER_GENERATOR_VERSION = "1.0.0";
export const AI_NPC_PROVIDER_RULES_VERSION = "g06.v1";
export const AI_NPC_PROVIDER_MAX_SAMPLE_COUNT = 8;
export const AI_NPC_PROVIDER_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

export type AiNpcProviderInput = {
  seed: string;
  sampleCount?: number;
};

export type AiNpcProviderSources = {
  config: AiNpcConfig;
  allowedMaps: readonly string[];
  endpoint: string;
  serverOnly: boolean;
  onDemand: boolean;
  browserSecretAllowed: boolean;
  backgroundLoopAllowed: boolean;
  fallbackReasons: readonly string[];
  fallbackActionType: "none" | "allow-listed-action";
  responseRequiredFields: readonly string[];
};

export type AiNpcProviderIssueCode =
  | "map-count"
  | "duplicate-map"
  | "map-id-invalid"
  | "unsupported-map"
  | "provider-invalid"
  | "model-missing"
  | "endpoint-invalid"
  | "default-enabled"
  | "action-cap-invalid"
  | "cooldown-cap-invalid"
  | "turn-cap-invalid"
  | "timeout-cap-invalid"
  | "message-cap-invalid"
  | "server-only-violation"
  | "on-demand-violation"
  | "browser-secret-allowed"
  | "background-loop-allowed"
  | "fallback-reason-missing"
  | "fallback-action-unsafe"
  | "response-schema-incomplete";

export type AiNpcProviderSummary = {
  allowedMapCount: number;
  uniqueAllowedMapCount: number;
  allowedMapIds: string[];
  provider: AiNpcConfig["provider"];
  model: string;
  defaultEnabled: boolean;
  maxActionsPerTurn: number;
  cooldownMs: number;
  maxTurns: number;
  timeoutMs: number;
  maxMessageChars: number;
  fallbackReasonCount: number;
  responseRequiredFields: string[];
  policy: {
    oneSpecialNpcPerMap: true;
    serverOnly: true;
    onDemand: true;
    defaultDisabled: true;
    browserSecretAllowed: false;
    backgroundLoopAllowed: false;
    maxActionsPerTurn: 1;
    fallbackIsNonMutating: true;
    outputIsAuditOnly: true;
  };
  issueCounts: Record<string, number>;
  sourceContentHash: string;
};

export type AiNpcProviderAudit = {
  artifact: GeneratorArtifact<AiNpcProviderInput, AiNpcProviderSummary>;
  graph: DependencyGraphValidation;
  summary: AiNpcProviderSummary;
};

const REQUIRED_FALLBACK_REASONS = ["disabled", "unsupported-map", "invalid-input", "cooldown", "provider-error", "invalid-provider-output"] as const;
const REQUIRED_RESPONSE_FIELDS = ["speech", "mood", "action"] as const;

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length >= 1;
}

function makeArtifact(input: AiNpcProviderInput, summary: AiNpcProviderSummary): GeneratorArtifact<AiNpcProviderInput, AiNpcProviderSummary> {
  const artifact: GeneratorArtifact<AiNpcProviderInput, AiNpcProviderSummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: AI_NPC_PROVIDER_GENERATOR_ID,
    generatorVersion: AI_NPC_PROVIDER_GENERATOR_VERSION,
    kind: "mob",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: AI_NPC_PROVIDER_GENERATOR_ID,
      generatorVersion: AI_NPC_PROVIDER_GENERATOR_VERSION,
      seed: input.seed,
      source: "backend-generator",
      generatedAt: 0,
    },
  };
  artifact.contentHash = calculateGeneratorContentHash(artifact);
  return artifact;
}

function makeNode(input: { key: string; kind: GeneratorKind; contentHash: string; dependencies?: GeneratorDependency[] }): DependencyGraphNode {
  return {
    key: input.key,
    kind: input.kind,
    generatorId: AI_NPC_PROVIDER_GENERATOR_ID,
    generatorVersion: AI_NPC_PROVIDER_GENERATOR_VERSION,
    schemaVersion: AI_NPC_PROVIDER_RULES_VERSION,
    seed: "g06",
    rulesVersion: AI_NPC_PROVIDER_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: AiNpcProviderInput): Required<AiNpcProviderInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("G-06 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? AI_NPC_PROVIDER_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > AI_NPC_PROVIDER_MAX_SAMPLE_COUNT) throw new Error(`G-06 sampleCount must be an integer from 1 to ${AI_NPC_PROVIDER_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

export function readActiveAiNpcProviderSources(): AiNpcProviderSources {
  return {
    config: readAiNpcConfig({}),
    allowedMaps: Array.from(SPECIAL_AI_NPC_MAPS),
    endpoint: AI_NPC_PROVIDER_ENDPOINT,
    serverOnly: true,
    onDemand: true,
    browserSecretAllowed: false,
    backgroundLoopAllowed: false,
    fallbackReasons: Array.from(REQUIRED_FALLBACK_REASONS),
    fallbackActionType: "none",
    responseRequiredFields: Array.from(AI_NPC_RESPONSE_SCHEMA.required),
  };
}

export function buildAiNpcProviderDependencyGraphFromSources(input: AiNpcProviderInput, sources: AiNpcProviderSources): AiNpcProviderAudit {
  const normalizedInput = normalizeInput(input);
  const allowedMaps = Array.from(sources.allowedMaps);
  const uniqueAllowedMaps = new Set(allowedMaps);
  const issueCounts: Record<string, number> = {};
  const mapIssueKeys: Array<{ key: string; codes: AiNpcProviderIssueCode[] }> = [];
  const configIssueKeys: Array<{ key: string; codes: AiNpcProviderIssueCode[] }> = [];

  if (allowedMaps.length < 1 || allowedMaps.length > 1) {
    increment(issueCounts, "map-count");
    mapIssueKeys.push({ key: "maps:g06", codes: ["map-count"] });
  }
  for (const mapId of allowedMaps) {
    const issueCodes: AiNpcProviderIssueCode[] = [];
    if (uniqueAllowedMaps.size !== allowedMaps.length) issueCodes.push("duplicate-map");
    if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(mapId)) issueCodes.push("map-id-invalid");
    if (mapId !== "obsidian-frontier") issueCodes.push("unsupported-map");
    for (const code of issueCodes) increment(issueCounts, code);
    if (issueCodes.length > 0) mapIssueKeys.push({ key: `map:${mapId}`, codes: issueCodes });
  }

  const configIssues: AiNpcProviderIssueCode[] = [];
  if (sources.config.provider !== "gemini") configIssues.push("provider-invalid");
  if (!hasText(sources.config.model)) configIssues.push("model-missing");
  if (sources.endpoint !== AI_NPC_PROVIDER_ENDPOINT) configIssues.push("endpoint-invalid");
  if (sources.config.enabled) configIssues.push("default-enabled");
  if (sources.config.maxActionsPerTurn !== 1) configIssues.push("action-cap-invalid");
  if (!Number.isInteger(sources.config.cooldownMs) || sources.config.cooldownMs < 1_000 || sources.config.cooldownMs > 120_000) configIssues.push("cooldown-cap-invalid");
  if (!Number.isInteger(sources.config.maxTurns) || sources.config.maxTurns < 1 || sources.config.maxTurns > 16) configIssues.push("turn-cap-invalid");
  if (!Number.isInteger(sources.config.timeoutMs) || sources.config.timeoutMs < 1_000 || sources.config.timeoutMs > 20_000) configIssues.push("timeout-cap-invalid");
  if (!Number.isInteger(sources.config.maxMessageChars) || sources.config.maxMessageChars < 32 || sources.config.maxMessageChars > 1_000) configIssues.push("message-cap-invalid");
  if (!sources.serverOnly) configIssues.push("server-only-violation");
  if (!sources.onDemand) configIssues.push("on-demand-violation");
  if (sources.browserSecretAllowed) configIssues.push("browser-secret-allowed");
  if (sources.backgroundLoopAllowed) configIssues.push("background-loop-allowed");
  for (const reason of REQUIRED_FALLBACK_REASONS) if (!sources.fallbackReasons.includes(reason)) configIssues.push("fallback-reason-missing");
  if (sources.fallbackActionType !== "none") configIssues.push("fallback-action-unsafe");
  if (!REQUIRED_RESPONSE_FIELDS.every(field => sources.responseRequiredFields.includes(field))) configIssues.push("response-schema-incomplete");
  for (const code of configIssues) increment(issueCounts, code);
  if (configIssues.length > 0) configIssueKeys.push({ key: "config:g06", codes: configIssues });

  const summary: AiNpcProviderSummary = {
    allowedMapCount: allowedMaps.length,
    uniqueAllowedMapCount: uniqueAllowedMaps.size,
    allowedMapIds: Array.from(uniqueAllowedMaps).sort(),
    provider: sources.config.provider,
    model: sources.config.model || DEFAULT_AI_NPC_MODEL,
    defaultEnabled: sources.config.enabled,
    maxActionsPerTurn: sources.config.maxActionsPerTurn,
    cooldownMs: sources.config.cooldownMs,
    maxTurns: sources.config.maxTurns,
    timeoutMs: sources.config.timeoutMs,
    maxMessageChars: sources.config.maxMessageChars,
    fallbackReasonCount: sources.fallbackReasons.length,
    responseRequiredFields: Array.from(sources.responseRequiredFields).sort(),
    policy: {
      oneSpecialNpcPerMap: true,
      serverOnly: true,
      onDemand: true,
      defaultDisabled: true,
      browserSecretAllowed: false,
      backgroundLoopAllowed: false,
      maxActionsPerTurn: 1,
      fallbackIsNonMutating: true,
      outputIsAuditOnly: true,
    },
    issueCounts,
    sourceContentHash: hashStableJson({
      config: sources.config,
      allowedMaps,
      endpoint: sources.endpoint,
      serverOnly: sources.serverOnly,
      onDemand: sources.onDemand,
      browserSecretAllowed: sources.browserSecretAllowed,
      backgroundLoopAllowed: sources.backgroundLoopAllowed,
      fallbackReasons: Array.from(sources.fallbackReasons).sort(),
      fallbackActionType: sources.fallbackActionType,
      responseRequiredFields: Array.from(sources.responseRequiredFields).sort(),
    } as unknown as JsonValue),
  };

  const mapHash = hashStableJson({ allowedMaps } as unknown as JsonValue);
  const configHash = hashStableJson({ config: sources.config, endpoint: sources.endpoint, serverOnly: sources.serverOnly, onDemand: sources.onDemand, browserSecretAllowed: sources.browserSecretAllowed, backgroundLoopAllowed: sources.backgroundLoopAllowed, fallbackReasons: sources.fallbackReasons, fallbackActionType: sources.fallbackActionType, responseRequiredFields: sources.responseRequiredFields } as unknown as JsonValue);
  const nodes: DependencyGraphNode[] = [
    makeNode({ key: "ai-npc-maps:g06", kind: "world", contentHash: mapHash }),
    makeNode({ key: "ai-npc-config:g06", kind: "mob", contentHash: configHash }),
  ];
  const rootDependencies: GeneratorDependency[] = [
    { key: "ai-npc-maps:g06", kind: "world", required: true, generatorId: AI_NPC_PROVIDER_GENERATOR_ID, generatorVersion: AI_NPC_PROVIDER_GENERATOR_VERSION, contentHash: mapHash },
    { key: "ai-npc-config:g06", kind: "mob", required: true, generatorId: AI_NPC_PROVIDER_GENERATOR_ID, generatorVersion: AI_NPC_PROVIDER_GENERATOR_VERSION, contentHash: configHash },
  ];
  const blockerCodes = [...mapIssueKeys, ...configIssueKeys].flatMap(entry => entry.codes.map(code => `${entry.key}:${code}`));
  for (const blockerCode of blockerCodes) rootDependencies.push({ key: `blocker:g06:${blockerCode}`, kind: "other", required: true });
  const root = makeNode({ key: "ai-npc-provider:g06", kind: "mob", contentHash: hashStableJson(summary as unknown as JsonValue), dependencies: rootDependencies });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildAiNpcProviderDependencyGraph(input: AiNpcProviderInput = { seed: "ai-npc-provider-g06" }): AiNpcProviderAudit {
  return buildAiNpcProviderDependencyGraphFromSources(input, readActiveAiNpcProviderSources());
}
