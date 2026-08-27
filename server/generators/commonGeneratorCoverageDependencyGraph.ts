import { animationProfileGeneratorPlugin, createAnimationProfileRegistry } from "./animationProfileGenerator";
import { contentCatalogGeneratorPlugin, createContentCatalogRegistry } from "./contentCatalogGenerator";
import { createQuestProgressionRegistry, questProgressionGeneratorPlugin } from "./questProgressionGenerator";
import { createStructureGeneratorRegistry, structureGeneratorPlugin } from "./structureGenerator";
import { createTexturePackBuilderRegistry, texturePackBuilderPlugin } from "./texturePackBuilder";
import { createUniversalItemRegistry, universalItemGeneratorPlugin } from "./universalItemEngine";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const COMMON_GENERATOR_COVERAGE_GENERATOR_ID = "common-generator-coverage-audit";
export const COMMON_GENERATOR_COVERAGE_GENERATOR_VERSION = "1.0.0";
export const COMMON_GENERATOR_COVERAGE_RULES_VERSION = "t04.v1";
export const COMMON_GENERATOR_COVERAGE_MAX_PLUGIN_COUNT = 64;

export type CommonGeneratorCoverageInput = {
  seed: string;
  sampleCount?: number;
};

type PluginContract = {
  id: string;
  version: string;
  kind: GeneratorKind;
  generate: (...args: never[]) => unknown;
  validate: (...args: never[]) => unknown;
  preview?: (...args: never[]) => unknown;
};

export type CommonGeneratorPluginSource = {
  domain: "animation" | "content" | "quest" | "structure" | "texture" | "item";
  sourcePath: string;
  plugin: PluginContract;
  registryVersions: readonly string[];
};

export type CommonGeneratorCoverageSources = {
  plugins: readonly CommonGeneratorPluginSource[];
};

export type CommonGeneratorCoverageIssueCode =
  | "plugin-count"
  | "duplicate-plugin-id"
  | "invalid-plugin-id"
  | "invalid-version"
  | "registry-version-mismatch"
  | "registry-version-missing"
  | "unsupported-kind"
  | "generate-missing"
  | "validate-missing"
  | "preview-missing";

export type CommonGeneratorCoverageSummary = {
  pluginCount: number;
  sampleCount: number;
  uniquePluginIdCount: number;
  registeredPluginCount: number;
  previewPluginCount: number;
  generatePluginCount: number;
  validatePluginCount: number;
  kindCounts: Record<string, number>;
  domainCounts: Record<string, number>;
  sourcePaths: string[];
  issueCounts: Record<string, number>;
  runtimePolicy: {
    generatedOnce: true;
    cacheReuseAllowed: true;
    playerVisible: false;
    runtimeImportAllowed: false;
    runtimePublishAllowed: false;
  };
  sourceContentHash: string;
};

export type CommonGeneratorCoverageAudit = {
  artifact: GeneratorArtifact<CommonGeneratorCoverageInput, CommonGeneratorCoverageSummary>;
  graph: DependencyGraphValidation;
  summary: CommonGeneratorCoverageSummary;
};

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function pluginMetadata(source: CommonGeneratorPluginSource) {
  return {
    domain: source.domain,
    sourcePath: source.sourcePath,
    id: source.plugin.id,
    version: source.plugin.version,
    kind: source.plugin.kind,
    registryVersions: Array.from(source.registryVersions),
    hasGenerate: typeof source.plugin.generate === "function",
    hasValidate: typeof source.plugin.validate === "function",
    hasPreview: typeof source.plugin.preview === "function",
  };
}

