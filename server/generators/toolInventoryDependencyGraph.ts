import { animationProfileGeneratorPlugin, createAnimationProfileRegistry } from "./animationProfileGenerator";
import { contentCatalogGeneratorPlugin, createContentCatalogRegistry } from "./contentCatalogGenerator";
import { createQuestProgressionRegistry, questProgressionGeneratorPlugin } from "./questProgressionGenerator";
import { createStructureGeneratorRegistry, structureGeneratorPlugin } from "./structureGenerator";
import { createTexturePackBuilderRegistry, texturePackBuilderPlugin } from "./texturePackBuilder";
import { createUniversalItemRegistry, universalItemGeneratorPlugin } from "./universalItemEngine";
import { hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { calculateGeneratorContentHash } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const TOOL_INVENTORY_GENERATOR_ID = "tool-inventory-audit";
export const TOOL_INVENTORY_GENERATOR_VERSION = "1.0.0";
export const TOOL_INVENTORY_RULES_VERSION = "o04.v1";
export const TOOL_INVENTORY_MAX_SAMPLE_COUNT = 64;

export type ToolInventoryInput = {
  seed: string;
  sampleCount?: number;
};

type GeneratorPluginLike = {
  id: string;
  version: string;
  kind: GeneratorKind;
  generate: (...args: never[]) => unknown;
  validate: (...args: never[]) => unknown;
  preview?: (...args: never[]) => unknown;
};

export type BackendGeneratorToolSource = {
  toolId: string;
  sourcePath: string;
  plugin: GeneratorPluginLike;
  registryVersions: readonly string[];
  runtimeCallers: readonly string[];
  generatedOnce: boolean;
  previewReadOnly: boolean;
  runtimeImportAllowed: boolean;
  playerVisible: boolean;
  cacheWriteAllowed: boolean;
  databaseWriteAllowed: boolean;
  binaryWriteAllowed: boolean;
  runtimePublishAllowed: boolean;
};

export type RuntimeDataHelperSource = {
  toolId: string;
  sourcePath: string;
  callers: readonly string[];
  classification: "canonical-runtime-data-helper";
  generatedOnce: false;
  playerVisible: false;
  cacheWriteAllowed: false;
  databaseWriteAllowed: false;
  binaryWriteAllowed: false;
  runtimePublishAllowed: false;
};

export type ToolInventorySources = {
  backendGenerators: readonly BackendGeneratorToolSource[];
  runtimeDataHelpers: readonly RuntimeDataHelperSource[];
};

export type ToolInventoryIssueCode =
  | "tool-count"
  | "duplicate-tool-id"
  | "tool-id-invalid"
  | "registry-missing"
  | "registry-version-mismatch"
  | "generate-missing"
  | "validate-missing"
  | "preview-missing"
  | "runtime-caller"
  | "generated-once-false"
  | "preview-not-readonly"
  | "runtime-import-allowed"
  | "player-visible"
  | "cache-write-allowed"
  | "database-write-allowed"
  | "binary-write-allowed"
  | "runtime-publish-allowed"
  | "helper-caller-missing"
  | "helper-boundary-violation";

export type ToolInventorySummary = {
  backendGeneratorCount: number;
  sampledBackendGeneratorCount: number;
  runtimeDataHelperCount: number;
  uniqueToolIdCount: number;
  registeredGeneratorCount: number;
  generateHookCount: number;
  validateHookCount: number;
  previewHookCount: number;
  backendOnlyCount: number;
  runtimeCallerCount: number;
  playerVisibleCount: number;
  cacheWriteCount: number;
  databaseWriteCount: number;
  binaryWriteCount: number;
  runtimePublishCount: number;
  toolIds: string[];
  helperPaths: string[];
  issueCounts: Record<string, number>;
  dependencyPolicy: {
    backendGeneratorsMustBeRegistered: true;
    backendGeneratorsGenerateOnce: true;
    previewsAreReadOnly: true;
    runtimeImportsAreClosed: true;
    playerUiExposureIsClosed: true;
    cacheWritesAreClosed: true;
    databaseWritesAreClosed: true;
    binaryWritesAreClosed: true;
    runtimePublishIsClosed: true;
    runtimeDataHelpersAreMetadataOnly: true;
    outputIsAuditOnly: true;
  };
  sourceContentHash: string;
};

export type ToolInventoryAudit = {
  artifact: GeneratorArtifact<ToolInventoryInput, ToolInventorySummary>;
  graph: DependencyGraphValidation;
  summary: ToolInventorySummary;
};

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function makeArtifact(input: ToolInventoryInput, summary: ToolInventorySummary): GeneratorArtifact<ToolInventoryInput, ToolInventorySummary> {
  const artifact: GeneratorArtifact<ToolInventoryInput, ToolInventorySummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: TOOL_INVENTORY_GENERATOR_ID,
    generatorVersion: TOOL_INVENTORY_GENERATOR_VERSION,
    kind: "other",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: TOOL_INVENTORY_GENERATOR_ID,
      generatorVersion: TOOL_INVENTORY_GENERATOR_VERSION,
      seed: input.seed,
      source: "backend-generator",
      generatedAt: 0,
    },
  };
  artifact.contentHash = calculateGeneratorContentHash(artifact);
  return artifact;
}

