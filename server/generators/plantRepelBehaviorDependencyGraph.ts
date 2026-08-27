import { PLANT_CATALOG } from "@/game/data/plantCatalog";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const PLANT_REPEL_BEHAVIOR_GENERATOR_ID = "plant-repel-behavior-audit";
export const PLANT_REPEL_BEHAVIOR_GENERATOR_VERSION = "1.0.0";
export const PLANT_REPEL_BEHAVIOR_RULES_VERSION = "f05.v1";
export const PLANT_REPEL_RADIUS_CAP_METERS = 8;
export const PLANT_REPEL_POWER_CAP = 8;
export const PLANT_REPEL_DURATION_CAP_MS = 30_000;
export const PLANT_REPEL_STEP_SPEED_METERS_PER_SECOND = 1.35;
export const PLANT_REPEL_MAX_DELTA_SECONDS = 0.25;

export type PlantRepelBehaviorInput = {
  seed: string;
  sampleCount?: number;
};

export type RepellentAuraSource = {
  id: string;
  plantId: string;
  x: number;
  z: number;
  radiusMeters: number;
  power: number;
  activeFromMs: number;
  durationMs?: number;
  stackable: false;
  label: string;
};

export type PlantRepelBehaviorSources = {
  catalogPlantCount: number;
  canonicalRepellentPlantCount: number;
  auras: readonly RepellentAuraSource[];
};

export type PlantRepelBehaviorIssueCode =
  | "catalog-count"
  | "repellent-count-mismatch"
  | "duplicate-aura-id"
  | "invalid-aura-id"
  | "invalid-plant-id"
  | "position-invalid"
  | "radius-invalid"
  | "power-invalid"
  | "active-from-invalid"
  | "duration-missing"
  | "duration-invalid"
  | "stackable"
  | "label-disclosure";

export type RepelSelection = {
  aura: RepellentAuraSource;
  distanceMeters: number;
};

export type RepelStepResult =
  | { repelled: false; x: number; z: number; health: number; reason: "no-active-aura" | "outside-radius" }
  | { repelled: true; x: number; z: number; health: number; auraId: string; distanceMeters: number; displacementMeters: number };

export type PlantRepelBehaviorSummary = {
  catalogPlantCount: number;
  canonicalRepellentPlantCount: number;
  auraCount: number;
  sampledAuraCount: number;
  uniqueAuraIdCount: number;
  durationRuleCount: number;
  activeDurationCount: number;
  stackableAuraCount: number;
  maxObservedRadiusMeters: number;
  maxObservedPower: number;
  maxObservedDurationMs: number;
  issueCounts: Record<string, number>;
  behavior: {
    selectionIsStrongestOnly: true;
    equalPowerTieBreakIsDeterministic: true;
    expiredAuraIsIgnored: true;
    healthIsUnchanged: true;
    displacementIsCappedByDelta: true;
  };
  sourceContentHash: string;
};

export type PlantRepelBehaviorAudit = {
  artifact: GeneratorArtifact<PlantRepelBehaviorInput, PlantRepelBehaviorSummary>;
  graph: DependencyGraphValidation;
  summary: PlantRepelBehaviorSummary;
};

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonLethalLabel(label: string) {
  return label.includes("ไม่ทำลาย") || label.includes("ไม่ฆ่า") || label.includes("non-lethal") || label.includes("nonlethal");
}

function auraIsActive(aura: RepellentAuraSource, now: number) {
  return finite(aura.activeFromMs) && finite(aura.durationMs) && now >= aura.activeFromMs && now < aura.activeFromMs + aura.durationMs;
}

export function selectStrongestRepellentAura(position: { x: number; z: number }, auras: readonly RepellentAuraSource[], now: number): RepelSelection | undefined {
  let selected: RepelSelection | undefined;
  for (const aura of auras) {
    if (!auraIsActive(aura, now)) continue;
    const distanceMeters = Math.hypot(position.x - aura.x, position.z - aura.z);
    if (distanceMeters > aura.radiusMeters) continue;
    if (!selected || aura.power > selected.aura.power || (aura.power === selected.aura.power && (distanceMeters < selected.distanceMeters || (distanceMeters === selected.distanceMeters && aura.id < selected.aura.id)))) {
      selected = { aura, distanceMeters };
    }
  }
  return selected;
}

