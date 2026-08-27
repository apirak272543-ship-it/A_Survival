import { getBlockDefinition, type BlockDefinition } from "@/game/data/blockModules";
import { generateWorldPlantCatalog, WORLD_FARM_MAX_FICTIONAL_RESTORE, WORLD_FARM_MAX_REPEL_RADIUS, WORLD_PLANT_CATALOG_SIZE, type WorldPlantDefinition, type WorldPlantEffect } from "@/game/tools/plantCatalogGenerator";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const PLANT_EFFECT_SAFETY_GENERATOR_ID = "plant-effect-safety-audit";
export const PLANT_EFFECT_SAFETY_GENERATOR_VERSION = "1.0.0";
export const PLANT_EFFECT_SAFETY_RULES_VERSION = "f04.v1";
export const PLANT_EFFECT_SAFETY_MAX_SAMPLE_COUNT = WORLD_PLANT_CATALOG_SIZE;
export const OBSIDIAN_CACTUS_BLOCK_ID = "flora.obsidian.thorn-cactus";
export const PLANT_EFFECT_SAFETY_MAX_REPEL_DURATION_MS = 30_000;
export const PLANT_EFFECT_SAFETY_MAX_CACTUS_DAMAGE = 12;
export const PLANT_EFFECT_SAFETY_MAX_CACTUS_COOLDOWN_SECONDS = 1;

export type PlantEffectSafetyInput = {
  seed: string;
  sampleCount?: number;
};

export type PlantEffectSafetySources = {
  plants: readonly WorldPlantDefinition[];
  cactus?: BlockDefinition;
};

export type PlantEffectSafetyIssueCode =
  | "catalog-size"
  | "duplicate-plant-id"
  | "invalid-plant-id"
  | "unsupported-playable-biome"
  | "unsupported-effect-kind"
  | "restore-amount-invalid"
  | "restore-cap-invalid"
  | "restore-label-disclosure"
  | "repel-radius-invalid"
  | "repel-duration-invalid"
  | "repel-stackable"
  | "repel-label-disclosure"
  | "cactus-block-missing"
  | "cactus-block-id-mismatch"
  | "cactus-kind-invalid"
  | "cactus-collision-invalid"
  | "cactus-hazard-missing"
  | "cactus-damage-invalid"
  | "cactus-cooldown-invalid"
  | "cactus-affects-invalid";

export type PlantEffectSafetySummary = {
  catalogCount: number;
  sampleCount: number;
  uniquePlantIdCount: number;
  validRecordCount: number;
  invalidRecordCount: number;
  effectCount: number;
  effectKindCounts: Record<string, number>;
  cactusHazardCount: number;
  maxObservedRestoreAmount: number;
  maxObservedRepelRadius: number;
  maxObservedRepelDurationMs: number;
  maxObservedCactusDamage: number;
  sourceContentHash: string;
  issueCounts: Record<string, number>;
};

export type PlantEffectSafetyOutput = {
  summary: PlantEffectSafetySummary;
  graph: DependencyGraphValidation;
};

export type PlantEffectSafetyAudit = {
  artifact: GeneratorArtifact<PlantEffectSafetyInput, PlantEffectSafetySummary>;
  graph: DependencyGraphValidation;
  summary: PlantEffectSafetySummary;
};

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasAnyLabel(label: unknown, markers: readonly string[]) {
  return typeof label === "string" && markers.every(marker => label.includes(marker));
}

function auditPlantEffect(plant: WorldPlantDefinition, issueCodes: PlantEffectSafetyIssueCode[]) {
  const effect = plant.effect as WorldPlantEffect | undefined;
  if (!effect) return;
  if (effect.kind === "restore") {
    if (!isFiniteNumber(effect.amount) || effect.amount <= 0 || effect.amount > WORLD_FARM_MAX_FICTIONAL_RESTORE) issueCodes.push("restore-amount-invalid");
    if (!isFiniteNumber(effect.cap) || effect.cap <= 0 || effect.cap > WORLD_FARM_MAX_FICTIONAL_RESTORE || (isFiniteNumber(effect.amount) && effect.amount > effect.cap)) issueCodes.push("restore-cap-invalid");
    if (!hasAnyLabel(effect.label, ["สมมติ", "จำกัด"])) issueCodes.push("restore-label-disclosure");
    return;
  }
  if (effect.kind === "repel") {
    if (!isFiniteNumber(effect.radius) || effect.radius <= 0 || effect.radius > WORLD_FARM_MAX_REPEL_RADIUS) issueCodes.push("repel-radius-invalid");
    if (!Number.isInteger(effect.durationMs) || effect.durationMs <= 0 || effect.durationMs > PLANT_EFFECT_SAFETY_MAX_REPEL_DURATION_MS) issueCodes.push("repel-duration-invalid");
    if (effect.stackable !== false) issueCodes.push("repel-stackable");
    if (!hasAnyLabel(effect.label, ["สมมติ", "ไม่ทำลาย", "มอนสเตอร์"])) issueCodes.push("repel-label-disclosure");
    return;
  }
  issueCodes.push("unsupported-effect-kind");
}

