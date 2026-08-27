import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { CONTENT_GENERATOR_VERSION, type GeneratedLoot, type ProceduralItemDefinition } from "../../tools/content-generator";
import { buildUniversalItemInput, UNIVERSAL_ITEM_GENERATOR_VERSION } from "./proceduralUniversalItemDependencyGraph";
import { createUniversalItemRegistry, type UniversalItemDefinition, type UniversalItemGenerationInput } from "./universalItemEngine";
import { buildWorldSpawnLootDependencyGraph, generateWorldSpawnLootGraphSource, WORLD_SPAWN_LOOT_GRAPH_RULES_VERSION, type UnresolvedWorldSpawnLootReference, type WorldSpawnLootDependencyGraphInput } from "./worldSpawnLootDependencyGraph";

export const WORLD_SPAWN_LOOT_UNIVERSAL_ITEM_GRAPH_RULES_VERSION = "world-spawn-loot-universal-item-graph-rules.v1" as const;

export type WorldSpawnLootUniversalItemDependencyGraphInput = WorldSpawnLootDependencyGraphInput & {
  maxPowerBudget?: number;
};

export type WorldSpawnLootUniversalItemReference = UnresolvedWorldSpawnLootReference | {
  sourceKey: string;
  referenceType: "universal-item-validation";
  referenceId: string;
  reason: string;
};

export type WorldSpawnLootUniversalItemArtifactSummary = {
  spawnId: string;
  dropId: string;
  id: string;
  contentHash?: string;
  balanceScore?: number;
  valid: boolean;
  issues: string[];
};