function auditPlugin(source: CommonGeneratorPluginSource, issueCodes: CommonGeneratorCoverageIssueCode[]) {
  const plugin = source.plugin;
  if (!/^[a-z0-9][a-z0-9.-]{2,63}$/.test(plugin.id)) issueCodes.push("invalid-plugin-id");
  if (!/^\d+\.\d+\.\d+$/.test(plugin.version)) issueCodes.push("invalid-version");
  if (!source.registryVersions.includes(plugin.version)) issueCodes.push("registry-version-mismatch");
  if (source.registryVersions.length === 0) issueCodes.push("registry-version-missing");
  const allowedKinds: readonly GeneratorKind[] = ["world", "biome", "structure", "item", "plant", "mob", "animation", "texture", "quest", "dungeon", "loot", "crafting", "economy", "audio", "weather", "vegetation", "simulation", "migration", "other"];
  if (!allowedKinds.includes(plugin.kind)) issueCodes.push("unsupported-kind");
  if (typeof plugin.generate !== "function") issueCodes.push("generate-missing");
  if (typeof plugin.validate !== "function") issueCodes.push("validate-missing");
  if (typeof plugin.preview !== "function") issueCodes.push("preview-missing");
}

function makeArtifact(input: CommonGeneratorCoverageInput, summary: CommonGeneratorCoverageSummary): GeneratorArtifact<CommonGeneratorCoverageInput, CommonGeneratorCoverageSummary> {
  const artifact: GeneratorArtifact<CommonGeneratorCoverageInput, CommonGeneratorCoverageSummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: COMMON_GENERATOR_COVERAGE_GENERATOR_ID,
    generatorVersion: COMMON_GENERATOR_COVERAGE_GENERATOR_VERSION,
    kind: "other",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: COMMON_GENERATOR_COVERAGE_GENERATOR_ID,
      generatorVersion: COMMON_GENERATOR_COVERAGE_GENERATOR_VERSION,
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
    generatorId: input.generatorId ?? COMMON_GENERATOR_COVERAGE_GENERATOR_ID,
    generatorVersion: input.generatorVersion ?? COMMON_GENERATOR_COVERAGE_GENERATOR_VERSION,
    schemaVersion: COMMON_GENERATOR_COVERAGE_RULES_VERSION,
    seed: "t04",
    rulesVersion: COMMON_GENERATOR_COVERAGE_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: CommonGeneratorCoverageInput): Required<CommonGeneratorCoverageInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("T-04 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? COMMON_GENERATOR_COVERAGE_MAX_PLUGIN_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > COMMON_GENERATOR_COVERAGE_MAX_PLUGIN_COUNT) throw new Error(`T-04 sampleCount must be an integer from 1 to ${COMMON_GENERATOR_COVERAGE_MAX_PLUGIN_COUNT}`);
  return { seed: input.seed, sampleCount };
}

export function readActiveCommonGeneratorSources(): CommonGeneratorCoverageSources {
  return {
    plugins: [
      { domain: "animation", sourcePath: "server/generators/animationProfileGenerator.ts", plugin: animationProfileGeneratorPlugin, registryVersions: createAnimationProfileRegistry().versions(animationProfileGeneratorPlugin.id) },
      { domain: "content", sourcePath: "server/generators/contentCatalogGenerator.ts", plugin: contentCatalogGeneratorPlugin, registryVersions: createContentCatalogRegistry().versions(contentCatalogGeneratorPlugin.id) },
      { domain: "quest", sourcePath: "server/generators/questProgressionGenerator.ts", plugin: questProgressionGeneratorPlugin, registryVersions: createQuestProgressionRegistry().versions(questProgressionGeneratorPlugin.id) },
      { domain: "structure", sourcePath: "server/generators/structureGenerator.ts", plugin: structureGeneratorPlugin, registryVersions: createStructureGeneratorRegistry().versions(structureGeneratorPlugin.id) },
      { domain: "texture", sourcePath: "server/generators/texturePackBuilder.ts", plugin: texturePackBuilderPlugin, registryVersions: createTexturePackBuilderRegistry().versions(texturePackBuilderPlugin.id) },
      { domain: "item", sourcePath: "server/generators/universalItemEngine.ts", plugin: universalItemGeneratorPlugin, registryVersions: createUniversalItemRegistry().versions(universalItemGeneratorPlugin.id) },
    ],
  };
}

