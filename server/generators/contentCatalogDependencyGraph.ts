import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { createContentCatalogRegistry, DEFAULT_CONTENT_CATALOG_INPUT, generateContentCatalog, type ContentCatalogInput, type ContentCatalogOutput, type GeneratedContentDefinition } from "./contentCatalogGenerator";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation } from "./dependencyGraph";

export const CONTENT_CATALOG_RULES_VERSION = "content-catalog-rules.v1" as const;

export type ContentCatalogDependencyGraphInput = {
  seed: string;
  samplePerCategory?: number;
  rulesVersion?: string;
};

export type ContentCatalogDependencyGraphOutput = {
  artifact: {
    generatorId: string;
    generatorVersion: string;
    seed: string;
    contentHash: string;
    definitionCount: number;
    categoryCount: number;
  };
  graph: DependencyGraphValidation;
};

function contentKind(definition: GeneratedContentDefinition): GeneratorKind {
  return definition.category === "structure" ? "structure" : "item";
}

function boundedSample(value: number | undefined) {
  const sample = value ?? 1;
  if (!Number.isInteger(sample) || sample < 1 || sample > 8) throw new Error("samplePerCategory must be an integer from 1 to 8");
  return sample;
}

function buildGraphNodes(output: ReturnType<typeof generateContentCatalog>, artifact: { generatorId: string; generatorVersion: string; seed: string; contentHash: string }, samplePerCategory: number, rulesVersion: string): DependencyGraphNode[] {
  const catalogKey = `content-catalog:${artifact.contentHash}`;
  const assetNodes: DependencyGraphNode[] = output.assetRefs.map(asset => ({
    key: `asset:${asset.assetId}`,
    kind: "texture",
    generatorId: artifact.generatorId,
    generatorVersion: artifact.generatorVersion,
    schemaVersion: output.schemaVersion,
    seed: artifact.seed,
    rulesVersion,
    contentHash: hashStableJson(asset as never),
    dependencies: [],
  }));
  const assetKeyByCategory = new Map(output.assetRefs.map(asset => [asset.assetId.split(".").at(-1) ?? asset.assetId, `asset:${asset.assetId}`]));
  const catalogNode: DependencyGraphNode = {
    key: catalogKey,
    kind: "other",
    generatorId: artifact.generatorId,
    generatorVersion: artifact.generatorVersion,
    schemaVersion: output.schemaVersion,
    seed: artifact.seed,
    rulesVersion,
    contentHash: artifact.contentHash,
    dependencies: assetNodes.map(asset => ({ key: asset.key, kind: asset.kind, required: true, generatorId: asset.generatorId, generatorVersion: asset.generatorVersion, contentHash: asset.contentHash })),
  };
  const definitionNodes: DependencyGraphNode[] = output.definitions
    .filter(definition => definition.ordinal <= samplePerCategory)
    .map(definition => {
      const assetKey = assetKeyByCategory.get(definition.category) ?? `asset:${definition.assetId}`;
      const assetNode = assetNodes.find(asset => asset.key === assetKey);
      if (!assetNode) throw new Error(`Catalog asset node is missing for ${definition.id}`);
      return {
        key: `content:${definition.id}`,
        kind: contentKind(definition),
        generatorId: artifact.generatorId,
        generatorVersion: artifact.generatorVersion,
        schemaVersion: output.schemaVersion,
        seed: artifact.seed,
        rulesVersion,
        contentHash: hashStableJson(definition as never),
        dependencies: [
          { key: catalogNode.key, kind: catalogNode.kind, required: true, generatorId: catalogNode.generatorId, generatorVersion: catalogNode.generatorVersion, contentHash: catalogNode.contentHash },
          { key: assetNode.key, kind: assetNode.kind, required: true, generatorId: assetNode.generatorId, generatorVersion: assetNode.generatorVersion, contentHash: assetNode.contentHash },
        ],
      } satisfies DependencyGraphNode;
    });
  return [catalogNode, ...assetNodes, ...definitionNodes];
}

export function buildContentCatalogDependencyGraph(input: ContentCatalogDependencyGraphInput, catalogInput: ContentCatalogInput = DEFAULT_CONTENT_CATALOG_INPUT): ContentCatalogDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? CONTENT_CATALOG_RULES_VERSION;
  if (rulesVersion !== CONTENT_CATALOG_RULES_VERSION) throw new Error(`Unsupported content catalog rules version: ${rulesVersion}`);
  const samplePerCategory = boundedSample(input.samplePerCategory);
  const registry = createContentCatalogRegistry();
  const artifact = registry.generate<ContentCatalogInput, ContentCatalogOutput>("content.catalog", catalogInput, { seed: input.seed, generatedAt: 0 });
  const output = artifact.output;
  const nodes = buildGraphNodes(output, artifact, samplePerCategory, rulesVersion);
  return {
    artifact: {
      generatorId: artifact.generatorId,
      generatorVersion: artifact.generatorVersion,
      seed: artifact.seed,
      contentHash: artifact.contentHash,
      definitionCount: output.definitions.length,
      categoryCount: output.assetRefs.length,
    },
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
