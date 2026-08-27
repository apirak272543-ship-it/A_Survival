import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";

export const CONTENT_GENERATION_SUITE_RULES_VERSION = "content-generation-suite-rules.v1" as const;
export const CONTENT_GENERATION_SUITE_CONTRACT_VERSION = "0.1.0" as const;
const MAX_PLUGINS = 64;
const MAX_CAPABILITIES_PER_PLUGIN = 8;

export const REQUIRED_CONTENT_GENERATION_CAPABILITIES = [
  "definition",
  "model",
  "texture",
  "skin",
  "variant",
  "gameplay",
] as const;

export type ContentGenerationCapability = (typeof REQUIRED_CONTENT_GENERATION_CAPABILITIES)[number];
export type ContentGenerationSuiteReasonCode =
  | "INVALID_SUITE_ID"
  | "INVALID_SUITE_VERSION"
  | "NO_PLUGINS"
  | "PLUGIN_BOUNDS_EXCEEDED"
  | "INVALID_PLUGIN_ID"
  | "INVALID_PLUGIN_VERSION"
  | "DUPLICATE_PLUGIN_ID"
  | "UNKNOWN_CAPABILITY"
  | "CAPABILITY_BOUNDS_EXCEEDED"
  | "PLUGIN_PROVENANCE_MISSING"
  | "RUNTIME_POLICY_ENABLED"
  | "MISSING_CAPABILITY";

export type ContentGenerationSuitePlugin = {
  id: string;
  version: string;
  kind: GeneratorKind;
  capabilities: readonly string[];
  provenanceRefs: readonly string[];
  source: "backend-generator" | "external" | "reference-only";
  runtimePolicy: {
    runtimeImportAllowed: boolean;
    playerVisible: boolean;
    cacheable: boolean;
  };
};

export type ContentGenerationSuiteInput = {
  suiteId: string;
  suiteVersion: string;
  plugins: readonly ContentGenerationSuitePlugin[];
  rulesVersion?: string;
};

export type ContentGenerationSuiteReason = {
  code: ContentGenerationSuiteReasonCode;
  detail: string;
};