function auditCactus(cactus: BlockDefinition | undefined, issueCodes: PlantEffectSafetyIssueCode[]) {
  if (!cactus) {
    issueCodes.push("cactus-block-missing");
    return;
  }
  if (cactus.id !== OBSIDIAN_CACTUS_BLOCK_ID) issueCodes.push("cactus-block-id-mismatch");
  if (cactus.kind !== "plant") issueCodes.push("cactus-kind-invalid");
  if (cactus.collisionShape !== "thin") issueCodes.push("cactus-collision-invalid");
  const hazard = cactus.hazard;
  if (!hazard) {
    issueCodes.push("cactus-hazard-missing");
    return;
  }
  if (!Number.isInteger(hazard.damage) || hazard.damage <= 0 || hazard.damage > PLANT_EFFECT_SAFETY_MAX_CACTUS_DAMAGE) issueCodes.push("cactus-damage-invalid");
  if (!isFiniteNumber(hazard.cooldownSeconds) || hazard.cooldownSeconds <= 0 || hazard.cooldownSeconds > PLANT_EFFECT_SAFETY_MAX_CACTUS_COOLDOWN_SECONDS) issueCodes.push("cactus-cooldown-invalid");
  if (hazard.affects !== "all") issueCodes.push("cactus-affects-invalid");
}

