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
import { getWorldLighting } from "@/game/data/worldTime";
import { getMapDefinition } from "@/game/data/maps";
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
import { createBiomeDressing, createPixelTerrainChunks, createVoxelModel } from "@/game/assets/pixelPack";
import { getBiomeVisualProfile } from "@/game/data/biomeProfiles";
import { loadPackModel } from "@/game/assets/glbPack";
import { canSpendStamina, createStaminaState, regenerateStamina, spendStamina, staminaPercent, type StaminaState } from "@/game/systems/staminaSystem";
import { chunkKey, getStreamingChunkKeys } from "@/game/systems/visibleRegionSystem";
import { updatePixelTerrainStream } from "@/game/assets/pixelPack";
import { getRenderDistanceConfig, type RenderDistancePreset } from "@/game/systems/renderDistance";

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
};

export type GameReward = {
  definitionId: string;
  displayName: string;
  eventId: string;
  provenanceType: "harvest" | "drop" | "reward";
};

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
  companion?: CompanionConfig;
  reducedMotion?: boolean;
  renderDistance?: RenderDistancePreset;
};

type ArcaneControl =
  | { type: "move"; x: number; y: number }
  | { type: "attack" }
  | { type: "interact" }
  | { type: "dash" }
  | { type: "use-item"; slot: number };

