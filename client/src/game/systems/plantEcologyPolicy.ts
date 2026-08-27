import { getPlantDefinition, type PlantBiomeTag, type PlantDefinition } from "@/game/data/plantCatalog";
import type { SoilId } from "@/game/data/catalog";

export const PLANT_ECOLOGY_POLICY_VERSION = "plant-ecology-policy.v1" as const;

export type PlantEcologyStage = "seed" | "sprout" | "young" | "mature";
export type PlantEcologySeason = "ashfall" | "rainwake" | "embertide" | "frostveil";

export type PlantEcologyInput = {
  plantId: string;
  soilId?: unknown;
  biome?: unknown;
  stage: unknown;
  waterScore?: unknown;
  nutrientScore?: unknown;
  pestPressure?: unknown;
  season?: unknown;
  seasonScore?: unknown;
};

export type PlantEcologyAssessment = {
  policyVersion: typeof PLANT_ECOLOGY_POLICY_VERSION;
  plantId: string;
  displayName: string;
  family: PlantDefinition["family"];
  soilId: SoilId | null;
  biome: PlantBiomeTag | null;
  compatibility: {
    soilCompatible: boolean;
    biomeCompatible: boolean;
    accepted: boolean;
  };
  lifecycle: {
    stage: PlantEcologyStage;
    stageIndex: number;
    progress01: number;
    stages: readonly PlantEcologyStage[];
    growthSeconds: number;
    matureOnlyHarvest: true;
  };
  factors: {
    waterScore: number | null;
    nutrientScore: number | null;
    pestPressure: number | null;
    season: PlantEcologySeason | null;
    seasonScore: number | null;
  };
  advisory: {
    status: "eligible" | "incompatible" | "missing-factors";
    proposedGrowthMultiplier: number | null;
    reason: string;
  };
  effect: {
    kind: PlantDefinition["effect"]["kind"];
    power: number;
    radiusMeters: number | null;
  };
  missingRuntimeOwners: readonly ["nutrient-system", "pest-system", "season-system"];
  runtimePolicy: {
    generatedOnce: true;
    runtimeMutationAllowed: false;
    playerVisible: false;
    cacheable: false;
    networkPersistence: false;
  };
};

const STAGES: readonly PlantEcologyStage[] = ["seed", "sprout", "young", "mature"];
const SOILS: readonly SoilId[] = ["terra-loam", "ashen-volcanic", "red-dune", "verdant-humus", "aether-crystal"];
const BIOMES: readonly PlantBiomeTag[] = ["temperate", "wetland", "tropical", "dry", "desert", "alpine", "volcanic", "arcane", "void"];
const SEASONS: readonly PlantEcologySeason[] = ["ashfall", "rainwake", "embertide", "frostveil"];
const MISSING_RUNTIME_OWNERS = ["nutrient-system", "pest-system", "season-system"] as const;

function enumValue<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === "string" && values.includes(value as T) ? value as T : null;
}

function boundedScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}

function boundedEffect(plant: PlantDefinition) {
  return {
    kind: plant.effect.kind,
    power: Math.max(0, Math.min(8, plant.effect.power)),
    radiusMeters: plant.effect.radiusMeters === undefined ? null : Math.max(0, Math.min(8, plant.effect.radiusMeters)),
  };
}

function proposedGrowthMultiplier(factors: PlantEcologyAssessment["factors"]): number | null {
  if (factors.waterScore === null || factors.nutrientScore === null || factors.pestPressure === null || factors.seasonScore === null) return null;
  const value = 0.5 + (factors.waterScore * 0.15) + (factors.nutrientScore * 0.15) + ((1 - factors.pestPressure) * 0.15) + (factors.seasonScore * 0.15);
  return Number(Math.max(0.5, Math.min(1.1, value)).toFixed(3));
}

export function evaluatePlantEcology(input: PlantEcologyInput): PlantEcologyAssessment {
  const plant = getPlantDefinition(input.plantId);
  if (!plant) throw new Error(`Unknown plant definition: ${input.plantId}`);
  const soilId = enumValue(input.soilId, SOILS);
  const biome = enumValue(input.biome, BIOMES);
  const stage = enumValue(input.stage, STAGES);
  if (!stage) throw new Error("stage must be one of seed, sprout, young or mature");
  const season = enumValue(input.season, SEASONS);
  const factors = {
    waterScore: boundedScore(input.waterScore),
    nutrientScore: boundedScore(input.nutrientScore),
    pestPressure: boundedScore(input.pestPressure),
    season,
    seasonScore: boundedScore(input.seasonScore),
  } satisfies PlantEcologyAssessment["factors"];
  const soilCompatible = soilId !== null && plant.compatibleSoils.includes(soilId);
  const biomeCompatible = biome !== null && plant.biomeTags.includes(biome);
  const accepted = soilCompatible && biomeCompatible;
  const multiplier = accepted ? proposedGrowthMultiplier(factors) : null;
  const status: PlantEcologyAssessment["advisory"]["status"] = !accepted ? "incompatible" : multiplier === null ? "missing-factors" : "eligible";
  const reason = !soilCompatible ? "soil is not in the plant definition compatibleSoils list" : !biomeCompatible ? "biome is not in the plant definition biomeTags list" : multiplier === null ? "fictional ecology factors are incomplete; no runtime growth adjustment is authorized" : "fictional advisory only; no runtime growth adjustment is authorized";
  return {
    policyVersion: PLANT_ECOLOGY_POLICY_VERSION,
    plantId: plant.id,
    displayName: plant.displayName,
    family: plant.family,
    soilId,
    biome,
    compatibility: { soilCompatible, biomeCompatible, accepted },
    lifecycle: { stage, stageIndex: STAGES.indexOf(stage), progress01: Number((STAGES.indexOf(stage) / (STAGES.length - 1)).toFixed(3)), stages: STAGES, growthSeconds: plant.growthSeconds, matureOnlyHarvest: true },
    factors,
    advisory: { status, proposedGrowthMultiplier: multiplier, reason },
    effect: boundedEffect(plant),
    missingRuntimeOwners: MISSING_RUNTIME_OWNERS,
    runtimePolicy: { generatedOnce: true, runtimeMutationAllowed: false, playerVisible: false, cacheable: false, networkPersistence: false },
  };
}
