import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { buildWorldSpawnLootDependencyGraph, generateWorldSpawnLootGraphSource, WORLD_SPAWN_LOOT_GRAPH_RULES_VERSION } from "./worldSpawnLootDependencyGraph";
import { WORLD_GENERATOR_VERSION } from "../../tools/world-generator";
import { initialMap001Encounter, MAP001_DISTRESS_POD, MAP001_MONOLITH, MAP001_TELEGRAPH_MS, resolveMap001Encounter, type Map001EncounterResult } from "../../client/src/game/map001/encounter";

export const MAP001_ENCOUNTER_GRAPH_RULES_VERSION = "map001-encounter-graph-rules.v1" as const;
export const MAP001_ENCOUNTER_OWNER_VERSION = "1.0.0" as const;

export type Map001EncounterDependencyGraphInput = {
  seed: string;
  radius?: number;
  sampleSpawnCount?: number;
  rulesVersion?: string;
};

type EncounterSpawnTarget = {
  id: string;
  role: "regular" | "boss";
  species: string;
  count: number;
  x: number;
  z: number;
  radius: number;
};

export type Map001EncounterEventRecord = {
  id: string;
  event: Map001EncounterResult["event"];
  target: EncounterSpawnTarget;
  triggered: boolean;
  matchedSpawnIds: string[];
  nearbySpeciesIds: string[];
  expectedCount: number;
  matchedCount: number;
  missingCount: number;
};

export type Map001EncounterUnresolvedReference = {
  sourceKey: string;
  referenceType: "encounter-output" | "spawn-coverage" | "loot-context";
  referenceId: string;
  reason: string;
};

