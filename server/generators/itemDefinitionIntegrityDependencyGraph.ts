import { ALL_ITEMS, validateItemInstances, type ItemCategory, type ItemDefinition, type ItemInstance } from "../../client/src/game/data/catalog";
import { PLANT_CATALOG, type PlantDefinition } from "../../client/src/game/data/plantCatalog";
import { hashStableJson } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const ITEM_DEFINITION_INTEGRITY_RULES_VERSION = "item-definition-integrity-rules.v1" as const;
export const ITEM_DEFINITION_INTEGRITY_GENERATOR_VERSION = "1.0.0" as const;
export const ITEM_DEFINITION_INTEGRITY_SCHEMA_VERSION = "a-survival.item-definition-integrity.v1" as const;
export const ITEM_DEFINITION_INTEGRITY_MAX_DEFINITIONS = 4096 as const;
export const ITEM_DEFINITION_INTEGRITY_MAX_SAMPLE = 64 as const;
export const ITEM_DEFINITION_INTEGRITY_MAX_REFERENCES = 256 as const;

const ITEM_CATEGORIES: readonly ItemCategory[] = ["sword", "bow", "ranged", "seed", "material", "furniture", "decoration", "structure", "tool"];
const EQUIPPABLE_CATEGORIES = new Set<ItemCategory>(["sword", "bow", "ranged", "tool"]);
const ITEM_ID_PATTERN = /^[a-z0-9][a-z0-9.-]{2,63}$/;
const MAX_STACK_LIMIT = 99;

export type ItemDefinitionIntegritySources = {
  items: ItemDefinition[];
  plants: PlantDefinition[];
  itemInstances: ItemInstance[];
};

export type ItemDefinitionIntegrityReferenceType =
  | "duplicate-id"
  | "invalid-id"
  | "invalid-category"
  | "invalid-text"
  | "invalid-stack"
  | "equipment-rule"
  | "missing-icon"
  | "plant-link"
  | "block-link"
  | "item-instance";

export type ItemDefinitionIntegrityReference = {
  sourceKey: string;
  referenceType: ItemDefinitionIntegrityReferenceType;
  referenceId: string;
  reason: string;
};

export type ItemDefinitionIntegrityRecord = {
  id: string;
  category: string;
  stackLimit: number;
  equippable: boolean;
  iconAssetId?: string;
  issueTypes: ItemDefinitionIntegrityReferenceType[];
  valid: boolean;
};

export type ItemDefinitionIntegrityGraphInput = {
  seed: string;
  sampleCount?: number;
  rulesVersion?: string;
};

