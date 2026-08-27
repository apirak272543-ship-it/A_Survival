import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { WORLD_GENERATOR_VERSION, type GeneratedSpawnPoint, type GeneratedWorld } from "../../tools/world-generator";
import { buildWorldStructureGraphNodes, generateWorldStructureGraphSource, WORLD_STRUCTURE_GRAPH_RULES_VERSION, type WorldStructureDependencyGraphInput } from "./worldStructureDependencyGraph";
import type { GeneratedStructurePlacement, StructureBlueprint } from "./structureGenerator";

export const STRUCTURE_SPAWN_RECONCILIATION_RULES_VERSION = "structure-spawn-reconciliation-rules.v1" as const;
export const STRUCTURE_SPAWN_RECONCILIATION_GENERATOR_VERSION = "1.0.0" as const;

export type StructureSpawnReconciliationInput = WorldStructureDependencyGraphInput & {
  sampleSpawnCount?: number;
};

export type StructureSpawnUnresolvedReference = {
  sourceKey: string;
  referenceType: "spawn-intent" | "species-mismatch" | "orphan-structure-spawn";
  referenceId: string;
  reason: string;
};

type ExpectedSpawnIntent = {
  id: string;
  role: "npc" | "mob";
  expectedRole: "npc" | "regular";
  count: number;
};

export type StructureSpawnReconciliationRecord = {
  placementId: string;
  blueprintId: string;
  expected: ExpectedSpawnIntent[];
  matchedSpawnIds: string[];
  unmatchedExpected: Array<ExpectedSpawnIntent & { missingCount: number }>;
  nearbySpawnIds: string[];
};