export function buildCommonGeneratorCoverageDependencyGraphFromSources(input: CommonGeneratorCoverageInput, sources: CommonGeneratorCoverageSources): CommonGeneratorCoverageAudit {
  const normalizedInput = normalizeInput(input);
  const plugins = Array.from(sources.plugins);
  const sampledPlugins = plugins.slice(0, normalizedInput.sampleCount);
  const issueCounts: Record<string, number> = {};
  const kindCounts: Record<string, number> = {};
  const domainCounts: Record<string, number> = {};
  const pluginIds = new Set<string>();
  const pluginIssueKeys: Array<{ key: string; codes: CommonGeneratorCoverageIssueCode[] }> = [];
  let registeredPluginCount = 0;
  let previewPluginCount = 0;
  let generatePluginCount = 0;
  let validatePluginCount = 0;

  if (plugins.length > COMMON_GENERATOR_COVERAGE_MAX_PLUGIN_COUNT) increment(issueCounts, "plugin-count");
  for (const source of plugins) {
    const issueCodes: CommonGeneratorCoverageIssueCode[] = [];
    const plugin = source.plugin;
    if (pluginIds.has(plugin.id)) issueCodes.push("duplicate-plugin-id");
    pluginIds.add(plugin.id);
    increment(kindCounts, plugin.kind);
    increment(domainCounts, source.domain);
    if (source.registryVersions.includes(plugin.version)) registeredPluginCount += 1;
    if (source.registryVersions.length > 0) registeredPluginCount = Math.max(registeredPluginCount, 0);
    if (typeof plugin.preview === "function") previewPluginCount += 1;
    if (typeof plugin.generate === "function") generatePluginCount += 1;
    if (typeof plugin.validate === "function") validatePluginCount += 1;
    auditPlugin(source, issueCodes);
    for (const code of issueCodes) increment(issueCounts, code);
    if (issueCodes.length > 0) pluginIssueKeys.push({ key: `generator:${plugin.id}`, codes: issueCodes });
  }
  if (plugins.length > COMMON_GENERATOR_COVERAGE_MAX_PLUGIN_COUNT) pluginIssueKeys.push({ key: "catalog:t04", codes: ["plugin-count"] });

  const metadata = plugins.map(pluginMetadata);
  const nodes: DependencyGraphNode[] = sampledPlugins.map(source => {
    const descriptor = pluginMetadata(source);
    return makeNode({ key: `generator:${source.plugin.id}`, kind: source.plugin.kind, generatorId: source.plugin.id, generatorVersion: source.plugin.version, contentHash: hashStableJson(descriptor as unknown as JsonValue) });
  });
  const rootDependencies: GeneratorDependency[] = sampledPlugins.map(source => ({
    key: `generator:${source.plugin.id}`,
    kind: source.plugin.kind,
    required: true,
    generatorId: source.plugin.id,
    generatorVersion: source.plugin.version,
    contentHash: hashStableJson(pluginMetadata(source) as unknown as JsonValue),
  }));
  const blockerCodes = pluginIssueKeys.flatMap(entry => entry.codes.map(code => `${entry.key}:${code}`));
  for (const blockerCode of blockerCodes) rootDependencies.push({ key: `blocker:t04:${blockerCode}`, kind: "other", required: true });

  const summary: CommonGeneratorCoverageSummary = {
    pluginCount: plugins.length,
    sampleCount: sampledPlugins.length,
    uniquePluginIdCount: pluginIds.size,
    registeredPluginCount,
    previewPluginCount,
    generatePluginCount,
    validatePluginCount,
    kindCounts,
    domainCounts,
    sourcePaths: plugins.map(source => source.sourcePath).sort(),
    issueCounts,
    runtimePolicy: {
      generatedOnce: true,
      cacheReuseAllowed: true,
      playerVisible: false,
      runtimeImportAllowed: false,
      runtimePublishAllowed: false,
    },
    sourceContentHash: hashStableJson({ metadata } as unknown as JsonValue),
  };
  const root = makeNode({ key: "common-generator-coverage:t04", kind: "other", contentHash: hashStableJson(summary as unknown as JsonValue), dependencies: rootDependencies });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildCommonGeneratorCoverageDependencyGraph(input: CommonGeneratorCoverageInput = { seed: "common-generator-coverage-t04" }): CommonGeneratorCoverageAudit {
  return buildCommonGeneratorCoverageDependencyGraphFromSources(input, readActiveCommonGeneratorSources());
}