function makeArtifact(input: PlantEffectSafetyInput, summary: PlantEffectSafetySummary): GeneratorArtifact<PlantEffectSafetyInput, PlantEffectSafetySummary> {
  const artifact: GeneratorArtifact<PlantEffectSafetyInput, PlantEffectSafetySummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: PLANT_EFFECT_SAFETY_GENERATOR_ID,
    generatorVersion: PLANT_EFFECT_SAFETY_GENERATOR_VERSION,
    kind: "plant",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: PLANT_EFFECT_SAFETY_GENERATOR_ID,
      generatorVersion: PLANT_EFFECT_SAFETY_GENERATOR_VERSION,
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
    generatorId: PLANT_EFFECT_SAFETY_GENERATOR_ID,
    generatorVersion: PLANT_EFFECT_SAFETY_GENERATOR_VERSION,
    schemaVersion: PLANT_EFFECT_SAFETY_RULES_VERSION,
    seed: "f04",
    rulesVersion: PLANT_EFFECT_SAFETY_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: PlantEffectSafetyInput): Required<PlantEffectSafetyInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("F-04 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? PLANT_EFFECT_SAFETY_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > PLANT_EFFECT_SAFETY_MAX_SAMPLE_COUNT) throw new Error(`F-04 sampleCount must be an integer from 1 to ${PLANT_EFFECT_SAFETY_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

export function readActivePlantEffectSafetySources(): PlantEffectSafetySources {
  return {
    plants: generateWorldPlantCatalog(),
    cactus: getBlockDefinition(OBSIDIAN_CACTUS_BLOCK_ID),
  };
}

export function buildPlantEffectSafetyDependencyGraphFromSources(input: PlantEffectSafetyInput, sources: PlantEffectSafetySources): PlantEffectSafetyAudit {
  const normalizedInput = normalizeInput(input);
  const plants = Array.from(sources.plants);
  const sampledPlants = plants.slice(0, normalizedInput.sampleCount);
  const issueCounts: Record<string, number> = {};
  const effectKindCounts: Record<string, number> = {};
  const plantIssueKeys: Array<{ key: string; codes: PlantEffectSafetyIssueCode[] }> = [];
  const plantIds = new Set<string>();
  let validRecordCount = 0;
  let effectCount = 0;
  let maxObservedRestoreAmount = 0;
  let maxObservedRepelRadius = 0;
  let maxObservedRepelDurationMs = 0;

  if (plants.length !== WORLD_PLANT_CATALOG_SIZE) increment(issueCounts, "catalog-size");
  for (const plant of plants) {
    const issueCodes: PlantEffectSafetyIssueCode[] = [];
    if (!/^plant-\d{3}$/.test(plant.id)) issueCodes.push("invalid-plant-id");
    if (plantIds.has(plant.id)) issueCodes.push("duplicate-plant-id");
    plantIds.add(plant.id);
    if (plant.biomeId !== "obsidian-frontier") issueCodes.push("unsupported-playable-biome");
    const effectKind = plant.effect?.kind ?? "none";
    increment(effectKindCounts, effectKind);
    if (plant.effect) {
      effectCount += 1;
      if (plant.effect.kind === "restore" && isFiniteNumber(plant.effect.amount)) maxObservedRestoreAmount = Math.max(maxObservedRestoreAmount, plant.effect.amount);
      if (plant.effect.kind === "repel" && isFiniteNumber(plant.effect.radius)) {
        maxObservedRepelRadius = Math.max(maxObservedRepelRadius, plant.effect.radius);
        if (isFiniteNumber(plant.effect.durationMs)) maxObservedRepelDurationMs = Math.max(maxObservedRepelDurationMs, plant.effect.durationMs);
      }
    }
    auditPlantEffect(plant, issueCodes);
    for (const code of issueCodes) increment(issueCounts, code);
    if (issueCodes.length === 0) validRecordCount += 1;
    else plantIssueKeys.push({ key: `plant-effect:${plant.id}`, codes: issueCodes });
  }

  const cactusIssueCodes: PlantEffectSafetyIssueCode[] = [];
  auditCactus(sources.cactus, cactusIssueCodes);
  for (const code of cactusIssueCodes) increment(issueCounts, code);
  const cactusHazardCount = sources.cactus?.hazard ? 1 : 0;
  const maxObservedCactusDamage = isFiniteNumber(sources.cactus?.hazard?.damage) ? sources.cactus.hazard.damage : 0;

  const nodes: DependencyGraphNode[] = [];
  for (const plant of sampledPlants) {
    nodes.push(makeNode({ key: `plant-effect:${plant.id}`, kind: "plant", contentHash: hashStableJson(plant as unknown as JsonValue) }));
  }
  if (sources.cactus) nodes.push(makeNode({ key: `block-hazard:${sources.cactus.id}`, kind: "other", contentHash: hashStableJson(sources.cactus as unknown as JsonValue) }));

  const rootDependencies: GeneratorDependency[] = sampledPlants.map(plant => ({
    key: `plant-effect:${plant.id}`,
    kind: "plant",
    required: true,
    generatorId: PLANT_EFFECT_SAFETY_GENERATOR_ID,
    generatorVersion: PLANT_EFFECT_SAFETY_GENERATOR_VERSION,
    contentHash: hashStableJson(plant as unknown as JsonValue),
  }));
  if (sources.cactus) {
    rootDependencies.push({
      key: `block-hazard:${sources.cactus.id}`,
      kind: "other",
      required: true,
      generatorId: PLANT_EFFECT_SAFETY_GENERATOR_ID,
      generatorVersion: PLANT_EFFECT_SAFETY_GENERATOR_VERSION,
      contentHash: hashStableJson(sources.cactus as unknown as JsonValue),
    });
  }
  const blockerCodes = [...plantIssueKeys.flatMap(entry => entry.codes.map(code => `${entry.key}:${code}`)), ...cactusIssueCodes.map(code => `cactus:${code}`)];
  if (plants.length !== WORLD_PLANT_CATALOG_SIZE) blockerCodes.push("catalog:catalog-size");
  for (const blockerCode of blockerCodes) rootDependencies.push({ key: `blocker:f04:${blockerCode}`, kind: "other", required: true });

  const summary: PlantEffectSafetySummary = {
    catalogCount: plants.length,
    sampleCount: sampledPlants.length,
    uniquePlantIdCount: plantIds.size,
    validRecordCount,
    invalidRecordCount: plants.length - validRecordCount,
    effectCount,
    effectKindCounts,
    cactusHazardCount,
    maxObservedRestoreAmount,
    maxObservedRepelRadius,
    maxObservedRepelDurationMs,
    maxObservedCactusDamage,
    sourceContentHash: hashStableJson({ plants, cactus: sources.cactus ?? null } as unknown as JsonValue),
    issueCounts,
  };
  const root = makeNode({
    key: "plant-effect-safety:f04",
    kind: "plant",
    contentHash: hashStableJson(summary as unknown as JsonValue),
    dependencies: rootDependencies,
  });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildPlantEffectSafetyDependencyGraph(input: PlantEffectSafetyInput = { seed: "plant-effect-safety-f04" }): PlantEffectSafetyAudit {
  return buildPlantEffectSafetyDependencyGraphFromSources(input, readActivePlantEffectSafetySources());
}