export type StructureSpawnReconciliationOutput = {
  artifact: {
    mapId: string;
    seed: string;
    numericSeed: number;
    worldHash: string;
    structureHash: string;
    worldGeneratorVersion: string;
    structureGeneratorVersion: string;
    structurePlacementCount: number;
    sampledSpawnCount: number;
    intentCount: number;
  };
  summary: {
    structurePlacementCount: number;
    worldStructureContextCount: number;
    structureIntentCount: number;
    sampledSpawnCount: number;
    matchedIntentCount: number;
    unmatchedIntentCount: number;
    orphanStructureSpawnCount: number;
    placementIds: string[];
    expectedSpeciesIds: string[];
    actualSpeciesIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<StructureSpawnUnresolvedReference["referenceType"], number>;
  };
  records: StructureSpawnReconciliationRecord[];
  unresolvedReferences: StructureSpawnUnresolvedReference[];
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

function buildWorldStructureContextNodes(world: GeneratedWorld, worldNode: DependencyGraphNode, seed: string, rulesVersion: string) {
  return world.structures.map(structure => ({
    key: `world-structure-context:${structure.id}`,
    kind: "structure" as const,
    generatorId: "world.generator",
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: "a-survival.generated-world-structure.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(structure as never),
    dependencies: [dependencyFor(worldNode)],
  } satisfies DependencyGraphNode));
}

function buildSpawnNode(world: GeneratedWorld, worldNode: DependencyGraphNode, contextById: Map<string, DependencyGraphNode>, spawn: GeneratedSpawnPoint, seed: string, rulesVersion: string, unresolvedReferences: StructureSpawnUnresolvedReference[]) {
  const node: DependencyGraphNode = {
    key: `spawn-reconciliation-source:${spawn.id}`,
    kind: spawn.role === "npc" ? "other" : "mob",
    generatorId: "world.generator",
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: "a-survival.generated-spawn-point.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(spawn as never),
    dependencies: [dependencyFor(worldNode)],
  };
  if (spawn.structureId) {
    const contextNode = contextById.get(spawn.structureId);
    if (contextNode) node.dependencies.push(dependencyFor(contextNode));
    else {
      node.dependencies.push(missingDependency(`world-structure-context:${spawn.structureId}`, "structure"));
      unresolvedReferences.push({ sourceKey: node.key, referenceType: "orphan-structure-spawn", referenceId: spawn.id, reason: `spawn references structure ${spawn.structureId}, but that world structure context is not present` });
    }
  }
  return node;
}

function expectedIntents(placement: GeneratedStructurePlacement): ExpectedSpawnIntent[] {
  return [
    ...placement.npcSpawns.filter(spawn => spawn.count > 0).map(spawn => ({ id: spawn.id, role: "npc" as const, expectedRole: "npc" as const, count: spawn.count })),
    ...placement.mobSpawns.filter(spawn => spawn.count > 0).map(spawn => ({ id: spawn.id, role: "mob" as const, expectedRole: "regular" as const, count: spawn.count })),
  ].sort((left, right) => left.role.localeCompare(right.role) || left.id.localeCompare(right.id));
}

function distance(left: { x: number; z: number }, right: { x: number; z: number }) {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function reconcilePlacement(blueprint: StructureBlueprint, placement: GeneratedStructurePlacement, sampledSpawns: GeneratedSpawnPoint[], spawnNodesById: Map<string, DependencyGraphNode>, unresolvedReferences: StructureSpawnUnresolvedReference[]) {
  const expected = expectedIntents(placement);
  const proximityRadius = Math.max(4, Math.ceil(Math.max(blueprint.footprint.width, blueprint.footprint.length) / 2));
  const nearby = sampledSpawns.filter(spawn => distance(placement, spawn) <= proximityRadius).sort((left, right) => left.id.localeCompare(right.id));
  const available = new Set(nearby.map(spawn => spawn.id));
  const matchedSpawnIds: string[] = [];
  const unmatchedExpected: StructureSpawnReconciliationRecord["unmatchedExpected"] = [];
  let matchedIntentCount = 0;
  for (const intent of expected) {
    const candidates = nearby.filter(spawn => available.has(spawn.id) && spawn.role === intent.expectedRole);
    const exact = candidates.filter(spawn => spawn.species === intent.id).slice(0, intent.count);
    exact.forEach(spawn => { available.delete(spawn.id); matchedSpawnIds.push(spawn.id); });
    matchedIntentCount += exact.length;
    const missingCount = intent.count - exact.length;
    if (missingCount > 0) {
      unmatchedExpected.push({ ...intent, missingCount });
      const hasRoleCandidates = candidates.length > 0;
      unresolvedReferences.push({ sourceKey: `structure-spawn-reconciliation:${placement.instanceId}`, referenceType: hasRoleCandidates ? "species-mismatch" : "spawn-intent", referenceId: `${placement.instanceId}:${intent.role}:${intent.id}`, reason: hasRoleCandidates ? `structure expects ${missingCount} ${intent.id} ${intent.role} spawn(s), but nearby world spawn species differ` : `structure expects ${missingCount} ${intent.id} ${intent.role} spawn(s), but no nearby world spawn point matches the expected role` });
    }
  }
  return { record: { placementId: placement.instanceId, blueprintId: placement.blueprintId, expected, matchedSpawnIds: matchedSpawnIds.sort(), unmatchedExpected, nearbySpawnIds: nearby.map(spawn => spawn.id) } satisfies StructureSpawnReconciliationRecord, matchedIntentCount, nearby, dependencies: matchedSpawnIds.map(id => spawnNodesById.get(id)).filter((node): node is DependencyGraphNode => Boolean(node)) };
}

export function buildStructureSpawnReconciliationDependencyGraph(input: StructureSpawnReconciliationInput): StructureSpawnReconciliationOutput {
  const rulesVersion = input.rulesVersion ?? STRUCTURE_SPAWN_RECONCILIATION_RULES_VERSION;
  if (rulesVersion !== STRUCTURE_SPAWN_RECONCILIATION_RULES_VERSION) throw new Error(`Unsupported structure spawn reconciliation rules version: ${rulesVersion}`);
  const radius = boundedInteger(input.radius, 32, 16, 64, "radius");
  const sampleSpawnCount = boundedInteger(input.sampleSpawnCount, 16, 1, 64, "sampleSpawnCount");
  const source = generateWorldStructureGraphSource({ ...input, radius, rulesVersion: WORLD_STRUCTURE_GRAPH_RULES_VERSION });
  const { world, blueprints, structureArtifact, numericSeed } = source;
  const baseStructureNodes = buildWorldStructureGraphNodes(world, structureArtifact, blueprints, input.seed, rulesVersion);
  const worldNode = baseStructureNodes.find(node => node.kind === "world")!;
  const placementNodeById = new Map(baseStructureNodes.filter(node => node.key.startsWith("structure-placement:")).map(node => [node.key.slice("structure-placement:".length), node]));
  const contextNodes = buildWorldStructureContextNodes(world, worldNode, input.seed, rulesVersion);
  const contextById = new Map(contextNodes.map(node => [node.key.slice("world-structure-context:".length), node]));
  const sampledSpawns = world.spawnPoints.slice().sort((left, right) => left.id.localeCompare(right.id)).slice(0, sampleSpawnCount);
  const unresolvedReferences: StructureSpawnUnresolvedReference[] = [];
  const spawnNodes = sampledSpawns.map(spawn => buildSpawnNode(world, worldNode, contextById, spawn, input.seed, rulesVersion, unresolvedReferences));
  const spawnNodesById = new Map(spawnNodes.map(node => [node.key.slice("spawn-reconciliation-source:".length), node]));
  const blueprintById = new Map(blueprints.map(blueprint => [blueprint.id, blueprint]));
  const records: StructureSpawnReconciliationRecord[] = [];
  const reconciliationNodes: DependencyGraphNode[] = [];
  let matchedIntentCount = 0;
  for (const placement of structureArtifact.output.placements) {
    const blueprint = blueprintById.get(placement.blueprintId);
    if (!blueprint) continue;
    const reconciliation = reconcilePlacement(blueprint, placement, sampledSpawns, spawnNodesById, unresolvedReferences);
    records.push(reconciliation.record);
    matchedIntentCount += reconciliation.matchedIntentCount;
    const node: DependencyGraphNode = {
      key: `structure-spawn-reconciliation:${placement.instanceId}`,
      kind: "other",
      generatorId: "structure.spawn.reconciliation",
      generatorVersion: STRUCTURE_SPAWN_RECONCILIATION_GENERATOR_VERSION,
      schemaVersion: "a-survival.structure-spawn-reconciliation.v1",
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson(reconciliation.record as never),
      dependencies: [
        ...(placementNodeById.get(placement.instanceId) ? [dependencyFor(placementNodeById.get(placement.instanceId)!)] : [missingDependency(`structure-placement:${placement.instanceId}`, "structure")]),
        ...reconciliation.dependencies.map(dependencyFor),
      ],
    };
    if (reconciliation.record.unmatchedExpected.length > 0) node.dependencies.push(missingDependency(`spawn-reconciliation-validation:${placement.instanceId}`, "other"));
    reconciliationNodes.push(node);
  }
  const reconciledPlacementIds = new Set(records.map(record => record.placementId));
  for (const spawn of sampledSpawns.filter(spawn => Boolean(spawn.structureId))) {
    const nearestPlacement = structureArtifact.output.placements.find(placement => {
      const blueprint = blueprintById.get(placement.blueprintId);
      return blueprint && distance(placement, spawn) <= Math.max(4, Math.ceil(Math.max(blueprint.footprint.width, blueprint.footprint.length) / 2));
    });
    if (!nearestPlacement || !reconciledPlacementIds.has(nearestPlacement.instanceId)) unresolvedReferences.push({ sourceKey: `spawn-reconciliation-source:${spawn.id}`, referenceType: "orphan-structure-spawn", referenceId: spawn.id, reason: `world spawn ${spawn.id} is structure-linked to ${spawn.structureId} but has no matching generated structure placement` });
  }
  const expectedSpeciesIds = Array.from(new Set(records.flatMap(record => record.expected.map(intent => intent.id)))).sort();
  const actualSpeciesIds = Array.from(new Set(sampledSpawns.map(spawn => spawn.species))).sort();
  const structureIntentCount = records.reduce((sum, record) => sum + record.expected.reduce((inner, intent) => inner + intent.count, 0), 0);
  const orphanStructureSpawnCount = unresolvedReferences.filter(reference => reference.referenceType === "orphan-structure-spawn").length;
  const unresolvedReferenceTypes = {
    "spawn-intent": unresolvedReferences.filter(reference => reference.referenceType === "spawn-intent").length,
    "species-mismatch": unresolvedReferences.filter(reference => reference.referenceType === "species-mismatch").length,
    "orphan-structure-spawn": orphanStructureSpawnCount,
  } satisfies Record<StructureSpawnUnresolvedReference["referenceType"], number>;
  const nodes = [...baseStructureNodes, ...contextNodes, ...spawnNodes, ...reconciliationNodes];
  return {
    artifact: {
      mapId: world.mapId,
      seed: input.seed,
      numericSeed,
      worldHash: world.worldHash,
      structureHash: structureArtifact.contentHash,
      worldGeneratorVersion: world.generatorVersion,
      structureGeneratorVersion: structureArtifact.generatorVersion,
      structurePlacementCount: structureArtifact.output.placements.length,
      sampledSpawnCount: sampledSpawns.length,
      intentCount: structureIntentCount,
    },
    summary: {
      structurePlacementCount: structureArtifact.output.placements.length,
      worldStructureContextCount: world.structures.length,
      structureIntentCount,
      sampledSpawnCount: sampledSpawns.length,
      matchedIntentCount,
      unmatchedIntentCount: structureIntentCount - matchedIntentCount,
      orphanStructureSpawnCount,
      placementIds: structureArtifact.output.placements.map(placement => placement.instanceId).sort(),
      expectedSpeciesIds,
      actualSpeciesIds,
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    records: records.sort((left, right) => left.placementId.localeCompare(right.placementId)),
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
