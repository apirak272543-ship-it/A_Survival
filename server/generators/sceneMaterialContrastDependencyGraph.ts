import { getBiomeVisualProfile } from "../../client/src/game/data/biomeProfiles";
import { getMapSceneTreatment } from "../../client/src/game/data/mapSceneTreatments";
import { PIXEL_PACK_MANIFEST, PIXEL_PALETTE } from "../../client/src/game/assets/pixelPack";
import { sampleObsidianTerrainHeight } from "../../client/src/game/systems/terrainHeight";
import { hashStableJson } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const SCENE_MATERIAL_CONTRAST_GRAPH_RULES_VERSION = "scene-material-contrast-graph-rules.v1" as const;
export const SCENE_MATERIAL_CONTRAST_GRAPH_SCHEMA_VERSION = "a-survival.scene-material-contrast-graph.v1" as const;
export const SCENE_MATERIAL_CONTRAST_GRAPH_VERSION = "1.0.0" as const;
export const SCENE_MATERIAL_CONTRAST_DEFAULT_SAMPLE_RADIUS = 32;
export const SCENE_MATERIAL_CONTRAST_MAX_SAMPLE_RADIUS = 64;
const PLAYABLE_MAP_ID = "obsidian-frontier" as const;
const DEFAULT_FOG_SCALE = 0.11;
const MAX_DECLARED_DECORATION_EMISSIVE = 0.25;
const MAX_SCENE_ACTOR_EMISSIVE = 0.08;
const MIN_READABLE_CONTRAST_RATIO = 1.25;

export type SceneMaterialContrastBlocker = "visual-runtime-screenshot-owner-missing" | "camera-mode-contrast-acceptance-missing";

export type SceneMaterialContrastDependencyGraphInput = {
  mapId?: string;
  sampleRadius?: number;
  rulesVersion?: string;
};

type Rgb = { r: number; g: number; b: number };

export type SceneMaterialContrastSummary = {
  mapId: string;
  terrain: {
    activeRenderer: "createPixelTerrainChunks";
    usesHeightSampler: true;
    usesNeighborHeightSideFaces: true;
    sampleRadius: number;
    sampleCount: number;
    minimumHeight: number;
    maximumHeight: number;
    heightRange: number;
    uniqueHeightCount: number;
    positiveReliefStepCount: number;
    nonFlatReliefEvidence: boolean;
    terrainAssetIds: string[];
    flatLegacyHelperCaller: false;
  };
  actorReadability: {
    paletteBindings: Array<{ role: "player" | "pet" | "enemy"; paletteKey: string; hex: string; assetId: string }>;
    terrainPaletteBindings: Array<{ paletteKey: "ash" | "obsidian"; hex: string }>;
    minimumContrastByRole: Record<"player" | "pet" | "enemy", number>;
    maximumContrastByRole: Record<"player" | "pet" | "enemy", number>;
    readableAgainstAtLeastOneTerrain: Record<"player" | "pet" | "enemy", boolean>;
    actorMaterialEmissive: number;
    actorEmissiveWithinCap: boolean;
    playerPetEnemyHaveDistinctPaletteBindings: boolean;
  };
  materialLighting: {
    terrainTextureEmissive: { r: number; g: number; b: number };
    actorTextureEmissive: { r: number; g: number; b: number };
    sceneBlockMaterialEmissive: number;
    sceneFarmMaterialEmissive: number;
    decorationEmissiveValues: number[];
    maximumDecorationEmissive: number;
    decorationEmissiveWithinCap: boolean;
    skyLightIntensity: number;
    keyLightIntensity: number;
    fogDensityInput: number;
    appliedFogDensity: number;
    glowDoesNotReplaceBaseColor: true;
  };
  mapProfile: {
    sceneTreatmentPresent: true;
    biomeVisualProfilePresent: true;
    terrainFamilyCount: number;
    landmarkCount: number;
    landmarkAssetIds: string[];
    landmarkEmissiveValues: number[];
    allAssetsReferenceOnly: true;
  };
  policy: {
    visualContrastAuditOnly: true;
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    binaryAssetsCreated: false;
    runtimeSceneMutated: false;
  };
  owners: {
    sceneMaterialSource: true;
    sceneLightingSource: true;
    terrainReliefSource: true;
    pixelPaletteSource: true;
    mapVisualProfileSource: true;
    runtimeScreenshotAcceptance: false;
    cameraModeContrastAcceptance: false;
  };
  blockerCodes: SceneMaterialContrastBlocker[];
};

