import {
  CommonGeneratorRegistry,
  hashStableJson,
  type GeneratorAssetRef,
  type GeneratorPlugin,
  type GeneratorValidationResult,
} from "./commonGeneratorApi";

export type StructureLevel = "object" | "building" | "compound" | "settlement" | "landmark";
export type StructureTerrain = "flat" | "rolling" | "slope" | "mountain" | "cave";
export type StructureClimate = "temperate" | "cold" | "hot" | "arid" | "void";

export type PlacementBox = {
  x: number;
  z: number;
  width: number;
  length: number;
};

export type StructureFootprint = {
  width: number;
  length: number;
  height: number;
};

export type StructurePlacementRules = {
  allowedBiomes: string[];
  allowedTerrains: StructureTerrain[];
  allowedClimates: StructureClimate[];
  maxSlopeDegrees: number;
  waterAllowed: boolean;
  maxWaterDepth: number;
  requiresRoad: boolean;
  maxRoadDistance: number;
  requiresSettlement: boolean;
  maxSettlementDistance: number;
  minPopulation: number;
  minFreeSpaceWidth: number;
  minFreeSpaceLength: number;
  minSupportRatio: number;
  requiresAccessibleEntry: boolean;
  allowFloating: boolean;
};

export type StructureGenerationRules = {
  generateInterior: boolean;
  interiorRooms: string[];
  generateRoad: boolean;
  generateDecorations: boolean;
  generateResources: boolean;
  npcSpawns: { id: string; min: number; max: number }[];
  mobSpawns: { id: string; min: number; max: number }[];
  requiredChildren: string[];
  optionalChildren: string[];
};

export type StructureBlueprint = {
  id: string;
  name: string;
  level: StructureLevel;
  style: string[];
  tags: string[];
  footprint: StructureFootprint;
  assetRefs: GeneratorAssetRef[];
  placement: StructurePlacementRules;
  generation: StructureGenerationRules;
};

export type StructureWorldContext = {
  mapId: string;
  biome: string;
  terrain: StructureTerrain;
  climate: StructureClimate;
  slopeDegrees: number;
  waterDepth: number;
  groundY: number;
  freeSpaceWidth: number;
  freeSpaceLength: number;
  roadDistance: number;
  settlementDistance: number;
  population: number;
  supportRatio: number;
  accessibleEntry: boolean;
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  occupiedFootprints: PlacementBox[];
};

export type StructurePlacementCandidate = {
  x: number;
  y: number;
  z: number;
  context: StructureWorldContext;
};

export type StructureGenerationInput = {
  mapId: string;
  blueprints: StructureBlueprint[];
  candidates: StructurePlacementCandidate[];
  minPlacementScore: number;
  maxPlacements: number;
};

export type PlacementEvaluation = {
  accepted: boolean;
  score: number;
  reasons: string[];
  repairs: string[];
};

export type GeneratedStructurePlacement = {
  instanceId: string;
  blueprintId: string;
  mapId: string;
  x: number;
  y: number;
  z: number;
  score: number;
  repairs: string[];
  generatedChildren: string[];
  npcSpawns: { id: string; count: number }[];
  mobSpawns: { id: string; count: number }[];
};

export type RejectedStructurePlacement = {
  blueprintId: string;
  candidateIndex: number;
  score: number;
  reasons: string[];
  repairs: string[];
};

export type StructureGenerationOutput = {
  schemaVersion: "a-survival.structure-generation.v1";
  mapId: string;
  assetRefs: GeneratorAssetRef[];
  placements: GeneratedStructurePlacement[];
  rejected: RejectedStructurePlacement[];
};

const LEVEL_ORDER: StructureLevel[] = ["object", "building", "compound", "settlement", "landmark"];
const MAX_BLUEPRINTS_PER_RUN = 100;
const MAX_CANDIDATES_PER_RUN = 500;
const MAX_PLACEMENTS_PER_RUN = 100;
const SCORE_MAX = 100;

function boundedInteger(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function boundedCount(value: number, min: number, max: number) {
  return boundedInteger(value, min, max);
}

function isFiniteNumber(value: number) {
  return Number.isFinite(value);
}

function boxFrom(footprint: StructureFootprint, candidate: StructurePlacementCandidate): PlacementBox {
  return { x: candidate.x, z: candidate.z, width: footprint.width, length: footprint.length };
}

function boxesOverlap(left: PlacementBox, right: PlacementBox) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.z < right.z + right.length
    && left.z + left.length > right.z;
}