export function resolveRepelStep(input: { enemy: { x: number; z: number; health: number }; auras: readonly RepellentAuraSource[]; now: number; deltaSeconds: number }): RepelStepResult {
  const selection = selectStrongestRepellentAura(input.enemy, input.auras, input.now);
  if (!selection) return { repelled: false, x: input.enemy.x, z: input.enemy.z, health: input.enemy.health, reason: input.auras.some(aura => auraIsActive(aura, input.now)) ? "outside-radius" : "no-active-aura" };
  let awayX = input.enemy.x - selection.aura.x;
  let awayZ = input.enemy.z - selection.aura.z;
  const length = Math.hypot(awayX, awayZ);
  if (length < 0.0001) {
    awayX = 1;
    awayZ = 0;
  } else {
    awayX /= length;
    awayZ /= length;
  }
  const displacementMeters = PLANT_REPEL_STEP_SPEED_METERS_PER_SECOND * Math.min(PLANT_REPEL_MAX_DELTA_SECONDS, Math.max(0, input.deltaSeconds));
  return {
    repelled: true,
    x: input.enemy.x + awayX * displacementMeters,
    z: input.enemy.z + awayZ * displacementMeters,
    health: input.enemy.health,
    auraId: selection.aura.id,
    distanceMeters: selection.distanceMeters,
    displacementMeters,
  };
}

function auditAura(aura: RepellentAuraSource, issueCodes: PlantRepelBehaviorIssueCode[]) {
  if (!/^aura:[a-z0-9][a-z0-9._-]{1,63}$/.test(aura.id)) issueCodes.push("invalid-aura-id");
  if (!/^plant-\d{3}$/.test(aura.plantId)) issueCodes.push("invalid-plant-id");
  if (![aura.x, aura.z].every(finite)) issueCodes.push("position-invalid");
  if (!finite(aura.radiusMeters) || aura.radiusMeters <= 0 || aura.radiusMeters > PLANT_REPEL_RADIUS_CAP_METERS) issueCodes.push("radius-invalid");
  if (!finite(aura.power) || aura.power <= 0 || aura.power > PLANT_REPEL_POWER_CAP) issueCodes.push("power-invalid");
  if (!finite(aura.activeFromMs) || aura.activeFromMs < 0) issueCodes.push("active-from-invalid");
  if (aura.durationMs === undefined) issueCodes.push("duration-missing");
  else if (!Number.isInteger(aura.durationMs) || aura.durationMs <= 0 || aura.durationMs > PLANT_REPEL_DURATION_CAP_MS) issueCodes.push("duration-invalid");
  if (aura.stackable !== false) issueCodes.push("stackable");
  if (!isNonLethalLabel(aura.label)) issueCodes.push("label-disclosure");
}

function makeArtifact(input: PlantRepelBehaviorInput, summary: PlantRepelBehaviorSummary): GeneratorArtifact<PlantRepelBehaviorInput, PlantRepelBehaviorSummary> {
  const artifact: GeneratorArtifact<PlantRepelBehaviorInput, PlantRepelBehaviorSummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: PLANT_REPEL_BEHAVIOR_GENERATOR_ID,
    generatorVersion: PLANT_REPEL_BEHAVIOR_GENERATOR_VERSION,
    kind: "plant",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: PLANT_REPEL_BEHAVIOR_GENERATOR_ID,
      generatorVersion: PLANT_REPEL_BEHAVIOR_GENERATOR_VERSION,
      seed: input.seed,
      source: "backend-generator",
      generatedAt: 0,
    },
  };
  artifact.contentHash = calculateGeneratorContentHash(artifact);
  return artifact;
}

