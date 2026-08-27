import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { getWorldLighting } from "@/game/data/worldTime";
import { getMapDefinition } from "@/game/data/maps";
import { getItemDefinition, type ItemInstance } from "@/game/data/catalog";
import { getMapSceneTreatment } from "@/game/data/mapSceneTreatments";
import { MAP001_DISTRESS_POD, MAP001_MONOLITH, initialMap001Encounter, resolveMap001Encounter } from "@/game/map001/encounter";
import { MAP002_JAX_CAMP, MAP002_PYROCLASTIC_ALTAR, initialMap002Encounter, resolveMap002Encounter } from "@/game/map002/encounter";
import { MAP003_EMPRESS_SHRINE, MAP003_LYRA_CAMP, initialMap003Encounter, resolveMap003Encounter } from "@/game/map003/encounter";
import { MAP004_ARCHON_DAIS, MAP004_ZEPHYR_CAMP, initialMap004Encounter, resolveMap004Encounter } from "@/game/map004/encounter";
import { MAP005_HYDRA_NEST, MAP005_VANE_SHELTER, initialMap005Encounter, resolveMap005Encounter } from "@/game/map005/encounter";
import { MAP006_COLOSSUS_CORE, MAP006_STABILIZER, initialMap006Encounter, resolveMap006Encounter } from "@/game/map006/encounter";
import { MAP007_STEAM_VENT, MAP007_TERROR_RIFT, initialMap007Encounter, resolveMap007Encounter } from "@/game/map007/encounter";
import { MAP008_MATRIX_CORE, MAP008_RUNE_TERMINAL, initialMap008Encounter, resolveMap008Encounter } from "@/game/map008/encounter";
import { MAP009_CANOPY_HAVEN, MAP009_HIVE_ROOT, initialMap009Encounter, resolveMap009Encounter } from "@/game/map009/encounter";
import { MAP010_SINGULARITY_GATE, MAP010_STABLE_PYLON, initialMap010Encounter, resolveMap010Encounter } from "@/game/map010/encounter";
import { MAP011_SMELTER_ARCH, MAP011_FORGE_CAMP, initialMap011Encounter, resolveMap011Encounter } from "@/game/map011/encounter";
import { MAP012_WIND_MONOLITH, MAP012_SCOUT_OVERLOOK, initialMap012Encounter, resolveMap012Encounter } from "@/game/map012/encounter";
import { MAP013_SULFUR_FALLS, MAP013_THERON_BOARDWALK, initialMap013Encounter, resolveMap013Encounter } from "@/game/map013/encounter";
import { MAP014_CITADEL_GATE, MAP014_WARDEN_POST, initialMap014Encounter, resolveMap014Encounter } from "@/game/map014/encounter";
import { MAP015_PRIMAL_ANVIL, MAP015_FORGE_SHRINE, initialMap015Encounter, resolveMap015Encounter } from "@/game/map015/encounter";
import { resolveCompanionRuntime, type CompanionRuntimeState } from "@/game/home/homeSystemV2";
import { createBiomeDressing, createPixelBlockMesh, createPixelTerrainChunks, createVoxelModel } from "@/game/assets/pixelPack";
import { getBiomeVisualProfile } from "@/game/data/biomeProfiles";
import { loadPackModel } from "@/game/assets/glbPack";
import { canSpendStamina, createStaminaState, regenerateStamina, spendStamina, staminaPercent, type StaminaState } from "@/game/systems/staminaSystem";
import { chunkKey, getStreamingChunkKeys } from "@/game/systems/visibleRegionSystem";
import { updatePixelTerrainStream } from "@/game/assets/pixelPack";
import { getBlockRenderDistanceConfig, getRenderDistanceConfig, normalizeViewDistanceBlocks, type RenderDistancePreset, type TargetFps, type ViewDistanceBlocks } from "@/game/systems/renderDistance";
import { getPerformanceBudget, type PerformanceBudget, type PerformanceTier } from "@/game/systems/performanceProfile";
import { cameraRelativeMovement, getCameraModePose, normalizeCameraMode, type CameraMode } from "@/game/systems/cameraModes";
import { sampleObsidianTerrainHeight } from "@/game/systems/terrainHeight";
import { getBlockDefinition, type BlockToolTag, type WorldBlock } from "@/game/data/blockModules";
import { blockKey, getPlaceableBlockModule, getBlockToolForItem, type BlockTool } from "@/game/data/blockModules";
import { breakBlockAt, getAdjacentSupportModule, getWorldBlockAt, normalizeWorldBlockOverrides, placeBlockAt, type BlockCoordinate, type WorldBlockOverrides } from "@/game/systems/blockActionSystem";
import { resolveBlockBreak } from "@/game/systems/blockActionSystem";
import { canApplyHazardDamage, canPlaceBlock, getBlockingContacts, getHazardContacts } from "@/game/systems/blockPhysicsSystem";
import { createBlockWorld, generateBlockGroup, generateRockBlocks, generateTreeBlocks, getWorldBlock, listWorldBlocks, mergeGeneratedGroup, removeWorldBlock, setWorldBlock, type BlockWorld } from "@/game/systems/blockWorldSystem";
import { applyWorldBlockOverrides, loadObsidianWorldModule } from "@/game/storage/obsidianWorldModule";
import { OBSIDIAN_FARM_PLOTS, countMatureWorldPlants, getActiveRepellentAuras, getRepellentInfluence, getWorldPlantStage, harvestWorldPlant, plantWorldSeed, type ObsidianFarmPlot, type WorldPlantState } from "@/game/systems/worldFarmingSystem";
import { getWorldStorageAnchor, OBSIDIAN_STORAGE_ID, WORLD_STORAGE_INTERACTION_REACH, type WorldStorageAnchor } from "@/game/systems/worldStorageSystem";
import { getWorldFarmCropStage, getWorldFarmPlant, normalizeWorldFarmState, planHarvestWorldPlant, planPlantWorldSeed, type WorldFarmState } from "@/game/systems/worldFarmSystem";
import { shouldEnableRuntimeObject, type RuntimeSpatialMetadata } from "@/game/systems/runtimeVisibilitySystem";
import { STORAGE_CHEST_ID, STORAGE_CHEST_MODULE_ID } from "@/game/systems/worldStorageSystem";
import type { WorldPlantEffect } from "@/game/tools/plantCatalogGenerator";

export type GameSnapshot = {
  health: number;
  resources: number;
  enemies: number;
  phase: "day" | "night";
  mapState?: string;
  warning?: string;
  companionState?: CompanionRuntimeState;
  movementState?: "idle" | "walk" | "run" | "dash";
  speed?: number;
  stamina?: number;
  exhausted?: boolean;
  position?: { x: number; z: number };
  aiNpcAvailable?: boolean;
  cameraMode?: CameraMode;
  viewDistanceBlocks?: number;
  farmPlots?: number;
  plantedCrops?: number;
  matureCrops?: number;
  repelledEnemies?: number;
  worldStorageAvailable?: boolean;
  worldStorageId?: string;
  worldStorageSlots?: number;
  worldStorageCapacity?: number;
  performanceTier?: PerformanceTier;
  mobSimulationRadiusMeters?: number;
  animationRadiusMeters?: number;
  physicsRadiusMeters?: number;
  targetFpsBudget?: number;
};

export type GameReward = {
  definitionId: string;
  displayName: string;
  eventId: string;
  provenanceType: "harvest" | "drop" | "reward";
  quantity?: number;
};

export type BlockActionEvent = {
  type: "break" | "place";
  mapId: string;
  coordinate: BlockCoordinate;
  moduleId: string;
  itemInstanceId?: string;
  itemDefinitionId?: string;
  droppedDefinitionId?: string;
  overrides: WorldBlockOverrides;
  message: string;
};

export type BlockActionHandler = (event: BlockActionEvent) => boolean;

export type FarmActionEvent = {
  type: "plant" | "harvest";
  mapId: string;
  plotId: string;
  state: WorldFarmState;
  coordinate: BlockCoordinate;
  seedInstanceId?: string;
  seedDefinitionId?: string;
  reward?: ItemInstance;
  effect?: WorldPlantEffect;
  message: string;
};

export type FarmActionHandler = (event: FarmActionEvent) => boolean;

export type CompanionConfig = {
  following: boolean;
  lootRadius: number;
  resourceYieldMultiplier: number;
  damageMitigation: number;
};

export type GameHandle = {
  scene: Scene;
  dispose: () => void;
};

type GameOptions = {
  mapId: string;
  onSnapshot?: (snapshot: GameSnapshot) => void;
  onReward?: (reward: GameReward) => void;
  onBlockAction?: BlockActionHandler;
  onBlockMessage?: (message: string) => void;
  onFarmAction?: FarmActionHandler;
  onFarmMessage?: (message: string) => void;
  onChestOpen?: (chestId: string) => void;
  worldBlockOverrides?: WorldBlockOverrides;
  worldFarmState?: WorldFarmState;
  companion?: CompanionConfig;
  reducedMotion?: boolean;
  renderDistance?: RenderDistancePreset;
  viewDistanceBlocks?: ViewDistanceBlocks | number;
  targetFps?: number;
  performanceTier?: PerformanceTier;
  initialWorldPlants?: Record<string, WorldPlantState>;
  initialWorldStorageById?: Record<string, ItemInstance[]>;
  cameraMode?: CameraMode;
  paused?: boolean;
  selectedToolTag?: BlockToolTag;
  selectedItemDefinitionId?: string;
  initialWorldBlockOverrides?: Record<string, WorldBlock | null>;
  onItemConsumed?: (definitionId: string) => void;
  onWorldBlockMutation?: (key: string, block: WorldBlock | null) => void;
  onWorldPlantMutation?: (key: string, plant: WorldPlantState | null) => void;
  onWorldStorageOpen?: (storageId: string) => void;
};

type ArcaneControl =
  | { type: "move"; x: number; y: number }
  | { type: "attack" }
  | { type: "interact" }
  | { type: "dash" }
  | { type: "use-item"; slot: number; itemInstanceId?: string; itemDefinitionId?: string }
  | { type: "set-camera-mode"; mode: CameraMode }
  | { type: "set-view-distance"; blocks: ViewDistanceBlocks };

function material(scene: Scene, name: string, color: string, glow = 0) {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = Color3.FromHexString(color);
  result.emissiveColor = Color3.FromHexString(color).scale(glow);
  result.specularColor = Color3.Black();
  return result;
}

function renderPresetForViewDistance(blocks: ViewDistanceBlocks): RenderDistancePreset {
  return blocks <= 15 ? "near" : blocks >= 40 ? "far" : "balanced";
}

