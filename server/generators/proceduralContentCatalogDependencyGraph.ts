import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { buildContentCatalogDependencyGraph } from "./contentCatalogDependencyGraph";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { CONTENT_GENERATOR_VERSION, generateProceduralWeapons, type ProceduralItemDefinition, type WeaponCategory } from "../../tools/content-generator";

export const PROCEDURAL_CONTENT_CATALOG_GRAPH_RULES_VERSION = "procedural-content-catalog-graph-rules.v1" as const;

export type ProceduralContentCatalogDependencyGraphInput = {
  seed: string;
  count?: number;
  category?: WeaponCategory;
  samplePerCategory?: number;
  rulesVersion?: string;
};

export type UnresolvedProceduralContentReference = {
  sourceKey: string;
  referenceType: "catalog-category" | "catalog-definition" | "asset-binding";
  referenceId: string;
  reason: string;
};

export type ProceduralContentCatalogDependencyGraphOutput = {
  artifact: {
    generatorId: string;
    generatorVersion: string;
    seed: string;
    contentHash: string;
    catalogHash: string;
    weaponCount: number;
    category?: WeaponCategory;
  };
  summary: {
    weaponCount: number;
    generatedWeaponIds: string[];
    baseTypes: string[];
    assetIds: string[];
    catalogCategoryIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<UnresolvedProceduralContentReference["referenceType"], number>;
  };
  unresolvedReferences: UnresolvedProceduralContentReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, label: string) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return normalized;
}

function numericSeedFromLabel(seed: string) {
  return Number.parseInt(hashStableJson(seed).slice(0, 8), 16) % 2_000_000_000;
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return { key: target.key, kind: target.kind, required: true, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function addUnresolved(list: UnresolvedProceduralContentReference[], sourceKey: string, referenceType: UnresolvedProceduralContentReference["referenceType"], referenceId: string, reason: string) {
  list.push({ sourceKey, referenceType, referenceId, reason });
}

function catalogCategoryForItem(item: ProceduralItemDefinition) {
  if (item.baseType === "bow") return "weapon-bow" as const;
  if (item.baseType === "crossbow" || item.category === "ranged") return "weapon-ranged" as const;
  if (item.category === "melee") return "weapon-sword" as const;
  return undefined;
}

function buildProceduralRoot(items: ProceduralItemDefinition[], catalogRoot: DependencyGraphNode, seed: string, rulesVersion: string) {
  const payload = { generatorId: "content.generator", generatorVersion: CONTENT_GENERATOR_VERSION, seed, items };
  return {
    key: `procedural-content:${hashStableJson(payload as never)}`,
    kind: "item" as const,
    generatorId: "content.generator",
    generatorVersion: CONTENT_GENERATOR_VERSION,
    schemaVersion: "a-survival.procedural-content.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(payload as never),
    dependencies: [dependencyFor(catalogRoot)],
  } satisfies DependencyGraphNode;
}

export function buildProceduralContentCatalogDependencyGraph(input: ProceduralContentCatalogDependencyGraphInput): ProceduralContentCatalogDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? PROCEDURAL_CONTENT_CATALOG_GRAPH_RULES_VERSION;
  if (rulesVersion !== PROCEDURAL_CONTENT_CATALOG_GRAPH_RULES_VERSION) throw new Error(`Unsupported procedural content catalog graph rules version: ${rulesVersion}`);
  const count = boundedInteger(input.count, 8, 1, 8, "count");
  const samplePerCategory = boundedInteger(input.samplePerCategory, 8, 1, 8, "samplePerCategory");
  const catalog = buildContentCatalogDependencyGraph({ seed: input.seed, samplePerCategory });
  const catalogRoot = catalog.nodes.find(node => node.key.startsWith("content-catalog:"));
  if (!catalogRoot) throw new Error("Content catalog root node is missing");
  const items = generateProceduralWeapons({ seed: numericSeedFromLabel(input.seed), count, category: input.category });
  const proceduralRoot = buildProceduralRoot(items, catalogRoot, input.seed, rulesVersion);
  const unresolvedReferences: UnresolvedProceduralContentReference[] = [];
  const itemNodes = items.map(item => {
    const node: DependencyGraphNode = {
      key: `procedural-item:${item.id}`,
      kind: "item",
      generatorId: "content.generator",
      generatorVersion: CONTENT_GENERATOR_VERSION,
      schemaVersion: "a-survival.procedural-item.v1",
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson(item as never),
      dependencies: [dependencyFor(proceduralRoot)],
    };
    const catalogCategory = catalogCategoryForItem(item);
    if (catalogCategory) {
      const categoryAsset = catalog.nodes.find(candidate => candidate.key === `asset:content.catalog.${catalogCategory}`);
      if (categoryAsset) node.dependencies.push(dependencyFor(categoryAsset));
      else {
        node.dependencies.push(missingDependency(`asset:content.catalog.${catalogCategory}`, "texture"));
        addUnresolved(unresolvedReferences, node.key, "catalog-category", catalogCategory, "matching content catalog category asset is not present in the sampled catalog graph");
      }
    } else {
      node.dependencies.push(missingDependency(`content-category:${item.category}`, "item"));
      addUnresolved(unresolvedReferences, node.key, "catalog-category", item.category, "content.catalog has no exact magic weapon category for this procedural weapon family");
    }
    node.dependencies.push(missingDependency(`content:${item.id}`, "item"));
    addUnresolved(unresolvedReferences, node.key, "catalog-definition", item.id, "procedural content definition ID is not an exact definition in the logical content.catalog owner");
    node.dependencies.push(missingDependency(`asset:${item.asset.assetId}`, "texture"));
    addUnresolved(unresolvedReferences, node.key, "asset-binding", item.asset.assetId, "procedural item has no verified asset manifest binding in this preview");
    return node;
  });
  const unresolvedReferenceTypes = {
    "catalog-category": unresolvedReferences.filter(reference => reference.referenceType === "catalog-category").length,
    "catalog-definition": unresolvedReferences.filter(reference => reference.referenceType === "catalog-definition").length,
    "asset-binding": unresolvedReferences.filter(reference => reference.referenceType === "asset-binding").length,
  } satisfies Record<UnresolvedProceduralContentReference["referenceType"], number>;
  const payload = { generatorId: "content.generator", generatorVersion: CONTENT_GENERATOR_VERSION, seed: input.seed, items };
  const contentHash = hashStableJson(payload as never);
  const graphNodes = [...catalog.nodes, proceduralRoot, ...itemNodes];
  return {
    artifact: {
      generatorId: "content.generator",
      generatorVersion: CONTENT_GENERATOR_VERSION,
      seed: input.seed,
      contentHash,
      catalogHash: catalog.artifact.contentHash,
      weaponCount: items.length,
      category: input.category,
    },
    summary: {
      weaponCount: items.length,
      generatedWeaponIds: items.map(item => item.id),
      baseTypes: Array.from(new Set(items.map(item => item.baseType))).sort(),
      assetIds: Array.from(new Set(items.map(item => item.asset.assetId))).sort(),
      catalogCategoryIds: Array.from(new Set(items.map(catalogCategoryForItem).filter((category): category is NonNullable<ReturnType<typeof catalogCategoryForItem>> => Boolean(category)))).sort(),
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes: graphNodes,
    graph: validateGeneratorDependencyGraph(graphNodes),
  };
}