function hasDuplicateIds(values: string[]) {
  return new Set(values).size !== values.length;
}

function collectAssetRefs(blueprints: StructureBlueprint[]) {
  const refs = new Map<string, GeneratorAssetRef>();
  for (const blueprint of blueprints) {
    for (const asset of blueprint.assetRefs) refs.set(asset.assetId, asset);
  }
  return Array.from(refs.values()).sort((left, right) => left.assetId.localeCompare(right.assetId));
}

function seededUnit(seed: string, key: string) {
  const digest = hashStableJson(`${seed}:${key}`);
  return parseInt(digest.slice(0, 8), 16) / 0xffffffff;
}

function validateRange(value: number, min: number, max: number, label: string, issues: string[]) {
  if (!isFiniteNumber(value) || value < min || value > max) issues.push(`${label} must be between ${min} and ${max}`);
}

function validateBlueprint(blueprint: StructureBlueprint, index: number) {
  const issues: string[] = [];
  if (!/^[a-z0-9][a-z0-9.-]{2,63}$/.test(blueprint.id)) issues.push(`blueprint[${index}] has invalid id`);
  if (!blueprint.name.trim()) issues.push(`blueprint[${index}] is missing name`);
  if (!LEVEL_ORDER.includes(blueprint.level)) issues.push(`blueprint[${index}] has invalid structure level`);
  for (const [value, min, max, label] of [
    [blueprint.footprint.width, 1, 512, "footprint.width"],
    [blueprint.footprint.length, 1, 512, "footprint.length"],
    [blueprint.footprint.height, 1, 512, "footprint.height"],
    [blueprint.placement.maxSlopeDegrees, 0, 90, "placement.maxSlopeDegrees"],
    [blueprint.placement.maxWaterDepth, 0, 512, "placement.maxWaterDepth"],
    [blueprint.placement.maxRoadDistance, 0, 4096, "placement.maxRoadDistance"],
    [blueprint.placement.maxSettlementDistance, 0, 4096, "placement.maxSettlementDistance"],
    [blueprint.placement.minPopulation, 0, 1_000_000, "placement.minPopulation"],
    [blueprint.placement.minFreeSpaceWidth, 1, 4096, "placement.minFreeSpaceWidth"],
    [blueprint.placement.minFreeSpaceLength, 1, 4096, "placement.minFreeSpaceLength"],
    [blueprint.placement.minSupportRatio, 0, 1, "placement.minSupportRatio"],
  ] as const) validateRange(value, min, max, label, issues);
  if (hasDuplicateIds(blueprint.generation.requiredChildren)) issues.push(`blueprint[${index}] has duplicate required children`);
  if (hasDuplicateIds(blueprint.generation.optionalChildren)) issues.push(`blueprint[${index}] has duplicate optional children`);
  for (const spawn of [...blueprint.generation.npcSpawns, ...blueprint.generation.mobSpawns]) {
    if (!spawn.id || !Number.isInteger(spawn.min) || !Number.isInteger(spawn.max) || spawn.min < 0 || spawn.max < spawn.min) {
      issues.push(`blueprint[${index}] has invalid spawn range`);
    }
  }
  return issues;
}

export function validateStructureBlueprints(blueprints: StructureBlueprint[]): GeneratorValidationResult {
  const issues: string[] = [];
  if (blueprints.length === 0) issues.push("at least one structure blueprint is required");
  if (blueprints.length > MAX_BLUEPRINTS_PER_RUN) issues.push(`blueprint count exceeds ${MAX_BLUEPRINTS_PER_RUN}`);
  const ids = blueprints.map(blueprint => blueprint.id);
  if (hasDuplicateIds(ids)) issues.push("blueprint ids must be unique");
  blueprints.forEach((blueprint, index) => issues.push(...validateBlueprint(blueprint, index)));
  return { valid: issues.length === 0, issues };
}

export function repairStructureCandidate(blueprint: StructureBlueprint, candidate: StructurePlacementCandidate) {
  const repairs: string[] = [];
  const bounds = candidate.context.worldBounds;
  const maxX = Math.max(bounds.minX, bounds.maxX - blueprint.footprint.width);
  const maxZ = Math.max(bounds.minZ, bounds.maxZ - blueprint.footprint.length);
  const x = boundedInteger(candidate.x, bounds.minX, maxX);
  const z = boundedInteger(candidate.z, bounds.minZ, maxZ);
  const y = candidate.context.groundY;
  if (x !== candidate.x) repairs.push("x clamped to world bounds");
  if (z !== candidate.z) repairs.push("z clamped to world bounds");
  if (y !== candidate.y) repairs.push("y aligned to ground surface");
  return { ...candidate, x, y, z, repairs };
}

