import { hashStableJson } from "./commonGeneratorApi";
import { buildContentCatalogDependencyGraph } from "./contentCatalogDependencyGraph";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation } from "./dependencyGraph";
import { createUniversalItemRegistry, type UniversalItemGenerationInput, type UniversalItemGenerationOutput } from "./universalItemEngine";

export const ITEM_CONTENT_CATALOG_GRAPH_RULES_VERSION = "item-content-catalog-graph-rules.v1" as const;

export type ItemContentCatalogDependencyGraphInput = {
  seed: string;
  itemId?: string;
  samplePerCategory?: number;
  maxPowerBudget?: number;
  rulesVersion?: string;
};

export type ItemContentCatalogDependencyGraphOutput = {
  artifact: {
    generatorId: string;
    generatorVersion: string;
    seed: string;
    itemId: string;
    category: string;
    contentHash: string;
    balanceScore: number;
  };
  summary: {
    catalogDefinitionCount: number;
    sampledCatalogNodeCount: number;
    referenceCount: number;
    unresolvedReferenceCount: number;
    balanceScore: number;
  };
  unresolvedReferences: Array<{ dependencyKey: string; source: string; reason: string }>;
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedSample(value: number | undefined) {
  const sample = value ?? 1;
  if (!Number.isInteger(sample) || sample < 1 || sample > 8) throw new Error("samplePerCategory must be an integer from 1 to 8");
  return sample;
}

function boundedBudget(value: number | undefined) {
  const budget = value ?? 100;
  if (!Number.isInteger(budget) || budget < 1 || budget > 100) throw new Error("maxPowerBudget must be an integer from 1 to 100");
  return budget;
}

function itemId(value: string | undefined) {
  const id = value ?? "obsidian-rift-blade";
  if (!/^[a-z0-9][a-z0-9.-]{2,63}$/.test(id)) throw new Error("itemId must use lowercase letters, numbers, dots or hyphens");
  return id;
}

function itemInput(id: string): UniversalItemGenerationInput {
  return {
    maxPowerBudget: 100,
    item: {
      id,
      name: id === "obsidian-rift-blade" ? "Obsidian Rift Blade" : `Generated ${id}`,
      family: "melee",
      category: "weapon-sword",
      role: "dps",
      materialTags: ["obsidian", "metal"],
      environmentTags: ["volcanic", "frontier"],
      progression: "mid",
      element: "dark",
      damageType: "physical",
      purpose: "ตัดผ่านเกราะของศัตรูระยะประชิด",
      identity: "ดาบหนักที่เน้นจังหวะและตำแหน่ง ไม่ใช่ระยะไกล",
      weakness: "เคลื่อนที่ช้าลงและเสียเปรียบเมื่อถูกกดจากระยะไกล",
      counters: ["cover", "mobility"],
      stats: { damage: 70, range: 20, attackSpeed: 70, area: 10, critical: 25, mobility: 60, defense: 20, healing: 0, utility: 25 },
      tradeOffs: [
        { stat: "range", amount: 20, reason: "ต้องเข้าใกล้เพื่อแลกความเสียหาย" },
        { stat: "defense", amount: 15, reason: "ไม่มีโล่จึงรับการโจมตีได้น้อย" },
      ],
      effects: [],
      durability: { maximum: 300, current: 300 },
      repair: { method: "station", resources: [{ source: "mining", resourceId: "obsidian-shard", quantity: 2 }], baseCost: 8 },
      compatibility: [
        { target: "material", tag: "obsidian", result: "allowed", reason: "วัสดุเข้ากับรูปแบบคมตัด" },
        { target: "plant", tag: "fire", result: "restricted", reason: "ใช้ร่วมได้เฉพาะ enchant ที่รองรับ" },
      ],
      resources: [{ source: "mining", resourceId: "obsidian-shard", quantity: 3 }],
      recommendedBuilds: ["dps", "assassin"],
      performanceCost: 12,
    },
  };
}

function dependencyFor(node: DependencyGraphNode) {
  return { key: node.key, kind: node.kind, required: true, generatorId: node.generatorId, generatorVersion: node.generatorVersion, contentHash: node.contentHash };
}

export function buildItemContentCatalogDependencyGraph(input: ItemContentCatalogDependencyGraphInput): ItemContentCatalogDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? ITEM_CONTENT_CATALOG_GRAPH_RULES_VERSION;
  if (rulesVersion !== ITEM_CONTENT_CATALOG_GRAPH_RULES_VERSION) throw new Error(`Unsupported item content catalog graph rules version: ${rulesVersion}`);
  const samplePerCategory = boundedSample(input.samplePerCategory);
  const maxPowerBudget = boundedBudget(input.maxPowerBudget);
  const id = itemId(input.itemId);
  const catalog = buildContentCatalogDependencyGraph({ seed: input.seed, samplePerCategory });
  const catalogRoot = catalog.nodes.find(node => node.key.startsWith("content-catalog:"));
  if (!catalogRoot) throw new Error("Content catalog root node is missing");
  const generated = createUniversalItemRegistry().generate<UniversalItemGenerationInput, UniversalItemGenerationOutput>("item.universal", { ...itemInput(id), maxPowerBudget }, { seed: input.seed, generatedAt: 0 });
  const definition = generated.output.definition;
  const categoryNode = catalog.nodes.find(node => node.key === "content:weapon-sword-001");
  const unresolvedReferences: ItemContentCatalogDependencyGraphOutput["unresolvedReferences"] = [];
  const dependencies: DependencyGraphNode["dependencies"] = [dependencyFor(catalogRoot)];
  if (categoryNode) dependencies.push(dependencyFor(categoryNode));
  else { dependencies.push({ key: "content:weapon-sword-001", kind: "item", required: true }); unresolvedReferences.push({ dependencyKey: "content:weapon-sword-001", source: "item.category", reason: "The sampled content catalog does not contain the item's category definition" }); }
  for (const resource of definition.resources) {
    const dependencyKey = `content:${resource.resourceId}`;
    const resourceNode = catalog.nodes.find(node => node.key === dependencyKey);
    if (resourceNode) dependencies.push(dependencyFor(resourceNode));
    else { dependencies.push({ key: dependencyKey, kind: "item", required: true }); unresolvedReferences.push({ dependencyKey, source: `item.resources.${resource.source}`, reason: `The item resource reference ${resource.resourceId} is not present in the sampled content catalog` }); }
  }
  const itemNode: DependencyGraphNode = {
    key: `item:${definition.id}:${generated.contentHash}`,
    kind: "item",
    generatorId: generated.generatorId,
    generatorVersion: generated.generatorVersion,
    schemaVersion: generated.output.schemaVersion,
    seed: generated.seed,
    rulesVersion,
    contentHash: generated.contentHash,
    dependencies,
  };
  const nodes = [...catalog.nodes, itemNode];
  return {
    artifact: { generatorId: generated.generatorId, generatorVersion: generated.generatorVersion, seed: generated.seed, itemId: definition.id, category: definition.category, contentHash: generated.contentHash, balanceScore: definition.balanceProfile.totalScore },
    summary: { catalogDefinitionCount: catalog.artifact.definitionCount, sampledCatalogNodeCount: catalog.nodes.length, referenceCount: dependencies.length + unresolvedReferences.length, unresolvedReferenceCount: unresolvedReferences.length, balanceScore: definition.balanceProfile.totalScore },
    unresolvedReferences,
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