function effectiveRenderDistancePreset(globalPreset: RenderDistancePreset | undefined, viewDistanceBlocks: ViewDistanceBlocks): RenderDistancePreset {
  const viewPreset = renderPresetForViewDistance(viewDistanceBlocks);
  if (globalPreset === "near" || viewPreset === "near") return "near";
  if (globalPreset === "far" && viewPreset === "far") return "far";
  return "balanced";
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement, options: GameOptions): Promise<GameHandle> {
  const scene = new Scene(engine);
  const mapDefinition = getMapDefinition(options.mapId);
  const mapAccent = mapDefinition?.accent ?? "#00d4ff";
  const regularMonster = mapDefinition?.content.monsters.find(monster => monster.role === "regular")?.name ?? "Glass Stalker";
  const eventBoss = mapDefinition?.eventBossName ?? mapDefinition?.content.monsters.find(monster => monster.role === "event-boss")?.name ?? "Void Reaper";
  const isMap001 = options.mapId === "obsidian-frontier";
  const isMap002 = options.mapId === "map-002-ashen-obsidian-plains";
  const isMap003 = options.mapId === "map-003-bioluminescent-caverns";
  const isMap004 = options.mapId === "map-004-crystalline-spires";
  const isMap005 = options.mapId === "map-005-corrosive-acid-swamps";
  const isMap006 = options.mapId === "map-006-magnetic-dunes";
  const isMap007 = options.mapId === "map-007-frozen-obsidian-crevasses";
  const isMap008 = options.mapId === "map-008-ancient-obsidian-ruins";
  const isMap009 = options.mapId === "map-009-overgrown-obsidian-jungle";
  const isMap010 = options.mapId === "map-010-void-infused-rift";
  const isMap011 = options.mapId === "map-011-cinder-caldera";
  const isMap012 = options.mapId === "map-012-obsidian-spire-shelf";
  const isMap013 = options.mapId === "map-013-brimstone-mire";
  const isMap014 = options.mapId === "map-014-magma-trench-bastion";
  const isMap015 = options.mapId === "map-015-heart-of-the-crucible";
  const sceneTreatment = getMapSceneTreatment(options.mapId);
  const visualProfile = getBiomeVisualProfile(options.mapId);
  const worldMetersPerUnit = 1;
  const worldRadius = Math.max(500, Math.round(mapDefinition?.radiusMeters ?? 500));
  let activePerformanceBudget: PerformanceBudget & { viewDistanceBlocks: ViewDistanceBlocks; targetFps: TargetFps } = getPerformanceBudget(options.performanceTier, options.viewDistanceBlocks, options.targetFps);
  let activeViewDistanceBlocks: ViewDistanceBlocks = activePerformanceBudget.viewDistanceBlocks;
  let renderDistance = getRenderDistanceConfig(options.renderDistance, activeViewDistanceBlocks, worldRadius);
  const overheadCamera = new ArcRotateCamera("arcane-overhead-camera", -Math.PI / 4, Math.PI / 3.65, 26, new Vector3(0, 0.5, 0), scene);
  const sideCamera = new ArcRotateCamera("arcane-side-camera", -Math.PI / 2.6, Math.PI / 2.75, 15, new Vector3(0, 1.5, 0), scene);
  const firstPersonCamera = new UniversalCamera("arcane-first-person-camera", new Vector3(0, 1.45, -0.2), scene);
  [overheadCamera, sideCamera, firstPersonCamera].forEach(candidate => { candidate.minZ = 0.05; candidate.maxZ = worldRadius * 3; });
  overheadCamera.lowerRadiusLimit = 8;
  overheadCamera.upperRadiusLimit = 50;
  overheadCamera.fov = 0.82;
  sideCamera.lowerRadiusLimit = 8;
  sideCamera.upperRadiusLimit = 32;
  sideCamera.fov = 0.86;
  firstPersonCamera.fov = 0.9;
  overheadCamera.attachControl(canvas, false);
  sideCamera.attachControl(canvas, false);
  firstPersonCamera.attachControl(canvas, false);
  overheadCamera.inputs.clear();
  sideCamera.inputs.clear();
  firstPersonCamera.inputs.clear();
  let activeCameraMode = normalizeCameraMode(options.cameraMode);
  let activeOrbitCamera = activeCameraMode === "side" ? sideCamera : overheadCamera;
  const setCameraMode = (mode: unknown) => {
    activeCameraMode = normalizeCameraMode(mode);
    const pose = getCameraModePose(activeCameraMode);
    if (activeCameraMode === "first-person") {
      scene.activeCamera = firstPersonCamera;
      firstPersonCamera.fov = pose.fov;
      return;
    }
    activeOrbitCamera = activeCameraMode === "side" ? sideCamera : overheadCamera;
    activeOrbitCamera.alpha = pose.alpha;
    activeOrbitCamera.beta = pose.beta;
    activeOrbitCamera.radius = pose.radius;
    activeOrbitCamera.fov = pose.fov;
    scene.activeCamera = activeOrbitCamera;
  };
  setCameraMode(activeCameraMode);
  let cameraPan = { x: 0, z: 0 };
  let panning = false;
  let lastPanPoint: { x: number; y: number } | null = null;
  const onCameraWheel = (event: WheelEvent) => {
    event.preventDefault();
    if (activeCameraMode === "first-person") {
      firstPersonCamera.fov = Math.max(0.65, Math.min(1.15, firstPersonCamera.fov + event.deltaY * 0.001));
      return;
    }
    activeOrbitCamera.radius = Math.max(8, Math.min(50, activeOrbitCamera.radius + event.deltaY * 0.018));
  };
  const onCameraPointerDown = (event: PointerEvent) => {
    if (activeCameraMode === "first-person" || (event.button !== 1 && !event.shiftKey)) return;
    panning = true;
    lastPanPoint = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  };
  const onCameraPointerMove = (event: PointerEvent) => {
    if (!panning || !lastPanPoint) return;
    const dx = event.clientX - lastPanPoint.x;
    const dy = event.clientY - lastPanPoint.y;
    lastPanPoint = { x: event.clientX, y: event.clientY };
    cameraPan = { x: Math.max(-8, Math.min(8, cameraPan.x - dx * 0.025)), z: Math.max(-8, Math.min(8, cameraPan.z + dy * 0.025)) };
  };
  const stopCameraPan = () => {
    panning = false;
    lastPanPoint = null;
  };
  canvas.addEventListener("wheel", onCameraWheel, { passive: false });
  canvas.addEventListener("pointerdown", onCameraPointerDown);
  canvas.addEventListener("pointermove", onCameraPointerMove);
  canvas.addEventListener("pointerup", stopCameraPan);
  canvas.addEventListener("pointercancel", stopCameraPan);

  const skyLight = new HemisphericLight("arcane-sky", new Vector3(0.3, 1, 0.2), scene);
  skyLight.intensity = sceneTreatment ? Math.min(0.9, sceneTreatment.lightIntensity + 0.15) : 0.88;
  const keyLight = new DirectionalLight("arcane-key", new Vector3(-0.6, -1, -0.35), scene);
  keyLight.position = new Vector3(18, 28, 12);
  keyLight.intensity = sceneTreatment?.lightIntensity ?? 1.25;
  if (sceneTreatment) {
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = Color3.FromHexString(sceneTreatment.fogColor);
    scene.fogDensity = sceneTreatment.fogDensity * 0.11;
    scene.clearColor = Color4.FromColor3(Color3.FromHexString(sceneTreatment.skyColor));
    skyLight.diffuse = Color3.FromHexString(sceneTreatment.lightColor);
    keyLight.diffuse = Color3.FromHexString(sceneTreatment.lightColor);
  }
  // Keep the pixel scene free of post-process dependencies. This avoids shader
  // compilation failures on constrained WebGL/mobile GPUs; emissive materials
  // still retain their readable base colors.

  const terrainTiles = 128;
  const terrainPoolDistance = getBlockRenderDistanceConfig(50, worldRadius);
  const ground = createPixelTerrainChunks(scene, terrainTiles, terrainTiles, 1, 16, visualProfile.terrainAssetIds, terrainPoolDistance);
  ground.position.y = -0.02;
  ground.metadata = { ...ground.metadata, mapId: options.mapId, biome: mapDefinition?.biome ?? "Obsidian frontier", accent: mapAccent, terrainFamily: visualProfile.terrainAssetIds };

  const blockWorld = createBlockWorld(options.mapId, 7341);
  let obsidianBlockWorld: BlockWorld = blockWorld;
  const moduleWorldBlockMeshes = new Map<string, ReturnType<typeof createPixelBlockMesh>>();
  const worldBlockRoot = new TransformNode("obsidian-block-world-root", scene);
  const worldPlantStates = new Map<string, WorldPlantState>(Object.entries(options.initialWorldPlants ?? {}));
  const worldPlantMeshes = new Map<string, ReturnType<typeof createPixelBlockMesh>>();
  const worldStorageMeshes = new Map<string, AbstractMesh>();
  const moduleWorldFarmPlotMeshes = new Map<string, ReturnType<typeof createPixelBlockMesh>>();
  const obsidianStorageAnchor = getWorldStorageAnchor(OBSIDIAN_STORAGE_ID, options.mapId);
  let obsidianWorldModule: Awaited<ReturnType<typeof loadObsidianWorldModule>> | undefined;
  if (isMap001) {
    try {
      obsidianWorldModule = await loadObsidianWorldModule();
      const renderableBlocks = obsidianWorldModule.blocks.filter(block => getBlockDefinition(block.blockId)?.kind !== "terrain");
      const generatedBlocks = applyWorldBlockOverrides(renderableBlocks, options.initialWorldBlockOverrides);
      obsidianBlockWorld = { mapId: options.mapId, seed: obsidianWorldModule.manifest.seed, blocks: new Map(generatedBlocks.map(block => [block.key, block])) };
    } catch {
      // The generated module is the preferred source. Keep a small deterministic fallback for first-run/cache failure.
      obsidianWorldModule = undefined;
    }
    if (!obsidianWorldModule) {
    const treeSeeds = [
      { x: -9, z: -8, seed: 1103 },
      { x: 9, z: -11, seed: 2217 },
      { x: -17, z: 9, seed: 3301 },
      { x: 15, z: 15, seed: 4419 },
    ];
    const rockSeeds = [
      { x: -5, z: 4, seed: 5107 },
      { x: 6, z: -6, seed: 6203 },
      { x: 20, z: 4, seed: 7309 },
      { x: -23, z: -4, seed: 8411 },
    ];
    treeSeeds.forEach(input => {
      const baseY = Math.floor(sampleObsidianTerrainHeight(input.x, input.z)) + 1;
      obsidianBlockWorld = mergeGeneratedGroup(obsidianBlockWorld, generateTreeBlocks({ ...input, baseY }));
    });
    rockSeeds.forEach(input => {
      const baseY = Math.floor(sampleObsidianTerrainHeight(input.x, input.z)) + 1;
      obsidianBlockWorld = mergeGeneratedGroup(obsidianBlockWorld, generateRockBlocks({ ...input, baseY }));
    });
    const cactusX = 4;
    const cactusZ = 5;
    obsidianBlockWorld = mergeGeneratedGroup(obsidianBlockWorld, generateBlockGroup({
      moduleId: "flora.plant.obsidian",
      groupId: "obsidian-thorn-cactus-1",
      seed: 9107,
      offsets: [{ x: cactusX, y: Math.floor(sampleObsidianTerrainHeight(cactusX, cactusZ)) + 1, z: cactusZ, blockId: "flora.obsidian.thorn-cactus" }],
    }));
    }
    listWorldBlocks(obsidianBlockWorld).forEach(block => {
      const mesh = createPixelBlockMesh(scene, block);
      mesh.parent = worldBlockRoot;
      mesh.isPickable = true;
      moduleWorldBlockMeshes.set(block.key, mesh);
    });
    if (obsidianStorageAnchor) {
      const chestY = Math.floor(sampleObsidianTerrainHeight(obsidianStorageAnchor.x, obsidianStorageAnchor.z));
      const chestKey = `${obsidianStorageAnchor.x}:${chestY}:${obsidianStorageAnchor.z}`;
      if (!getWorldBlock(obsidianBlockWorld, obsidianStorageAnchor.x, chestY, obsidianStorageAnchor.z)) {
        const chestBlock: WorldBlock = { key: chestKey, blockId: "storage.obsidian.chest", moduleId: "storage.obsidian", groupId: obsidianStorageAnchor.id, x: obsidianStorageAnchor.x, y: chestY, z: obsidianStorageAnchor.z, state: "intact", hitPoints: 4, maxHitPoints: 4, solid: true, seed: obsidianBlockWorld.seed };
        obsidianBlockWorld = setWorldBlock(obsidianBlockWorld, chestBlock);
        const chestMesh = createVoxelModel(scene, "landmark", { name: "obsidian-storage-chest", scale: 0.62 });
        chestMesh.parent = worldBlockRoot;
        chestMesh.position.set(obsidianStorageAnchor.x + 0.5, chestY + 0.46, obsidianStorageAnchor.z + 0.5);
        chestMesh.scaling.y = 0.72;
        chestMesh.isPickable = true;
        chestMesh.metadata = { ...chestBlock, storageId: obsidianStorageAnchor.id, interaction: "world-storage", collisionShape: "full", replaceable: false };
        worldStorageMeshes.set(obsidianStorageAnchor.id, chestMesh);
      }
    }
  }
  const updateWorldPlantMesh = (plant: WorldPlantState, now = Date.now()) => {
    const stage = getWorldPlantStage(plant, now);
    const mesh = worldPlantMeshes.get(plant.key);
    if (!mesh) return;
    const stageScale = stage === "seed" ? 0.18 : stage === "sprout" ? 0.34 : stage === "young" ? 0.58 : 0.82;
    mesh.scaling.set(stageScale, stageScale, stageScale);
    mesh.position.set(plant.x + 0.5, plant.y + stageScale / 2, plant.z + 0.5);
    mesh.metadata = { ...mesh.metadata, farming: true, plantId: plant.plantId, stage, soilId: plant.soilId, biome: plant.biome, collisionShape: "thin", replaceable: true };
  };
  if (isMap001) {
    for (const plot of OBSIDIAN_FARM_PLOTS) {
      const groundY = Math.floor(sampleObsidianTerrainHeight(plot.x, plot.z));
      const soilBlock: WorldBlock = { key: plot.key, blockId: "terrain.ash", moduleId: "farming.soil", groupId: "obsidian-farm-soil", x: plot.x, y: groundY, z: plot.z, state: "intact", hitPoints: 1, maxHitPoints: 1, solid: false, seed: obsidianBlockWorld.seed };
      const soilMesh = createPixelBlockMesh(scene, soilBlock);
      soilMesh.parent = worldBlockRoot;
      soilMesh.scaling.set(0.86, 0.08, 0.86);
      soilMesh.position.y = groundY + 1 - 0.04;
      soilMesh.isPickable = false;
      soilMesh.metadata = { ...soilMesh.metadata, farming: true, soilPlot: true, soilId: plot.soilId, biome: plot.biome, x: plot.x, z: plot.z, collisionShape: "none", replaceable: true };
      moduleWorldFarmPlotMeshes.set(plot.key, soilMesh);
    }
    for (const plant of Array.from(worldPlantStates.values())) {
      const meshBlock: WorldBlock = { key: plant.key, blockId: "flora.obsidian.sprout", moduleId: "farming.world", groupId: `world-plant:${plant.plantId}`, x: plant.x, y: plant.y, z: plant.z, state: "young", hitPoints: 1, maxHitPoints: 1, solid: false, seed: plant.seed };
      const mesh = createPixelBlockMesh(scene, meshBlock);
      mesh.parent = worldBlockRoot;
      mesh.isPickable = true;
      worldPlantMeshes.set(plant.key, mesh);
      updateWorldPlantMesh(plant);
    }
  }
  worldBlockRoot.metadata = { assetPack: "arcane-frontier-voxel-pixel", mapId: options.mapId, blockFirst: true, blockCount: moduleWorldBlockMeshes.size, plantCount: worldPlantMeshes.size, farmPlotCount: moduleWorldFarmPlotMeshes.size, replaceable: true, generatedModule: Boolean(obsidianWorldModule), worldHash: obsidianWorldModule?.manifest.worldHash, generatorSeed: obsidianWorldModule?.manifest.seed };


  const biomeDressing = createBiomeDressing(scene, visualProfile.decorations);
  biomeDressing.metadata = { ...biomeDressing.metadata, mapId: options.mapId, biome: mapDefinition?.biome ?? "Obsidian frontier" };
  const biomeResourceMeshes = biomeDressing.getChildMeshes().filter(mesh => mesh.metadata?.category === "resource");
  const terrainChunks = ground.getChildMeshes().filter(mesh => mesh.metadata?.chunk) as Array<AbstractMesh & { metadata: { chunk: { x: number; z: number } } }>;
  let lastTerrainVisibilityUpdate = -Infinity;
  const updateTerrainVisibility = (position: Vector3, now: number) => {
    if (now - lastTerrainVisibilityUpdate < 180) return;
    lastTerrainVisibilityUpdate = now;
    activePerformanceBudget = getPerformanceBudget(options.performanceTier, options.viewDistanceBlocks ?? activeViewDistanceBlocks, options.targetFps);
    activeViewDistanceBlocks = activePerformanceBudget.viewDistanceBlocks;
    const activeRenderDistance = getRenderDistanceConfig(options.renderDistance, activePerformanceBudget.viewDistanceBlocks, worldRadius);
    const visible = getStreamingChunkKeys({ positionX: position.x, positionZ: position.z, chunkWorldSize: 16, visibleRadiusMeters: activeRenderDistance.visibleRadiusMeters, mapRadiusMeters: worldRadius });
    updatePixelTerrainStream(ground, { x: position.x, z: position.z }, worldRadius);
    updateWorldObjectVisibility(position);
    terrainChunks.forEach(chunk => {
      const chunkInfo = chunk.metadata?.chunk as { x?: number; z?: number } | undefined;
      chunk.setEnabled(Boolean(chunk.metadata?.inMap && chunkInfo && visible.has(chunkKey(chunkInfo.x ?? 0, chunkInfo.z ?? 0))));
    });
    ground.metadata = { ...ground.metadata, visibleChunkCount: visible.size, totalChunkCount: terrainChunks.length, streamRadiusMeters: activeRenderDistance.visibleRadiusMeters, prefetchRadiusMeters: activeRenderDistance.prefetchRadiusMeters, renderDistancePreset: activeRenderDistance.preset, viewDistanceBlocks: activeRenderDistance.visibleRadiusBlocks ?? activeRenderDistance.visibleRadiusMeters, performanceTier: activePerformanceBudget.tier, targetFpsBudget: activePerformanceBudget.targetFps, mobSimulationRadiusMeters: activePerformanceBudget.mobSimulationRadiusMeters, animationRadiusMeters: activePerformanceBudget.animationRadiusMeters, physicsRadiusMeters: activePerformanceBudget.physicsRadiusMeters, maxParticleCount: activePerformanceBudget.maxParticleCount, shadowQuality: activePerformanceBudget.shadowQuality, lodPolicy: activePerformanceBudget.lodPolicy };
  };
  if (!isMap001) {
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      const distance = 18 + (i % 3) * 8;
      const pylon = createVoxelModel(scene, "landmark", { name: `pixel-frontier-marker-${i}`, scale: 0.62 + (i % 3) * 0.08 });
      pylon.position = new Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
      pylon.scaling.y *= 1.2 + (i % 2) * 0.2;
      const rune = createVoxelModel(scene, "resource", { name: `pixel-frontier-rune-${i}`, scale: 0.24 });
      rune.position = pylon.position.add(new Vector3(0, 1.2, 0));
    }
  }

  if (sceneTreatment && !isMap001) {
    const landmark = createVoxelModel(scene, "landmark", { name: `${mapDefinition?.id ?? "frontier"}-landmark-voxel`, scale: 1.5 });
    landmark.position = new Vector3(-9, 0, -23);
    landmark.metadata = { sceneIdentity: true, kind: sceneTreatment.landmarkKind, label: sceneTreatment.landmarkLabel, assetPack: "arcane-frontier-voxel-pixel" };
  }

  const player = new TransformNode("voxel-survivor", scene);
  const heroArt = await loadPackModel(scene, "survivor", { name: "survivor-pack-model", scale: 1.08 });
  heroArt.parent = player;
  heroArt.position.y = 0.04;
  const pet = new TransformNode("voxel-arcane-cyber-fox", scene);
  pet.position = new Vector3(-1.8, 0, -1.2);
  const petArt = await loadPackModel(scene, "companion", { name: "arcane-cyber-fox-pack-model", scale: 1.12 });
  petArt.parent = pet;
  petArt.position.y = 0.02;

  const applyCameraMode = (mode: CameraMode) => {
    setCameraMode(mode);
    heroArt.setEnabled(mode !== "first-person");
  };
  applyCameraMode(activeCameraMode);

  let worldBlockOverrides = normalizeWorldBlockOverrides(options.worldBlockOverrides);
  let activeBlockTool: BlockTool = "hand";
  const worldBlockMeshes = new Map<string, AbstractMesh>();
  const worldChestMeshes = new Map<string, AbstractMesh>();
  const blockMaterials = new Map<string, StandardMaterial>();
  let worldFarmState = normalizeWorldFarmState(options.worldFarmState);
  const worldFarmPlotMeshes = new Map<string, AbstractMesh>();
  const worldFarmCropMeshes = new Map<string, AbstractMesh>();
  const farmMaterials = new Map<string, StandardMaterial>();
  let lastFarmVisualUpdate = -Infinity;
  let activeItemInstanceId: string | undefined;
  let activeItemDefinitionId: string | undefined;
  const initialWorldBlocks: Array<{ coordinate: BlockCoordinate; moduleId: string }> = [
    { coordinate: { x: 0, y: 0, z: 2 }, moduleId: "obstacle.obsidian.slab" },
    { coordinate: { x: -1, y: 0, z: 2 }, moduleId: "obstacle.obsidian.slab" },
    { coordinate: { x: 1, y: 0, z: 2 }, moduleId: "obstacle.obsidian.slab" },
  ];
  const staticWorldBlocks = new Map(initialWorldBlocks.map(block => [blockKey(block.coordinate.x, block.coordinate.y, block.coordinate.z), block.moduleId]));
  const readSceneBlockAt = (coordinate: BlockCoordinate) => {
    const key = blockKey(coordinate.x, coordinate.y, coordinate.z);
    if (Object.prototype.hasOwnProperty.call(worldBlockOverrides, key)) return worldBlockOverrides[key];
    return staticWorldBlocks.get(key) ?? getWorldBlockAt(coordinate, worldBlockOverrides);
  };
  const getBlockMaterial = (moduleId: string) => {
    const existing = blockMaterials.get(moduleId);
    if (existing) return existing;
    const definition = getBlockDefinition(moduleId);
    const color = definition?.kind === "terrain" ? "#756052" : definition?.kind === "rock" ? "#626979" : definition?.kind === "ore" ? "#51b7c9" : definition?.kind === "log" ? "#78523a" : definition?.kind === "leaf" ? "#4d9b61" : definition?.kind === "plant" ? "#7bbf6a" : "#6e5aa8";
    const blockMaterial = material(scene, `block-material-${moduleId.replaceAll(".", "-")}`, color, 0.08);
    blockMaterials.set(moduleId, blockMaterial);
    return blockMaterial;
  };
  const syncWorldBlockMesh = (coordinate: BlockCoordinate, moduleId: string | null) => {
    const key = blockKey(coordinate.x, coordinate.y, coordinate.z);
    const current = worldBlockMeshes.get(key);
    if (!moduleId) {
      current?.setEnabled(false);
      return;
    }
    const definition = getBlockDefinition(moduleId);
    if (!definition) return;
    const partial = definition.collisionShape === "slab" || definition.collisionShape === "thin";
    const mesh = current ?? MeshBuilder.CreateBox(`obsidian-block-${key.replaceAll(":", "-")}`, { width: 0.92, depth: 0.92, height: partial ? 0.36 : 0.92 }, scene);
    mesh.position.set(coordinate.x, coordinate.y + (partial ? 0.18 : 0.46), coordinate.z);
    mesh.material = getBlockMaterial(moduleId);
    mesh.metadata = { ...(mesh.metadata ?? {}), mapId: options.mapId, blockModuleId: moduleId, coordinate, solid: definition.solid, partial, replaceable: true };
    mesh.setEnabled(true);
    worldBlockMeshes.set(key, mesh);
  };
  const syncWorldChestMesh = (chestId: string, coordinate: BlockCoordinate) => {
    const mesh = worldChestMeshes.get(chestId) ?? MeshBuilder.CreateBox(`world-chest-${chestId}`, { width: 0.76, depth: 0.62, height: 0.56 }, scene);
    mesh.position.set(coordinate.x, coordinate.y + 0.28, coordinate.z);
    mesh.material = getBlockMaterial(STORAGE_CHEST_MODULE_ID);
    mesh.metadata = { ...(mesh.metadata ?? {}), mapId: options.mapId, storageChestId: chestId, blockModuleId: STORAGE_CHEST_MODULE_ID, coordinate, solid: true, partial: true };
    mesh.setEnabled(true);
    worldChestMeshes.set(chestId, mesh);
  };
  const getFarmMaterial = (key: string, color: string) => {
    const existing = farmMaterials.get(key);
    if (existing) return existing;
    const farmMaterial = material(scene, `farm-material-${key}`, color, 0.05);
    farmMaterials.set(key, farmMaterial);
    return farmMaterial;
  };
  const updateWorldObjectVisibility = (position: Vector3) => {
    const input = { positionX: position.x, positionZ: position.z, viewDistanceBlocks: activePerformanceBudget.viewDistanceBlocks };
    const meshes = new Set<AbstractMesh>();
    [moduleWorldBlockMeshes, worldBlockMeshes, worldPlantMeshes, worldStorageMeshes, moduleWorldFarmPlotMeshes, worldChestMeshes, worldFarmPlotMeshes, worldFarmCropMeshes].forEach(registry => {
      registry.forEach(mesh => meshes.add(mesh));
    });
    meshes.forEach(mesh => {
      const metadata = (mesh.metadata ?? null) as RuntimeSpatialMetadata | null;
      mesh.setEnabled(shouldEnableRuntimeObject(metadata, input));
    });
  };

  const syncWorldFarmVisuals = (now = Date.now()) => {
    if (!isMap001 || now - lastFarmVisualUpdate < 220) return;
    lastFarmVisualUpdate = now;
    Object.values(worldFarmState).forEach(plot => {
      const plotMesh = worldFarmPlotMeshes.get(plot.id) ?? MeshBuilder.CreateBox(`farm-plot-${plot.id}`, { width: 0.9, depth: 0.9, height: 0.1 }, scene);
      plotMesh.position.set(plot.coordinate.x, 0.06, plot.coordinate.z);
      plotMesh.material = getFarmMaterial(`soil-${plot.soilId}`, plot.soilId === "ashen-volcanic" ? "#5a3c42" : "#8f6442");
      plotMesh.metadata = { ...(plotMesh.metadata ?? {}), mapId: options.mapId, farmPlotId: plot.id, x: plot.coordinate.x, z: plot.coordinate.z, soilId: plot.soilId, solid: false, partial: true };
      plotMesh.setEnabled(true);
      worldFarmPlotMeshes.set(plot.id, plotMesh);
      const stage = getWorldFarmCropStage(plot, now);
      const cropMesh = worldFarmCropMeshes.get(plot.id) ?? MeshBuilder.CreateBox(`farm-crop-${plot.id}`, { width: 0.42, depth: 0.42, height: 0.22 }, scene);
      cropMesh.position.set(plot.coordinate.x, stage === "empty" ? 0 : stage === "mature" ? 0.62 : stage === "young" ? 0.46 : stage === "sprout" ? 0.3 : 0.18, plot.coordinate.z);
      cropMesh.scaling.set(1, stage === "mature" ? 2.4 : stage === "young" ? 1.7 : stage === "sprout" ? 1.1 : 0.65, 1);
      cropMesh.material = getFarmMaterial(`stage-${stage}`, stage === "mature" ? "#b8df75" : stage === "young" ? "#66c27a" : stage === "sprout" ? "#4fa58a" : "#6b4e39");
      cropMesh.metadata = { ...(cropMesh.metadata ?? {}), mapId: options.mapId, farmPlotId: plot.id, x: plot.coordinate.x, z: plot.coordinate.z, farmStage: stage, solid: false, partial: true };
      cropMesh.setEnabled(stage !== "empty");
      worldFarmCropMeshes.set(plot.id, cropMesh);
    });
  };
  if (isMap001) {
    syncWorldChestMesh(STORAGE_CHEST_ID, { x: 0, y: 0, z: 4 });
    initialWorldBlocks.forEach(({ coordinate, moduleId }) => {
      const resolved = readSceneBlockAt(coordinate);
      if (resolved) syncWorldBlockMesh(coordinate, resolved);
    });
    Object.entries(worldBlockOverrides).forEach(([key, moduleId]) => {
      const [x, y, z] = key.split(":").map(Number);
      if ([x, y, z].every(Number.isFinite) && moduleId) syncWorldBlockMesh({ x, y, z }, moduleId);
    });
    syncWorldFarmVisuals();
  }

  const enemies: AbstractMesh[] = [];
  for (let index = 0; index < 7; index += 1) {
    const enemy = await loadPackModel(scene, "enemy", { name: `${regularMonster.toLowerCase().replaceAll(" ", "-")}-${index}`, scale: 1.12 });
    const angle = (Math.PI * 2 * index) / 7;
    enemy.position = new Vector3(Math.cos(angle) * (10 + index * 1.2), 0, Math.sin(angle) * (10 + index * 1.2));
    enemy.metadata = { health: 30, alive: true, encounterName: regularMonster, assetPack: "arcane-frontier-voxel-pixel", source: "glb-pack" };
    if ((isMap002 || isMap006 || isMap007 || isMap008 || isMap009 || isMap010) && index > 4) enemy.setEnabled(false);
    enemies.push(enemy);
  }

  const resources: AbstractMesh[] = [...biomeResourceMeshes, ...Array.from({ length: 10 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 10 + 0.3;
    const resource = createVoxelModel(scene, "resource", { name: `pixel-resource-${index}`, scale: 0.95 + (index % 3) * 0.12 });
    resource.position = new Vector3(Math.cos(angle) * (7 + (index % 4) * 2), 0, Math.sin(angle) * (7 + (index % 4) * 2));
    resource.metadata = { assetPack: "arcane-frontier-voxel-pixel", interaction: "harvest" };
    return resource;
  })];

  const boss = await loadPackModel(scene, "boss", { name: `${eventBoss.toLowerCase().replaceAll(" ", "-")}-event-boss`, scale: 1.3 });
  boss.position = new Vector3(0, 0, -18);
  boss.metadata = { health: 420, alive: true, encounterName: eventBoss, assetPack: "arcane-frontier-voxel-pixel" };
  boss.setEnabled(false);

  const koral = createVoxelModel(scene, "landmark", { name: "commander-koral-safe-zone", scale: 1.0 });
  koral.position = new Vector3(-5.5, 0, 2.8);
  koral.setEnabled(false);

  const specialAiNpc = createVoxelModel(scene, "landmark", { name: "obsidian-special-ai-npc", scale: 0.92 });
  specialAiNpc.position = new Vector3(5.2, 0, 4.8);
  specialAiNpc.metadata = { assetPack: "arcane-frontier-voxel-pixel", npcId: "obsidian-frontier:special-ai", interaction: "ai-dialogue", maxPerMap: 1 };
  specialAiNpc.setEnabled(isMap001);

  const monolith = createVoxelModel(scene, "landmark", { name: "crashed-leyline-monolith", scale: 1.0 });
  monolith.position = new Vector3(MAP001_MONOLITH.x, 0, MAP001_MONOLITH.z);
  monolith.setEnabled(false);

  const elite = await loadPackModel(scene, "elite", { name: "obsidian-golem-elite", scale: 1.28 });
  elite.position = new Vector3(9, 0, -10);
  elite.metadata = { health: 180, alive: true, encounterName: "Obsidian Golem", elite: true };
  elite.setEnabled(false);

  const distressPod = createVoxelModel(scene, "resource", { name: "distress-pod-signal", scale: 0.9 });
  distressPod.position = new Vector3(MAP001_DISTRESS_POD.x, 0, MAP001_DISTRESS_POD.z);
  distressPod.setEnabled(isMap001);

  const jax = createVoxelModel(scene, "landmark", { name: "scavenger-jax-camp", scale: 1.0 });
  jax.position = new Vector3(MAP002_JAX_CAMP.x, 0, MAP002_JAX_CAMP.z);
  jax.setEnabled(isMap002);

  const map002Elite = createVoxelModel(scene, "elite", { name: "obsidian-shell-golem-elite", scale: 1.28 });
  map002Elite.position = new Vector3(25, 0, 5);
  map002Elite.setEnabled(false);

  const pyroclasticAltar = createVoxelModel(scene, "resource", { name: "pyroclastic-altar", scale: 0.9 });
  pyroclasticAltar.position = new Vector3(MAP002_PYROCLASTIC_ALTAR.x, 0, MAP002_PYROCLASTIC_ALTAR.z);
  pyroclasticAltar.setEnabled(isMap002);

  const lyra = createVoxelModel(scene, "landmark", { name: "researcher-lyra-camp", scale: 1.0 });
  lyra.position = new Vector3(MAP003_LYRA_CAMP.x, 0, MAP003_LYRA_CAMP.z);
  lyra.setEnabled(isMap003);

  const map003Elite = createVoxelModel(scene, "elite", { name: "luminous-stalker-elite", scale: 1.28 });
  map003Elite.position = new Vector3(-18.4, 0, 24);
  map003Elite.setEnabled(false);

  const myceliumShrine = createVoxelModel(scene, "landmark", { name: "mycelium-empress-shrine", scale: 1.0 });
  myceliumShrine.position = new Vector3(MAP003_EMPRESS_SHRINE.x, 0, MAP003_EMPRESS_SHRINE.z);
  myceliumShrine.setEnabled(isMap003);

  const zephyr = createVoxelModel(scene, "landmark", { name: "cartographer-zephyr-camp", scale: 1.0 });
  zephyr.position = new Vector3(MAP004_ZEPHYR_CAMP.x, 0, MAP004_ZEPHYR_CAMP.z);
  zephyr.setEnabled(isMap004);
  const map004Elite = createVoxelModel(scene, "elite", { name: "prism-golem-elite", scale: 1.28 });
  map004Elite.position = new Vector3(-18, 0, 24);
  map004Elite.setEnabled(false);
  const resonanceDais = createVoxelModel(scene, "landmark", { name: "resonance-archon-dais", scale: 1.0 });
  resonanceDais.position = new Vector3(MAP004_ARCHON_DAIS.x, 0, MAP004_ARCHON_DAIS.z);
  resonanceDais.setEnabled(isMap004);

  const vane = createVoxelModel(scene, "landmark", { name: "alchemist-vane-shelter", scale: 1.0 });
  vane.position = new Vector3(MAP005_VANE_SHELTER.x, 0, MAP005_VANE_SHELTER.z);
  vane.setEnabled(isMap005);
  const map005Elite = createVoxelModel(scene, "elite", { name: "mire-lurker-elite", scale: 1.28 });
  map005Elite.position = new Vector3(-18, 0, 24);
  map005Elite.setEnabled(false);
  const hydraNest = createVoxelModel(scene, "landmark", { name: "toxic-hydra-nest", scale: 1.0 });
  hydraNest.position = new Vector3(MAP005_HYDRA_NEST.x, 0, MAP005_HYDRA_NEST.z);
  hydraNest.setEnabled(isMap005);

  const rusty = createVoxelModel(scene, "landmark", { name: "engineer-rusty-stabilizer", scale: 1.0 });
  rusty.position = new Vector3(MAP006_STABILIZER.x, 0, MAP006_STABILIZER.z);
  rusty.setEnabled(isMap006);
  const map006Elite = createVoxelModel(scene, "elite", { name: "ironclad-golem-elite", scale: 1.28 });
  map006Elite.position = new Vector3(-18, 0, 24);
  map006Elite.setEnabled(false);
  const colossusCore = createVoxelModel(scene, "resource", { name: "lodestone-colossus-core", scale: 0.9 });
  colossusCore.position = new Vector3(MAP006_COLOSSUS_CORE.x, 0, MAP006_COLOSSUS_CORE.z);
  colossusCore.setEnabled(isMap006);

  const scoutFrost = createVoxelModel(scene, "landmark", { name: "scout-frost-steam-vent", scale: 1.0 });
  scoutFrost.position = new Vector3(MAP007_STEAM_VENT.x, 0, MAP007_STEAM_VENT.z);
  scoutFrost.setEnabled(isMap007);
  const map007Elite = createVoxelModel(scene, "elite", { name: "cryo-beast-elite", scale: 1.28 });
  map007Elite.position = new Vector3(-18, 0, 24);
  map007Elite.setEnabled(false);
  const terrorRift = createVoxelModel(scene, "landmark", { name: "glacial-terror-rift", scale: 1.0 });
  terrorRift.position = new Vector3(MAP007_TERROR_RIFT.x, 0, MAP007_TERROR_RIFT.z);
  terrorRift.setEnabled(isMap007);

  const kael = createVoxelModel(scene, "landmark", { name: "historian-kael-rune-terminal", scale: 1.0 });
  kael.position = new Vector3(MAP008_RUNE_TERMINAL.x, 0, MAP008_RUNE_TERMINAL.z);
  kael.setEnabled(isMap008);
  const map008Elite = createVoxelModel(scene, "elite", { name: "ruin-guardian-elite", scale: 1.28 });
  map008Elite.position = new Vector3(-18, 0, 24);
  map008Elite.setEnabled(false);
  const matrixCore = createVoxelModel(scene, "resource", { name: "matrix-overlord-core", scale: 0.9 });
  matrixCore.position = new Vector3(MAP008_MATRIX_CORE.x, 0, MAP008_MATRIX_CORE.z);
  matrixCore.setEnabled(isMap008);

  const iris = createVoxelModel(scene, "landmark", { name: "botanist-iris-canopy-haven", scale: 1.0 });
  iris.position = new Vector3(MAP009_CANOPY_HAVEN.x, 0, MAP009_CANOPY_HAVEN.z);
  iris.setEnabled(isMap009);
  const map009Elite = createVoxelModel(scene, "elite", { name: "thornback-behemoth-elite", scale: 1.28 });
  map009Elite.position = new Vector3(-18, 0, 24);
  map009Elite.setEnabled(false);
  const hiveRoot = createVoxelModel(scene, "landmark", { name: "verdant-hive-root", scale: 1.0 });
  hiveRoot.position = new Vector3(MAP009_HIVE_ROOT.x, 0, MAP009_HIVE_ROOT.z);
  hiveRoot.setEnabled(isMap009);

  const voidWanderer = createVoxelModel(scene, "landmark", { name: "void-wanderer-stable-pylon", scale: 1.0 });
  voidWanderer.position = new Vector3(MAP010_STABLE_PYLON.x, 0, MAP010_STABLE_PYLON.z);
  voidWanderer.setEnabled(isMap010);
  const map010Elite = createVoxelModel(scene, "elite", { name: "rift-horror-elite", scale: 1.28 });
  map010Elite.position = new Vector3(-18, 0, 24);
  map010Elite.setEnabled(false);
  const singularityGate = createVoxelModel(scene, "landmark", { name: "void-singularity-gate", scale: 1.0 });
  singularityGate.position = new Vector3(MAP010_SINGULARITY_GATE.x, 0, MAP010_SINGULARITY_GATE.z);
  singularityGate.setEnabled(isMap010);

  const forgemasterVael = createVoxelModel(scene, "landmark", { name: "forgemaster-vael-camp", scale: 1.0 });
  forgemasterVael.position = new Vector3(MAP011_FORGE_CAMP.x, 0, MAP011_FORGE_CAMP.z);
  forgemasterVael.setEnabled(isMap011);
  const map011Elite = createVoxelModel(scene, "elite", { name: "pyroclast-brute-elite", scale: 1.28 });
  map011Elite.position = new Vector3(-18, 0, 24);
  map011Elite.setEnabled(false);
  const smelterArch = createVoxelModel(scene, "landmark", { name: "shattered-smelter-arch", scale: 1.0 });
  smelterArch.position = new Vector3(MAP011_SMELTER_ARCH.x, 0, MAP011_SMELTER_ARCH.z);
  smelterArch.setEnabled(isMap011);

  const scoutKaelen = createVoxelModel(scene, "landmark", { name: "scout-kaelen-overlook", scale: 1.0 });
  scoutKaelen.position = new Vector3(MAP012_SCOUT_OVERLOOK.x, 0, MAP012_SCOUT_OVERLOOK.z);
  scoutKaelen.setEnabled(isMap012);
  const map012Elite = createVoxelModel(scene, "elite", { name: "gale-talon-alpha-elite", scale: 1.28 });
  map012Elite.position = new Vector3(-18, 0, 24);
  map012Elite.setEnabled(false);
  const windMonolith = createVoxelModel(scene, "landmark", { name: "wind-monolith", scale: 1.0 });
  windMonolith.position = new Vector3(MAP012_WIND_MONOLITH.x, 0, MAP012_WIND_MONOLITH.z);
  windMonolith.setEnabled(isMap012);

  const alchemistTheron = createVoxelModel(scene, "landmark", { name: "alchemist-theron-boardwalk", scale: 1.0 });
  alchemistTheron.position = new Vector3(MAP013_THERON_BOARDWALK.x, 0, MAP013_THERON_BOARDWALK.z);
  alchemistTheron.setEnabled(isMap013);
  const map013Elite = createVoxelModel(scene, "elite", { name: "corrosive-aberration-elite", scale: 1.28 });
  map013Elite.position = new Vector3(-18, 0, 24);
  map013Elite.setEnabled(false);
  const sulfurFalls = createVoxelModel(scene, "resource", { name: "sulfur-falls", scale: 0.9 });
  sulfurFalls.position = new Vector3(MAP013_SULFUR_FALLS.x, 0, MAP013_SULFUR_FALLS.z);
  sulfurFalls.setEnabled(isMap013);

  const wardenSonya = createVoxelModel(scene, "landmark", { name: "warden-sonya-post", scale: 1.0 });
  wardenSonya.position = new Vector3(MAP014_WARDEN_POST.x, 0, MAP014_WARDEN_POST.z);
  wardenSonya.setEnabled(isMap014);
  const map014Elite = createVoxelModel(scene, "elite", { name: "magma-drake-sentinel-elite", scale: 1.28 });
  map014Elite.position = new Vector3(-18, 0, 24);
  map014Elite.setEnabled(false);
  const citadelGate = createVoxelModel(scene, "landmark", { name: "citadel-gate", scale: 1.0 });
  citadelGate.position = new Vector3(MAP014_CITADEL_GATE.x, 0, MAP014_CITADEL_GATE.z);
  citadelGate.setEnabled(isMap014);

  const forgeAvatar = createVoxelModel(scene, "landmark", { name: "forge-avatar-shrine", scale: 1.0 });
  forgeAvatar.position = new Vector3(MAP015_FORGE_SHRINE.x, 0, MAP015_FORGE_SHRINE.z);
  forgeAvatar.setEnabled(isMap015);
  const map015Elite = createVoxelModel(scene, "elite", { name: "dread-infernal-goliath-elite", scale: 1.28 });
  map015Elite.position = new Vector3(-18, 0, 24);
  map015Elite.setEnabled(false);
  const primalAnvil = createVoxelModel(scene, "resource", { name: "primal-anvil", scale: 0.9 });
  primalAnvil.position = new Vector3(MAP015_PRIMAL_ANVIL.x, 0, MAP015_PRIMAL_ANVIL.z);
  primalAnvil.setEnabled(isMap015);

  let move = { x: 0, y: 0 };
  let health = 100;
  let collected = 0;
  let attackPulse = 0;
  let dashPulse = 0;
  let lastEmit = 0;
  let lastDamage = 0;
  let map001Memory = initialMap001Encounter();
  let map002Memory = initialMap002Encounter();
  let map002HarvestedResources = 0;
  let map002DefeatedAshCrawlers = 0;
  let map003Memory = initialMap003Encounter();
  let map003HarvestedCrystals = 0;
  let map003DefeatedBeetles = 0;
  let map004Memory = initialMap004Encounter();
  let map004HarvestedShards = 0;
  let map004DefeatedGnats = 0;
  let map005Memory = initialMap005Encounter();
  let map005HarvestedLilies = 0;
  let map005DefeatedSlimes = 0;
  let map006Memory = initialMap006Encounter();
  let map006HarvestedMagnetite = 0;
  let map006DefeatedRays = 0;
  let map007Memory = initialMap007Encounter();
  let map007HarvestedCrystals = 0;
  let map007DefeatedWeavers = 0;
  let map008Memory = initialMap008Encounter();
  let map008HarvestedRelics = 0;
  let map008DefeatedDrones = 0;
  let map009Memory = initialMap009Encounter();
  let map009HarvestedBlooms = 0;
  let map009DefeatedStalkers = 0;
  let map010Memory = initialMap010Encounter();
  let map010HarvestedEssence = 0;
  let map010DefeatedLarvae = 0;
  let map011Memory = initialMap011Encounter();
  let map011HarvestedBloom = 0;
  let map011DefeatedCrawlers = 0;
  let map012Memory = initialMap012Encounter();
  let map012HarvestedGlass = 0;
  let map012DefeatedStalkers = 0;
  let map013Memory = initialMap013Encounter();
  let map013HarvestedCrust = 0;
  let map013DefeatedLeapers = 0;
  let map014Memory = initialMap014Encounter();
  let map014HarvestedMagma = 0;
  let map014DefeatedHounds = 0;
  let map015Memory = initialMap015Encounter();
  let map015HarvestedEmber = 0;
  let map015DefeatedMyrmidons = 0;
  let enemySpeedMultiplier = 1;
  let playerSpeedMultiplier = 1;
  let currentSpeed = 0;
  let stamina: StaminaState = createStaminaState();
  let pendingMapInteraction = false;
  const blockCollisionRadius = 0.28;
  const playerHeight = 1.7;
  const playerHazardLastAppliedAt = new Map<string, number>();
  const sampleGroundY = (position: Vector3) => isMap001 ? sampleObsidianTerrainHeight(Math.floor(position.x), Math.floor(position.z)) : 0;
  const canOccupyBlockWorld = (position: Vector3) => {
    if (!isMap001) return true;
    return getBlockingContacts(obsidianBlockWorld, {
      x: position.x,
      y: position.y,
      z: position.z,
      radius: blockCollisionRadius,
      height: playerHeight,
    }).length === 0;
  };
  const blockInteractionReach = 7.2;
  const findNearestWorldBlock = () => {
    if (!isMap001) return undefined;
    let nearest: { block: WorldBlock; distance: number } | undefined;
    for (const block of Array.from(obsidianBlockWorld.blocks.values())) {
      if (block.state === "broken" || block.blockId === "storage.obsidian.chest") continue;
      const center = new Vector3(block.x + 0.5, block.y + 0.5, block.z + 0.5);
      const distance = Vector3.Distance(player.position, center);
      if (distance > blockInteractionReach || (nearest && distance >= nearest.distance)) continue;
      nearest = { block, distance };
    }
    return nearest?.block;
  };
  const findNearestWorldStorage = (): WorldStorageAnchor | undefined => {
    if (!obsidianStorageAnchor) return undefined;
    const center = new Vector3(obsidianStorageAnchor.x + 0.5, player.position.y, obsidianStorageAnchor.z + 0.5);
    return Vector3.Distance(player.position, center) <= WORLD_STORAGE_INTERACTION_REACH ? obsidianStorageAnchor : undefined;
  };
  const tryOpenNearestWorldStorage = () => {
    const target = findNearestWorldStorage();
    if (!target) return false;
    options.onWorldStorageOpen?.(target.id);
    setMap001InteractionWarning(`เปิด ${target.label} แล้ว · storage แยกเฉพาะ map นี้`);
    return true;
  };
  const findNearestWorldPlant = () => {
    if (!isMap001) return undefined;
    let nearest: { plant: WorldPlantState; distance: number } | undefined;
    for (const plant of Array.from(worldPlantStates.values())) {
      const center = new Vector3(plant.x + 0.5, plant.y + 0.5, plant.z + 0.5);
      const distance = Vector3.Distance(player.position, center);
      if (distance > blockInteractionReach || (nearest && distance >= nearest.distance)) continue;
      nearest = { plant, distance };
    }
    return nearest?.plant;
  };
  const tryHarvestNearestWorldPlant = () => {
    const target = findNearestWorldPlant();
    if (!target) return false;
    const result = harvestWorldPlant(target, Date.now());
    if (!result.accepted) {
      setMap001InteractionWarning(result.reason);
      return true;
    }
    worldPlantStates.delete(target.key);
    options.onWorldPlantMutation?.(target.key, null);
    worldPlantMeshes.get(target.key)?.dispose();
    worldPlantMeshes.delete(target.key);
    worldBlockRoot.metadata = { ...worldBlockRoot.metadata, plantCount: worldPlantMeshes.size };
    const rewardDefinition = getItemDefinition(result.reward.definitionId);
    options.onReward?.({ definitionId: result.reward.definitionId, displayName: rewardDefinition?.name ?? result.reward.definitionId, eventId: result.reward.eventId, provenanceType: "harvest", quantity: result.reward.quantity });
    setMap001InteractionWarning(`เก็บ ${rewardDefinition?.name ?? result.reward.definitionId} ได้ ${result.reward.quantity} ชิ้น`);
    return true;
  };
  const tryPlantSelectedWorldSeed = () => {
    if (!isMap001) return false;
    const selectedDefinition = getItemDefinition(options.selectedItemDefinitionId ?? "");
    if (selectedDefinition?.category !== "seed") return false;
    const candidate = OBSIDIAN_FARM_PLOTS
      .map(plot => ({ ...plot, y: Math.floor(sampleObsidianTerrainHeight(plot.x, plot.z)) + 1 }))
      .filter(plot => !worldPlantStates.has(plot.key))
      .sort((left, right) => Vector3.Distance(player.position, new Vector3(left.x + 0.5, left.y + 0.5, left.z + 0.5)) - Vector3.Distance(player.position, new Vector3(right.x + 0.5, right.y + 0.5, right.z + 0.5)))
      .find(plot => Vector3.Distance(player.position, new Vector3(plot.x + 0.5, plot.y + 0.5, plot.z + 0.5)) <= blockInteractionReach);
    if (!candidate) {
      setMap001InteractionWarning("ไม่มีแปลงว่างใกล้พอ · เดินไปที่แปลงฟาร์มข้าง spawn ก่อน");
      return true;
    }
    const plot: ObsidianFarmPlot = candidate;
    const result = plantWorldSeed({ seedItemId: selectedDefinition.id, plot, occupied: worldPlantStates.has(plot.key), now: Date.now(), seed: obsidianBlockWorld.seed });
    if (!result.accepted) {
      setMap001InteractionWarning(result.reason);
      return true;
    }
    worldPlantStates.set(plot.key, result.state);
    const meshBlock: WorldBlock = { key: result.state.key, blockId: "flora.obsidian.sprout", moduleId: "farming.world", groupId: `world-plant:${result.state.plantId}`, x: result.state.x, y: result.state.y, z: result.state.z, state: "sapling", hitPoints: 1, maxHitPoints: 1, solid: false, seed: result.state.seed };
    const mesh = createPixelBlockMesh(scene, meshBlock);
    mesh.parent = worldBlockRoot;
    mesh.isPickable = true;
    worldPlantMeshes.set(result.state.key, mesh);
    updateWorldPlantMesh(result.state);
    worldBlockRoot.metadata = { ...worldBlockRoot.metadata, plantCount: worldPlantMeshes.size };
    options.onWorldPlantMutation?.(result.state.key, result.state);
    options.onItemConsumed?.(selectedDefinition.id);
    setMap001InteractionWarning(`ปลูก ${result.plant.displayName} แล้ว · ใช้ดิน ${plot.soilId}`);
    return true;
  };
  const tryBreakNearestWorldBlock = () => {
    const target = findNearestWorldBlock();
    if (!target) return false;
    const result = resolveBlockBreak(target, options.selectedToolTag);
    if (!result.accepted || !result.removed) return false;
    const removal = removeWorldBlock(obsidianBlockWorld, target.x, target.y, target.z);
    if (!removal.removed) return false;
    obsidianBlockWorld = removal.world;
    options.onWorldBlockMutation?.(target.key, null);
    const targetMesh = worldBlockMeshes.get(target.key);
    targetMesh?.dispose();
    worldBlockMeshes.delete(target.key);
    worldBlockRoot.metadata = { ...worldBlockRoot.metadata, blockCount: worldBlockMeshes.size };
    setMap001InteractionWarning(`${result.message} · ${target.blockId}`);
    if (result.dropKind === "block-item" && result.dropDefinitionId) {
      const dropDefinition = getItemDefinition(result.dropDefinitionId);
      options.onReward?.({
        definitionId: result.dropDefinitionId,
        displayName: dropDefinition?.name ?? result.dropDefinitionId,
        eventId: `block-drop-${options.mapId}-${target.key}-${target.seed}`,
        provenanceType: "drop",
        quantity: result.dropQuantity,
      });
    }
    return true;
  };
  const terrainSupport = (x: number, y: number, z: number) => isMap001 && y === Math.floor(sampleObsidianTerrainHeight(x, z));
  const tryPlaceSelectedWorldBlock = () => {
    if (!isMap001) return false;
    const selectedDefinition = getItemDefinition(options.selectedItemDefinitionId ?? "");
    const placementBlockId = selectedDefinition?.placementBlockId;
    if (!placementBlockId) {
        setMap001InteractionWarning("เลือก block item ใน hotbar ก่อนวางบล็อก");
      return false;
    }
    const facingX = Math.round(Math.sin(player.rotation.y));
    const facingZ = Math.round(Math.cos(player.rotation.y));
    const playerX = Math.floor(player.position.x);
    const playerZ = Math.floor(player.position.z);
    const groundY = Math.floor(sampleGroundY(player.position));
    const candidates = [
      { x: playerX + (facingX || 1), y: groundY, z: playerZ + (facingZ || 0) },
      { x: playerX + (facingX || 1), y: groundY + 1, z: playerZ + (facingZ || 0) },
      { x: playerX, y: groundY + 1, z: playerZ },
    ];
    const target = candidates.find(candidate => canPlaceBlock(obsidianBlockWorld, placementBlockId, candidate.x, candidate.y, candidate.z, terrainSupport).accepted);
    if (!target) {
      setMap001InteractionWarning("วางไม่ได้: ช่องนี้ถูกใช้หรือไม่มีบล็อกพยุง");
      return false;
    }
    const definition = getBlockDefinition(placementBlockId);
    if (!definition) return false;
    const maxHitPoints = Math.max(1, definition.hardness);
    const block: WorldBlock = {
      key: `${target.x}:${target.y}:${target.z}`,
      blockId: placementBlockId,
      moduleId: "player.placed",
      groupId: `placed:${Date.now()}`,
      x: target.x,
      y: target.y,
      z: target.z,
      state: "intact",
      hitPoints: maxHitPoints,
      maxHitPoints,
      solid: definition.solid,
      seed: obsidianBlockWorld.seed,
    };
    obsidianBlockWorld = setWorldBlock(obsidianBlockWorld, block);
    options.onWorldBlockMutation?.(block.key, block);
    const mesh = createPixelBlockMesh(scene, block);
    mesh.parent = worldBlockRoot;
    mesh.isPickable = true;
    worldBlockMeshes.set(block.key, mesh);
    worldBlockRoot.metadata = { ...worldBlockRoot.metadata, blockCount: worldBlockMeshes.size };
    options.onItemConsumed?.(selectedDefinition.id);
    setMap001InteractionWarning(`วาง ${selectedDefinition.name} แล้ว · ช่อง ${block.key}`);
    return true;
  };
  let map001Warning: string | undefined;
  let map001InteractionWarningUntil = 0;
  const setMap001InteractionWarning = (message: string) => {
    map001Warning = message;
    map001InteractionWarningUntil = performance.now() + 6000;
  };
  let map002Warning: string | undefined;
  let map003Warning: string | undefined;
  let map004Warning: string | undefined;
  let map005Warning: string | undefined;
  let map006Warning: string | undefined;
  let map007Warning: string | undefined;
  let map008Warning: string | undefined;
  let map009Warning: string | undefined;
  let map010Warning: string | undefined;
  let map011Warning: string | undefined;
  let map012Warning: string | undefined;
  let map013Warning: string | undefined;
  let map014Warning: string | undefined;
  let map015Warning: string | undefined;

  const nearestWorldBlock = () => {
    let nearest: { mesh: AbstractMesh; coordinate: BlockCoordinate; moduleId: string; distance: number } | undefined;
    worldBlockMeshes.forEach(mesh => {
      if (!mesh.isEnabled() || mesh.metadata?.mapId !== options.mapId) return;
      const moduleId = mesh.metadata?.blockModuleId as string | undefined;
      const coordinate = mesh.metadata?.coordinate as BlockCoordinate | undefined;
      if (!moduleId || !coordinate) return;
      const distance = Vector3.Distance(mesh.position, player.position);
      if (distance <= 3.8 && (!nearest || distance < nearest.distance)) nearest = { mesh, coordinate, moduleId, distance };
    });
    return nearest;
  };

  const nearestWorldChest = () => {
    let nearest: { chestId: string; distance: number } | undefined;
    worldChestMeshes.forEach(mesh => {
      if (!mesh.isEnabled() || mesh.metadata?.mapId !== options.mapId) return;
      const chestId = mesh.metadata?.storageChestId as string | undefined;
      if (!chestId) return;
      const distance = Vector3.Distance(mesh.position, player.position);
      if (distance <= 3.8 && (!nearest || distance < nearest.distance)) nearest = { chestId, distance };
    });
    return nearest;
  };

  const nearestWorldFarmPlot = () => {
    let nearest: { plotId: string; distance: number } | undefined;
    Object.values(worldFarmState).forEach(plot => {
      const distance = Vector3.Distance(new Vector3(plot.coordinate.x, 0, plot.coordinate.z), player.position);
      if (distance <= 6 && (!nearest || distance < nearest.distance)) nearest = { plotId: plot.id, distance };
    });
    return nearest;
  };

  const applyFarmAction = (event: FarmActionEvent) => {
    const accepted = options.onFarmAction?.(event) ?? true;
    if (!accepted) return false;
    worldFarmState = event.state;
    return true;
  };

  const plantNearestWorldFarmPlot = () => {
    if (!isMap001 || !activeItemInstanceId || !activeItemDefinitionId || getItemDefinition(activeItemDefinitionId)?.category !== "seed") return false;
    const target = nearestWorldFarmPlot();
    if (!target) {
      options.onFarmMessage?.("เดินเข้าใกล้แปลงดินเพื่อปลูกหรือเก็บเกี่ยว");
      return false;
    }
    const plot = worldFarmState[target.plotId];
    if (!plot) return false;
    const plan = planPlantWorldSeed({ mapId: options.mapId, state: worldFarmState, plotId: plot.id, seedDefinitionId: activeItemDefinitionId, seedInstanceId: activeItemInstanceId });
    if (!plan.accepted || !plan.plot || !plan.plant) {
      options.onFarmMessage?.(plan.reason ?? plan.message);
      return false;
    }
    return applyFarmAction({ type: "plant", mapId: options.mapId, plotId: plot.id, state: plan.state, coordinate: plot.coordinate, seedInstanceId: activeItemInstanceId, seedDefinitionId: activeItemDefinitionId, message: plan.message });
  };

  const harvestNearestWorldFarmPlot = () => {
    if (!isMap001) return false;
    const target = nearestWorldFarmPlot();
    if (!target) {
      options.onFarmMessage?.("เดินเข้าใกล้แปลงดินเพื่อเก็บเกี่ยว");
      return false;
    }
    const plan = planHarvestWorldPlant({ mapId: options.mapId, state: worldFarmState, plotId: target.plotId });
    if (!plan.accepted || !plan.plot || !plan.reward) {
      if (plan.reason && worldFarmState[target.plotId]?.plantId) options.onFarmMessage?.(plan.reason);
      return false;
    }
    return applyFarmAction({ type: "harvest", mapId: options.mapId, plotId: target.plotId, state: plan.state, coordinate: plan.plot.coordinate, reward: plan.reward, effect: plan.effect, message: plan.message });
  };

  const applyBlockAction = (event: BlockActionEvent) => {
    const accepted = options.onBlockAction?.(event) ?? true;
    if (!accepted) return false;
    worldBlockOverrides = event.overrides;
    syncWorldBlockMesh(event.coordinate, event.type === "break" ? null : event.moduleId);
    return true;
  };

  const breakNearestWorldBlock = () => {
    if (!isMap001) return false;
    const target = nearestWorldBlock();
    if (!target) return false;
    const result = breakBlockAt({ moduleId: target.moduleId, coordinate: target.coordinate, tool: activeBlockTool, overrides: worldBlockOverrides });
    if (!result.removed) return false;
    const accepted = applyBlockAction({
      type: "break",
      mapId: options.mapId,
      coordinate: target.coordinate,
      moduleId: target.moduleId,
      droppedDefinitionId: result.dropDefinitionId,
      overrides: result.overrides,
      message: result.message,
    });
    if (accepted && result.dropDefinitionId) {
      const item = getItemDefinition(result.dropDefinitionId);
      options.onReward?.({ definitionId: result.dropDefinitionId, displayName: item?.name ?? result.dropDefinitionId, eventId: `block-break-${options.mapId}-${blockKey(target.coordinate.x, target.coordinate.y, target.coordinate.z)}`, provenanceType: "drop" });
    }
    return accepted;
  };

  const placeSelectedWorldBlock = (itemInstanceId?: string, itemDefinitionId?: string) => {
    if (!isMap001 || !itemInstanceId || !itemDefinitionId || !getPlaceableBlockModule(itemDefinitionId)) return false;
    const anchor = nearestWorldBlock();
    const coordinate = anchor
      ? { x: anchor.coordinate.x, y: anchor.coordinate.y + 1, z: anchor.coordinate.z }
      : { x: Math.round(player.position.x), y: 1, z: Math.round(player.position.z + 1) };
    const existingModuleId = getWorldBlockAt(coordinate, worldBlockOverrides);
    const supportModuleId = getAdjacentSupportModule(coordinate, worldBlockOverrides) ?? (anchor?.moduleId ?? null);
    const placement = placeBlockAt({ moduleId: "player.placed", coordinate, supportModuleId, existingModuleId, overrides: worldBlockOverrides });
    if (!placement.accepted) return false;
    return applyBlockAction({
      type: "place",
      mapId: options.mapId,
      coordinate,
      moduleId: "player.placed",
      itemInstanceId,
      itemDefinitionId,
      overrides: placement.overrides,
      message: "วางบล็อกสำเร็จ · ใช้บล็อกไป 1 ชิ้น",
    });
  };

  const handleControl = (event: Event) => {
    if (options.paused) return;
    const control = (event as CustomEvent<ArcaneControl>).detail;
    if (!control) return;
    if (control.type === "move") move = { x: control.x, y: control.y };
    if (control.type === "set-camera-mode") applyCameraMode(control.mode);
    if (control.type === "set-view-distance") {
      activePerformanceBudget = getPerformanceBudget(options.performanceTier, control.blocks, options.targetFps);
      activeViewDistanceBlocks = activePerformanceBudget.viewDistanceBlocks;
      renderDistance = getRenderDistanceConfig(effectiveRenderDistancePreset(options.renderDistance, activeViewDistanceBlocks), activeViewDistanceBlocks, worldRadius);
      updateTerrainVisibility(player.position, performance.now());
    }
    if (control.type === "attack") {
      const result = spendStamina(stamina, "attack");
      if (result.accepted) {
        stamina = result.state;
        attackPulse = 0.32;
      }
    }
    if (control.type === "use-item") {
      activeItemInstanceId = control.itemInstanceId;
      activeItemDefinitionId = control.itemDefinitionId;
      const selectedTool = control.itemDefinitionId ? getBlockToolForItem(control.itemDefinitionId) : null;
      activeBlockTool = selectedTool ?? "hand";
      if (control.itemDefinitionId) options.onBlockMessage?.(selectedTool ? `เลือกเครื่องมือ: ${selectedTool}` : getItemDefinition(control.itemDefinitionId)?.category === "seed" ? "เลือกเมล็ด · กด E ใกล้แปลงเพื่อปลูก" : "เลือกมือเปล่า");
      if (tryPlantSelectedWorldSeed()) return;
      if (control.itemInstanceId && control.itemDefinitionId && getPlaceableBlockModule(control.itemDefinitionId)) {
        const placed = placeSelectedWorldBlock(control.itemInstanceId, control.itemDefinitionId);
        if (!placed) options.onBlockMessage?.("วางไม่ได้: ต้องวางบนบล็อกทึบและตำแหน่งต้องว่าง");
      }
      return;
    }
    if (control.type === "dash" && canSpendStamina(stamina, "dash")) {
      stamina = spendStamina(stamina, "dash").state;
      dashPulse = 0.25;
    }
    if (control.type === "interact") {
      const chest = isMap001 ? nearestWorldChest() : undefined;
      if (chest) {
        options.onChestOpen?.(chest.chestId);
        pendingMapInteraction = false;
        return;
      }
      if (harvestNearestWorldFarmPlot()) {
        pendingMapInteraction = false;
        return;
      }
      if (plantNearestWorldFarmPlot()) {
        pendingMapInteraction = false;
        return;
      }
      if (breakNearestWorldBlock()) {
        pendingMapInteraction = false;
        return;
      }
      pendingMapInteraction = true;
      if (tryOpenNearestWorldStorage()) return;
      if (tryHarvestNearestWorldPlant()) return;
      if (tryBreakNearestWorldBlock()) return;
      resources.forEach(resource => {
        const lootReach = 2.8 + Math.max(0, (options.companion?.lootRadius ?? 2) - 2) * 0.16;
        if (resource.isEnabled() && Vector3.Distance(resource.position, player.position) < lootReach) {
          resource.setEnabled(false);
          collected += 1;
          if (isMap001) {
            options.onReward?.({ definitionId: "material-003", displayName: "Ley Crystal", eventId: `map001-ley-crystal-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap002) {
            map002HarvestedResources += 1;
            options.onReward?.({ definitionId: "material-007", displayName: "Ember Ore", eventId: `map002-ember-ore-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap003) {
            map003HarvestedCrystals += 1;
            options.onReward?.({ definitionId: "material-003", displayName: "Glow Crystal", eventId: `map003-glow-crystal-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap004) {
            map004HarvestedShards += 1;
            options.onReward?.({ definitionId: "material-003", displayName: "Resonance Shard", eventId: `map004-resonance-shard-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap005) {
            map005HarvestedLilies += 1;
            options.onReward?.({ definitionId: "material-005", displayName: "Toxic Lily", eventId: `map005-toxic-lily-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap006) {
            map006HarvestedMagnetite += 1;
            options.onReward?.({ definitionId: "material-006", displayName: "Magnetite Sand", eventId: `map006-magnetite-sand-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap007) {
            map007HarvestedCrystals += 1;
            options.onReward?.({ definitionId: "material-007", displayName: "Cryo Crystal", eventId: `map007-cryo-crystal-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap008) {
            map008HarvestedRelics += 1;
            options.onReward?.({ definitionId: "material-008", displayName: "Ancient Relic", eventId: `map008-ancient-relic-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap009) {
            map009HarvestedBlooms += 1;
            options.onReward?.({ definitionId: "material-009", displayName: "Alien Bloom", eventId: `map009-alien-bloom-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap010) {
            map010HarvestedEssence += 1;
            options.onReward?.({ definitionId: "material-010", displayName: "Void Essence", eventId: `map010-void-essence-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap011) {
            map011HarvestedBloom += 1;
            options.onReward?.({ definitionId: "material-011", displayName: "Cinder Bloom", eventId: `map011-cinder-bloom-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap012) {
            map012HarvestedGlass += 1;
            options.onReward?.({ definitionId: "material-012", displayName: "Razor Glass", eventId: `map012-razor-glass-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap013) {
            map013HarvestedCrust += 1;
            options.onReward?.({ definitionId: "material-013", displayName: "Sulfur Crust", eventId: `map013-sulfur-crust-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap014) {
            map014HarvestedMagma += 1;
            options.onReward?.({ definitionId: "material-014", displayName: "Hardened Magma", eventId: `map014-hardened-magma-${resource.name}`, provenanceType: "harvest" });
          }
          if (isMap015) {
            map015HarvestedEmber += 1;
            options.onReward?.({ definitionId: "material-015", displayName: "Primal Ember", eventId: `map015-primal-ember-${resource.name}`, provenanceType: "harvest" });
          }
        }
      });
    }
  };

  const keyState = new Set<string>();
  const onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    keyState.add(key);
    if (event.repeat) return;
    if (key === " ") {
      event.preventDefault();
      handleControl(new CustomEvent("arcane-control", { detail: { type: "attack" } }));
    } else if (key === "shift") {
      event.preventDefault();
      handleControl(new CustomEvent("arcane-control", { detail: { type: "dash" } }));
    } else if (key === "e") {
      event.preventDefault();
      handleControl(new CustomEvent("arcane-control", { detail: { type: "interact" } }));
    }
  };
  const onKeyUp = (event: KeyboardEvent) => keyState.delete(event.key.toLowerCase());
  window.addEventListener("arcane-control", handleControl);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  scene.onBeforeRenderObservable.add(() => {
    const requestedCameraMode = normalizeCameraMode(options.cameraMode);
    if (requestedCameraMode !== activeCameraMode) {
      setCameraMode(requestedCameraMode);
      cameraPan = { x: 0, z: 0 };
    }
    if (options.paused) return;
    if (isMap001) {
      const now = Date.now();
      for (const plant of Array.from(worldPlantStates.values())) {
        const distance = Vector3.Distance(player.position, new Vector3(plant.x + 0.5, plant.y + 0.5, plant.z + 0.5));
        if (distance <= activePerformanceBudget.animationRadiusMeters) updateWorldPlantMesh(plant, now);
      }
    }
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const keyboardX = (keyState.has("d") ? 1 : 0) - (keyState.has("a") ? 1 : 0);
    const keyboardY = (keyState.has("w") ? 1 : 0) - (keyState.has("s") ? 1 : 0);
    const movementInputX = move.x + keyboardX;
    const movementInputY = move.y - keyboardY;
    const movement = cameraRelativeMovement(activeCameraMode, movementInputX, movementInputY, player.rotation.y);
    const inputMagnitude = Math.min(1, movement.length());
    const isMoving = inputMagnitude > 0.08;
    if (isMoving && inputMagnitude > 0.72 && dashPulse <= 0) {
      stamina = spendStamina(stamina, "sprint", dt).state;
    } else {
      stamina = regenerateStamina(stamina, dt, !isMoving);
    }
    const sprintPenalty = stamina.exhausted && inputMagnitude > 0.72 && dashPulse <= 0 ? 0.5 : 1;
    const targetSpeed = dashPulse > 0 ? 12.4 : inputMagnitude > 0.72 ? 4.8 * sprintPenalty : 3.35;
    currentSpeed += (isMoving ? targetSpeed * playerSpeedMultiplier : 0 - currentSpeed) * Math.min(1, dt * (isMoving ? 10 : 14));
    if (isMoving) {
      movement.normalize();
      const nextPosition = player.position.add(movement.scale(currentSpeed * dt));
      nextPosition.x = Math.max(-worldRadius, Math.min(worldRadius, nextPosition.x));
      nextPosition.z = Math.max(-worldRadius, Math.min(worldRadius, nextPosition.z));
      nextPosition.y = sampleGroundY(nextPosition);
      if (canOccupyBlockWorld(nextPosition)) player.position.copyFrom(nextPosition);
    } else {
      player.position.y = sampleGroundY(player.position);
    }
    if (isMoving) player.rotation.y = Math.atan2(movement.x, movement.z);
    syncWorldFarmVisuals(Date.now());
    updateTerrainVisibility(player.position, performance.now());
    if (activeCameraMode === "first-person") {
      const lookDirection = new Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
      firstPersonCamera.position.copyFrom(player.position.add(new Vector3(0, 1.45, 0)).add(lookDirection.scale(0.12)));
      firstPersonCamera.rotation.set(0, player.rotation.y, 0);
    } else {
      const targetHeight = activeCameraMode === "side" ? 1.35 : 0.5;
      const cameraTarget = new Vector3(player.position.x + cameraPan.x, targetHeight, player.position.z + cameraPan.z);
      activeOrbitCamera.target = Vector3.Lerp(activeOrbitCamera.target, cameraTarget, Math.min(1, dt * 5.4));
    }
    dashPulse = Math.max(0, dashPulse - dt);
    attackPulse = Math.max(0, attackPulse - dt);
    heroArt.setEnabled(activeCameraMode !== "first-person");
    const heroScale = 1.08 * (1 + Math.sin((0.32 - attackPulse) * 18) * attackPulse * 0.24);
    heroArt.scaling.setAll(heroScale);
    const movementState = dashPulse > 0 ? "dash" : !isMoving ? "idle" : currentSpeed > 4.25 ? "run" : "walk";
    const bobAmplitude = movementState === "run" ? 0.08 : movementState === "walk" ? 0.045 : 0.018;
    const now = performance.now();
    heroArt.position.y = 0.04 + (options.reducedMotion ? 0 : Math.sin(now / (movementState === "run" ? 125 : 220)) * bobAmplitude);
    const gait = options.reducedMotion || !isMoving ? 0 : Math.sin(now / (movementState === "run" ? 105 : 175)) * (movementState === "run" ? 0.075 : 0.04);
    heroArt.rotation.z = gait;
    heroArt.rotation.x = gait * 0.35;
    const companion = options.companion ?? { following: true, lootRadius: 2, resourceYieldMultiplier: 1, damageMitigation: 0 };
    const companionRuntime = resolveCompanionRuntime({ pet: { x: pet.position.x, z: pet.position.z }, player: { x: player.position.x, z: player.position.z }, following: companion.following, playerMoving: isMoving, reducedMotion: options.reducedMotion, deltaSeconds: dt });
    pet.position.x = companionRuntime.position.x;
    pet.position.z = companionRuntime.position.z;
    pet.position.y = companionRuntime.state === "resting" ? 0 : options.reducedMotion ? 0 : Math.sin(now / (movementState === "run" ? 210 : 350)) * 0.12;
    if (isMap001) specialAiNpc.position.y = sampleGroundY(specialAiNpc.position);
    pet.rotation.z = options.reducedMotion || !isMoving ? 0 : Math.sin(now / 180) * 0.045;
    pet.setEnabled(companion.following || companionRuntime.state !== "resting");

    const activeRepellentAuras = isMap001 ? getActiveRepellentAuras(Object.fromEntries(worldPlantStates), Date.now()) : [];
    let repelledEnemyCount = 0;
    enemies.forEach((enemy, index) => {
      if (!enemy.metadata?.alive || enemy.metadata?.visibilityLocked) return;
      const distanceToPlayer = Vector3.Distance(player.position, enemy.position);
      if (distanceToPlayer > activePerformanceBudget.mobSimulationRadiusMeters) {
        enemy.setEnabled(false);
        enemy.metadata = { ...enemy.metadata, sleeping: true };
        return;
      }
      if (enemy.metadata?.sleeping) {
        enemy.setEnabled(true);
        enemy.metadata = { ...enemy.metadata, sleeping: false };
      }
      const repellent = isMap001 ? getRepellentInfluence({ x: enemy.position.x, z: enemy.position.z }, activeRepellentAuras) : { repelled: false as const };
      if (repellent.repelled) {
        const away = enemy.position.subtract(new Vector3(repellent.aura.x, enemy.position.y, repellent.aura.z));
        if (away.lengthSquared() < 0.0001) away.set(1, 0, 0);
        away.y = 0;
        away.normalize();
        enemy.position.addInPlace(away.scale(dt * (1.4 + repellent.aura.power * 0.12)));
        enemy.position.y = sampleGroundY(enemy.position);
        enemy.metadata = { ...enemy.metadata, repelled: true };
        repelledEnemyCount += 1;
        return;
      }
      if (enemy.metadata?.repelled) enemy.metadata = { ...enemy.metadata, repelled: false };
      if (isMap006 && Vector3.Distance(player.position, rusty.position) <= MAP006_STABILIZER.radius) return;
      const delta = player.position.subtract(enemy.position);
      const distance = delta.length();
      if (distance < 14) {
        delta.normalize();
        enemy.position.addInPlace(delta.scale(dt * (1.5 + index * 0.05) * enemySpeedMultiplier));
        enemy.position.y = sampleGroundY(enemy.position);
        enemy.rotation.y = Math.atan2(delta.x, delta.z);
      }
      if (attackPulse > 0 && distance < 4.2) {
        enemy.metadata.health -= 36 * dt * 12;
        if (enemy.metadata.health <= 0) {
          enemy.metadata.alive = false;
          enemy.setEnabled(false);
          collected += 2;
          if (isMap002) map002DefeatedAshCrawlers += 1;
          if (isMap003) map003DefeatedBeetles += 1;
          if (isMap004) map004DefeatedGnats += 1;
          if (isMap005) map005DefeatedSlimes += 1;
          if (isMap006) map006DefeatedRays += 1;
          if (isMap007) map007DefeatedWeavers += 1;
          if (isMap008) map008DefeatedDrones += 1;
          if (isMap009) map009DefeatedStalkers += 1;
          if (isMap010) map010DefeatedLarvae += 1;
          if (isMap011) map011DefeatedCrawlers += 1;
          if (isMap012) map012DefeatedStalkers += 1;
          if (isMap013) map013DefeatedLeapers += 1;
          if (isMap014) map014DefeatedHounds += 1;
          if (isMap015) map015DefeatedMyrmidons += 1;
        }
      }
      if (distance < 1.7 && performance.now() - lastDamage > 800) {
        health = Math.max(0, health - Math.max(1, Math.round(4 * (1 - companion.damageMitigation))));
        lastDamage = performance.now();
      }
    });

    if (isMap001) {
      Object.values(worldFarmState).forEach(plot => {
        if (getWorldFarmCropStage(plot, Date.now()) !== "mature") return;
        const effect = getWorldFarmPlant(plot)?.effect;
        if (effect?.kind !== "repel") return;
        const origin = new Vector3(plot.coordinate.x, 0, plot.coordinate.z);
        enemies.forEach(enemy => {
          if (!enemy.metadata?.alive) return;
          const delta = enemy.position.subtract(origin);
          const distance = delta.length();
          if (distance <= 0 || distance > effect.radius) return;
          delta.normalize();
          enemy.position.addInPlace(delta.scale(dt * 1.35));
        });
      });
    }

    const lighting = getWorldLighting(options.mapId);
    const sky = Color3.FromHexString(sceneTreatment?.skyColor ?? lighting.sky);
    scene.clearColor = new Color4(sky.r, sky.g, sky.b, 1);
    skyLight.diffuse = Color3.FromHexString(sceneTreatment?.lightColor ?? lighting.ambient);
    keyLight.diffuse = Color3.FromHexString(sceneTreatment?.lightColor ?? lighting.directional);
    if (isMap001) {
      const encounter = resolveMap001Encounter(map001Memory, { x: player.position.x, z: player.position.z, health, phase: lighting.phase, interacted: pendingMapInteraction, now: performance.now() });
      map001Memory = encounter.memory;
      pendingMapInteraction = false;
      if (performance.now() > map001InteractionWarningUntil) map001Warning = encounter.warning;
      distressPod.setEnabled(!map001Memory.distressResolved);
      koral.setEnabled(Vector3.Distance(player.position, koral.position) < 4.5);
      monolith.setEnabled(Vector3.Distance(player.position, monolith.position) < 13 || encounter.activateVoidReaper);
      elite.setEnabled(Vector3.Distance(player.position, elite.position) < 9 && Boolean(elite.metadata?.alive));
      if (encounter.spawnGlassStalkers > 0) {
        enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnGlassStalkers).forEach((enemy, index) => {
          enemy.setEnabled(true);
          enemy.metadata = { health: 34, alive: true, encounterName: "Glass Stalker · Distress Pod" };
          enemy.position = new Vector3(MAP001_DISTRESS_POD.x + 2 + index, 0, MAP001_DISTRESS_POD.z - 2 - index);
        });
      }
      if (encounter.event === "safe-reset") {
        health = 100;
        player.position.set(0, sampleGroundY(new Vector3(0, 0, 1.5)), 1.5);
      }
      const hazardEntity = { x: player.position.x, y: player.position.y, z: player.position.z, radius: blockCollisionRadius, height: playerHeight };
      getHazardContacts(obsidianBlockWorld, hazardEntity, "player").forEach(contact => {
        const lastAppliedAt = playerHazardLastAppliedAt.get(contact.block.key);
        const now = performance.now();
        if (!canApplyHazardDamage(contact, lastAppliedAt, now)) return;
        const damage = contact.hazard?.damage ?? 0;
        health = Math.max(0, health - damage);
        playerHazardLastAppliedAt.set(contact.block.key, now);
        setMap001InteractionWarning(`หนาม ${contact.block.blockId} ทำความเสียหาย ${damage} HP`);
      });
      if (repelledEnemyCount > 0 && performance.now() > map001InteractionWarningUntil) map001Warning = `พืชไล่มอนสเตอร์ออกจากพื้นที่ ${repelledEnemyCount} ตัว`;
      const pulse = options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 190) * 0.12;
      monolith.scaling.setAll(pulse);
      distressPod.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 150) * 0.18);
    }

    if (isMap002) {
      const encounter = resolveMap002Encounter(map002Memory, { x: player.position.x, z: player.position.z, health, harvestedResources: map002HarvestedResources, defeatedAshCrawlers: map002DefeatedAshCrawlers, interacted: pendingMapInteraction, now: performance.now() });
      map002Memory = encounter.memory;
      pendingMapInteraction = false;
      map002Warning = encounter.warning;
      enemySpeedMultiplier = encounter.enemySpeedMultiplier;
      map002Elite.setEnabled(encounter.activateElite);
      if (encounter.spawnAshCrawlers > 0) {
        enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnAshCrawlers).forEach((enemy, index) => {
          enemy.setEnabled(true);
          enemy.metadata = { health: 36, alive: true, encounterName: "Ash Crawler · Ash Storm" };
          enemy.position = new Vector3(8 + index * 2.2, 0, 9 - index * 2);
        });
      }
      if (encounter.event === "safe-reset") {
        health = 100;
        player.position.set(MAP002_JAX_CAMP.x + 1.6, 0, MAP002_JAX_CAMP.z + 1.2);
      }
      const altarPulse = encounter.stormActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 170) * 0.15 : 1;
      pyroclasticAltar.scaling.setAll(altarPulse);
      map002Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 240) * 0.07);
    }

    if (isMap003) {
      const encounter = resolveMap003Encounter(map003Memory, { x: player.position.x, z: player.position.z, health, harvestedCrystals: map003HarvestedCrystals, defeatedBeetles: map003DefeatedBeetles, interacted: pendingMapInteraction, now: performance.now() });
      map003Memory = encounter.memory;
      pendingMapInteraction = false;
      map003Warning = encounter.warning;
      enemySpeedMultiplier = encounter.enemySpeedMultiplier;
      if (encounter.bloomActive) health = Math.min(100, health + encounter.healPerSecond * dt);
      map003Elite.setEnabled(encounter.activateElite);
      if (encounter.spawnBeetles > 0) {
        enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnBeetles).forEach((enemy, index) => {
          enemy.setEnabled(true);
          enemy.metadata = { health: 40, alive: true, encounterName: "Glow Spore Beetle · Bloom" };
          enemy.position = new Vector3(7 + index * 2.5, 0, 8 - index * 2.1);
        });
      }
      if (encounter.event === "safe-reset") {
        health = 100;
        player.position.set(MAP003_LYRA_CAMP.x - 1.6, 0, MAP003_LYRA_CAMP.z + 1.1);
      }
      const bloomPulse = encounter.bloomActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 160) * 0.16 : 1;
      myceliumShrine.scaling.setAll(bloomPulse);
      map003Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 220) * 0.08);
    }

    if (isMap004) {
      const encounter = resolveMap004Encounter(map004Memory, { x: player.position.x, z: player.position.z, health, harvestedShards: map004HarvestedShards, defeatedGnats: map004DefeatedGnats, interacted: pendingMapInteraction, now: performance.now() });
      map004Memory = encounter.memory;
      pendingMapInteraction = false;
      map004Warning = encounter.warning;
      playerSpeedMultiplier = encounter.playerSpeedMultiplier;
      map004Elite.setEnabled(encounter.activateElite);
      if (encounter.laserDamagePerSecond > 0) health = Math.max(0, health - encounter.laserDamagePerSecond * dt);
      if (encounter.spawnGnats > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnGnats).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 38, alive: true, encounterName: "Shard Gnat · Reflection Field" }; enemy.position = new Vector3(13 + index * 2.4, 0, 10 - index * 2); });
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP004_ZEPHYR_CAMP.x + 1.5, 0, MAP004_ZEPHYR_CAMP.z + 1.2); }
      const laserPulse = encounter.laserActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 135) * 0.16 : 1;
      resonanceDais.scaling.setAll(laserPulse);
      map004Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 210) * 0.08);
    } else playerSpeedMultiplier = 1;

    if (isMap005) {
      const encounter = resolveMap005Encounter(map005Memory, { x: player.position.x, z: player.position.z, health, harvestedLilies: map005HarvestedLilies, defeatedSlimes: map005DefeatedSlimes, interacted: pendingMapInteraction, now: performance.now() });
      map005Memory = encounter.memory;
      pendingMapInteraction = false;
      map005Warning = encounter.warning;
      if (encounter.acidDamagePerSecond > 0) health = Math.max(0, health - encounter.acidDamagePerSecond * dt);
      map005Elite.setEnabled(encounter.activateElite);
      if (encounter.spawnSlimes > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnSlimes).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 36, alive: true, encounterName: "Acid Slime · Acid Drizzle" }; enemy.position = new Vector3(10 + index * 2.4, 0, -3 - index * 2); });
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP005_VANE_SHELTER.x + 1.5, 0, MAP005_VANE_SHELTER.z + 1.2); }
      vane.setEnabled(isMap005 && (Vector3.Distance(player.position, vane.position) < 12 || encounter.sheltered));
      const drizzlePulse = encounter.drizzleActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 145) * 0.14 : 1;
      hydraNest.scaling.setAll(encounter.memory.state === "boss-telegraph" ? drizzlePulse + 0.12 : drizzlePulse);
      map005Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    if (isMap006) {
      const encounter = resolveMap006Encounter(map006Memory, { x: player.position.x, z: player.position.z, health, harvestedMagnetite: map006HarvestedMagnetite, defeatedRays: map006DefeatedRays, interacted: pendingMapInteraction, now: performance.now() });
      map006Memory = encounter.memory;
      pendingMapInteraction = false;
      map006Warning = encounter.warning;
      map006Elite.setEnabled(encounter.activateElite);
      if (encounter.spawnRays > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnRays).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 36, alive: true, encounterName: "Magnetic Hover-Ray · Magnetic Storm" }; enemy.position = new Vector3(10 + index * 2.4, 0, -3 - index * 2); });
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP006_STABILIZER.x + 1.5, 0, MAP006_STABILIZER.z + 1.2); }
      rusty.setEnabled(isMap006 && (Vector3.Distance(player.position, rusty.position) < 12 || encounter.sheltered));
      const stormPulse = encounter.stormActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 145) * 0.14 : 1;
      colossusCore.scaling.setAll(encounter.memory.state === "boss-telegraph" ? stormPulse + 0.12 : stormPulse);
      map006Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    if (isMap007) {
      const encounter = resolveMap007Encounter(map007Memory, { x: player.position.x, z: player.position.z, health, harvestedCrystals: map007HarvestedCrystals, defeatedWeavers: map007DefeatedWeavers, interacted: pendingMapInteraction, now: performance.now() });
      map007Memory = encounter.memory;
      pendingMapInteraction = false;
      map007Warning = encounter.warning;
      if (encounter.coldDamagePerSecond > 0) health = Math.max(0, health - encounter.coldDamagePerSecond * dt);
      map007Elite.setEnabled(encounter.activateElite);
      if (encounter.spawnWeavers > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnWeavers).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 36, alive: true, encounterName: "Frostbite Weaver · Blizzard" }; enemy.position = new Vector3(10 + index * 2.4, 0, -3 - index * 2); });
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP007_STEAM_VENT.x + 1.5, 0, MAP007_STEAM_VENT.z + 1.2); }
      scoutFrost.setEnabled(isMap007 && (Vector3.Distance(player.position, scoutFrost.position) < 12 || encounter.sheltered));
      const blizzardPulse = encounter.blizzardActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 145) * 0.14 : 1;
      terrorRift.scaling.setAll(encounter.memory.state === "boss-telegraph" ? blizzardPulse + 0.12 : blizzardPulse);
      map007Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    if (isMap008) {
      const encounter = resolveMap008Encounter(map008Memory, { x: player.position.x, z: player.position.z, health, harvestedRelics: map008HarvestedRelics, defeatedDrones: map008DefeatedDrones, interacted: pendingMapInteraction, now: performance.now() });
      map008Memory = encounter.memory;
      pendingMapInteraction = false;
      map008Warning = encounter.warning;
      if (encounter.laserDamagePerSecond > 0) health = Math.max(0, health - encounter.laserDamagePerSecond * dt);
      map008Elite.setEnabled(encounter.activateElite);
      if (encounter.spawnDrones > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnDrones).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 36, alive: true, encounterName: "Sentinel Drone · Defense Sweep" }; enemy.position = new Vector3(10 + index * 2.4, 0, -3 - index * 2); });
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP008_RUNE_TERMINAL.x + 1.5, 0, MAP008_RUNE_TERMINAL.z + 1.2); }
      kael.setEnabled(isMap008 && (Vector3.Distance(player.position, kael.position) < 12 || encounter.sheltered));
      const sweepPulse = encounter.sweepActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 145) * 0.14 : 1;
      matrixCore.scaling.setAll(encounter.memory.state === "boss-telegraph" ? sweepPulse + 0.12 : sweepPulse);
      map008Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    if (isMap009) {
      const encounter = resolveMap009Encounter(map009Memory, { x: player.position.x, z: player.position.z, health, harvestedBlooms: map009HarvestedBlooms, defeatedStalkers: map009DefeatedStalkers, interacted: pendingMapInteraction, now: performance.now() });
      map009Memory = encounter.memory;
      pendingMapInteraction = false;
      map009Warning = encounter.warning;
      if (encounter.toxinDamagePerSecond > 0) health = Math.max(0, health - encounter.toxinDamagePerSecond * dt);
      map009Elite.setEnabled(encounter.activateElite);
      if (encounter.spawnStalkers > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnStalkers).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 36, alive: true, encounterName: "Vine Stalker · Toxic Downpour" }; enemy.position = new Vector3(10 + index * 2.4, 0, -3 - index * 2); });
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP009_CANOPY_HAVEN.x + 1.5, 0, MAP009_CANOPY_HAVEN.z + 1.2); }
      iris.setEnabled(isMap009 && (Vector3.Distance(player.position, iris.position) < 12 || encounter.sheltered));
      const downpourPulse = encounter.downpourActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 145) * 0.14 : 1;
      hiveRoot.scaling.setAll(encounter.memory.state === "boss-telegraph" ? downpourPulse + 0.12 : downpourPulse);
      map009Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    if (isMap010) {
      const encounter = resolveMap010Encounter(map010Memory, { x: player.position.x, z: player.position.z, health, harvestedEssence: map010HarvestedEssence, defeatedLarvae: map010DefeatedLarvae, interacted: pendingMapInteraction, now: performance.now() });
      map010Memory = encounter.memory;
      pendingMapInteraction = false;
      map010Warning = encounter.warning;
      if (encounter.voidDamagePerSecond > 0) health = Math.max(0, health - encounter.voidDamagePerSecond * dt);
      map010Elite.setEnabled(encounter.activateElite);
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP010_STABLE_PYLON.x + 1.5, 0, MAP010_STABLE_PYLON.z + 1.2); }
      voidWanderer.setEnabled(isMap010 && (Vector3.Distance(player.position, voidWanderer.position) < 12 || encounter.protectedByPylon));
      const pulse = encounter.pulseActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 125) * 0.16 : 1;
      singularityGate.scaling.setAll(encounter.memory.state === "boss-telegraph" ? pulse + 0.13 : pulse);
      map010Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    if (isMap011) {
      const encounter = resolveMap011Encounter(map011Memory, { x: player.position.x, z: player.position.z, health, harvestedBloom: map011HarvestedBloom, defeatedCrawlers: map011DefeatedCrawlers, interacted: pendingMapInteraction, now: performance.now() });
      map011Memory = encounter.memory;
      pendingMapInteraction = false;
      map011Warning = encounter.warning;
      if (encounter.ventDamagePerSecond > 0) health = Math.max(0, health - encounter.ventDamagePerSecond * dt);
      map011Elite.setEnabled(encounter.activateElite);
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP011_FORGE_CAMP.x + 1.5, 0, MAP011_FORGE_CAMP.z + 1.2); }
      forgemasterVael.setEnabled(isMap011 && (Vector3.Distance(player.position, forgemasterVael.position) < 12 || encounter.sheltered));
      const ventPulse = encounter.ventActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 150) * 0.14 : 1;
      smelterArch.scaling.setAll(encounter.memory.state === "boss-telegraph" ? ventPulse + 0.12 : ventPulse);
      map011Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    if (isMap012) {
      const encounter = resolveMap012Encounter(map012Memory, { x: player.position.x, z: player.position.z, health, harvestedGlass: map012HarvestedGlass, defeatedStalkers: map012DefeatedStalkers, interacted: pendingMapInteraction, now: performance.now() });
      map012Memory = encounter.memory;
      pendingMapInteraction = false;
      map012Warning = encounter.warning;
      if (encounter.ashDamagePerSecond > 0) health = Math.max(0, health - encounter.ashDamagePerSecond * dt);
      map012Elite.setEnabled(encounter.activateElite);
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP012_SCOUT_OVERLOOK.x + 1.5, 0, MAP012_SCOUT_OVERLOOK.z + 1.2); }
      scoutKaelen.setEnabled(isMap012 && (Vector3.Distance(player.position, scoutKaelen.position) < 12 || encounter.sheltered));
      const galePulse = encounter.galeActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 140) * 0.15 : 1;
      windMonolith.scaling.setAll(encounter.memory.state === "boss-telegraph" ? galePulse + 0.12 : galePulse);
      map012Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    if (isMap013) {
      const encounter = resolveMap013Encounter(map013Memory, { x: player.position.x, z: player.position.z, health, harvestedCrust: map013HarvestedCrust, defeatedLeapers: map013DefeatedLeapers, interacted: pendingMapInteraction, now: performance.now() });
      map013Memory = encounter.memory;
      pendingMapInteraction = false;
      map013Warning = encounter.warning;
      if (encounter.corrodeDamagePerSecond > 0) health = Math.max(0, health - encounter.corrodeDamagePerSecond * dt);
      map013Elite.setEnabled(encounter.activateElite);
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP013_THERON_BOARDWALK.x + 1.5, 0, MAP013_THERON_BOARDWALK.z + 1.2); }
      alchemistTheron.setEnabled(isMap013 && (Vector3.Distance(player.position, alchemistTheron.position) < 12 || encounter.sheltered));
      const geyserPulse = encounter.geyserActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 145) * 0.14 : 1;
      sulfurFalls.scaling.setAll(encounter.memory.state === "boss-telegraph" ? geyserPulse + 0.12 : geyserPulse);
      map013Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    if (isMap014) {
      const encounter = resolveMap014Encounter(map014Memory, { x: player.position.x, z: player.position.z, health, harvestedMagma: map014HarvestedMagma, defeatedHounds: map014DefeatedHounds, interacted: pendingMapInteraction, now: performance.now() });
      map014Memory = encounter.memory;
      pendingMapInteraction = false;
      map014Warning = encounter.warning;
      if (encounter.trenchDamagePerSecond > 0) health = Math.max(0, health - encounter.trenchDamagePerSecond * dt);
      map014Elite.setEnabled(encounter.activateElite);
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP014_WARDEN_POST.x + 1.5, 0, MAP014_WARDEN_POST.z + 1.2); }
      wardenSonya.setEnabled(isMap014 && (Vector3.Distance(player.position, wardenSonya.position) < 12 || encounter.sheltered));
      const tremorPulse = encounter.tremorActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 135) * 0.15 : 1;
      citadelGate.scaling.setAll(encounter.memory.state === "boss-telegraph" ? tremorPulse + 0.12 : tremorPulse);
      map014Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    if (isMap015) {
      const encounter = resolveMap015Encounter(map015Memory, { x: player.position.x, z: player.position.z, health, harvestedEmber: map015HarvestedEmber, defeatedMyrmidons: map015DefeatedMyrmidons, interacted: pendingMapInteraction, now: performance.now() });
      map015Memory = encounter.memory;
      pendingMapInteraction = false;
      map015Warning = encounter.warning;
      if (encounter.staminaDrainPerSecond > 0) health = Math.max(0, health - encounter.staminaDrainPerSecond * dt);
      map015Elite.setEnabled(encounter.activateElite);
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP015_FORGE_SHRINE.x + 1.5, 0, MAP015_FORGE_SHRINE.z + 1.2); }
      forgeAvatar.setEnabled(isMap015 && (Vector3.Distance(player.position, forgeAvatar.position) < 12 || encounter.sheltered));
      const corePulse = encounter.pulseActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 125) * 0.16 : 1;
      primalAnvil.scaling.setAll(encounter.memory.state === "boss-telegraph" ? corePulse + 0.13 : corePulse);
      map015Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    const bossActive = isMap001 ? map001Memory.state === "boss-active" : isMap002 ? map002Memory.state === "boss-active" : isMap003 ? map003Memory.state === "boss-active" : isMap004 ? map004Memory.state === "boss-active" : isMap005 ? map005Memory.state === "boss-active" : isMap006 ? map006Memory.state === "boss-active" : isMap007 ? map007Memory.state === "boss-active" : isMap008 ? map008Memory.state === "boss-active" : isMap009 ? map009Memory.state === "boss-active" : isMap010 ? map010Memory.state === "boss-active" : isMap011 ? map011Memory.state === "boss-active" : isMap012 ? map012Memory.state === "boss-active" : isMap013 ? map013Memory.state === "boss-active" : isMap014 ? map014Memory.state === "boss-active" : isMap015 ? map015Memory.state === "boss-active" : lighting.phase === "night";
    boss.setEnabled(bossActive);
    if (bossActive) {
      boss.position.x = player.position.x + Math.sin(performance.now() / 1500) * 2.5;
      boss.position.z = player.position.z - 16;
      boss.position.y = 0.25 + Math.sin(performance.now() / 420) * 0.22;
    }

    if (performance.now() - lastEmit > 180) {
      options.onSnapshot?.({
        health,
        resources: collected,
        enemies: enemies.filter(enemy => enemy.metadata?.alive).length + (isMap001 && elite.metadata?.alive ? 1 : 0) + (isMap002 && map002Elite.isEnabled() ? 1 : 0) + (isMap003 && map003Elite.isEnabled() ? 1 : 0) + (isMap004 && map004Elite.isEnabled() ? 1 : 0) + (isMap005 && map005Elite.isEnabled() ? 1 : 0) + (isMap005 && bossActive ? 1 : 0) + (isMap006 && map006Elite.isEnabled() ? 1 : 0) + (isMap006 && bossActive ? 1 : 0) + (isMap007 && map007Elite.isEnabled() ? 1 : 0) + (isMap007 && bossActive ? 1 : 0) + (isMap008 && map008Elite.isEnabled() ? 1 : 0) + (isMap008 && bossActive ? 1 : 0) + (isMap009 && map009Elite.isEnabled() ? 1 : 0) + (isMap009 && bossActive ? 1 : 0) + (isMap010 && map010Elite.isEnabled() ? 1 : 0) + (isMap010 && bossActive ? 1 : 0) + (isMap011 && map011Elite.isEnabled() ? 1 : 0) + (isMap011 && bossActive ? 1 : 0) + (isMap012 && map012Elite.isEnabled() ? 1 : 0) + (isMap012 && bossActive ? 1 : 0) + (isMap013 && map013Elite.isEnabled() ? 1 : 0) + (isMap013 && bossActive ? 1 : 0) + (isMap014 && map014Elite.isEnabled() ? 1 : 0) + (isMap014 && bossActive ? 1 : 0) + (isMap015 && map015Elite.isEnabled() ? 1 : 0) + (isMap015 && bossActive ? 1 : 0),
        phase: lighting.phase,
        mapState: isMap001 ? map001Memory.state : isMap002 ? map002Memory.state : isMap003 ? map003Memory.state : isMap004 ? map004Memory.state : isMap005 ? map005Memory.state : isMap006 ? map006Memory.state : isMap007 ? map007Memory.state : isMap008 ? map008Memory.state : isMap009 ? map009Memory.state : isMap010 ? map010Memory.state : isMap011 ? map011Memory.state : isMap012 ? map012Memory.state : isMap013 ? map013Memory.state : isMap014 ? map014Memory.state : isMap015 ? map015Memory.state : "exploring",
        warning: isMap001 ? map001Warning : isMap002 ? map002Warning : isMap003 ? map003Warning : isMap004 ? map004Warning : isMap005 ? map005Warning : isMap006 ? map006Warning : isMap007 ? map007Warning : isMap008 ? map008Warning : isMap009 ? map009Warning : isMap010 ? map010Warning : isMap011 ? map011Warning : isMap012 ? map012Warning : isMap013 ? map013Warning : isMap014 ? map014Warning : isMap015 ? map015Warning : sceneTreatment ? (Math.floor(performance.now() / 7000) % 2 === 0 ? sceneTreatment.ambientEvent : sceneTreatment.hudPhrasing) : undefined,
        companionState: companionRuntime.state,
        movementState,
        speed: Number(currentSpeed.toFixed(2)),
        stamina: staminaPercent(stamina),
        exhausted: stamina.exhausted,
        position: { x: Number(player.position.x.toFixed(1)), z: Number(player.position.z.toFixed(1)) },
        aiNpcAvailable: isMap001 && Vector3.Distance(player.position, specialAiNpc.position) <= 8,
        cameraMode: activeCameraMode,
        viewDistanceBlocks: Number(ground.metadata?.viewDistanceBlocks ?? renderDistance.visibleRadiusBlocks ?? renderDistance.visibleRadiusMeters),
        performanceTier: activePerformanceBudget.tier,
        mobSimulationRadiusMeters: activePerformanceBudget.mobSimulationRadiusMeters,
        animationRadiusMeters: activePerformanceBudget.animationRadiusMeters,
        physicsRadiusMeters: activePerformanceBudget.physicsRadiusMeters,
        targetFpsBudget: activePerformanceBudget.targetFps,
        farmPlots: isMap001 ? OBSIDIAN_FARM_PLOTS.length : 0,
        plantedCrops: isMap001 ? worldPlantStates.size : 0,
        matureCrops: isMap001 ? countMatureWorldPlants(Object.fromEntries(worldPlantStates), Date.now()) : 0,
        repelledEnemies: isMap001 ? repelledEnemyCount : 0,
        worldStorageAvailable: Boolean(findNearestWorldStorage()),
        worldStorageId: obsidianStorageAnchor?.id,
        worldStorageSlots: obsidianStorageAnchor ? (options.initialWorldStorageById?.[obsidianStorageAnchor.id]?.length ?? 0) : 0,
        worldStorageCapacity: obsidianStorageAnchor?.capacity,
      });
      lastEmit = performance.now();
    }
  });

  return {
    scene,
    dispose: () => {
      window.removeEventListener("arcane-control", handleControl);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("wheel", onCameraWheel);
      canvas.removeEventListener("pointerdown", onCameraPointerDown);
      canvas.removeEventListener("pointermove", onCameraPointerMove);
      canvas.removeEventListener("pointerup", stopCameraPan);
      canvas.removeEventListener("pointercancel", stopCameraPan);
      scene.dispose();
    },
  };
}
