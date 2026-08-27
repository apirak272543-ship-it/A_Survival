import { validateContentSuiteBundle, type ContentSuiteBundle } from "../../tools/contentRegistry";
import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const CONTENT_SUITE_DEPENDENCY_GRAPH_RULES_VERSION = "content-suite-dependency-graph-rules.v1" as const;
export const CONTENT_SUITE_DEPENDENCY_GRAPH_GENERATOR_VERSION = "1.0.0" as const;
export const MAX_CONTENT_SUITE_BUNDLES = 256;
export const MAX_CONTENT_SUITE_SAMPLE = 32;

export type ContentSuiteDependencyGraphInput = {
  seed: string;
  bundles: readonly ContentSuiteBundle[];
  sampleCount?: number;
  rulesVersion?: string;
};

export type UnresolvedContentSuiteReference = {
  sourceKey: string;
  component: "model" | "texture";
  assetId: string;
  status: ContentSuiteBundle["model"]["asset"]["status"];
  provenance: ContentSuiteBundle["model"]["asset"]["provenance"];
  reason: string;
};

export type ContentSuiteDependencyGraphOutput = {
  artifact: {
    generatorId: string;
    generatorVersion: string;
    seed: string;
    sampledBundleCount: number;
    bundleCount: number;
  };
  summary: {
    bundleCount: number;
    sampledBundleCount: number;
    validBundleCount: number;
    invalidBundleCount: number;
    duplicateDefinitionCount: number;
    resolvedAssetCount: number;
    awaitingAssetCount: number;
    referenceOnlyAssetCount: number;
    unresolvedReferenceCount: number;
    nodeCount: number;
    edgeCount: number;
  };
  invalidBundleIds: string[];
  unresolvedReferences: UnresolvedContentSuiteReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

type Component = "model" | "texture";

function boundedSample(value: number | undefined, max: number, label: string) {
  const normalized = value ?? max;
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > max) throw new Error(`${label} must be an integer from 1 to ${max}`);
  return normalized;
}

function contentKind(kind: ContentSuiteBundle["definition"]["kind"]): GeneratorKind {
  if (kind === "texture") return "texture";
  if (kind === "mob") return "mob";
  if (kind === "item" || kind === "weapon" || kind === "armor") return "item";
  if (kind === "loot") return "loot";
  return "other";
}

function componentKey(bundleId: string, component: string) {
  return `content-suite:${bundleId}:${component}`;
}

function assetKey(asset: ContentSuiteBundle["model"]["asset"]) {
  return `content-suite-asset:${asset.assetId}:${hashStableJson(asset as never)}`;
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return { key: node.key, kind: node.kind, required: true, generatorId: node.generatorId, generatorVersion: node.generatorVersion, contentHash: node.contentHash };
}

function missingDependency(key: string): GeneratorDependency {
  return { key, kind: "other", required: true };
}

function assetIsResolvable(asset: ContentSuiteBundle["model"]["asset"]) {
  return asset.status === "bound" && asset.provenance !== "reference-only";
}

function assetNode(asset: ContentSuiteBundle["model"]["asset"], seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: assetKey(asset),
    kind: "other",
    generatorId: "asset.binding",
    generatorVersion: asset.packVersion,
    schemaVersion: "a-survival.content-suite-asset-binding.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(asset as never),
    dependencies: [],
  };
}

function componentAssetDependency(input: {
  bundle: ContentSuiteBundle;
  component: Component;
  seed: string;
  rulesVersion: string;
  nodes: DependencyGraphNode[];
  unresolved: UnresolvedContentSuiteReference[];
}) {
  const asset = input.bundle[input.component].asset;
  const sourceKey = componentKey(input.bundle.definition.id, input.component);
  if (assetIsResolvable(asset)) {
    const node = assetNode(asset, input.seed, input.rulesVersion);
    if (!input.nodes.some(existing => existing.key === node.key)) input.nodes.push(node);
    return dependencyFor(node);
  }

  const reason = asset.status === "awaiting-asset"
    ? `asset ${asset.assetId} is awaiting an authored manifest binding`
    : `asset ${asset.assetId} is reference-only and cannot be a runtime dependency`;
  input.unresolved.push({ sourceKey, component: input.component, assetId: asset.assetId, status: asset.status, provenance: asset.provenance, reason });
  return missingDependency(assetKey(asset));
}