export type SceneMaterialContrastDependencyGraphOutput = {
  artifact: {
    generatorId: "scene.material-contrast.audit";
    generatorVersion: typeof SCENE_MATERIAL_CONTRAST_GRAPH_VERSION;
    mapId: string;
    contentHash: string;
  };
  summary: SceneMaterialContrastSummary;
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function parseHex(hex: string): Rgb {
  const value = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) throw new Error(`Invalid six-digit palette color: ${hex}`);
  return { r: Number.parseInt(value.slice(0, 2), 16) / 255, g: Number.parseInt(value.slice(2, 4), 16) / 255, b: Number.parseInt(value.slice(4, 6), 16) / 255 };
}

function linearChannel(value: number) {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string) {
  const rgb = parseHex(hex);
  return 0.2126 * linearChannel(rgb.r) + 0.7152 * linearChannel(rgb.g) + 0.0722 * linearChannel(rgb.b);
}

function contrastRatio(leftHex: string, rightHex: string) {
  const left = relativeLuminance(leftHex);
  const right = relativeLuminance(rightHex);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(4));
}

function sourceNode(key: string, generatorId: string, source: string, rulesVersion: string): DependencyGraphNode {
  return {
    key,
    kind: "other",
    generatorId,
    generatorVersion: SCENE_MATERIAL_CONTRAST_GRAPH_VERSION,
    schemaVersion: SCENE_MATERIAL_CONTRAST_GRAPH_SCHEMA_VERSION,
    seed: PLAYABLE_MAP_ID,
    rulesVersion,
    contentHash: hashStableJson({ generatorId, source, rulesVersion } as never),
    dependencies: [],
  };
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return { key: node.key, kind: node.kind, required: true, generatorId: node.generatorId, generatorVersion: node.generatorVersion, contentHash: node.contentHash };
}

function missingDependency(key: string): GeneratorDependency {
  return { key, kind: "other", required: true, generatorId: key.replace(/^owner:/, ""), generatorVersion: "1.0.0" };
}

function boundedSampleHeights(radius: number) {
  const heights: number[] = [];
  for (let z = -radius; z <= radius; z += 1) {
    for (let x = -radius; x <= radius; x += 1) heights.push(sampleObsidianTerrainHeight(x, z));
  }
  return heights;
}