function makeNode(input: { key: string; kind: GeneratorKind; generatorId?: string; generatorVersion?: string; contentHash: string; dependencies?: GeneratorDependency[] }): DependencyGraphNode {
  return {
    key: input.key,
    kind: input.kind,
    generatorId: input.generatorId ?? TOOL_INVENTORY_GENERATOR_ID,
    generatorVersion: input.generatorVersion ?? TOOL_INVENTORY_GENERATOR_VERSION,
    schemaVersion: TOOL_INVENTORY_RULES_VERSION,
    seed: "o04",
    rulesVersion: TOOL_INVENTORY_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: ToolInventoryInput): Required<ToolInventoryInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("O-04 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? TOOL_INVENTORY_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > TOOL_INVENTORY_MAX_SAMPLE_COUNT) throw new Error(`O-04 sampleCount must be an integer from 1 to ${TOOL_INVENTORY_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

function defaultBackendTool(input: { toolId: string; sourcePath: string; plugin: GeneratorPluginLike; registryVersions: readonly string[] }): BackendGeneratorToolSource {
  return {
    ...input,
    runtimeCallers: [],
    generatedOnce: true,
    previewReadOnly: true,
    runtimeImportAllowed: false,
    playerVisible: false,
    cacheWriteAllowed: false,
    databaseWriteAllowed: false,
    binaryWriteAllowed: false,
    runtimePublishAllowed: false,
  };
}

export function readActiveToolInventorySources(): ToolInventorySources {
  return {
    backendGenerators: [
      defaultBackendTool({ toolId: animationProfileGeneratorPlugin.id, sourcePath: "server/generators/animationProfileGenerator.ts", plugin: animationProfileGeneratorPlugin, registryVersions: createAnimationProfileRegistry().versions(animationProfileGeneratorPlugin.id) }),
      defaultBackendTool({ toolId: contentCatalogGeneratorPlugin.id, sourcePath: "server/generators/contentCatalogGenerator.ts", plugin: contentCatalogGeneratorPlugin, registryVersions: createContentCatalogRegistry().versions(contentCatalogGeneratorPlugin.id) }),
      defaultBackendTool({ toolId: questProgressionGeneratorPlugin.id, sourcePath: "server/generators/questProgressionGenerator.ts", plugin: questProgressionGeneratorPlugin, registryVersions: createQuestProgressionRegistry().versions(questProgressionGeneratorPlugin.id) }),
      defaultBackendTool({ toolId: structureGeneratorPlugin.id, sourcePath: "server/generators/structureGenerator.ts", plugin: structureGeneratorPlugin, registryVersions: createStructureGeneratorRegistry().versions(structureGeneratorPlugin.id) }),
      defaultBackendTool({ toolId: texturePackBuilderPlugin.id, sourcePath: "server/generators/texturePackBuilder.ts", plugin: texturePackBuilderPlugin, registryVersions: createTexturePackBuilderRegistry().versions(texturePackBuilderPlugin.id) }),
      defaultBackendTool({ toolId: universalItemGeneratorPlugin.id, sourcePath: "server/generators/universalItemEngine.ts", plugin: universalItemGeneratorPlugin, registryVersions: createUniversalItemRegistry().versions(universalItemGeneratorPlugin.id) }),
    ],
    runtimeDataHelpers: [
      {
        toolId: "plant-catalog-runtime-data",
        sourcePath: "client/src/game/tools/plantCatalogGenerator.ts",
        callers: ["client/src/game/systems/worldFarmSystem.ts", "client/src/game/scene.ts"],
        classification: "canonical-runtime-data-helper",
        generatedOnce: false,
        playerVisible: false,
        cacheWriteAllowed: false,
        databaseWriteAllowed: false,
        binaryWriteAllowed: false,
        runtimePublishAllowed: false,
      },
    ],
  };
}

function auditBackendTool(tool: BackendGeneratorToolSource, issueCodes: ToolInventoryIssueCode[]) {
  if (!/^[a-z0-9][a-z0-9.-]{2,63}$/.test(tool.toolId)) issueCodes.push("tool-id-invalid");
  if (!tool.registryVersions.length) issueCodes.push("registry-missing");
  if (!tool.registryVersions.includes(tool.plugin.version)) issueCodes.push("registry-version-mismatch");
  if (typeof tool.plugin.generate !== "function") issueCodes.push("generate-missing");
  if (typeof tool.plugin.validate !== "function") issueCodes.push("validate-missing");
  if (typeof tool.plugin.preview !== "function") issueCodes.push("preview-missing");
  if (tool.runtimeCallers.length > 0) issueCodes.push("runtime-caller");
  if (!tool.generatedOnce) issueCodes.push("generated-once-false");
  if (!tool.previewReadOnly) issueCodes.push("preview-not-readonly");
  if (tool.runtimeImportAllowed) issueCodes.push("runtime-import-allowed");
  if (tool.playerVisible) issueCodes.push("player-visible");
  if (tool.cacheWriteAllowed) issueCodes.push("cache-write-allowed");
  if (tool.databaseWriteAllowed) issueCodes.push("database-write-allowed");
  if (tool.binaryWriteAllowed) issueCodes.push("binary-write-allowed");
  if (tool.runtimePublishAllowed) issueCodes.push("runtime-publish-allowed");
}

function auditRuntimeHelper(helper: RuntimeDataHelperSource, issueCounts: Record<string, number>, helperIssueKeys: Array<{ key: string; codes: ToolInventoryIssueCode[] }>) {
  const issueCodes: ToolInventoryIssueCode[] = [];
  if (helper.callers.length === 0) issueCodes.push("helper-caller-missing");
  if (helper.generatedOnce || helper.playerVisible || helper.cacheWriteAllowed || helper.databaseWriteAllowed || helper.binaryWriteAllowed || helper.runtimePublishAllowed) issueCodes.push("helper-boundary-violation");
  for (const code of issueCodes) increment(issueCounts, code);
  if (issueCodes.length > 0) helperIssueKeys.push({ key: `helper:${helper.toolId}`, codes: issueCodes });
}

export function buildToolInventoryDependencyGraphFromSources(input: ToolInventoryInput, sources: ToolInventorySources): ToolInventoryAudit {
  const normalizedInput = normalizeInput(input);
  const backendGenerators = Array.from(sources.backendGenerators);
  const runtimeDataHelpers = Array.from(sources.runtimeDataHelpers);
  const sampledGenerators = backendGenerators.slice(0, normalizedInput.sampleCount);
  const issueCounts: Record<string, number> = {};
  const toolIds = new Set<string>();
  const toolIssueKeys: Array<{ key: string; codes: ToolInventoryIssueCode[] }> = [];
  const helperIssueKeys: Array<{ key: string; codes: ToolInventoryIssueCode[] }> = [];
  let registeredGeneratorCount = 0;
  let generateHookCount = 0;
  let validateHookCount = 0;
  let previewHookCount = 0;
  let backendOnlyCount = 0;
  let runtimeCallerCount = 0;
  let playerVisibleCount = 0;
  let cacheWriteCount = 0;
  let databaseWriteCount = 0;
  let binaryWriteCount = 0;
  let runtimePublishCount = 0;

  if (backendGenerators.length > TOOL_INVENTORY_MAX_SAMPLE_COUNT) increment(issueCounts, "tool-count");
  for (const tool of backendGenerators) {
    const issueCodes: ToolInventoryIssueCode[] = [];
    if (toolIds.has(tool.toolId)) issueCodes.push("duplicate-tool-id");
    toolIds.add(tool.toolId);
    if (tool.registryVersions.includes(tool.plugin.version)) registeredGeneratorCount += 1;
    if (typeof tool.plugin.generate === "function") generateHookCount += 1;
    if (typeof tool.plugin.validate === "function") validateHookCount += 1;
    if (typeof tool.plugin.preview === "function") previewHookCount += 1;
    if (tool.runtimeCallers.length === 0 && !tool.runtimeImportAllowed && !tool.playerVisible && !tool.cacheWriteAllowed && !tool.databaseWriteAllowed && !tool.binaryWriteAllowed && !tool.runtimePublishAllowed) backendOnlyCount += 1;
    runtimeCallerCount += tool.runtimeCallers.length;
    if (tool.playerVisible) playerVisibleCount += 1;
    if (tool.cacheWriteAllowed) cacheWriteCount += 1;
    if (tool.databaseWriteAllowed) databaseWriteCount += 1;
    if (tool.binaryWriteAllowed) binaryWriteCount += 1;
    if (tool.runtimePublishAllowed) runtimePublishCount += 1;
    auditBackendTool(tool, issueCodes);
    for (const code of issueCodes) increment(issueCounts, code);
    if (issueCodes.length > 0) toolIssueKeys.push({ key: `tool:${tool.toolId}`, codes: issueCodes });
  }
  if (backendGenerators.length > TOOL_INVENTORY_MAX_SAMPLE_COUNT) toolIssueKeys.push({ key: "catalog:o04", codes: ["tool-count"] });
  for (const helper of runtimeDataHelpers) auditRuntimeHelper(helper, issueCounts, helperIssueKeys);

  const descriptors = backendGenerators.map(tool => ({
    toolId: tool.toolId,
    sourcePath: tool.sourcePath,
    pluginId: tool.plugin.id,
    pluginVersion: tool.plugin.version,
    kind: tool.plugin.kind,
    registryVersions: Array.from(tool.registryVersions),
    runtimeCallers: Array.from(tool.runtimeCallers),
    generatedOnce: tool.generatedOnce,
    previewReadOnly: tool.previewReadOnly,
    runtimeImportAllowed: tool.runtimeImportAllowed,
    playerVisible: tool.playerVisible,
    cacheWriteAllowed: tool.cacheWriteAllowed,
    databaseWriteAllowed: tool.databaseWriteAllowed,
    binaryWriteAllowed: tool.binaryWriteAllowed,
    runtimePublishAllowed: tool.runtimePublishAllowed,
  }));
  const helperDescriptors = runtimeDataHelpers.map(helper => ({ ...helper, callers: Array.from(helper.callers) }));
  const nodes: DependencyGraphNode[] = sampledGenerators.map(tool => makeNode({ key: `tool:${tool.toolId}`, kind: tool.plugin.kind, generatorId: tool.plugin.id, generatorVersion: tool.plugin.version, contentHash: hashStableJson(descriptors.find(descriptor => descriptor.toolId === tool.toolId)! as unknown as JsonValue) }));
  const rootDependencies: GeneratorDependency[] = sampledGenerators.map(tool => ({
    key: `tool:${tool.toolId}`,
    kind: tool.plugin.kind,
    required: true,
    generatorId: tool.plugin.id,
    generatorVersion: tool.plugin.version,
    contentHash: hashStableJson(descriptors.find(descriptor => descriptor.toolId === tool.toolId)! as unknown as JsonValue),
  }));
  const blockerCodes = [...toolIssueKeys, ...helperIssueKeys].flatMap(entry => entry.codes.map(code => `${entry.key}:${code}`));
  for (const blockerCode of blockerCodes) rootDependencies.push({ key: `blocker:o04:${blockerCode}`, kind: "other", required: true });

  const summary: ToolInventorySummary = {
    backendGeneratorCount: backendGenerators.length,
    sampledBackendGeneratorCount: sampledGenerators.length,
    runtimeDataHelperCount: runtimeDataHelpers.length,
    uniqueToolIdCount: toolIds.size,
    registeredGeneratorCount,
    generateHookCount,
    validateHookCount,
    previewHookCount,
    backendOnlyCount,
    runtimeCallerCount,
    playerVisibleCount,
    cacheWriteCount,
    databaseWriteCount,
    binaryWriteCount,
    runtimePublishCount,
    toolIds: Array.from(toolIds).sort(),
    helperPaths: runtimeDataHelpers.map(helper => helper.sourcePath).sort(),
    issueCounts,
    dependencyPolicy: {
      backendGeneratorsMustBeRegistered: true,
      backendGeneratorsGenerateOnce: true,
      previewsAreReadOnly: true,
      runtimeImportsAreClosed: true,
      playerUiExposureIsClosed: true,
      cacheWritesAreClosed: true,
      databaseWritesAreClosed: true,
      binaryWritesAreClosed: true,
      runtimePublishIsClosed: true,
      runtimeDataHelpersAreMetadataOnly: true,
      outputIsAuditOnly: true,
    },
    sourceContentHash: hashStableJson({ descriptors, helperDescriptors } as unknown as JsonValue),
  };
  const root = makeNode({ key: "tool-inventory:o04", kind: "other", contentHash: hashStableJson(summary as unknown as JsonValue), dependencies: rootDependencies });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact: GeneratorArtifact<ToolInventoryInput, ToolInventorySummary> = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildToolInventoryDependencyGraph(input: ToolInventoryInput = { seed: "tool-inventory-o04" }): ToolInventoryAudit {
  return buildToolInventoryDependencyGraphFromSources(input, readActiveToolInventorySources());
}
