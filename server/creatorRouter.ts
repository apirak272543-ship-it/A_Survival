import { z } from "zod";
import {
  generateProceduralWeapons,
  type MaterialId,
  type RarityId,
  type WeaponCategory,
} from "../tools/content-generator";
import {
  DEFAULT_GENERATOR_MAP_ID,
  generateWorld,
} from "../tools/world-generator";
import { OBSIDIAN_BLOCKS, getBlockDefinition } from "../client/src/game/data/blockModules";
import {
  generateStructurePlacements,
  STRUCTURE_BLUEPRINT_LIBRARY,
  validateStructureGenerationOutput,
} from "./generators/structureGenerator";
import {
  createAnimationProfileRegistry,
  type AnimationProfileInput,
} from "./generators/animationProfileGenerator";
import { createQuestProgressionRegistry, type QuestProgressionInput, type QuestProgressionOutput } from "./generators/questProgressionGenerator";
import {
  generateUniversalItem,
  type ItemElement,
  type ItemFamily,
  type ItemRole,
  type ItemProgression,
  type DamageType,
  type ItemStats,
} from "./generators/universalItemEngine";
import {
  buildTexturePack,
  createTexturePackBuilderRegistry,
  validateTexturePackInput,
  validateTexturePackOutput,
  type TexturePackInput,
} from "./generators/texturePackBuilder";
import { adminProcedure, router } from "./_core/trpc";
import { listCreatorArtifacts, registerTexturePackArtifact } from "./creatorArtifactRegistry";

const identifierSchema = z.string().min(2).max(64);
const rgbaChannelSchema = z.number().int().min(0).max(255);
const textureLayerSchema = z.object({
  id: identifierSchema,
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(1).max(2048),
  height: z.number().int().min(1).max(2048),
  rgba: z.array(rgbaChannelSchema).max(16_777_216),
});
const skinPartSchema = z.object({
  id: identifierSchema,
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(1).max(2048),
  height: z.number().int().min(1).max(2048),
});
const skinLayoutSchema = z.object({
  id: identifierSchema,
  parts: z.array(skinPartSchema).max(128),
  allowPartOverlap: z.boolean(),
});
const textureAssetSchema = z.object({
  assetId: identifierSchema,
  kind: z.enum(["icon", "tile", "skin", "atlas"]),
  width: z.number().int().min(1).max(2048),
  height: z.number().int().min(1).max(2048),
  layers: z.array(textureLayerSchema).max(128),
  source: z.enum(["generated", "starter-authored", "provided", "reference-only"]),
  provenanceRef: z.string().max(512),
  skinLayout: skinLayoutSchema.optional(),
});
export const texturePackInputSchema = z.object({
  id: identifierSchema,
  namespace: identifierSchema,
  version: z.string().max(32),
  displayName: z.string().max(160),
  textureSampling: z.enum(["nearest", "linear"]),
  assets: z.array(textureAssetSchema).max(500),
});

const textureGenerationSchema = z.object({
  input: texturePackInputSchema,
  seed: z.string().min(1).max(128),
});

type TexturePackRequest = z.infer<typeof texturePackInputSchema>;

const itemStatsSchema = z.object({
  damage: z.number().min(0).max(100).optional(),
  range: z.number().min(0).max(100).optional(),
  attackSpeed: z.number().min(0).max(100).optional(),
  area: z.number().min(0).max(100).optional(),
  critical: z.number().min(0).max(100).optional(),
  mobility: z.number().min(0).max(100).optional(),
  defense: z.number().min(0).max(100).optional(),
  healing: z.number().min(0).max(100).optional(),
  utility: z.number().min(0).max(100).optional(),
});

const itemPreviewSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9.-]{2,63}$/),
  name: z.string().trim().min(3).max(96),
  family: z.enum(["melee", "ranged", "magic", "technology", "modern", "hybrid", "armor", "tool", "consumable", "material", "artifact", "clothing", "accessory"]),
  role: z.enum(["dps", "tank", "assassin", "ranger", "mage", "support", "farmer", "explorer", "crafter", "technician", "hybrid"]),
  progression: z.enum(["early", "mid", "late", "end", "special"]),
  element: z.enum(["fire", "water", "ice", "earth", "wind", "lightning", "light", "dark", "poison", "nature", "arcane", "neutral"]),
  damageType: z.enum(["physical", "magic", "elemental", "energy", "projectile", "explosive", "poison", "environmental"]).optional(),
  materialTag: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{1,48}$/),
  environmentTag: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{1,48}$/),
  purpose: z.string().trim().min(3).max(240),
  identity: z.string().trim().min(3).max(240),
  weakness: z.string().trim().min(3).max(240),
  stats: itemStatsSchema.optional(),
  maxPowerBudget: z.number().int().min(1).max(100).default(75),
});