export function buildSceneMaterialContrastDependencyGraph(input: SceneMaterialContrastDependencyGraphInput = {}): SceneMaterialContrastDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? SCENE_MATERIAL_CONTRAST_GRAPH_RULES_VERSION;
  if (rulesVersion !== SCENE_MATERIAL_CONTRAST_GRAPH_RULES_VERSION) throw new Error(`Unsupported scene material contrast graph rules version: ${rulesVersion}`);
  const mapId = input.mapId ?? PLAYABLE_MAP_ID;
  if (mapId !== PLAYABLE_MAP_ID) throw new Error(`Only ${PLAYABLE_MAP_ID} is enabled until the vertical slice is complete.`);
  const sampleRadius = input.sampleRadius ?? SCENE_MATERIAL_CONTRAST_DEFAULT_SAMPLE_RADIUS;
  if (!Number.isInteger(sampleRadius) || sampleRadius < 1 || sampleRadius > SCENE_MATERIAL_CONTRAST_MAX_SAMPLE_RADIUS) throw new Error(`sampleRadius must be a bounded integer from 1 to ${SCENE_MATERIAL_CONTRAST_MAX_SAMPLE_RADIUS}`);
  const sceneTreatment = getMapSceneTreatment(mapId);
  const visualProfile = getBiomeVisualProfile(mapId);
  if (!sceneTreatment || visualProfile.mapId !== PLAYABLE_MAP_ID) throw new Error("Canonical Obsidian scene treatment and visual profile are required");

  const heights = boundedSampleHeights(sampleRadius);
  const minimumHeight = Math.min(...heights);
  const maximumHeight = Math.max(...heights);
  const uniqueHeightCount = new Set(heights).size;
  let positiveReliefStepCount = 0;
  for (let z = -sampleRadius; z <= sampleRadius; z += 1) {
    for (let x = -sampleRadius; x <= sampleRadius; x += 1) {
      const height = sampleObsidianTerrainHeight(x, z);
      if (height > sampleObsidianTerrainHeight(x + 1, z) || height > sampleObsidianTerrainHeight(x, z + 1)) positiveReliefStepCount += 1;
    }
  }

  const actorColors: Array<{ role: "player" | "pet" | "enemy"; paletteKey: keyof typeof PIXEL_PALETTE; assetId: string }> = [
    { role: "player", paletteKey: "violet", assetId: PIXEL_PACK_MANIFEST.assets.survivor },
    { role: "pet", paletteKey: "cyan", assetId: PIXEL_PACK_MANIFEST.assets.companion },
    { role: "enemy", paletteKey: "crimson", assetId: PIXEL_PACK_MANIFEST.assets.enemy },
  ];
  const terrainColors = [{ paletteKey: "ash" as const, hex: PIXEL_PALETTE.ash }, { paletteKey: "obsidian" as const, hex: PIXEL_PALETTE.obsidian }];
  const contrastByRole = Object.fromEntries(actorColors.map(actor => [actor.role, terrainColors.map(terrain => contrastRatio(PIXEL_PALETTE[actor.paletteKey], terrain.hex))])) as Record<"player" | "pet" | "enemy", number[]>;
  const minimumContrastByRole = Object.fromEntries(actorColors.map(actor => [actor.role, Math.min(...contrastByRole[actor.role])])) as Record<"player" | "pet" | "enemy", number>;
  const maximumContrastByRole = Object.fromEntries(actorColors.map(actor => [actor.role, Math.max(...contrastByRole[actor.role])])) as Record<"player" | "pet" | "enemy", number>;
  const readableAgainstAtLeastOneTerrain = Object.fromEntries(actorColors.map(actor => [actor.role, maximumContrastByRole[actor.role] >= MIN_READABLE_CONTRAST_RATIO])) as Record<"player" | "pet" | "enemy", boolean>;
  const decorationEmissiveValues = visualProfile.decorations.map(decoration => decoration.emissive ?? 0.28);
  const terrainTextureEmissive = { r: 0.025, g: 0.03, b: 0.035 };
  const actorTextureEmissive = { r: 0.08, g: 0.08, b: 0.08 };
  const summary: SceneMaterialContrastSummary = {
    mapId,
    terrain: { activeRenderer: "createPixelTerrainChunks", usesHeightSampler: true, usesNeighborHeightSideFaces: true, sampleRadius, sampleCount: heights.length, minimumHeight, maximumHeight, heightRange: maximumHeight - minimumHeight, uniqueHeightCount, positiveReliefStepCount, nonFlatReliefEvidence: maximumHeight > minimumHeight && uniqueHeightCount > 1 && positiveReliefStepCount > 0, terrainAssetIds: [...visualProfile.terrainAssetIds], flatLegacyHelperCaller: false },
    actorReadability: { paletteBindings: actorColors.map(actor => ({ ...actor, hex: PIXEL_PALETTE[actor.paletteKey] })), terrainPaletteBindings: terrainColors, minimumContrastByRole, maximumContrastByRole, readableAgainstAtLeastOneTerrain, actorMaterialEmissive: MAX_SCENE_ACTOR_EMISSIVE, actorEmissiveWithinCap: MAX_SCENE_ACTOR_EMISSIVE <= 0.1, playerPetEnemyHaveDistinctPaletteBindings: new Set(actorColors.map(actor => actor.paletteKey)).size === 3 },
    materialLighting: { terrainTextureEmissive, actorTextureEmissive, sceneBlockMaterialEmissive: 0.08, sceneFarmMaterialEmissive: 0.05, decorationEmissiveValues, maximumDecorationEmissive: Math.max(...decorationEmissiveValues), decorationEmissiveWithinCap: Math.max(...decorationEmissiveValues) <= MAX_DECLARED_DECORATION_EMISSIVE, skyLightIntensity: Math.min(0.9, sceneTreatment.lightIntensity + 0.15), keyLightIntensity: 1.25, fogDensityInput: sceneTreatment.fogDensity, appliedFogDensity: sceneTreatment.fogDensity * DEFAULT_FOG_SCALE, glowDoesNotReplaceBaseColor: true },
    mapProfile: { sceneTreatmentPresent: true, biomeVisualProfilePresent: true, terrainFamilyCount: visualProfile.terrainAssetIds.length, landmarkCount: visualProfile.decorations.length, landmarkAssetIds: visualProfile.decorations.map(decoration => decoration.assetId), landmarkEmissiveValues: decorationEmissiveValues, allAssetsReferenceOnly: true },
    policy: { visualContrastAuditOnly: true, runtimeImportAllowed: false, playerVisible: false, cacheable: false, binaryAssetsCreated: false, runtimeSceneMutated: false },
    owners: { sceneMaterialSource: true, sceneLightingSource: true, terrainReliefSource: true, pixelPaletteSource: true, mapVisualProfileSource: true, runtimeScreenshotAcceptance: false, cameraModeContrastAcceptance: false },
    blockerCodes: ["visual-runtime-screenshot-owner-missing", "camera-mode-contrast-acceptance-missing"],
  };

  const sceneNode = sourceNode("owner:visual:scene-material", "scene.visual.material", "client/src/game/scene.ts:material/createGameScene", rulesVersion);
  const profileNode = sourceNode("owner:visual:map-profile", "scene.visual.map-profile", "client/src/game/data/mapSceneTreatments.ts+biomeProfiles.ts", rulesVersion);
  const pixelNode = sourceNode("owner:visual:pixel-pack", "scene.visual.pixel-pack", "client/src/game/assets/pixelPack.ts", rulesVersion);
  const terrainNode = sourceNode("owner:visual:terrain-relief", "scene.visual.terrain-relief", "client/src/game/systems/terrainHeight.ts", rulesVersion);
  const dependencies = [sceneNode, profileNode, pixelNode, terrainNode].map(dependencyFor);
  dependencies.push(missingDependency("owner:visual:runtime-screenshot-acceptance"), missingDependency("owner:visual:camera-mode-contrast-acceptance"));
  const auditNode: DependencyGraphNode = { key: `scene-material-contrast:${mapId}:${sampleRadius}`, kind: "other", generatorId: "scene.material-contrast.audit", generatorVersion: SCENE_MATERIAL_CONTRAST_GRAPH_VERSION, schemaVersion: SCENE_MATERIAL_CONTRAST_GRAPH_SCHEMA_VERSION, seed: `${mapId}:${sampleRadius}`, rulesVersion, contentHash: hashStableJson({ summary, dependencies } as never), dependencies };
  const nodes = [sceneNode, profileNode, pixelNode, terrainNode, auditNode];
  return { artifact: { generatorId: "scene.material-contrast.audit", generatorVersion: SCENE_MATERIAL_CONTRAST_GRAPH_VERSION, mapId, contentHash: auditNode.contentHash }, summary, nodes, graph: validateGeneratorDependencyGraph(nodes) };
}

export function getDefaultSceneMaterialContrastDependencyGraphInput(): SceneMaterialContrastDependencyGraphInput {
  return { mapId: PLAYABLE_MAP_ID, sampleRadius: SCENE_MATERIAL_CONTRAST_DEFAULT_SAMPLE_RADIUS, rulesVersion: SCENE_MATERIAL_CONTRAST_GRAPH_RULES_VERSION };
}
