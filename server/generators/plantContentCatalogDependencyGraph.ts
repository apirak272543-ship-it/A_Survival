import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { buildContentCatalogDependencyGraph } from "./contentCatalogDependencyGraph";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { WORLD_PLANT_CATALOG_SIZE, generateWorldPlantCatalog, type WorldPlantDefinition } from "../../client/src/game/tools/plantCatalogGenerator";
import { getPlantDefinition } from "../../client/src/game/data/plantCatalog";

export const PLANT_CONTENT_CATALOG_GRAPH_RULES_VERSION = "plant-content-catalog-graph-rules.v1" as const;
export const WORLD_PLANT_CATALOG_GENERATOR_VERSION = "1.0.0" as const;

export type PlantContentCatalogDependencyGraphInput = {
  seed: string;
  samplePlantCount?: number;
  samplePerCategory?: number;
  rulesVersion?: string;
};

export type UnresolvedPlantContentReference = {
  sourceKey: string;
  referenceType: "biome-context" | "soil-context" | "seed-definition" | "harvest-definition" | "plant-asset" | "seed-asset";
  referenceId: string;
  reason: string;
};

export type PlantContentCatalogDependencyGraphOutput = {
  artifact: {
    generatorId: string;
    generatorVersion: string;
    seed: string;
    contentHash: string;
    catalogHash: string;
    plantCount: number;
    sampledPlantCount: number;
  };
  summary: {
    plantCount: number;
    sampledPlantCount: number;
    familyIds: string[];
    biomeIds: string[];
    soilIds: string[];
    seedDefinitionIds: string[];
    harvestDefinitionIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<UnresolvedPlantContentReference["referenceType"], number>;
  };
  unresolvedReferences: UnresolvedPlantContentReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, label: string) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return normalized;
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return { key: target.key, kind: target.kind, required: true, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function addUnresolved(list: UnresolvedPlantContentReference[], sourceKey: string, referenceType: UnresolvedPlantContentReference["referenceType"], referenceId: string, reason: string) {
  list.push({ sourceKey, referenceType, referenceId, reason });
}

function plantContentHash(catalog: WorldPlantDefinition[]) {
  return hashStableJson(catalog as never);
}

function buildPlantRoot(catalog: WorldPlantDefinition[], catalogRoot: DependencyGraphNode, seed: string, rulesVersion: string) {
  const contentHash = plantContentHash(catalog);
  return {
    key: `plant-catalog:${contentHash}`,
    kind: "other" as const,
    generatorId: "plant.catalog",
    generatorVersion: WORLD_PLANT_CATALOG_GENERATOR_VERSION,
    schemaVersion: "a-survival.world-plant-catalog.v1",
    seed,
    rulesVersion,
    contentHash,
    dependencies: [dependencyFor(catalogRoot)],
  } satisfies DependencyGraphNode;
}

function categoryAssetNode(catalog: ReturnType<typeof buildContentCatalogDependencyGraph>, category: string) {
  return catalog.nodes.find(node => node.key.endsWith(`.${category}`) && node.kind === "texture");
}

export function buildPlantContentCatalogDependencyGraph(input: PlantContentCatalogDependencyGraphInput): PlantContentCatalogDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? PLANT_CONTENT_CATALOG_GRAPH_RULES_VERSION;
  if (rulesVersion !== PLANT_CONTENT_CATALOG_GRAPH_RULES_VERSION) throw new Error(`Unsupported plant content catalog graph rules version: ${rulesVersion}`);
  const samplePlantCount = boundedInteger(input.samplePlantCount, 16, 1, 32, "samplePlantCount");
  const samplePerCategory = boundedInteger(input.samplePerCategory, 8, 1, 8, "samplePerCategory");
  const catalog = buildContentCatalogDependencyGraph({ seed: input.seed, samplePerCategory });
  const catalogRoot = catalog.nodes.find(node => node.key.startsWith("content-catalog:"));
  if (!catalogRoot) throw new Error("Content catalog root node is missing");
  const allPlants = generateWorldPlantCatalog(WORLD_PLANT_CATALOG_SIZE);
  const sampledPlants = allPlants.slice().sort((left, right) => left.id.localeCompare(right.id)).slice(0, samplePlantCount);
  const plantRoot = buildPlantRoot(allPlants, catalogRoot, input.seed, rulesVersion);
  const unresolvedReferences: UnresolvedPlantContentReference[] = [];
  const plantNodes = sampledPlants.map(plant => {
    const node: DependencyGraphNode = {
      key: `plant:${plant.id}`,
      kind: "item",
      generatorId: "plant.catalog",
      generatorVersion: WORLD_PLANT_CATALOG_GENERATOR_VERSION,
      schemaVersion: "a-survival.world-plant.v1",
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson(plant as never),
      dependencies: [dependencyFor(plantRoot)],
    };
    const plantAsset = categoryAssetNode(catalog, "plant");
    if (plantAsset) node.dependencies.push(dependencyFor(plantAsset));
    else {
      node.dependencies.push(missingDependency("asset:a-survival.content.plant", "texture"));
      addUnresolved(unresolvedReferences, node.key, "plant-asset", "a-survival.content.plant", "content catalog plant category asset is not present in the sampled catalog graph");
    }
    const seedAsset = categoryAssetNode(catalog, "seed");
    if (seedAsset) node.dependencies.push(dependencyFor(seedAsset));
    else {
      node.dependencies.push(missingDependency("asset:a-survival.content.seed", "texture"));
      addUnresolved(unresolvedReferences, node.key, "seed-asset", "a-survival.content.seed", "content catalog seed category asset is not present in the sampled catalog graph");
    }
    node.dependencies.push(missingDependency(`biome:${plant.biomeId}`, "biome"));
    addUnresolved(unresolvedReferences, node.key, "biome-context", plant.biomeId, "the current content.catalog graph has no registered biome definition for the playable plant context");
    node.dependencies.push(missingDependency(`soil:${plant.soilId}`, "other"));
    addUnresolved(unresolvedReferences, node.key, "soil-context", plant.soilId, "soil compatibility is owned by the runtime farming catalog and has no content.catalog node in this preview");
    node.dependencies.push(missingDependency(`content:${plant.seedDefinitionId}`, "item"));
    addUnresolved(unresolvedReferences, node.key, "seed-definition", plant.seedDefinitionId, "plant seed definition ID is not an exact definition in the logical content.catalog owner");
    node.dependencies.push(missingDependency(`content:${plant.harvestDefinitionId}`, "item"));
    addUnresolved(unresolvedReferences, node.key, "harvest-definition", plant.harvestDefinitionId, "plant harvest definition ID is not an exact definition in the logical content.catalog owner");
    const runtimeAssetId = getPlantDefinition(plant.id)?.assetId;
    if (runtimeAssetId) {
      node.dependencies.push(missingDependency(`asset:${runtimeAssetId}`, "texture"));
      addUnresolved(unresolvedReferences, node.key, "plant-asset", runtimeAssetId, "plant runtime asset is not a verified texture-manifest binding in this preview");
    } else {
      node.dependencies.push(missingDependency(`plant-asset:${plant.id}`, "texture"));
      addUnresolved(unresolvedReferences, node.key, "plant-asset", plant.id, "plant runtime owner has no asset ID for this plant");
    }
    node.dependencies.push(missingDependency("asset:items.seed", "texture"));
    addUnresolved(unresolvedReferences, node.key, "seed-asset", "items.seed", "seed runtime icon is not a verified texture-manifest binding in this preview");
    return node;
  });
  const unresolvedReferenceTypes = {
    "biome-context": unresolvedReferences.filter(reference => reference.referenceType === "biome-context").length,
    "soil-context": unresolvedReferences.filter(reference => reference.referenceType === "soil-context").length,
    "seed-definition": unresolvedReferences.filter(reference => reference.referenceType === "seed-definition").length,
    "harvest-definition": unresolvedReferences.filter(reference => reference.referenceType === "harvest-definition").length,
    "plant-asset": unresolvedReferences.filter(reference => reference.referenceType === "plant-asset").length,
    "seed-asset": unresolvedReferences.filter(reference => reference.referenceType === "seed-asset").length,
  } satisfies Record<UnresolvedPlantContentReference["referenceType"], number>;
  const contentHash = plantContentHash(allPlants);
  const graphNodes = [...catalog.nodes, plantRoot, ...plantNodes];
  return {
    artifact: {
      generatorId: "plant.catalog",
      generatorVersion: WORLD_PLANT_CATALOG_GENERATOR_VERSION,
      seed: input.seed,
      contentHash,
      catalogHash: catalog.artifact.contentHash,
      plantCount: allPlants.length,
      sampledPlantCount: sampledPlants.length,
    },
    summary: {
      plantCount: allPlants.length,
      sampledPlantCount: sampledPlants.length,
      familyIds: Array.from(new Set(allPlants.map(plant => plant.tags.find(tag => ["crop", "herb", "flower", "tree", "fungus", "crystal"].includes(tag)) ?? "unknown"))).sort(),
      biomeIds: Array.from(new Set(allPlants.map(plant => plant.biomeId))).sort(),
      soilIds: Array.from(new Set(allPlants.map(plant => plant.soilId))).sort(),
      seedDefinitionIds: sampledPlants.map(plant => plant.seedDefinitionId),
      harvestDefinitionIds: sampledPlants.map(plant => plant.harvestDefinitionId),
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes: graphNodes,
    graph: validateGeneratorDependencyGraph(graphNodes),
  };
}