type ItemPreviewRequest = z.infer<typeof itemPreviewSchema>;

function buildNoCodeItemInput(input: ItemPreviewRequest) {
  const stats: ItemStats = {
    damage: 25,
    range: 20,
    attackSpeed: 20,
    area: 0,
    critical: 5,
    mobility: 10,
    defense: 10,
    healing: 0,
    utility: 20,
    ...input.stats,
  };
  const element = input.element as ItemElement;
  return {
    id: input.id,
    name: input.name,
    family: input.family as ItemFamily,
    category: input.family,
    role: input.role as ItemRole,
    materialTags: [input.materialTag],
    environmentTags: [input.environmentTag],
    progression: input.progression as ItemProgression,
    element,
    damageType: input.damageType as DamageType | undefined,
    purpose: input.purpose,
    identity: input.identity,
    weakness: input.weakness,
    counters: [`counter.${element}`],
    stats,
    tradeOffs: [{ stat: "defense" as const, amount: 10, reason: "รักษาความแรงไว้แลกกับการป้องกันที่ไม่สูงเกินไป" }],
    effects: element === "neutral" ? [] : [{ id: `effect.${input.id}`, element, damageType: input.damageType as DamageType | undefined, strength: 8, durationSeconds: 4, stackLimit: 1, cooldownSeconds: 2, counterTags: [`resist.${element}`] }],
    durability: { maximum: 100, current: 100 },
    repair: { method: "material" as const, resources: [{ source: "mining" as const, resourceId: input.materialTag, quantity: 1 }], baseCost: 5 },
    compatibility: [
      { target: "material" as const, tag: input.materialTag, result: "allowed" as const, reason: "วัสดุนี้เป็นส่วนประกอบที่ระบบกำหนดไว้" },
      { target: "build" as const, tag: input.environmentTag, result: "special" as const, reason: "สภาพแวดล้อมนี้เป็น build ที่แนะนำ" },
    ],
    resources: [{ source: "mining" as const, resourceId: input.materialTag, quantity: 1 }],
    recommendedBuilds: [input.role as ItemRole],
    performanceCost: 10,
  };
}

const animationPreviewSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{2,63}$/),
  displayName: z.string().trim().min(3).max(120),
  assetId: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{2,63}$/),
  assetSource: z.enum(["generated", "starter-authored", "provided", "reference-only"]),
  provenanceRef: z.string().trim().min(1).max(512),
  fps: z.number().int().min(1).max(60).default(12),
  seed: z.string().trim().min(1).max(128),
});

const questPreviewSchema = z.object({
  mapCount: z.number().int().min(1).max(100).default(100),
  seed: z.string().trim().min(1).max(128),
});

const structurePreviewSchema = z.object({
  mapId: z.literal(DEFAULT_GENERATOR_MAP_ID),
  blueprintId: z.string().trim().regex(/^[a-z0-9][a-z0-9.-]{2,63}$/),
  seed: z.string().trim().min(1).max(128),
  x: z.number().int().min(-500).max(500).default(0),
  z: z.number().int().min(-500).max(500).default(0),
  biome: z.string().trim().min(1).max(80).default("Obsidian Alien Frontier"),
  terrain: z.enum(["flat", "rolling", "slope", "mountain", "cave"]).default("flat"),
  climate: z.enum(["temperate", "cold", "hot", "arid", "void"]).default("temperate"),
  slopeDegrees: z.number().min(0).max(90).default(0),
  waterDepth: z.number().min(0).max(512).default(0),
  groundY: z.number().int().min(0).max(256).default(0),
  freeSpaceWidth: z.number().int().min(1).max(512).default(256),
  freeSpaceLength: z.number().int().min(1).max(512).default(256),
  roadDistance: z.number().min(0).max(4096).default(0),
  settlementDistance: z.number().min(0).max(4096).default(0),
  population: z.number().int().min(0).max(1_000_000).default(100),
  supportRatio: z.number().min(0).max(1).default(1),
  accessibleEntry: z.boolean().default(true),
  minPlacementScore: z.number().int().min(0).max(100).default(0),
  occupiedFootprints: z.array(z.object({ x: z.number().int(), z: z.number().int(), width: z.number().int().positive(), length: z.number().int().positive() })).max(64).default([]),
});