function material(scene: Scene, name: string, color: string, glow = 0) {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = Color3.FromHexString(color);
  result.emissiveColor = Color3.FromHexString(color).scale(glow);
  result.specularColor = Color3.Black();
  return result;
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
  const renderDistance = getRenderDistanceConfig(options.renderDistance);
  const worldMetersPerUnit = 1;
  const worldRadius = Math.max(500, Math.round(mapDefinition?.radiusMeters ?? 500));
  const camera = new ArcRotateCamera("arcane-isometric-camera", -Math.PI / 4, Math.PI / 3.65, 26, new Vector3(0, 0.5, 0), scene);
  camera.lowerRadiusLimit = 22;
  camera.upperRadiusLimit = 32;
  camera.fov = 0.82;
  camera.minZ = 0.1;
  camera.maxZ = worldRadius * 3;
  scene.activeCamera = camera;
  camera.attachControl(canvas, false);
  camera.inputs.clear();
  let cameraPan = { x: 0, z: 0 };
  let panning = false;
  let lastPanPoint: { x: number; y: number } | null = null;
  const onCameraWheel = (event: WheelEvent) => {
    event.preventDefault();
    camera.radius = Math.max(8, Math.min(24, camera.radius + event.deltaY * 0.018));
  };
  const onCameraPointerDown = (event: PointerEvent) => {
    if (event.button !== 1 && !event.shiftKey) return;
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
  const ground = createPixelTerrainChunks(scene, terrainTiles, terrainTiles, 1, 16, visualProfile.terrainAssetIds, renderDistance);
  ground.position.y = -0.02;
  ground.metadata = { ...ground.metadata, mapId: options.mapId, biome: mapDefinition?.biome ?? "Obsidian frontier", accent: mapAccent, terrainFamily: visualProfile.terrainAssetIds };
  const biomeDressing = createBiomeDressing(scene, visualProfile.decorations);
  biomeDressing.metadata = { ...biomeDressing.metadata, mapId: options.mapId, biome: mapDefinition?.biome ?? "Obsidian frontier" };
  const biomeResourceMeshes = biomeDressing.getChildMeshes().filter(mesh => mesh.metadata?.category === "resource");
  const terrainChunks = ground.getChildMeshes().filter(mesh => mesh.metadata?.chunk) as Array<AbstractMesh & { metadata: { chunk: { x: number; z: number } } }>;
  let lastTerrainVisibilityUpdate = -Infinity;
  const updateTerrainVisibility = (position: Vector3, now: number) => {
    if (now - lastTerrainVisibilityUpdate < 180) return;
    lastTerrainVisibilityUpdate = now;
    const visible = getStreamingChunkKeys({ positionX: position.x, positionZ: position.z, chunkWorldSize: 16, visibleRadiusMeters: renderDistance.visibleRadiusMeters, mapRadiusMeters: worldRadius });
    updatePixelTerrainStream(ground, { x: position.x, z: position.z }, worldRadius);
    terrainChunks.forEach(chunk => {
      const chunkInfo = chunk.metadata?.chunk as { x?: number; z?: number } | undefined;
      chunk.setEnabled(Boolean(chunk.metadata?.inMap && chunkInfo && visible.has(chunkKey(chunkInfo.x ?? 0, chunkInfo.z ?? 0))));
    });
    ground.metadata = { ...ground.metadata, visibleChunkCount: visible.size, totalChunkCount: terrainChunks.length, streamRadiusMeters: renderDistance.visibleRadiusMeters, prefetchRadiusMeters: renderDistance.prefetchRadiusMeters, renderDistancePreset: renderDistance.preset };
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
  let map001Warning: string | undefined;
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

  const handleControl = (event: Event) => {
    const control = (event as CustomEvent<ArcaneControl>).detail;
    if (!control) return;
    if (control.type === "move") move = { x: control.x, y: control.y };
    if (control.type === "attack") {
      const result = spendStamina(stamina, "attack");
      if (result.accepted) {
        stamina = result.state;
        attackPulse = 0.32;
      }
    }
    if (control.type === "dash" && canSpendStamina(stamina, "dash")) {
      stamina = spendStamina(stamina, "dash").state;
      dashPulse = 0.25;
    }
    if (control.type === "interact") {
      pendingMapInteraction = true;
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
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const keyboardX = (keyState.has("d") ? 1 : 0) - (keyState.has("a") ? 1 : 0);
    const keyboardY = (keyState.has("w") ? 1 : 0) - (keyState.has("s") ? 1 : 0);
    const movement = new Vector3(move.x + keyboardX, 0, move.y - keyboardY);
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
      player.position.addInPlace(movement.scale(currentSpeed * dt));
      player.position.x = Math.max(-worldRadius, Math.min(worldRadius, player.position.x));
      player.position.z = Math.max(-worldRadius, Math.min(worldRadius, player.position.z));
      player.rotation.y = Math.atan2(movement.x, movement.z);
    }
    updateTerrainVisibility(player.position, performance.now());
    const cameraTarget = new Vector3(player.position.x + cameraPan.x, 0.5, player.position.z + cameraPan.z);
    camera.target = Vector3.Lerp(camera.target, cameraTarget, Math.min(1, dt * 5.4));
    dashPulse = Math.max(0, dashPulse - dt);
    attackPulse = Math.max(0, attackPulse - dt);
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
    pet.rotation.z = options.reducedMotion || !isMoving ? 0 : Math.sin(now / 180) * 0.045;
    pet.setEnabled(companion.following || companionRuntime.state !== "resting");

    enemies.forEach((enemy, index) => {
      if (!enemy.metadata?.alive) return;
      if (isMap006 && Vector3.Distance(player.position, rusty.position) <= MAP006_STABILIZER.radius) return;
      const delta = player.position.subtract(enemy.position);
      const distance = delta.length();
      if (distance < 14) {
        delta.normalize();
        enemy.position.addInPlace(delta.scale(dt * (1.5 + index * 0.05) * enemySpeedMultiplier));
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

    const lighting = getWorldLighting(options.mapId);
    const sky = Color3.FromHexString(sceneTreatment?.skyColor ?? lighting.sky);
    scene.clearColor = new Color4(sky.r, sky.g, sky.b, 1);
    skyLight.diffuse = Color3.FromHexString(sceneTreatment?.lightColor ?? lighting.ambient);
    keyLight.diffuse = Color3.FromHexString(sceneTreatment?.lightColor ?? lighting.directional);
    if (isMap001) {
      const encounter = resolveMap001Encounter(map001Memory, { x: player.position.x, z: player.position.z, health, phase: lighting.phase, interacted: pendingMapInteraction, now: performance.now() });
      map001Memory = encounter.memory;
      pendingMapInteraction = false;
      map001Warning = encounter.warning;
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
        player.position.set(0, 0, 1.5);
      }
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