function invalidBundleNode(bundle: ContentSuiteBundle, seed: string, rulesVersion: string, reason: string): DependencyGraphNode {
  const key = `content-suite:${bundle.definition.id}`;
  return {
    key,
    kind: contentKind(bundle.definition.kind),
    generatorId: "content.suite",
    generatorVersion: CONTENT_SUITE_DEPENDENCY_GRAPH_GENERATOR_VERSION,
    schemaVersion: "a-survival.content-suite-bundle.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(bundle as never),
    dependencies: [
      { key: `content-suite-integrity:${bundle.definition.id}:${hashStableJson(reason as never)}`, kind: "other", required: true },
    ],
  };
}

function buildBundleNodes(input: {
  bundle: ContentSuiteBundle;
  seed: string;
  rulesVersion: string;
  invalidReason?: string;
  unresolved: UnresolvedContentSuiteReference[];
}) {
  const { bundle, seed, rulesVersion, invalidReason, unresolved } = input;
  if (invalidReason) return [invalidBundleNode(bundle, seed, rulesVersion, invalidReason)];

  const nodes: DependencyGraphNode[] = [];
  const modelKey = componentKey(bundle.definition.id, "model");
  const textureKey = componentKey(bundle.definition.id, "texture");
  const skinKey = componentKey(bundle.definition.id, "skin");
  const gameplayKey = componentKey(bundle.definition.id, "gameplay");
  const definitionKey = componentKey(bundle.definition.id, "definition");
  const variantKey = componentKey(bundle.definition.id, "variant");
  const modelAssetDependency = componentAssetDependency({ bundle, component: "model", seed, rulesVersion, nodes, unresolved });
  const textureAssetDependency = componentAssetDependency({ bundle, component: "texture", seed, rulesVersion, nodes, unresolved });

  nodes.push({
    key: modelKey,
    kind: "other",
    generatorId: "content.suite",
    generatorVersion: bundle.suiteVersion,
    schemaVersion: "a-survival.content-suite-model.v1",
    seed: String(bundle.definition.seed),
    rulesVersion,
    contentHash: hashStableJson(bundle.model as never),
    dependencies: [modelAssetDependency],
  });
  nodes.push({
    key: textureKey,
    kind: "texture",
    generatorId: "content.suite",
    generatorVersion: bundle.suiteVersion,
    schemaVersion: "a-survival.content-suite-texture.v1",
    seed: String(bundle.definition.seed),
    rulesVersion,
    contentHash: hashStableJson(bundle.texture as never),
    dependencies: [textureAssetDependency],
  });
  nodes.push({
    key: skinKey,
    kind: "other",
    generatorId: "content.suite",
    generatorVersion: bundle.suiteVersion,
    schemaVersion: "a-survival.content-suite-skin.v1",
    seed: String(bundle.definition.seed),
    rulesVersion,
    contentHash: hashStableJson(bundle.skin as never),
    dependencies: [
      { key: modelKey, kind: "other", required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.model as never) },
      { key: textureKey, kind: "texture", required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.texture as never) },
    ],
  });
  nodes.push({
    key: gameplayKey,
    kind: "other",
    generatorId: "content.suite",
    generatorVersion: bundle.suiteVersion,
    schemaVersion: "a-survival.content-suite-gameplay.v1",
    seed: String(bundle.definition.seed),
    rulesVersion,
    contentHash: hashStableJson(bundle.gameplay as never),
    dependencies: [],
  });
  nodes.push({
    key: definitionKey,
    kind: contentKind(bundle.definition.kind),
    generatorId: "content.suite",
    generatorVersion: bundle.suiteVersion,
    schemaVersion: "a-survival.content-suite-definition.v1",
    seed: String(bundle.definition.seed),
    rulesVersion,
    contentHash: hashStableJson(bundle.definition as never),
    dependencies: [
      { key: modelKey, kind: "other", required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.model as never) },
      { key: textureKey, kind: "texture", required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.texture as never) },
      { key: skinKey, kind: "other", required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.skin as never) },
      { key: gameplayKey, kind: "other", required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.gameplay as never) },
    ],
  });
  nodes.push({
    key: variantKey,
    kind: "other",
    generatorId: "content.suite",
    generatorVersion: bundle.suiteVersion,
    schemaVersion: "a-survival.content-suite-variant.v1",
    seed: String(bundle.variant.variantSeed),
    rulesVersion,
    contentHash: hashStableJson(bundle.variant as never),
    dependencies: [
      { key: definitionKey, kind: contentKind(bundle.definition.kind), required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.definition as never) },
      { key: modelKey, kind: "other", required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.model as never) },
      { key: skinKey, kind: "other", required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.skin as never) },
      { key: gameplayKey, kind: "other", required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.gameplay as never) },
    ],
  });
  nodes.push({
    key: `content-suite:${bundle.definition.id}`,
    kind: "other",
    generatorId: "content.suite",
    generatorVersion: bundle.suiteVersion,
    schemaVersion: "a-survival.content-suite-bundle.v1",
    seed,
    rulesVersion,
    contentHash: bundle.contentHash,
    dependencies: [
      { key: definitionKey, kind: contentKind(bundle.definition.kind), required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.definition as never) },
      { key: variantKey, kind: "other", required: true, generatorId: "content.suite", generatorVersion: bundle.suiteVersion, contentHash: hashStableJson(bundle.variant as never) },
    ],
  });
  return nodes;
}