function makeNode(input: { key: string; kind: GeneratorKind; contentHash: string; dependencies?: GeneratorDependency[] }): DependencyGraphNode {
  return {
    key: input.key,
    kind: input.kind,
    generatorId: PLANT_REPEL_BEHAVIOR_GENERATOR_ID,
    generatorVersion: PLANT_REPEL_BEHAVIOR_GENERATOR_VERSION,
    schemaVersion: PLANT_REPEL_BEHAVIOR_RULES_VERSION,
    seed: "f05",
    rulesVersion: PLANT_REPEL_BEHAVIOR_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: PlantRepelBehaviorInput): Required<PlantRepelBehaviorInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("F-05 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? PLANT_CATALOG.length;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > PLANT_CATALOG.length) throw new Error(`F-05 sampleCount must be an integer from 1 to ${PLANT_CATALOG.length}`);
  return { seed: input.seed, sampleCount };
}

export function readActivePlantRepelSources(): PlantRepelBehaviorSources {
  const repellentPlants = PLANT_CATALOG.filter(plant => plant.effect.kind === "repellent");
  return {
    catalogPlantCount: PLANT_CATALOG.length,
    canonicalRepellentPlantCount: repellentPlants.length,
    auras: repellentPlants.map(plant => ({
      id: `aura:${plant.id}`,
      plantId: plant.id,
      x: 0,
      z: 0,
      radiusMeters: plant.effect.radiusMeters ?? 0,
      power: plant.effect.power,
      activeFromMs: 0,
      stackable: false,
      label: "แรงผลักสมมติอ่อน ๆ · ไม่ทำลายมอนสเตอร์",
    })),
  };
}

export function buildPlantRepelBehaviorDependencyGraphFromSources(input: PlantRepelBehaviorInput, sources: PlantRepelBehaviorSources): PlantRepelBehaviorAudit {
  const normalizedInput = normalizeInput(input);
  const auras = Array.from(sources.auras);
  const sampledAuras = auras.slice(0, normalizedInput.sampleCount);
  const issueCounts: Record<string, number> = {};
  const auraIds = new Set<string>();
  let durationRuleCount = 0;
  let activeDurationCount = 0;
  let stackableAuraCount = 0;
  let maxObservedRadiusMeters = 0;
  let maxObservedPower = 0;
  let maxObservedDurationMs = 0;
  const auraIssueKeys: Array<{ key: string; codes: PlantRepelBehaviorIssueCode[] }> = [];

  if (sources.catalogPlantCount !== PLANT_CATALOG.length) increment(issueCounts, "catalog-count");
  if (sources.canonicalRepellentPlantCount !== auras.length) increment(issueCounts, "repellent-count-mismatch");
  for (const aura of auras) {
    const issueCodes: PlantRepelBehaviorIssueCode[] = [];
    if (auraIds.has(aura.id)) issueCodes.push("duplicate-aura-id");
    auraIds.add(aura.id);
    auditAura(aura, issueCodes);
    if (aura.durationMs !== undefined) {
      durationRuleCount += 1;
      if (Number.isInteger(aura.durationMs) && aura.durationMs > 0 && aura.durationMs <= PLANT_REPEL_DURATION_CAP_MS) activeDurationCount += 1;
      if (finite(aura.durationMs)) maxObservedDurationMs = Math.max(maxObservedDurationMs, aura.durationMs);
    }
    if (aura.stackable) stackableAuraCount += 1;
    if (finite(aura.radiusMeters)) maxObservedRadiusMeters = Math.max(maxObservedRadiusMeters, aura.radiusMeters);
    if (finite(aura.power)) maxObservedPower = Math.max(maxObservedPower, aura.power);
    for (const code of issueCodes) increment(issueCounts, code);
    if (issueCodes.length > 0) auraIssueKeys.push({ key: `aura:${aura.id}`, codes: issueCodes });
  }

  if (sources.catalogPlantCount !== PLANT_CATALOG.length) auraIssueKeys.push({ key: "catalog:f05", codes: ["catalog-count"] });
  if (sources.canonicalRepellentPlantCount !== auras.length) auraIssueKeys.push({ key: "catalog:f05", codes: ["repellent-count-mismatch"] });

  const nodes: DependencyGraphNode[] = sampledAuras.map(aura => makeNode({ key: `plant-repel:${aura.id}`, kind: "plant", contentHash: hashStableJson(aura as unknown as JsonValue) }));
  const rootDependencies: GeneratorDependency[] = sampledAuras.map(aura => ({
    key: `plant-repel:${aura.id}`,
    kind: "plant",
    required: true,
    generatorId: PLANT_REPEL_BEHAVIOR_GENERATOR_ID,
    generatorVersion: PLANT_REPEL_BEHAVIOR_GENERATOR_VERSION,
    contentHash: hashStableJson(aura as unknown as JsonValue),
  }));
  const blockerCodes = auraIssueKeys.flatMap(entry => entry.codes.map(code => `${entry.key}:${code}`));
  for (const blockerCode of blockerCodes) rootDependencies.push({ key: `blocker:f05:${blockerCode}`, kind: "other", required: true });

  const summary: PlantRepelBehaviorSummary = {
    catalogPlantCount: sources.catalogPlantCount,
    canonicalRepellentPlantCount: sources.canonicalRepellentPlantCount,
    auraCount: auras.length,
    sampledAuraCount: sampledAuras.length,
    uniqueAuraIdCount: auraIds.size,
    durationRuleCount,
    activeDurationCount,
    stackableAuraCount,
    maxObservedRadiusMeters,
    maxObservedPower,
    maxObservedDurationMs,
    issueCounts,
    behavior: {
      selectionIsStrongestOnly: true,
      equalPowerTieBreakIsDeterministic: true,
      expiredAuraIsIgnored: true,
      healthIsUnchanged: true,
      displacementIsCappedByDelta: true,
    },
    sourceContentHash: hashStableJson({ ...sources, auras } as unknown as JsonValue),
  };
  const root = makeNode({
    key: "plant-repel-behavior:f05",
    kind: "plant",
    contentHash: hashStableJson(summary as unknown as JsonValue),
    dependencies: rootDependencies,
  });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildPlantRepelBehaviorDependencyGraph(input: PlantRepelBehaviorInput = { seed: "plant-repel-behavior-f05" }): PlantRepelBehaviorAudit {
  return buildPlantRepelBehaviorDependencyGraphFromSources(input, readActivePlantRepelSources());
}