export function evaluateStructurePlacement(blueprint: StructureBlueprint, candidate: StructurePlacementCandidate): PlacementEvaluation {
  const repaired = repairStructureCandidate(blueprint, candidate);
  const context = repaired.context;
  const reasons: string[] = [];
  const footprint = blueprint.footprint;
  const rules = blueprint.placement;
  const scoreParts: number[] = [];

  if (!rules.allowedBiomes.includes(context.biome)) reasons.push("biome is not allowed");
  else scoreParts.push(20);
  if (!rules.allowedTerrains.includes(context.terrain)) reasons.push("terrain is not allowed");
  else scoreParts.push(15);
  if (!rules.allowedClimates.includes(context.climate)) reasons.push("climate is not allowed");
  else scoreParts.push(10);
  if (context.slopeDegrees > rules.maxSlopeDegrees) reasons.push("slope exceeds blueprint limit");
  else scoreParts.push(Math.round(10 * (1 - context.slopeDegrees / Math.max(1, rules.maxSlopeDegrees))));
  if (!rules.waterAllowed && context.waterDepth > 0) reasons.push("water is forbidden");
  else if (context.waterDepth > rules.maxWaterDepth) reasons.push("water depth exceeds blueprint limit");
  else scoreParts.push(10);
  if (context.freeSpaceWidth < Math.max(footprint.width, rules.minFreeSpaceWidth) || context.freeSpaceLength < Math.max(footprint.length, rules.minFreeSpaceLength)) {
    reasons.push("free space is insufficient");
  } else {
    scoreParts.push(15);
  }
  if (rules.requiresRoad && context.roadDistance > rules.maxRoadDistance) reasons.push("road access is too far");
  else scoreParts.push(10);
  if (rules.requiresSettlement && context.settlementDistance > rules.maxSettlementDistance) reasons.push("settlement is too far");
  else if (context.population < rules.minPopulation) reasons.push("settlement population is too low");
  else scoreParts.push(5);
  if (!rules.allowFloating && context.supportRatio < rules.minSupportRatio) reasons.push("ground support is insufficient");
  else scoreParts.push(5);
  if (rules.requiresAccessibleEntry && !context.accessibleEntry) reasons.push("no accessible entry");
  else scoreParts.push(5);
  const candidateBox = boxFrom(footprint, repaired);
  if (footprint.width > context.worldBounds.maxX - context.worldBounds.minX || footprint.length > context.worldBounds.maxZ - context.worldBounds.minZ) reasons.push("footprint exceeds world bounds");
  if (context.occupiedFootprints.some(occupied => boxesOverlap(candidateBox, occupied))) reasons.push("placement overlaps an occupied footprint");
  if (blueprint.generation.generateInterior && blueprint.generation.interiorRooms.length === 0) reasons.push("interior generation requires at least one room");

  const score = boundedInteger(scoreParts.reduce((sum, part) => sum + part, 0), 0, SCORE_MAX);
  return { accepted: reasons.length === 0, score, reasons, repairs: repaired.repairs };
}

function spawnCounts(seed: string, prefix: string, spawns: { id: string; min: number; max: number }[]) {
  return spawns.map((spawn, index) => ({
    id: spawn.id,
    count: boundedCount(spawn.min + Math.floor(seededUnit(seed, `${prefix}:${spawn.id}:${index}`) * (spawn.max - spawn.min + 1)), spawn.min, spawn.max),
  }));
}

function validateGenerationInput(input: StructureGenerationInput): GeneratorValidationResult {
  const issues: string[] = [];
  if (!input.mapId || input.mapId !== input.candidates[0]?.context.mapId) issues.push("mapId must match candidate map context");
  if (!Number.isInteger(input.minPlacementScore) || input.minPlacementScore < 0 || input.minPlacementScore > SCORE_MAX) issues.push("minPlacementScore must be an integer from 0 to 100");
  if (!Number.isInteger(input.maxPlacements) || input.maxPlacements < 1 || input.maxPlacements > MAX_PLACEMENTS_PER_RUN) issues.push(`maxPlacements must be from 1 to ${MAX_PLACEMENTS_PER_RUN}`);
  if (input.candidates.length > MAX_CANDIDATES_PER_RUN) issues.push(`candidate count exceeds ${MAX_CANDIDATES_PER_RUN}`);
  issues.push(...validateStructureBlueprints(input.blueprints).issues);
  input.candidates.forEach((candidate, index) => {
    if (!Number.isInteger(candidate.x) || !Number.isInteger(candidate.y) || !Number.isInteger(candidate.z)) issues.push(`candidate[${index}] coordinates must be integers`);
    if (candidate.context.mapId !== input.mapId) issues.push(`candidate[${index}] map does not match input map`);
  });
  return { valid: issues.length === 0, issues };
}