export type ContentGenerationSuiteOutput = {
  artifact: {
    suiteId: string;
    suiteVersion: string;
    contractVersion: typeof CONTENT_GENERATION_SUITE_CONTRACT_VERSION;
    rulesVersion: typeof CONTENT_GENERATION_SUITE_RULES_VERSION;
    pluginCount: number;
    capabilityCount: number;
    declarationHash: string;
  };
  summary: {
    pluginCount: number;
    requiredCapabilityCount: number;
    coveredCapabilityCount: number;
    missingCapabilities: ContentGenerationCapability[];
    provenanceCompletePluginCount: number;
    runtimeSafePluginCount: number;
    issueCount: number;
    valid: boolean;
  };
  plugins: Array<{
    id: string;
    version: string;
    kind: GeneratorKind;
    capabilities: ContentGenerationCapability[];
    provenanceComplete: boolean;
    runtimeSafe: boolean;
  }>;
  reasons: ContentGenerationSuiteReason[];
  runtimePolicy: {
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
};

function sortedUnique(values: readonly string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function validIdentifier(value: string) {
  return /^[a-z0-9][a-z0-9._-]{1,63}$/.test(value);
}

function addReason(reasons: ContentGenerationSuiteReason[], code: ContentGenerationSuiteReasonCode, detail: string) {
  reasons.push({ code, detail });
}

export function validateContentGenerationSuite(input: ContentGenerationSuiteInput): ContentGenerationSuiteOutput {
  const rulesVersion = input.rulesVersion ?? CONTENT_GENERATION_SUITE_RULES_VERSION;
  if (rulesVersion !== CONTENT_GENERATION_SUITE_RULES_VERSION) throw new Error(`Unsupported content generation suite rules version: ${rulesVersion}`);

  const reasons: ContentGenerationSuiteReason[] = [];
  if (!validIdentifier(input.suiteId)) addReason(reasons, "INVALID_SUITE_ID", "suiteId must use a lowercase identifier with 2–64 characters");
  if (!/^\d+\.\d+\.\d+$/.test(input.suiteVersion)) addReason(reasons, "INVALID_SUITE_VERSION", "suiteVersion must use semver x.y.z");
  if (input.plugins.length === 0) addReason(reasons, "NO_PLUGINS", "at least one generator plugin declaration is required");
  if (input.plugins.length > MAX_PLUGINS) addReason(reasons, "PLUGIN_BOUNDS_EXCEEDED", `suite accepts at most ${MAX_PLUGINS} plugin declarations`);

  const pluginIds = new Set<string>();
  const coveredCapabilities = new Set<ContentGenerationCapability>();
  const plugins = input.plugins.slice(0, MAX_PLUGINS).map(plugin => {
    const capabilities = sortedUnique(plugin.capabilities);
    const knownCapabilities: ContentGenerationCapability[] = [];
    if (!validIdentifier(plugin.id)) addReason(reasons, "INVALID_PLUGIN_ID", `plugin id ${plugin.id || "<empty>"} is not a valid lowercase identifier`);
    if (!/^\d+\.\d+\.\d+$/.test(plugin.version)) addReason(reasons, "INVALID_PLUGIN_VERSION", `plugin ${plugin.id || "<empty>"} version must use semver x.y.z`);
    if (pluginIds.has(plugin.id)) addReason(reasons, "DUPLICATE_PLUGIN_ID", `plugin id is declared more than once: ${plugin.id}`);
    pluginIds.add(plugin.id);
    if (capabilities.length > MAX_CAPABILITIES_PER_PLUGIN) addReason(reasons, "CAPABILITY_BOUNDS_EXCEEDED", `plugin ${plugin.id || "<empty>"} declares more than ${MAX_CAPABILITIES_PER_PLUGIN} capabilities`);
    for (const capability of capabilities.slice(0, MAX_CAPABILITIES_PER_PLUGIN)) {
      if ((REQUIRED_CONTENT_GENERATION_CAPABILITIES as readonly string[]).includes(capability)) {
        knownCapabilities.push(capability as ContentGenerationCapability);
        coveredCapabilities.add(capability as ContentGenerationCapability);
      } else {
        addReason(reasons, "UNKNOWN_CAPABILITY", `plugin ${plugin.id || "<empty>"} declares unknown capability ${capability}`);
      }
    }
    const provenanceComplete = plugin.source === "backend-generator" && plugin.provenanceRefs.length > 0;
    if (!provenanceComplete) addReason(reasons, "PLUGIN_PROVENANCE_MISSING", `plugin ${plugin.id || "<empty>"} requires backend-generator source and at least one provenance reference`);
    const runtimeSafe = plugin.runtimePolicy.runtimeImportAllowed === false && plugin.runtimePolicy.playerVisible === false && plugin.runtimePolicy.cacheable === false;
    if (!runtimeSafe) addReason(reasons, "RUNTIME_POLICY_ENABLED", `plugin ${plugin.id || "<empty>"} enables runtime import, player visibility or cache`);
    return { id: plugin.id, version: plugin.version, kind: plugin.kind, capabilities: knownCapabilities.sort(), provenanceComplete, runtimeSafe };
  });

  const missingCapabilities = REQUIRED_CONTENT_GENERATION_CAPABILITIES.filter(capability => !coveredCapabilities.has(capability));
  for (const capability of missingCapabilities) addReason(reasons, "MISSING_CAPABILITY", `suite has no plugin declaration for required capability ${capability}`);

  const uniqueReasons = Array.from(new Map(reasons.map(reason => [`${reason.code}:${reason.detail}`, reason])).values()).sort((left, right) => left.code.localeCompare(right.code) || left.detail.localeCompare(right.detail));
  const declaration = {
    suiteId: input.suiteId,
    suiteVersion: input.suiteVersion,
    rulesVersion,
    plugins: input.plugins.slice(0, MAX_PLUGINS).map(plugin => ({
      id: plugin.id,
      version: plugin.version,
      kind: plugin.kind,
      capabilities: sortedUnique(plugin.capabilities).slice(0, MAX_CAPABILITIES_PER_PLUGIN),
      provenanceRefs: sortedUnique(plugin.provenanceRefs),
      source: plugin.source,
      runtimePolicy: plugin.runtimePolicy,
    })),
  };
  const provenanceCompletePluginCount = plugins.filter(plugin => plugin.provenanceComplete).length;
  const runtimeSafePluginCount = plugins.filter(plugin => plugin.runtimeSafe).length;
  const valid = uniqueReasons.length === 0;
  return {
    artifact: {
      suiteId: input.suiteId,
      suiteVersion: input.suiteVersion,
      contractVersion: CONTENT_GENERATION_SUITE_CONTRACT_VERSION,
      rulesVersion,
      pluginCount: plugins.length,
      capabilityCount: coveredCapabilities.size,
      declarationHash: hashStableJson(declaration as never),
    },
    summary: {
      pluginCount: plugins.length,
      requiredCapabilityCount: REQUIRED_CONTENT_GENERATION_CAPABILITIES.length,
      coveredCapabilityCount: coveredCapabilities.size,
      missingCapabilities,
      provenanceCompletePluginCount,
      runtimeSafePluginCount,
      issueCount: uniqueReasons.length,
      valid,
    },
    plugins,
    reasons: uniqueReasons,
    runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
  };
}