export type Map001EncounterDependencyGraphOutput = {
  artifact: {
    mapId: "obsidian-frontier";
    seed: string;
    numericSeed: number;
    worldHash: string;
    worldGeneratorVersion: string;
    encounterOwnerVersion: string;
    lootGeneratorVersion: string;
    triggerCount: number;
    expectedSpawnCount: number;
    matchedSpawnCount: number;
    missingSpawnCount: number;
  };
  summary: {
    mapId: "obsidian-frontier";
    triggerCount: number;
    expectedSpawnCount: number;
    matchedSpawnCount: number;
    missingSpawnCount: number;
    sampledSpawnCount: number;
    eventIds: string[];
    eventKinds: string[];
    expectedSpeciesIds: string[];
    matchedSpawnIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<Map001EncounterUnresolvedReference["referenceType"], number>;
  };
  events: Map001EncounterEventRecord[];
  unresolvedReferences: Map001EncounterUnresolvedReference[];
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

function distance(left: { x: number; z: number }, right: { x: number; z: number }) {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function encounterTriggerResults() {
  const distressTelegraph = resolveMap001Encounter(initialMap001Encounter(), { x: MAP001_DISTRESS_POD.x, z: MAP001_DISTRESS_POD.z, health: 100, phase: "day", interacted: true, now: 1_000 });
  const distressActive = resolveMap001Encounter(distressTelegraph.memory, { x: MAP001_DISTRESS_POD.x, z: MAP001_DISTRESS_POD.z, health: 100, phase: "day", interacted: false, now: 1_000 + MAP001_TELEGRAPH_MS });
  const bossTelegraph = resolveMap001Encounter(initialMap001Encounter(), { x: MAP001_MONOLITH.x, z: MAP001_MONOLITH.z, health: 100, phase: "night", interacted: false, now: 2_000 });
  const bossActive = resolveMap001Encounter(bossTelegraph.memory, { x: MAP001_MONOLITH.x, z: MAP001_MONOLITH.z, health: 100, phase: "night", interacted: false, now: 2_000 + MAP001_TELEGRAPH_MS });
  return { distressTelegraph, distressActive, bossTelegraph, bossActive };
}

function addCoverageReference(unresolvedReferences: Map001EncounterUnresolvedReference[], sourceKey: string, target: EncounterSpawnTarget, missingCount: number, nearbySpeciesIds: string[]) {
  unresolvedReferences.push({ sourceKey, referenceType: "spawn-coverage", referenceId: target.id, reason: nearbySpeciesIds.length > 0
    ? `MAP_001 encounter expects ${missingCount} ${target.species} ${target.role} spawn(s) near ${target.id}, but sampled world spawn coverage is insufficient`
    : `MAP_001 encounter expects ${missingCount} ${target.species} ${target.role} spawn(s) near ${target.id}, but no sampled world spawn point is inside the encounter radius` });
}

function buildEncounterNode(id: string, result: Map001EncounterResult, profileNode: DependencyGraphNode, worldNode: DependencyGraphNode, seed: string, rulesVersion: string, dependencies: GeneratorDependency[]) {
  return {
    key: `map001-encounter-output:${id}`,
    kind: "other" as const,
    generatorId: "map001.encounter",
    generatorVersion: MAP001_ENCOUNTER_OWNER_VERSION,
    schemaVersion: "a-survival.map001-encounter-output.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson({ id, result } as never),
    dependencies: [dependencyFor(profileNode), dependencyFor(worldNode), ...dependencies],
  } satisfies DependencyGraphNode;
}

export function buildMap001EncounterDependencyGraph(input: Map001EncounterDependencyGraphInput): Map001EncounterDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? MAP001_ENCOUNTER_GRAPH_RULES_VERSION;
  if (rulesVersion !== MAP001_ENCOUNTER_GRAPH_RULES_VERSION) throw new Error(`Unsupported MAP_001 encounter graph rules version: ${rulesVersion}`);
  const radius = boundedInteger(input.radius, 32, 16, 64, "radius");
  const sampleSpawnCount = boundedInteger(input.sampleSpawnCount, 16, 1, 64, "sampleSpawnCount");
  const source = generateWorldSpawnLootGraphSource({ seed: input.seed, radius, sampleSpawnCount, rulesVersion: WORLD_SPAWN_LOOT_GRAPH_RULES_VERSION });
  const worldLootGraph = buildWorldSpawnLootDependencyGraph({ seed: input.seed, radius, sampleSpawnCount, rulesVersion: WORLD_SPAWN_LOOT_GRAPH_RULES_VERSION });
  const baseNodes = worldLootGraph.nodes.map(node => ({ ...node, rulesVersion }));
  const worldNode = baseNodes.find(node => node.kind === "world")!;
  const spawnNodesById = new Map(baseNodes.filter(node => node.key.startsWith("spawn:")).map(node => [node.key.slice("spawn:".length), node]));
  const lootNodesBySpawnId = new Map(baseNodes.filter(node => node.key.startsWith("loot:")).map(node => [node.key.slice("loot:".length), node]));
  const profileNode: DependencyGraphNode = {
    key: "map001-encounter-profile:commander-koral",
    kind: "other",
    generatorId: "map001.encounter",
    generatorVersion: MAP001_ENCOUNTER_OWNER_VERSION,
    schemaVersion: "a-survival.map001-encounter.v1",
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson({ mapId: "obsidian-frontier", safeZoneRadius: 7, distressPod: MAP001_DISTRESS_POD, monolith: MAP001_MONOLITH, telegraphMs: MAP001_TELEGRAPH_MS } as never),
    dependencies: [dependencyFor(worldNode)],
  };
  const { distressTelegraph, distressActive, bossTelegraph, bossActive } = encounterTriggerResults();
  const targets: Array<{ id: string; result: Map001EncounterResult; target: EncounterSpawnTarget }> = [
    { id: "distress-pod-glass-stalkers", result: distressActive, target: { id: "map001-distress-pod", role: "regular", species: "glass-stalker", count: distressActive.spawnGlassStalkers, x: MAP001_DISTRESS_POD.x, z: MAP001_DISTRESS_POD.z, radius: MAP001_DISTRESS_POD.radius } },
    { id: "leyline-monolith-void-reaper", result: bossActive, target: { id: "map001-leyline-monolith", role: "boss", species: "void-reaper", count: bossActive.activateVoidReaper ? 1 : 0, x: MAP001_MONOLITH.x, z: MAP001_MONOLITH.z, radius: MAP001_MONOLITH.radius } },
  ];
  const unresolvedReferences: Map001EncounterUnresolvedReference[] = [];
  const events: Map001EncounterEventRecord[] = [];
  const outputNodes: DependencyGraphNode[] = [];
  const triggerNodes: DependencyGraphNode[] = [];
  let expectedSpawnCount = 0;
  let matchedSpawnCount = 0;
  for (const entry of targets) {
    const triggerResult = entry.id.startsWith("distress") ? distressTelegraph : bossTelegraph;
    const triggerNode: DependencyGraphNode = {
      key: `map001-encounter-trigger:${entry.id}`,
      kind: "other",
      generatorId: "map001.encounter",
      generatorVersion: MAP001_ENCOUNTER_OWNER_VERSION,
      schemaVersion: "a-survival.map001-encounter-trigger.v1",
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson({ id: entry.id, result: triggerResult } as never),
      dependencies: [dependencyFor(profileNode), dependencyFor(worldNode)],
    };
    triggerNodes.push(triggerNode);
    const nearby = source.sampledSpawns.filter(spawn => spawn.role === entry.target.role && distance(spawn, entry.target) <= entry.target.radius && spawn.species === entry.target.species).sort((left, right) => left.id.localeCompare(right.id));
    const matched = nearby.slice(0, entry.target.count);
    const missingCount = Math.max(0, entry.target.count - matched.length);
    expectedSpawnCount += entry.target.count;
    matchedSpawnCount += matched.length;
    if (missingCount > 0) addCoverageReference(unresolvedReferences, `map001-encounter-output:${entry.id}`, entry.target, missingCount, source.sampledSpawns.filter(spawn => distance(spawn, entry.target) <= entry.target.radius).map(spawn => spawn.species).sort());
    const dependencies: GeneratorDependency[] = [dependencyFor(triggerNode)];
    for (const spawn of matched) {
      const spawnNode = spawnNodesById.get(spawn.id);
      if (spawnNode) {
        dependencies.push(dependencyFor(spawnNode));
        const lootNode = lootNodesBySpawnId.get(spawn.id);
        if (lootNode) dependencies.push(dependencyFor(lootNode));
        else unresolvedReferences.push({ sourceKey: `map001-encounter-output:${entry.id}`, referenceType: "loot-context", referenceId: spawn.id, reason: `matched ${spawn.species} spawn has no world spawn loot node` });
      } else dependencies.push(missingDependency(`spawn:${spawn.id}`, "mob"));
    }
    for (let index = matched.length; index < entry.target.count; index += 1) dependencies.push(missingDependency(`map001-encounter-target:${entry.id}:${index + 1}`, "mob"));
    const outputNode = buildEncounterNode(entry.id, entry.result, profileNode, worldNode, input.seed, rulesVersion, dependencies);
    outputNodes.push(outputNode);
    events.push({ id: entry.id, event: entry.result.event, target: entry.target, triggered: entry.result.event !== "none", matchedSpawnIds: matched.map(spawn => spawn.id), nearbySpeciesIds: source.sampledSpawns.filter(spawn => distance(spawn, entry.target) <= entry.target.radius).map(spawn => spawn.species).sort(), expectedCount: entry.target.count, matchedCount: matched.length, missingCount });
  }
  const unresolvedReferenceTypes = {
    "encounter-output": unresolvedReferences.filter(reference => reference.referenceType === "encounter-output").length,
    "spawn-coverage": unresolvedReferences.filter(reference => reference.referenceType === "spawn-coverage").length,
    "loot-context": unresolvedReferences.filter(reference => reference.referenceType === "loot-context").length,
  } satisfies Record<Map001EncounterUnresolvedReference["referenceType"], number>;
  const nodes = [...baseNodes, profileNode, ...triggerNodes, ...outputNodes];
  return {
    artifact: {
      mapId: "obsidian-frontier",
      seed: input.seed,
      numericSeed: source.numericSeed,
      worldHash: source.world.worldHash,
      worldGeneratorVersion: WORLD_GENERATOR_VERSION,
      encounterOwnerVersion: MAP001_ENCOUNTER_OWNER_VERSION,
      lootGeneratorVersion: "0.1.0",
      triggerCount: targets.length,
      expectedSpawnCount,
      matchedSpawnCount,
      missingSpawnCount: expectedSpawnCount - matchedSpawnCount,
    },
    summary: {
      mapId: "obsidian-frontier",
      triggerCount: targets.length,
      expectedSpawnCount,
      matchedSpawnCount,
      missingSpawnCount: expectedSpawnCount - matchedSpawnCount,
      sampledSpawnCount: source.sampledSpawns.length,
      eventIds: events.map(event => event.id).sort(),
      eventKinds: events.map(event => event.event).sort(),
      expectedSpeciesIds: Array.from(new Set(events.flatMap(event => event.target.count > 0 ? [event.target.species] : []))).sort(),
      matchedSpawnIds: Array.from(new Set(events.flatMap(event => event.matchedSpawnIds))).sort(),
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    events: events.sort((left, right) => left.id.localeCompare(right.id)),
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