type StructurePreviewRequest = z.infer<typeof structurePreviewSchema>;

function buildStructurePreview(input: StructurePreviewRequest) {
  const blueprint = STRUCTURE_BLUEPRINT_LIBRARY.find(candidate => candidate.id === input.blueprintId);
  if (!blueprint) throw new Error(`Unknown structure blueprint: ${input.blueprintId}`);
  const generationInput = {
    mapId: input.mapId,
    blueprints: [blueprint],
    candidates: [{
      x: input.x,
      y: input.groundY,
      z: input.z,
      context: {
        mapId: input.mapId,
        biome: input.biome,
        terrain: input.terrain,
        climate: input.climate,
        slopeDegrees: input.slopeDegrees,
        waterDepth: input.waterDepth,
        groundY: input.groundY,
        freeSpaceWidth: input.freeSpaceWidth,
        freeSpaceLength: input.freeSpaceLength,
        roadDistance: input.roadDistance,
        settlementDistance: input.settlementDistance,
        population: input.population,
        supportRatio: input.supportRatio,
        accessibleEntry: input.accessibleEntry,
        worldBounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
        occupiedFootprints: input.occupiedFootprints,
      },
    }],
    minPlacementScore: input.minPlacementScore,
    maxPlacements: 1,
  };
  const output = generateStructurePlacements(generationInput, input.seed);
  return { output, validation: validateStructureGenerationOutput(output, generationInput) };
}

function buildGeneratedTextureResponse(input: TexturePackRequest, seed: string) {
  const registry = createTexturePackBuilderRegistry();
  const artifact = registry.generate("texture.pack", input as TexturePackInput, { seed, generatedAt: 0 });
  return { artifact, preview: registry.preview(artifact) };
}

/**
 * Creator routes deliberately use adminProcedure. The current user model has
 * only user/admin roles; until a creator-specific role exists, generator
 * writes remain an admin-only developer capability and never enter `game`.
 */