export function generateStructurePlacements(input: StructureGenerationInput, seed: string): StructureGenerationOutput {
  const validation = validateGenerationInput(input);
  if (!validation.valid) throw new Error(`Structure generation input is invalid: ${validation.issues.join("; ")}`);

  const placements: GeneratedStructurePlacement[] = [];
  const rejected: RejectedStructurePlacement[] = [];
  const occupied: PlacementBox[] = [];
  const orderedCandidates = input.candidates
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .sort((left, right) => hashStableJson(`${seed}:${left.candidateIndex}`).localeCompare(hashStableJson(`${seed}:${right.candidateIndex}`)));

  for (const blueprint of [...input.blueprints].sort((left, right) => left.id.localeCompare(right.id))) {
    if (placements.length >= input.maxPlacements) break;
    const available = orderedCandidates
      .map(entry => ({ ...entry, repaired: repairStructureCandidate(blueprint, entry.candidate) }))
      .map(entry => ({ ...entry, evaluation: evaluateStructurePlacement(blueprint, entry.repaired) }))
      .sort((left, right) => right.evaluation.score - left.evaluation.score || left.candidateIndex - right.candidateIndex);
    let bestRejected: { candidateIndex: number; score: number; reasons: string[]; repairs: string[] } | undefined;
    let placed = false;
    for (const candidateEntry of available) {
      const candidateBox = boxFrom(blueprint.footprint, candidateEntry.repaired);
      const overlapsGenerated = occupied.some(existing => boxesOverlap(candidateBox, existing));
      const evaluation = overlapsGenerated
        ? { ...candidateEntry.evaluation, accepted: false, reasons: [...candidateEntry.evaluation.reasons, "placement overlaps another generated structure"] }
        : candidateEntry.evaluation;
      const rejection = { candidateIndex: candidateEntry.candidateIndex, score: evaluation.score, reasons: evaluation.reasons.length > 0 ? evaluation.reasons : ["placement score is below threshold"], repairs: evaluation.repairs };
      if (!bestRejected || rejection.score > bestRejected.score) bestRejected = rejection;
      if (!evaluation.accepted || evaluation.score < input.minPlacementScore) continue;
      occupied.push(candidateBox);
      placements.push({
        instanceId: `structure-${input.mapId}-${blueprint.id}-${placements.length + 1}`,
        blueprintId: blueprint.id,
        mapId: input.mapId,
        x: candidateEntry.repaired.x,
        y: candidateEntry.repaired.y,
        z: candidateEntry.repaired.z,
        score: evaluation.score,
        repairs: evaluation.repairs,
        generatedChildren: [...blueprint.generation.requiredChildren, ...(seededUnit(seed, `${blueprint.id}:optional`) > 0.5 ? blueprint.generation.optionalChildren.slice(0, 1) : [])],
        npcSpawns: spawnCounts(seed, `${blueprint.id}:npc`, blueprint.generation.npcSpawns),
        mobSpawns: spawnCounts(seed, `${blueprint.id}:mob`, blueprint.generation.mobSpawns),
      });
      placed = true;
      break;
    }
    if (!placed && bestRejected) rejected.push({ blueprintId: blueprint.id, ...bestRejected });
  }

  return { schemaVersion: "a-survival.structure-generation.v1", mapId: input.mapId, assetRefs: collectAssetRefs(input.blueprints), placements, rejected };
}

export const structureGeneratorPlugin: GeneratorPlugin<StructureGenerationInput, StructureGenerationOutput> = {
  id: "structure.placement",
  version: "1.0.0",
  kind: "structure",
  generate: (input, context) => generateStructurePlacements(input, context.seed),
  validate: (output, input) => validateStructureGenerationOutput(output, input),
  preview: output => ({
    recordCount: output.placements.length,
    ids: output.placements.map(placement => placement.instanceId),
    assetRefs: output.assetRefs,
  }),
};