export type ItemDefinitionIntegrityGraphOutput = {
  artifact: {
    generatorId: "item.definition.integrity";
    generatorVersion: typeof ITEM_DEFINITION_INTEGRITY_GENERATOR_VERSION;
    schemaVersion: typeof ITEM_DEFINITION_INTEGRITY_SCHEMA_VERSION;
    seed: string;
    rulesVersion: string;
    contentHash: string;
    catalogHash: string;
    plantHash: string;
    instanceHash: string;
    itemCount: number;
    plantCount: number;
    instanceCount: number;
    sampleCount: number;
  };
  summary: {
    itemCount: number;
    plantCount: number;
    instanceCount: number;
    sampleCount: number;
    validDefinitionCount: number;
    invalidDefinitionCount: number;
    duplicateIdCount: number;
    invalidIdCount: number;
    invalidCategoryCount: number;
    invalidTextCount: number;
    invalidStackCount: number;
    equipmentRuleViolationCount: number;
    missingIconCount: number;
    plantLinkViolationCount: number;
    blockLinkViolationCount: number;
    itemInstanceIssueCount: number;
    categoryCounts: Record<ItemCategory, number>;
    issueCounts: Record<ItemDefinitionIntegrityReferenceType, number>;
    unresolvedReferenceTotal: number;
    unresolvedReferenceCount: number;
    sampledIds: string[];
  };
  records: ItemDefinitionIntegrityRecord[];
  unresolvedReferences: ItemDefinitionIntegrityReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

export function readActiveItemDefinitionIntegritySources(): ItemDefinitionIntegritySources {
  return { items: ALL_ITEMS.map(item => ({ ...item, tags: [...item.tags] })), plants: PLANT_CATALOG.map(plant => ({ ...plant, biomeTags: [...plant.biomeTags], compatibleSoils: [...plant.compatibleSoils], growthStages: [...plant.growthStages], effect: { ...plant.effect }, yieldQuantity: [...plant.yieldQuantity] as [number, number] })), itemInstances: [] };
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return { key: target.key, kind: target.kind, required: true, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function missingDependency(key: string): GeneratorDependency {
  return { key, kind: "item", required: true };
}

function emptyIssueCounts(): Record<ItemDefinitionIntegrityReferenceType, number> {
  return {
    "duplicate-id": 0,
    "invalid-id": 0,
    "invalid-category": 0,
    "invalid-text": 0,
    "invalid-stack": 0,
    "equipment-rule": 0,
    "missing-icon": 0,
    "plant-link": 0,
    "block-link": 0,
    "item-instance": 0,
  };
}

function pushReference(references: ItemDefinitionIntegrityReference[], issueCounts: Record<ItemDefinitionIntegrityReferenceType, number>, sourceKey: string, referenceType: ItemDefinitionIntegrityReferenceType, referenceId: string, reason: string) {
  issueCounts[referenceType] += 1;
  if (references.length < ITEM_DEFINITION_INTEGRITY_MAX_REFERENCES) references.push({ sourceKey, referenceType, referenceId, reason });
}

function auditDefinition(item: ItemDefinition, duplicateIds: Set<string>, itemById: Map<string, ItemDefinition>, plantIds: Set<string>, references: ItemDefinitionIntegrityReference[], issueCounts: Record<ItemDefinitionIntegrityReferenceType, number>): ItemDefinitionIntegrityRecord {
  const issueTypes: ItemDefinitionIntegrityReferenceType[] = [];
  const sourceKey = `item-definition:${item.id}`;
  const add = (referenceType: ItemDefinitionIntegrityReferenceType, reason: string) => {
    issueTypes.push(referenceType);
    pushReference(references, issueCounts, sourceKey, referenceType, item.id || "unknown", reason);
  };
  if (duplicateIds.has(item.id)) add("duplicate-id", "item definition ID is duplicated in the catalog");
  if (!ITEM_ID_PATTERN.test(item.id)) add("invalid-id", "item definition ID does not match the canonical lowercase ID pattern");
  if (!ITEM_CATEGORIES.includes(item.category)) add("invalid-category", `item category is unsupported: ${item.category}`);
  if (item.name.trim().length < 3 || item.effect.trim().length < 3) add("invalid-text", "item name and effect must contain at least three non-whitespace characters");
  if (!Number.isInteger(item.stackLimit) || item.stackLimit < 1 || item.stackLimit > MAX_STACK_LIMIT) add("invalid-stack", `stackLimit must be an integer from 1 to ${MAX_STACK_LIMIT}`);
  const shouldBeEquippable = ITEM_CATEGORIES.includes(item.category) && EQUIPPABLE_CATEGORIES.has(item.category);
  if (item.equippable !== shouldBeEquippable) add("equipment-rule", `category ${item.category} requires equippable=${shouldBeEquippable}`);
  if (item.equippable && item.stackLimit !== 1) add("equipment-rule", "equippable item must have stackLimit=1");
  if (!item.iconAssetId?.trim()) add("missing-icon", "item definition has no iconAssetId");
  if (item.isBlockItem && (item.category !== "structure" || !item.placementBlockId?.trim())) add("block-link", "block item must be a structure with a placementBlockId");
  if (item.category === "seed" && !item.soilId) add("plant-link", "seed item must specify soilId");
  if (item.id.startsWith("seed-plant-") && !plantIds.has(item.id.replace(/^seed-plant-/, "plant-"))) add("plant-link", "plant seed item has no matching plant definition");
  if (item.id.startsWith("seed-plant-") && item.soilId && !plantIds.has(item.id.replace(/^seed-plant-/, "plant-"))) add("plant-link", "plant seed item soil link cannot be verified without its plant definition");
  if (item.category === "structure" && item.isBlockItem && item.placementBlockId && item.stackLimit > 64) add("block-link", "placeable block stackLimit cannot exceed 64");
  if (itemById.get(item.id) !== item && !duplicateIds.has(item.id)) add("duplicate-id", "catalog lookup does not resolve this definition identity");
  return { id: item.id, category: item.category, stackLimit: item.stackLimit, equippable: item.equippable, ...(item.iconAssetId ? { iconAssetId: item.iconAssetId } : {}), issueTypes: Array.from(new Set(issueTypes)).sort(compareStrings), valid: issueTypes.length === 0 };
}

function auditPlantLinks(plants: PlantDefinition[], itemsById: Map<string, ItemDefinition>, references: ItemDefinitionIntegrityReference[], issueCounts: Record<ItemDefinitionIntegrityReferenceType, number>) {
  for (const plant of plants) {
    const sourceKey = `plant-definition:${plant.id}`;
    const seed = itemsById.get(plant.seedItemId);
    const yieldItem = itemsById.get(plant.yieldItemId);
    if (!seed || seed.category !== "seed" || seed.soilId !== plant.compatibleSoils[0]) pushReference(references, issueCounts, sourceKey, "plant-link", plant.id, "plant seedItemId does not resolve to a compatible seed item definition");
    if (!yieldItem) pushReference(references, issueCounts, sourceKey, "plant-link", plant.id, "plant yieldItemId does not resolve to an item definition");
  }
}

function auditItemInstances(instances: ItemInstance[], references: ItemDefinitionIntegrityReference[], issueCounts: Record<ItemDefinitionIntegrityReferenceType, number>) {
  const validation = validateItemInstances(instances);
  for (const issue of validation.issues) pushReference(references, issueCounts, "item-instance-validation", "item-instance", issue, issue);
}

export function buildItemDefinitionIntegrityDependencyGraphFromSources(input: ItemDefinitionIntegrityGraphInput, sources: ItemDefinitionIntegritySources): ItemDefinitionIntegrityGraphOutput {
  const rulesVersion = input.rulesVersion ?? ITEM_DEFINITION_INTEGRITY_RULES_VERSION;
  if (rulesVersion !== ITEM_DEFINITION_INTEGRITY_RULES_VERSION) throw new Error(`Unsupported item definition integrity rules version: ${rulesVersion}`);
  if (!input.seed.trim() || input.seed.length > 128) throw new Error("seed must be 1–128 characters");
  if (sources.items.length === 0 || sources.items.length > ITEM_DEFINITION_INTEGRITY_MAX_DEFINITIONS) throw new Error(`items must contain 1 to ${ITEM_DEFINITION_INTEGRITY_MAX_DEFINITIONS} definitions`);
  const sampleCount = input.sampleCount ?? 48;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > ITEM_DEFINITION_INTEGRITY_MAX_SAMPLE) throw new Error(`sampleCount must be an integer from 1 to ${ITEM_DEFINITION_INTEGRITY_MAX_SAMPLE}`);
  const sortedItems = [...sources.items].sort((left, right) => compareStrings(left.id, right.id));
  const sortedPlants = [...sources.plants].sort((left, right) => compareStrings(left.id, right.id));
  const duplicateIds = new Set(sortedItems.filter((item, index) => sortedItems.findIndex(candidate => candidate.id === item.id) !== index).map(item => item.id));
  const itemsById = new Map(sortedItems.map(item => [item.id, item]));
  const plantIds = new Set(sortedPlants.map(plant => plant.id));
  const references: ItemDefinitionIntegrityReference[] = [];
  const issueCounts = emptyIssueCounts();
  const records = sortedItems.map(item => auditDefinition(item, duplicateIds, itemsById, plantIds, references, issueCounts));
  auditPlantLinks(sortedPlants, itemsById, references, issueCounts);
  auditItemInstances(sources.itemInstances, references, issueCounts);
  const invalidDefinitionIds = new Set(records.filter(record => !record.valid).map(record => record.id));
  const catalogHash = hashStableJson(sortedItems as never);
  const plantHash = hashStableJson(sortedPlants as never);
  const instanceHash = hashStableJson(sources.itemInstances as never);
  const contentHash = hashStableJson({ generatorId: "item.definition.integrity", generatorVersion: ITEM_DEFINITION_INTEGRITY_GENERATOR_VERSION, schemaVersion: ITEM_DEFINITION_INTEGRITY_SCHEMA_VERSION, seed: input.seed, rulesVersion, catalogHash, plantHash, instanceHash, sampleCount } as never);
  const catalogNode: DependencyGraphNode = { key: `item-catalog:${catalogHash}`, kind: "item", generatorId: "item.catalog", generatorVersion: ITEM_DEFINITION_INTEGRITY_GENERATOR_VERSION, schemaVersion: "a-survival.item-catalog.v1", seed: input.seed, rulesVersion, contentHash: catalogHash, dependencies: [] };
  const sampleRecords = records.filter(record => record.id).slice(0, sampleCount);
  const sampleNodes = sampleRecords.map(record => {
    const node: DependencyGraphNode = { key: `item-integrity:${record.id}`, kind: "item", generatorId: "item.definition.integrity", generatorVersion: ITEM_DEFINITION_INTEGRITY_GENERATOR_VERSION, schemaVersion: ITEM_DEFINITION_INTEGRITY_SCHEMA_VERSION, seed: input.seed, rulesVersion, contentHash: hashStableJson(record as never), dependencies: [dependencyFor(catalogNode)] };
    if (!record.valid) node.dependencies.push(missingDependency(`item-integrity-blocker:${record.id}`));
    return node;
  });
  const rootNode: DependencyGraphNode = { key: `item-integrity-root:${contentHash}`, kind: "item", generatorId: "item.definition.integrity", generatorVersion: ITEM_DEFINITION_INTEGRITY_GENERATOR_VERSION, schemaVersion: ITEM_DEFINITION_INTEGRITY_SCHEMA_VERSION, seed: input.seed, rulesVersion, contentHash, dependencies: sampleNodes.map(dependencyFor) };
  if (references.length > 0) rootNode.dependencies.push(missingDependency(`item-integrity-blocker:${contentHash}`));
  const nodes = [catalogNode, ...sampleNodes, rootNode].sort((left, right) => compareStrings(left.key, right.key));
  const categoryCounts = Object.fromEntries(ITEM_CATEGORIES.map(category => [category, sortedItems.filter(item => item.category === category).length])) as Record<ItemCategory, number>;
  const sampledIds = sampleRecords.map(record => record.id);
  const unresolvedReferenceTotal = Object.values(issueCounts).reduce((sum, count) => sum + count, 0);
  return {
    artifact: { generatorId: "item.definition.integrity", generatorVersion: ITEM_DEFINITION_INTEGRITY_GENERATOR_VERSION, schemaVersion: ITEM_DEFINITION_INTEGRITY_SCHEMA_VERSION, seed: input.seed, rulesVersion, contentHash, catalogHash, plantHash, instanceHash, itemCount: sortedItems.length, plantCount: sortedPlants.length, instanceCount: sources.itemInstances.length, sampleCount: sampleRecords.length },
    summary: { itemCount: sortedItems.length, plantCount: sortedPlants.length, instanceCount: sources.itemInstances.length, sampleCount: sampleRecords.length, validDefinitionCount: sortedItems.length - invalidDefinitionIds.size, invalidDefinitionCount: invalidDefinitionIds.size, duplicateIdCount: issueCounts["duplicate-id"], invalidIdCount: issueCounts["invalid-id"], invalidCategoryCount: issueCounts["invalid-category"], invalidTextCount: issueCounts["invalid-text"], invalidStackCount: issueCounts["invalid-stack"], equipmentRuleViolationCount: issueCounts["equipment-rule"], missingIconCount: issueCounts["missing-icon"], plantLinkViolationCount: issueCounts["plant-link"], blockLinkViolationCount: issueCounts["block-link"], itemInstanceIssueCount: issueCounts["item-instance"], categoryCounts, issueCounts, unresolvedReferenceTotal, unresolvedReferenceCount: references.length, sampledIds },
    records: sampleRecords,
    unresolvedReferences: references.sort((left, right) => compareStrings(left.sourceKey, right.sourceKey) || compareStrings(left.referenceType, right.referenceType) || compareStrings(left.referenceId, right.referenceId) || compareStrings(left.reason, right.reason)),
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}

export function buildItemDefinitionIntegrityDependencyGraph(input: ItemDefinitionIntegrityGraphInput): ItemDefinitionIntegrityGraphOutput {
  return buildItemDefinitionIntegrityDependencyGraphFromSources(input, readActiveItemDefinitionIntegritySources());
}