export const creatorRouter = router({
  texture: router({
    validateInput: adminProcedure.input(texturePackInputSchema).mutation(({ input }) => validateTexturePackInput(input as TexturePackInput)),
    build: adminProcedure.input(texturePackInputSchema).mutation(({ input }) => {
      const output = buildTexturePack(input as TexturePackInput);
      return { output, validation: validateTexturePackOutput(output, input as TexturePackInput) };
    }),
    generate: adminProcedure.input(textureGenerationSchema).mutation(({ input }) => buildGeneratedTextureResponse(input.input, input.seed)),
    preview: adminProcedure.input(textureGenerationSchema).mutation(({ input }) => buildGeneratedTextureResponse(input.input, input.seed).preview),
    register: adminProcedure.input(texturePackInputSchema).mutation(async ({ input, ctx }) => {
      const output = buildTexturePack(input as TexturePackInput);
      const validation = validateTexturePackOutput(output, input as TexturePackInput);
      if (!validation.valid) throw new Error(`Texture pack output is invalid: ${validation.issues.join("; ")}`);
      const artifact = await registerTexturePackArtifact({ output, createdByUserId: ctx.user.id });
      return { artifact, validation };
    }),
    list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional()).query(({ input }) => listCreatorArtifacts(input?.limit)),
  }),
  world: router({
    preview: adminProcedure.input(z.object({
      seed: z.number().int(),
      radius: z.number().int().min(8).max(64).default(32),
      difficulty: z.enum(["peaceful", "normal", "hard"]).default("normal"),
    })).mutation(({ input }) => {
      const world = generateWorld({ mapId: DEFAULT_GENERATOR_MAP_ID, profileId: "creator-preview", seed: input.seed, radius: input.radius, difficulty: input.difficulty });
      return {
        previewOnly: true as const,
        mapId: world.mapId,
        seed: world.seed,
        requestedRadius: world.requestedRadius,
        chunkSize: world.chunkSize,
        worldHash: world.worldHash,
        metadata: world.metadata,
        counts: { blocks: world.blocks.length, terrain: world.terrain.length, water: world.water.length, caves: world.caves.length, resources: world.resources.length, structures: world.structures.length, spawnPoints: world.spawnPoints.length },
        sampleBlockIds: Array.from(new Set(world.blocks.slice(0, 24).map(block => block.blockId))),
      };
    }),
  }),
  quest: router({
    preview: adminProcedure.input(questPreviewSchema).mutation(({ input }) => {
      const registry = createQuestProgressionRegistry();
      const questInput: QuestProgressionInput = { mapCount: input.mapCount };
      const artifact = registry.generate<QuestProgressionInput, QuestProgressionOutput>("quest.progression", questInput, { seed: input.seed, generatedAt: 0 });
      const firstMap = artifact.output.maps[0];
      const secondMap = artifact.output.maps[1];
      return {
        previewOnly: true as const,
        contentHash: artifact.contentHash,
        preview: registry.preview(artifact),
        summary: {
          mapCount: artifact.output.maps.length,
          questsPerMap: artifact.output.constraints.questsPerMap,
          totalQuests: artifact.output.quests.length,
          playableMap: firstMap?.mapId ?? "obsidian-frontier",
          futureMapRuntimeImportAllowed: artifact.output.constraints.futureMapsRuntimeImportAllowed,
          firstChapter: firstMap?.chapterTitle ?? "",
          nextMapGateQuestCount: secondMap?.unlockRequiresQuestIds.length ?? 0,
          questSample: artifact.output.quests.slice(0, artifact.output.constraints.questsPerMap).map(quest => ({ id: quest.id, title: quest.title, objective: quest.objectives[0]?.description ?? "", reward: quest.rewards[0]?.itemDefinitionId ?? "" })),
        },
      };
    }),
  }),
  animation: router({
    preview: adminProcedure.input(animationPreviewSchema).mutation(({ input }) => {
      const registry = createAnimationProfileRegistry();
      const animationInput: AnimationProfileInput = {
        id: input.id,
        displayName: input.displayName,
        assetId: input.assetId,
        assetSource: input.assetSource,
        provenanceRef: input.provenanceRef,
        fps: input.fps,
      };
      const artifact = registry.generate("animation.profile", animationInput, { seed: input.seed, generatedAt: 0 });
      return { previewOnly: true as const, output: artifact.output, preview: registry.preview(artifact) };
    }),
  }),
  block: router({
    preview: adminProcedure.input(z.object({ blockId: z.string().trim().min(3).max(96) })).mutation(({ input }) => {
      const definition = getBlockDefinition(input.blockId);
      if (!definition || !Object.prototype.hasOwnProperty.call(OBSIDIAN_BLOCKS, input.blockId)) throw new Error(`Unknown Obsidian block definition: ${input.blockId}`);
      return { previewOnly: true as const, runtimeImportAllowed: false as const, definition };
    }),
  }),
  structure: router({
    preview: adminProcedure.input(structurePreviewSchema).mutation(({ input }) => ({ previewOnly: true as const, ...buildStructurePreview(input) })),
  }),
  item: router({
    preview: adminProcedure.input(itemPreviewSchema).mutation(({ input }) => {
      const generated = generateUniversalItem({ item: buildNoCodeItemInput(input), maxPowerBudget: input.maxPowerBudget });
      return { previewOnly: true as const, output: generated, validation: { valid: true as const, issues: [] as string[] } };
    }),
  }),
  weapon: router({
    preview: adminProcedure.input(z.object({
      seed: z.number().int(),
      count: z.number().int().min(1).max(32).default(1),
      category: z.enum(["melee", "ranged", "magic"]).optional(),
      rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary", "mythic"]).optional(),
    })).mutation(({ input }) => ({
      previewOnly: true as const,
      generatorVersion: "0.1.0",
      records: generateProceduralWeapons(input as { seed: number; count: number; category?: WeaponCategory; rarity?: RarityId }),
    })),
  }),
});