export function validateStructureGenerationOutput(output: StructureGenerationOutput, input?: StructureGenerationInput): GeneratorValidationResult {
  const issues: string[] = [];
  if (output.schemaVersion !== "a-survival.structure-generation.v1") issues.push("unsupported structure generation schema");
  if (input && output.mapId !== input.mapId) issues.push("output map does not match input map");
  if (input && output.placements.length > input.maxPlacements) issues.push("generated placement count exceeds input maxPlacements");
  if (input) {
    const blueprintIds = new Set(input.blueprints.map(blueprint => blueprint.id));
    for (const placement of output.placements) if (!blueprintIds.has(placement.blueprintId)) issues.push(`unknown generated blueprint: ${placement.blueprintId}`);
  }
  if (hasDuplicateIds(output.placements.map(placement => placement.instanceId))) issues.push("generated instance ids must be unique");
  if (hasDuplicateIds(output.assetRefs.map(asset => asset.assetId))) issues.push("generated asset references must be unique");
  for (const asset of output.assetRefs) {
    if (!asset.assetId) issues.push("generated asset reference is missing assetId");
    if (asset.source === "reference-only" && !asset.provenanceRef) issues.push(`reference-only asset needs provenanceRef: ${asset.assetId}`);
  }
  for (const placement of output.placements) {
    if (!placement.instanceId || !placement.blueprintId || placement.mapId !== output.mapId) issues.push(`invalid generated placement: ${placement.instanceId}`);
    if (!Number.isInteger(placement.x) || !Number.isInteger(placement.y) || !Number.isInteger(placement.z)) issues.push(`non-integer generated coordinate: ${placement.instanceId}`);
    if (!Number.isInteger(placement.score) || placement.score < 0 || placement.score > SCORE_MAX) issues.push(`invalid placement score: ${placement.instanceId}`);
    if (placement.generatedChildren.some(child => !child)) issues.push(`invalid generated child: ${placement.instanceId}`);
    if (placement.npcSpawns.some(spawn => !Number.isInteger(spawn.count) || spawn.count < 0) || placement.mobSpawns.some(spawn => !Number.isInteger(spawn.count) || spawn.count < 0)) {
      issues.push(`invalid spawn count: ${placement.instanceId}`);
    }
  }
  return { valid: issues.length === 0, issues };
}

export function createStructureGeneratorRegistry() {
  return new CommonGeneratorRegistry().register(structureGeneratorPlugin);
}