export function buildContentSuiteDependencyGraph(input: ContentSuiteDependencyGraphInput): ContentSuiteDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? CONTENT_SUITE_DEPENDENCY_GRAPH_RULES_VERSION;
  if (rulesVersion !== CONTENT_SUITE_DEPENDENCY_GRAPH_RULES_VERSION) throw new Error(`Unsupported content suite dependency graph rules version: ${rulesVersion}`);
  if (input.bundles.length > MAX_CONTENT_SUITE_BUNDLES) throw new Error(`bundles exceeds ${MAX_CONTENT_SUITE_BUNDLES} records`);
  const sampleCount = boundedSample(input.sampleCount, MAX_CONTENT_SUITE_SAMPLE, "sampleCount");
  const bundles = input.bundles.slice().sort((left, right) => left.definition.id.localeCompare(right.definition.id));
  const sampledBundles = bundles.slice(0, Math.min(sampleCount, bundles.length));
  const idCounts = new Map<string, number>();
  for (const bundle of sampledBundles) idCounts.set(bundle.definition.id, (idCounts.get(bundle.definition.id) ?? 0) + 1);
  const duplicateDefinitionIds = new Set(Array.from(idCounts.entries()).filter(([, count]) => count > 1).map(([id]) => id));
  const invalidBundleIds: string[] = [];
  const unresolvedReferences: UnresolvedContentSuiteReference[] = [];
  const nodes: DependencyGraphNode[] = [];
  let validBundleCount = 0;

  for (const bundle of sampledBundles) {
    const validationErrors = validateContentSuiteBundle(bundle);
    const invalidReason = duplicateDefinitionIds.has(bundle.definition.id)
      ? "definition ID is duplicated in sampled bundles"
      : validationErrors.join("; ");
    if (invalidReason) {
      invalidBundleIds.push(bundle.definition.id);
    } else {
      validBundleCount += 1;
    }
    nodes.push(...buildBundleNodes({ bundle, seed: input.seed, rulesVersion, invalidReason: invalidReason || undefined, unresolved: unresolvedReferences }));
  }

  const graph = validateGeneratorDependencyGraph(nodes);
  const uniqueUnresolved = unresolvedReferences.filter((reference, index, all) => all.findIndex(candidate => candidate.sourceKey === reference.sourceKey && candidate.assetId === reference.assetId && candidate.reason === reference.reason) === index);
  const resolvedAssetCount = nodes.filter(node => node.generatorId === "asset.binding").length;
  const awaitingAssetCount = uniqueUnresolved.filter(reference => reference.status === "awaiting-asset").length;
  const referenceOnlyAssetCount = uniqueUnresolved.filter(reference => reference.provenance === "reference-only").length;
  return {
    artifact: { generatorId: "content.suite", generatorVersion: CONTENT_SUITE_DEPENDENCY_GRAPH_GENERATOR_VERSION, seed: input.seed, sampledBundleCount: sampledBundles.length, bundleCount: bundles.length },
    summary: {
      bundleCount: bundles.length,
      sampledBundleCount: sampledBundles.length,
      validBundleCount,
      invalidBundleCount: invalidBundleIds.length,
      duplicateDefinitionCount: duplicateDefinitionIds.size,
      resolvedAssetCount,
      awaitingAssetCount,
      referenceOnlyAssetCount,
      unresolvedReferenceCount: uniqueUnresolved.length,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
    },
    invalidBundleIds: Array.from(new Set(invalidBundleIds)).sort(),
    unresolvedReferences: uniqueUnresolved.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.component.localeCompare(right.component) || left.assetId.localeCompare(right.assetId)),
    nodes: graph.nodes,
    graph,
  };
}