export type WorldSpawnLootUniversalItemDependencyGraphOutput = {
  artifact: {
    mapId: string;
    seed: string;
    numericSeed: number;
    worldHash: string;
    lootGeneratorVersion: string;
    universalItemGeneratorVersion: string;
    sampledSpawnCount: number;
    lootCount: number;
    dropCount: number;
    universalItemCount: number;
    blockedItemCount: number;
  };
  summary: {
    sampledSpawnCount: number;
    lootCount: number;
    dropCount: number;
    universalItemCount: number;
    blockedItemCount: number;
    spawnIds: string[];
    dropItemIds: string[];
    universalItemIds: string[];
    assetIds: string[];
    balanceScores: number[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<string, number>;
  };
  universalItems: WorldSpawnLootUniversalItemArtifactSummary[];
  unresolvedReferences: WorldSpawnLootUniversalItemReference[];
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

function lootItemKey(spawnId: string, itemId: string) {
  return `loot-item:${spawnId}:${itemId}`;
}

function addValidationReference(list: WorldSpawnLootUniversalItemReference[], sourceKey: string, itemId: string, reason: string) {
  list.push({ sourceKey, referenceType: "universal-item-validation", referenceId: itemId, reason });
}

function buildUniversalNode(item: ProceduralItemDefinition, spawnId: string, loot: GeneratedLoot, lootItemNode: DependencyGraphNode, input: WorldSpawnLootUniversalItemDependencyGraphInput, maxPowerBudget: number, registry: ReturnType<typeof createUniversalItemRegistry>, universalItems: WorldSpawnLootUniversalItemArtifactSummary[], unresolvedReferences: WorldSpawnLootUniversalItemReference[]) {
  const universalInput: UniversalItemGenerationInput = { ...buildUniversalItemInput(item), maxPowerBudget };
  try {
    const artifact = registry.generate<UniversalItemGenerationInput, { schemaVersion: "a-survival.universal-item.v1"; definition: UniversalItemDefinition }>("item.universal", universalInput, { seed: `${input.seed}:${loot.seed}:${item.id}`, generatedAt: 0 });
    universalItems.push({ spawnId, dropId: item.id, id: artifact.output.definition.id, contentHash: artifact.contentHash, balanceScore: artifact.output.definition.balanceProfile.totalScore, valid: true, issues: [] });
    return {
      key: `item-universal:loot:${spawnId}:${item.id}:${artifact.contentHash}`,
      kind: "item" as const,
      generatorId: "item.universal",
      generatorVersion: UNIVERSAL_ITEM_GENERATOR_VERSION,
      schemaVersion: artifact.output.schemaVersion,
      seed: `${input.seed}:${loot.seed}:${item.id}`,
      rulesVersion: input.rulesVersion ?? WORLD_SPAWN_LOOT_UNIVERSAL_ITEM_GRAPH_RULES_VERSION,
      contentHash: artifact.contentHash,
      dependencies: [dependencyFor(lootItemNode)],
    } satisfies DependencyGraphNode;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    universalItems.push({ spawnId, dropId: item.id, id: item.id, valid: false, issues: [reason] });
    addValidationReference(unresolvedReferences, lootItemNode.key, item.id, reason);
    return {
      key: `item-universal:loot:${spawnId}:${item.id}`,
      kind: "item" as const,
      generatorId: "item.universal",
      generatorVersion: UNIVERSAL_ITEM_GENERATOR_VERSION,
      schemaVersion: "a-survival.universal-item.v1" as const,
      seed: `${input.seed}:${loot.seed}:${item.id}`,
      rulesVersion: input.rulesVersion ?? WORLD_SPAWN_LOOT_UNIVERSAL_ITEM_GRAPH_RULES_VERSION,
      contentHash: hashStableJson({ id: item.id, spawn: loot.monsterId, reason } as never),
      dependencies: [dependencyFor(lootItemNode), missingDependency(`item.universal.output:${item.id}`, "item")],
    } satisfies DependencyGraphNode;
  }
}

export function buildWorldSpawnLootUniversalItemDependencyGraph(input: WorldSpawnLootUniversalItemDependencyGraphInput): WorldSpawnLootUniversalItemDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? WORLD_SPAWN_LOOT_UNIVERSAL_ITEM_GRAPH_RULES_VERSION;
  if (rulesVersion !== WORLD_SPAWN_LOOT_UNIVERSAL_ITEM_GRAPH_RULES_VERSION) throw new Error(`Unsupported world spawn loot universal item graph rules version: ${rulesVersion}`);
  const radius = boundedInteger(input.radius, 32, 16, 64, "radius");
  const sampleSpawnCount = boundedInteger(input.sampleSpawnCount, 16, 1, 64, "sampleSpawnCount");
  const maxPowerBudget = boundedInteger(input.maxPowerBudget, 100, 1, 100, "maxPowerBudget");
  const source = generateWorldSpawnLootGraphSource({ ...input, radius, sampleSpawnCount });
  const lootGraph = buildWorldSpawnLootDependencyGraph({ ...input, radius, sampleSpawnCount, rulesVersion: WORLD_SPAWN_LOOT_GRAPH_RULES_VERSION });
  const baseNodes = lootGraph.nodes.map(node => ({ ...node, rulesVersion }));
  const lootItemNodes = new Map(baseNodes.filter(node => node.key.startsWith("loot-item:")).map(node => [node.key, node]));
  const registry = createUniversalItemRegistry();
  const unresolvedReferences: WorldSpawnLootUniversalItemReference[] = [...lootGraph.unresolvedReferences];
  const universalItems: WorldSpawnLootUniversalItemArtifactSummary[] = [];
  const universalNodes = source.lootRecords.flatMap(record => record.loot.drops.map(item => {
    const lootItemNode = lootItemNodes.get(lootItemKey(record.spawn.id, item.id));
    if (!lootItemNode) {
      const missingKey = lootItemKey(record.spawn.id, item.id);
      addValidationReference(unresolvedReferences, missingKey, item.id, "loot item node generated by world spawn loot owner is missing from the composed graph");
      return {
        key: `item-universal:loot:${record.spawn.id}:${item.id}`,
        kind: "item" as const,
        generatorId: "item.universal",
        generatorVersion: UNIVERSAL_ITEM_GENERATOR_VERSION,
        schemaVersion: "a-survival.universal-item.v1" as const,
        seed: `${input.seed}:${record.loot.seed}:${item.id}`,
        rulesVersion,
        contentHash: hashStableJson({ id: item.id, spawn: record.spawn.id, missingKey } as never),
        dependencies: [missingDependency(missingKey, "item")],
      } satisfies DependencyGraphNode;
    }
    return buildUniversalNode(item, record.spawn.id, record.loot, lootItemNode, { ...input, rulesVersion }, maxPowerBudget, registry, universalItems, unresolvedReferences);
  }));
  const graphNodes = [...baseNodes, ...universalNodes];
  const balanceScores = universalItems.flatMap(item => item.balanceScore === undefined ? [] : [item.balanceScore]);
  const unresolvedReferenceTypes = Object.fromEntries(Array.from(new Set(unresolvedReferences.map(reference => reference.referenceType))).sort().map(type => [type, unresolvedReferences.filter(reference => reference.referenceType === type).length]));
  return {
    artifact: {
      mapId: source.world.mapId,
      seed: input.seed,
      numericSeed: source.numericSeed,
      worldHash: source.world.worldHash,
      lootGeneratorVersion: CONTENT_GENERATOR_VERSION,
      universalItemGeneratorVersion: UNIVERSAL_ITEM_GENERATOR_VERSION,
      sampledSpawnCount: source.sampledSpawns.length,
      lootCount: source.lootRecords.length,
      dropCount: source.lootRecords.reduce((sum, record) => sum + record.loot.drops.length, 0),
      universalItemCount: universalItems.filter(item => item.valid).length,
      blockedItemCount: universalItems.filter(item => !item.valid).length,
    },
    summary: {
      sampledSpawnCount: source.sampledSpawns.length,
      lootCount: source.lootRecords.length,
      dropCount: source.lootRecords.reduce((sum, record) => sum + record.loot.drops.length, 0),
      universalItemCount: universalItems.filter(item => item.valid).length,
      blockedItemCount: universalItems.filter(item => !item.valid).length,
      spawnIds: source.lootRecords.map(record => record.spawn.id).sort(),
      dropItemIds: Array.from(new Set(source.lootRecords.flatMap(record => record.loot.drops.map(item => item.id)))).sort(),
      universalItemIds: universalItems.map(item => item.id).sort(),
      assetIds: Array.from(new Set(source.lootRecords.flatMap(record => record.loot.drops.map(item => item.asset.assetId)))).sort(),
      balanceScores,
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    universalItems,
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes: graphNodes,
    graph: validateGeneratorDependencyGraph(graphNodes),
  };
}