export const STRUCTURE_BLUEPRINT_LIBRARY: StructureBlueprint[] = [
  {
    id: "object-frontier-lantern",
    name: "Frontier Lantern",
    level: "object",
    style: ["arcane", "industrial"],
    tags: ["light", "navigation"],
    footprint: { width: 1, length: 1, height: 3 },
    assetRefs: [{ assetId: "models.structure.frontier-lantern", kind: "model", source: "starter-authored" }],
    placement: { allowedBiomes: ["Obsidian Alien Frontier"], allowedTerrains: ["flat", "rolling"], allowedClimates: ["temperate", "hot"], maxSlopeDegrees: 18, waterAllowed: false, maxWaterDepth: 0, requiresRoad: false, maxRoadDistance: 64, requiresSettlement: false, maxSettlementDistance: 256, minPopulation: 0, minFreeSpaceWidth: 1, minFreeSpaceLength: 1, minSupportRatio: 1, requiresAccessibleEntry: false, allowFloating: false },
    generation: { generateInterior: false, interiorRooms: [], generateRoad: false, generateDecorations: false, generateResources: false, npcSpawns: [], mobSpawns: [], requiredChildren: [], optionalChildren: [] },
  },
  {
    id: "building-magic-clock-tower",
    name: "Magic Village Clock Tower",
    level: "building",
    style: ["fantasy", "magic", "medieval"],
    tags: ["landmark", "village-center"],
    footprint: { width: 18, length: 18, height: 45 },
    assetRefs: [{ assetId: "models.structure.magic-clock-tower", kind: "model", source: "starter-authored" }],
    placement: { allowedBiomes: ["Obsidian Alien Frontier", "Wildpine Highlands"], allowedTerrains: ["flat"], allowedClimates: ["temperate"], maxSlopeDegrees: 12, waterAllowed: false, maxWaterDepth: 0, requiresRoad: true, maxRoadDistance: 12, requiresSettlement: true, maxSettlementDistance: 64, minPopulation: 20, minFreeSpaceWidth: 40, minFreeSpaceLength: 40, minSupportRatio: 1, requiresAccessibleEntry: true, allowFloating: false },
    generation: { generateInterior: true, interiorRooms: ["clockwork-hall", "bell-chamber", "archive"], generateRoad: true, generateDecorations: true, generateResources: false, npcSpawns: [{ id: "village-keeper", min: 1, max: 1 }], mobSpawns: [{ id: "frontier-guard", min: 0, max: 2 }], requiredChildren: ["object-frontier-lantern"], optionalChildren: ["object-rune-banner"] },
  },
  {
    id: "compound-frontier-farm",
    name: "Frontier Farm Compound",
    level: "compound",
    style: ["survival", "agriculture"],
    tags: ["food", "safe-zone"],
    footprint: { width: 32, length: 28, height: 8 },
    assetRefs: [{ assetId: "models.structure.frontier-farm", kind: "model", source: "starter-authored" }],
    placement: { allowedBiomes: ["Obsidian Alien Frontier"], allowedTerrains: ["flat", "rolling"], allowedClimates: ["temperate", "hot"], maxSlopeDegrees: 10, waterAllowed: false, maxWaterDepth: 0, requiresRoad: true, maxRoadDistance: 20, requiresSettlement: false, maxSettlementDistance: 128, minPopulation: 0, minFreeSpaceWidth: 36, minFreeSpaceLength: 32, minSupportRatio: 1, requiresAccessibleEntry: true, allowFloating: false },
    generation: { generateInterior: true, interiorRooms: ["seed-store", "field-kitchen"], generateRoad: true, generateDecorations: true, generateResources: true, npcSpawns: [{ id: "field-tender", min: 1, max: 2 }], mobSpawns: [], requiredChildren: ["object-frontier-lantern"], optionalChildren: ["object-water-barrel"] },
  },
  {
    id: "settlement-obsidian-village",
    name: "Obsidian Frontier Village",
    level: "settlement",
    style: ["frontier", "community"],
    tags: ["settlement", "trade"],
    footprint: { width: 96, length: 96, height: 24 },
    assetRefs: [{ assetId: "models.structure.obsidian-village", kind: "model", source: "starter-authored" }],
    placement: { allowedBiomes: ["Obsidian Alien Frontier"], allowedTerrains: ["flat"], allowedClimates: ["temperate"], maxSlopeDegrees: 8, waterAllowed: false, maxWaterDepth: 0, requiresRoad: true, maxRoadDistance: 32, requiresSettlement: false, maxSettlementDistance: 512, minPopulation: 8, minFreeSpaceWidth: 104, minFreeSpaceLength: 104, minSupportRatio: 1, requiresAccessibleEntry: true, allowFloating: false },
    generation: { generateInterior: true, interiorRooms: ["main-road", "well-square", "market"], generateRoad: true, generateDecorations: true, generateResources: true, npcSpawns: [{ id: "frontier-villager", min: 8, max: 20 }, { id: "frontier-trader", min: 0, max: 1 }], mobSpawns: [{ id: "glass-stalker", min: 0, max: 2 }], requiredChildren: ["building-magic-clock-tower"], optionalChildren: ["compound-frontier-farm"] },
  },
  {
    id: "landmark-leyline-fortress",
    name: "Leyline Fortress",
    level: "landmark",
    style: ["ancient", "arcane", "defensive"],
    tags: ["landmark", "event-anchor"],
    footprint: { width: 128, length: 112, height: 64 },
    assetRefs: [{ assetId: "models.structure.leyline-fortress", kind: "model", source: "starter-authored" }],
    placement: { allowedBiomes: ["Obsidian Alien Frontier"], allowedTerrains: ["flat", "rolling"], allowedClimates: ["temperate", "hot"], maxSlopeDegrees: 14, waterAllowed: false, maxWaterDepth: 0, requiresRoad: true, maxRoadDistance: 48, requiresSettlement: false, maxSettlementDistance: 2048, minPopulation: 0, minFreeSpaceWidth: 136, minFreeSpaceLength: 120, minSupportRatio: 1, requiresAccessibleEntry: true, allowFloating: false },
    generation: { generateInterior: true, interiorRooms: ["leyline-chamber", "watch-ring", "relic-vault"], generateRoad: true, generateDecorations: true, generateResources: true, npcSpawns: [{ id: "commander-koral", min: 1, max: 1 }], mobSpawns: [{ id: "obsidian-warden", min: 1, max: 1 }], requiredChildren: ["building-magic-clock-tower"], optionalChildren: ["compound-frontier-farm"] },
  },
];

export const structureBlueprintLibraryValidation = validateStructureBlueprints(STRUCTURE_BLUEPRINT_LIBRARY);
