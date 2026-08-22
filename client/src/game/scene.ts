import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import "@babylonjs/core/Legacy/legacy";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
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
import { resolveCompanionRuntime, type CompanionRuntimeState } from "@/game/home/homeSystemV2";

export type GameSnapshot = {
  health: number;
  resources: number;
  enemies: number;
  phase: "day" | "night";
  mapState?: string;
  warning?: string;
  companionState?: CompanionRuntimeState;
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
};

type ArcaneControl =
  | { type: "move"; x: number; y: number }
  | { type: "attack" }
  | { type: "interact" }
  | { type: "dash" };

function material(scene: Scene, name: string, color: string, glow = 0) {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = Color3.FromHexString(color);
  result.emissiveColor = Color3.FromHexString(color).scale(glow);
  result.specularColor = Color3.Black();
  return result;
}

const map001Asset = {
  hero: "/manus-storage/survivor-hero_d9227206.jpg",
  stalker: "/manus-storage/glass-stalker-monster_48677eda.jpg",
  crystal: "/manus-storage/ley-crystal-resource_052c1bcd.jpg",
  boss: "/manus-storage/void-reaper-boss_03f9497f.jpg",
  koral: "/manus-storage/commander-koral-portrait_06a487e5.jpg",
  monolith: "/manus-storage/crashed-leyline-monolith_35d89c1e.jpg",
  elite: "/manus-storage/obsidian-golem-elite_a0a82e7e.jpg",
  alloy: "/manus-storage/frontier-alloy-icon_1192ae58.jpg",
  companion: "/manus-storage/arcane-cyber-fox_d0832d7b.jpg",
};

const map002Asset = {
  jax: "/manus-storage/scavenger-jax_5e8c7328.jpg",
  crawler: "/manus-storage/ash-crawler-v2_63661c7a.jpg",
  elite: "/manus-storage/obsidian-shell-golem_6ec8be90.jpg",
  boss: "/manus-storage/pyroclastic-behemoth_2fdfe2eb.jpg",
  ore: "/manus-storage/ember-ore-v2_8fe7e31d.jpg",
};

const map003Asset = {
  lyra: "/manus-storage/researcher-lyra_072d7a37.jpg",
  beetle: "/manus-storage/glow-spore-beetle_f84e6c03.jpg",
  elite: "/manus-storage/luminous-stalker_11beed51.jpg",
  boss: "/manus-storage/mycelium-empress_3886310d.jpg",
  crystal: "/manus-storage/glow-crystal_7882072b.jpg",
};

const map004Asset = {
  zephyr: "/manus-storage/cartographer-zephyr_0edb606a.jpg",
  gnat: "/manus-storage/shard-gnat_00c26a5d.jpg",
  elite: "/manus-storage/prism-golem_716fbfa6.jpg",
  boss: "/manus-storage/resonance-archon_97fdc4b6.jpg",
  shard: "/manus-storage/resonance-shard_0bc60214.jpg",
};

const map005Asset = {
  vane: "/manus-storage/alchemist-vane_6d5c6239.jpg",
  slime: "/manus-storage/acid-slime_b32817d4.jpg",
  elite: "/manus-storage/mire-lurker_0be2a315.jpg",
  boss: "/manus-storage/toxic-hydra_84776812.jpg",
  lily: "/manus-storage/toxic-lily_cec5bf87.jpg",
};

const map006Asset = {
  rusty: "/manus-storage/engineer-rusty_0f169fbd.jpg",
  ray: "/manus-storage/magnetic-hover-ray_51293df0.jpg",
  elite: "/manus-storage/ironclad-golem_953cf9b6.jpg",
  boss: "/manus-storage/lodestone-colossus_abc05348.jpg",
  sand: "/manus-storage/magnetite-sand_cff4f19d.jpg",
};

function assetMaterial(scene: Scene, name: string, url: string, glow = 0.45) {
  const result = new StandardMaterial(name, scene);
  const texture = new Texture(url, scene, true, false);
  texture.vScale = -1;
  result.diffuseTexture = texture;
  result.emissiveTexture = texture;
  result.emissiveColor = new Color3(glow, glow, glow);
  result.specularColor = Color3.Black();
  result.backFaceCulling = false;
  result.disableLighting = true;
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
  const sceneTreatment = getMapSceneTreatment(options.mapId);
  const worldMetersPerUnit = 10;
  const worldRadius = Math.max(100, Math.round((mapDefinition?.radiusMeters ?? 1200) / worldMetersPerUnit));
  const camera = new ArcRotateCamera("arcane-isometric-camera", -Math.PI / 4, Math.PI / 3.65, 26, new Vector3(0, 0.5, 0), scene);
  camera.lowerRadiusLimit = 22;
  camera.upperRadiusLimit = 32;
  camera.fov = 0.82;
  camera.minZ = 0.1;
  camera.maxZ = worldRadius * 3;
  scene.activeCamera = camera;
  camera.attachControl(canvas, false);
  camera.inputs.clear();

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
  const glow = new GlowLayer("arcane-glow", scene, { blurKernelSize: 32 });
  glow.intensity = 0.82;

  const ground = MeshBuilder.CreateGround("obsidian-terrain", { width: worldRadius * 2.15, height: worldRadius * 2.15, subdivisions: 2 }, scene);
  const terrainMaterial = mapDefinition?.keyArt
    ? assetMaterial(scene, `${mapDefinition.id}-terrain-key-art`, mapDefinition.keyArt, 0.14)
    : material(scene, "obsidian-ground", "#101824", 0.1);
  terrainMaterial.alpha = mapDefinition?.keyArt ? 0.28 : 1;
  ground.material = terrainMaterial;
  if (sceneTreatment) {
    const terrainVeil = MeshBuilder.CreateGround("biome-terrain-veil", { width: worldRadius * 2.14, height: worldRadius * 2.14 }, scene);
    terrainVeil.position.y = 0.012;
    const veilMaterial = material(scene, "biome-terrain-veil-material", sceneTreatment.terrainColor, 0.22);
    veilMaterial.alpha = 0.42;
    terrainVeil.material = veilMaterial;
  }

  const gridMaterial = material(scene, "ley-grid", mapAccent, 0.95);
  gridMaterial.alpha = 0.32;
  for (let i = -worldRadius; i <= worldRadius; i += 20) {
    const eastWest = MeshBuilder.CreateBox(`ley-ew-${i}`, { width: worldRadius * 2, height: 0.025, depth: 0.15 }, scene);
    eastWest.position = new Vector3(0, 0.035, i);
    eastWest.material = gridMaterial;
    const northSouth = MeshBuilder.CreateBox(`ley-ns-${i}`, { width: 0.15, height: 0.025, depth: worldRadius * 2 }, scene);
    northSouth.position = new Vector3(i, 0.04, 0);
    northSouth.material = gridMaterial;
  }

  const boundaryMaterial = material(scene, "frontier-boundary", mapAccent, 0.7);
  boundaryMaterial.alpha = 0.45;
  const boundary = MeshBuilder.CreateTorus("frontier-boundary", { diameter: worldRadius * 2, thickness: 0.28, tessellation: 120 }, scene);
  boundary.rotation.x = Math.PI / 2;
  boundary.position.y = 0.12;
  boundary.material = boundaryMaterial;

  const ruinMaterial = material(scene, "ruin-material", "#26283a", 0.18);
  const runeMaterial = material(scene, "rune-material", mapAccent, 1.05);
  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12;
    const distance = 18 + (i % 3) * 8;
    const pylon = MeshBuilder.CreateCylinder(`ruin-pylon-${i}`, { height: 4 + (i % 3), diameterTop: 0.55, diameterBottom: 1.4, tessellation: 6 }, scene);
    pylon.position = new Vector3(Math.cos(angle) * distance, pylon.scaling.y + 1.2, Math.sin(angle) * distance);
    pylon.rotation.z = (i % 2 ? 1 : -1) * 0.13;
    pylon.material = ruinMaterial;
    const rune = MeshBuilder.CreateTorus(`rune-${i}`, { diameter: 1.3, thickness: 0.06, tessellation: 24 }, scene);
    rune.position = pylon.position.add(new Vector3(0, 1.1, 0));
    rune.rotation.x = Math.PI / 2;
    rune.material = runeMaterial;
  }

  if (sceneTreatment && mapDefinition?.keyArt) {
    const landmark = MeshBuilder.CreatePlane(`${mapDefinition.id}-landmark-art`, { width: 7.2, height: 5.4 }, scene);
    landmark.position = new Vector3(-9, 3.1, -23);
    landmark.billboardMode = 7;
    landmark.material = assetMaterial(scene, `${mapDefinition.id}-landmark-art-material`, mapDefinition.keyArt, 0.5);
    landmark.metadata = { sceneIdentity: true, kind: sceneTreatment.landmarkKind, label: sceneTreatment.landmarkLabel };
  }

  const player = new TransformNode("anime-survivor", scene);
  const heroArt = MeshBuilder.CreatePlane("survivor-key-art", { width: 3.25, height: 3.25 }, scene);
  heroArt.parent = player;
  heroArt.position.y = 1.55;
  heroArt.billboardMode = 7;
  heroArt.material = assetMaterial(scene, "survivor-key-art-material", map001Asset.hero, 0.68);
  const pet = new TransformNode("arcane-cyber-fox", scene);
  pet.position = new Vector3(-1.8, 0, -1.2);
  const petArt = MeshBuilder.CreatePlane("arcane-cyber-fox-art", { width: 1.7, height: 1.7 }, scene);
  petArt.parent = pet;
  petArt.position.y = 0.85;
  petArt.billboardMode = 7;
  petArt.material = assetMaterial(scene, "arcane-cyber-fox-material", map001Asset.companion, 0.6);

  const enemyMaterial = isMap006
    ? assetMaterial(scene, "magnetic-hover-ray-material", map006Asset.ray, 0.7)
    : isMap005
    ? assetMaterial(scene, "acid-slime-material", map005Asset.slime, 0.68)
    : isMap004
    ? assetMaterial(scene, "shard-gnat-material", map004Asset.gnat, 0.68)
    : isMap003
    ? assetMaterial(scene, "glow-spore-beetle-material", map003Asset.beetle, 0.67)
    : isMap002
      ? assetMaterial(scene, "ash-crawler-material", map002Asset.crawler, 0.62)
      : assetMaterial(scene, "glass-stalker-material", map001Asset.stalker, 0.62);
  const enemies = Array.from({ length: 7 }, (_, index) => {
    const enemy = MeshBuilder.CreatePlane(`${regularMonster.toLowerCase().replaceAll(" ", "-")}-${index}`, { width: 2.5, height: 2.5 }, scene);
    const angle = (Math.PI * 2 * index) / 7;
    enemy.position = new Vector3(Math.cos(angle) * (10 + index * 1.2), 1.25, Math.sin(angle) * (10 + index * 1.2));
    enemy.billboardMode = 7;
    enemy.material = enemyMaterial;
    enemy.metadata = { health: 30, alive: true, encounterName: regularMonster };
    if ((isMap002 || isMap006) && index > 4) enemy.setEnabled(false);
    return enemy;
  });

  const resourceMaterial = isMap006
    ? assetMaterial(scene, "magnetite-sand-material", map006Asset.sand, 0.86)
    : isMap005
    ? assetMaterial(scene, "toxic-lily-material", map005Asset.lily, 0.86)
    : isMap004
    ? assetMaterial(scene, "resonance-shard-material", map004Asset.shard, 0.86)
    : isMap003
    ? assetMaterial(scene, "glow-crystal-material", map003Asset.crystal, 0.85)
    : isMap002
      ? assetMaterial(scene, "ember-ore-material", map002Asset.ore, 0.82)
      : assetMaterial(scene, "ley-crystal-material", map001Asset.crystal, 0.82);
  const resources = Array.from({ length: 10 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 10 + 0.3;
    const resource = MeshBuilder.CreatePlane(`${isMap006 ? "magnetite-sand" : isMap005 ? "toxic-lily" : isMap004 ? "resonance-shard" : isMap003 ? "glow-crystal" : isMap002 ? "ember-ore" : "ley-crystal"}-${index}`, { width: 1.35, height: 1.35 }, scene);
    resource.position = new Vector3(Math.cos(angle) * (7 + (index % 4) * 2), 0.72, Math.sin(angle) * (7 + (index % 4) * 2));
    resource.billboardMode = 7;
    resource.material = resourceMaterial;
    return resource;
  });

  const boss = MeshBuilder.CreatePlane(`${eventBoss.toLowerCase().replaceAll(" ", "-")}-event-boss`, { width: 5.8, height: 5.8 }, scene);
  boss.position = new Vector3(0, 2.8, -18);
  boss.billboardMode = 7;
  boss.material = isMap006
    ? assetMaterial(scene, "lodestone-colossus-material", map006Asset.boss, 0.96)
    : isMap005
    ? assetMaterial(scene, "toxic-hydra-material", map005Asset.boss, 0.96)
    : isMap004
    ? assetMaterial(scene, "resonance-archon-material", map004Asset.boss, 0.96)
    : isMap003
    ? assetMaterial(scene, "mycelium-empress-material", map003Asset.boss, 0.95)
    : isMap002
      ? assetMaterial(scene, "pyroclastic-behemoth-material", map002Asset.boss, 0.92)
      : assetMaterial(scene, "void-reaper-boss-material", map001Asset.boss, 0.92);
  boss.setEnabled(false);

  const koral = MeshBuilder.CreatePlane("commander-koral-safe-zone", { width: 2.2, height: 2.2 }, scene);
  koral.position = new Vector3(-5.5, 1.1, 2.8);
  koral.billboardMode = 7;
  koral.material = assetMaterial(scene, "commander-koral-material", map001Asset.koral, 0.48);
  koral.setEnabled(false);

  const monolith = MeshBuilder.CreatePlane("crashed-leyline-monolith", { width: 4.6, height: 4.6 }, scene);
  monolith.position = new Vector3(MAP001_MONOLITH.x, 2.8, MAP001_MONOLITH.z);
  monolith.billboardMode = 7;
  monolith.material = assetMaterial(scene, "crashed-leyline-monolith-material", map001Asset.monolith, 0.62);
  monolith.setEnabled(false);

  const elite = MeshBuilder.CreatePlane("obsidian-golem-elite", { width: 3.9, height: 3.9 }, scene);
  elite.position = new Vector3(9, 1.6, -10);
  elite.billboardMode = 7;
  elite.material = assetMaterial(scene, "obsidian-golem-elite-material", map001Asset.elite, 0.68);
  elite.metadata = { health: 180, alive: true, encounterName: "Obsidian Golem", elite: true };
  elite.setEnabled(false);

  const distressPod = MeshBuilder.CreatePlane("distress-pod-signal", { width: 1.9, height: 1.9 }, scene);
  distressPod.position = new Vector3(MAP001_DISTRESS_POD.x, 1, MAP001_DISTRESS_POD.z);
  distressPod.billboardMode = 7;
  distressPod.material = assetMaterial(scene, "frontier-alloy-distress-marker", map001Asset.alloy, 0.52);
  distressPod.setEnabled(isMap001);

  const jax = MeshBuilder.CreatePlane("scavenger-jax-camp", { width: 2.8, height: 2.8 }, scene);
  jax.position = new Vector3(MAP002_JAX_CAMP.x, 1.4, MAP002_JAX_CAMP.z);
  jax.billboardMode = 7;
  jax.material = assetMaterial(scene, "scavenger-jax-material", map002Asset.jax, 0.5);
  jax.setEnabled(isMap002);

  const map002Elite = MeshBuilder.CreatePlane("obsidian-shell-golem-elite", { width: 4.3, height: 4.3 }, scene);
  map002Elite.position = new Vector3(25, 2.1, 5);
  map002Elite.billboardMode = 7;
  map002Elite.material = assetMaterial(scene, "obsidian-shell-golem-material", map002Asset.elite, 0.68);
  map002Elite.setEnabled(false);

  const pyroclasticAltar = MeshBuilder.CreatePlane("pyroclastic-altar", { width: 2.6, height: 2.6 }, scene);
  pyroclasticAltar.position = new Vector3(MAP002_PYROCLASTIC_ALTAR.x, 1.35, MAP002_PYROCLASTIC_ALTAR.z);
  pyroclasticAltar.billboardMode = 7;
  pyroclasticAltar.material = assetMaterial(scene, "pyroclastic-altar-material", map002Asset.ore, 0.72);
  pyroclasticAltar.setEnabled(isMap002);

  const lyra = MeshBuilder.CreatePlane("researcher-lyra-camp", { width: 2.8, height: 2.8 }, scene);
  lyra.position = new Vector3(MAP003_LYRA_CAMP.x, 1.4, MAP003_LYRA_CAMP.z);
  lyra.billboardMode = 7;
  lyra.material = assetMaterial(scene, "researcher-lyra-material", map003Asset.lyra, 0.56);
  lyra.setEnabled(isMap003);

  const map003Elite = MeshBuilder.CreatePlane("luminous-stalker-elite", { width: 4.1, height: 4.1 }, scene);
  map003Elite.position = new Vector3(-18.4, 2.05, 24);
  map003Elite.billboardMode = 7;
  map003Elite.material = assetMaterial(scene, "luminous-stalker-material", map003Asset.elite, 0.72);
  map003Elite.setEnabled(false);

  const myceliumShrine = MeshBuilder.CreatePlane("mycelium-empress-shrine", { width: 2.65, height: 2.65 }, scene);
  myceliumShrine.position = new Vector3(MAP003_EMPRESS_SHRINE.x, 1.4, MAP003_EMPRESS_SHRINE.z);
  myceliumShrine.billboardMode = 7;
  myceliumShrine.material = assetMaterial(scene, "mycelium-shrine-material", map003Asset.crystal, 0.8);
  myceliumShrine.setEnabled(isMap003);

  const zephyr = MeshBuilder.CreatePlane("cartographer-zephyr-camp", { width: 2.8, height: 2.8 }, scene);
  zephyr.position = new Vector3(MAP004_ZEPHYR_CAMP.x, 1.4, MAP004_ZEPHYR_CAMP.z);
  zephyr.billboardMode = 7;
  zephyr.material = assetMaterial(scene, "cartographer-zephyr-material", map004Asset.zephyr, 0.58);
  zephyr.setEnabled(isMap004);
  const map004Elite = MeshBuilder.CreatePlane("prism-golem-elite", { width: 4.3, height: 4.3 }, scene);
  map004Elite.position = new Vector3(-18, 2.1, 24);
  map004Elite.billboardMode = 7;
  map004Elite.material = assetMaterial(scene, "prism-golem-material", map004Asset.elite, 0.74);
  map004Elite.setEnabled(false);
  const resonanceDais = MeshBuilder.CreatePlane("resonance-archon-dais", { width: 2.65, height: 2.65 }, scene);
  resonanceDais.position = new Vector3(MAP004_ARCHON_DAIS.x, 1.4, MAP004_ARCHON_DAIS.z);
  resonanceDais.billboardMode = 7;
  resonanceDais.material = assetMaterial(scene, "resonance-dais-material", map004Asset.shard, 0.82);
  resonanceDais.setEnabled(isMap004);

  const vane = MeshBuilder.CreatePlane("alchemist-vane-shelter", { width: 2.8, height: 2.8 }, scene);
  vane.position = new Vector3(MAP005_VANE_SHELTER.x, 1.4, MAP005_VANE_SHELTER.z);
  vane.billboardMode = 7;
  vane.material = assetMaterial(scene, "alchemist-vane-material", map005Asset.vane, 0.58);
  vane.setEnabled(isMap005);
  const map005Elite = MeshBuilder.CreatePlane("mire-lurker-elite", { width: 4.3, height: 4.3 }, scene);
  map005Elite.position = new Vector3(-18, 2.1, 24);
  map005Elite.billboardMode = 7;
  map005Elite.material = assetMaterial(scene, "mire-lurker-material", map005Asset.elite, 0.72);
  map005Elite.setEnabled(false);
  const hydraNest = MeshBuilder.CreatePlane("toxic-hydra-nest", { width: 2.65, height: 2.65 }, scene);
  hydraNest.position = new Vector3(MAP005_HYDRA_NEST.x, 1.4, MAP005_HYDRA_NEST.z);
  hydraNest.billboardMode = 7;
  hydraNest.material = assetMaterial(scene, "toxic-hydra-nest-material", map005Asset.lily, 0.82);
  hydraNest.setEnabled(isMap005);

  const rusty = MeshBuilder.CreatePlane("engineer-rusty-stabilizer", { width: 2.8, height: 2.8 }, scene);
  rusty.position = new Vector3(MAP006_STABILIZER.x, 1.4, MAP006_STABILIZER.z);
  rusty.billboardMode = 7;
  rusty.material = assetMaterial(scene, "engineer-rusty-material", map006Asset.rusty, 0.58);
  rusty.setEnabled(isMap006);
  const map006Elite = MeshBuilder.CreatePlane("ironclad-golem-elite", { width: 4.3, height: 4.3 }, scene);
  map006Elite.position = new Vector3(-18, 2.1, 24);
  map006Elite.billboardMode = 7;
  map006Elite.material = assetMaterial(scene, "ironclad-golem-material", map006Asset.elite, 0.72);
  map006Elite.setEnabled(false);
  const colossusCore = MeshBuilder.CreatePlane("lodestone-colossus-core", { width: 2.65, height: 2.65 }, scene);
  colossusCore.position = new Vector3(MAP006_COLOSSUS_CORE.x, 1.4, MAP006_COLOSSUS_CORE.z);
  colossusCore.billboardMode = 7;
  colossusCore.material = assetMaterial(scene, "lodestone-core-material", map006Asset.sand, 0.82);
  colossusCore.setEnabled(isMap006);

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
  let enemySpeedMultiplier = 1;
  let playerSpeedMultiplier = 1;
  let pendingMapInteraction = false;
  let map001Warning: string | undefined;
  let map002Warning: string | undefined;
  let map003Warning: string | undefined;
  let map004Warning: string | undefined;
  let map005Warning: string | undefined;
  let map006Warning: string | undefined;

  const handleControl = (event: Event) => {
    const control = (event as CustomEvent<ArcaneControl>).detail;
    if (!control) return;
    if (control.type === "move") move = { x: control.x, y: control.y };
    if (control.type === "attack") attackPulse = 0.32;
    if (control.type === "dash") dashPulse = 0.25;
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
        }
      });
    }
  };

  const keyState = new Set<string>();
  const onKeyDown = (event: KeyboardEvent) => keyState.add(event.key.toLowerCase());
  const onKeyUp = (event: KeyboardEvent) => keyState.delete(event.key.toLowerCase());
  window.addEventListener("arcane-control", handleControl);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const keyboardX = (keyState.has("d") ? 1 : 0) - (keyState.has("a") ? 1 : 0);
    const keyboardY = (keyState.has("w") ? 1 : 0) - (keyState.has("s") ? 1 : 0);
    const movement = new Vector3(move.x + keyboardX, 0, move.y - keyboardY);
    const isMoving = movement.lengthSquared() > 0.01;
    if (isMoving) {
      movement.normalize();
      const speed = (dashPulse > 0 ? 18 : 7.8) * playerSpeedMultiplier;
      player.position.addInPlace(movement.scale(speed * dt));
      player.position.x = Math.max(-worldRadius, Math.min(worldRadius, player.position.x));
      player.position.z = Math.max(-worldRadius, Math.min(worldRadius, player.position.z));
      player.rotation.y = Math.atan2(movement.x, movement.z);
    }
    const cameraTarget = new Vector3(player.position.x, 0.5, player.position.z);
    camera.target = Vector3.Lerp(camera.target, cameraTarget, Math.min(1, dt * 5.4));
    dashPulse = Math.max(0, dashPulse - dt);
    attackPulse = Math.max(0, attackPulse - dt);
    const heroScale = 1 + Math.sin((0.32 - attackPulse) * 18) * attackPulse * 0.24;
    heroArt.scaling.setAll(heroScale);
    heroArt.position.y = 1.55 + Math.sin(performance.now() / 250) * (isMoving ? 0.08 : 0.025);
    const companion = options.companion ?? { following: true, lootRadius: 2, resourceYieldMultiplier: 1, damageMitigation: 0 };
    const companionRuntime = resolveCompanionRuntime({ pet: { x: pet.position.x, z: pet.position.z }, player: { x: player.position.x, z: player.position.z }, following: companion.following, playerMoving: isMoving, reducedMotion: options.reducedMotion, deltaSeconds: dt });
    pet.position.x = companionRuntime.position.x;
    pet.position.z = companionRuntime.position.z;
    pet.position.y = companionRuntime.state === "resting" ? 0 : options.reducedMotion ? 0 : Math.sin(performance.now() / 350) * 0.12;
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
    glow.intensity = options.reducedMotion ? 0.45 : 0.65 + lighting.motionIntensity * 0.32;
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
          enemy.position = new Vector3(MAP001_DISTRESS_POD.x + 2 + index, 1.25, MAP001_DISTRESS_POD.z - 2 - index);
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
          enemy.position = new Vector3(8 + index * 2.2, 1.25, 9 - index * 2);
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
          enemy.position = new Vector3(7 + index * 2.5, 1.25, 8 - index * 2.1);
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
      if (encounter.spawnGnats > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnGnats).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 38, alive: true, encounterName: "Shard Gnat · Reflection Field" }; enemy.position = new Vector3(13 + index * 2.4, 1.25, 10 - index * 2); });
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
      if (encounter.spawnSlimes > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnSlimes).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 36, alive: true, encounterName: "Acid Slime · Acid Drizzle" }; enemy.position = new Vector3(10 + index * 2.4, 1.25, -3 - index * 2); });
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
      if (encounter.spawnRays > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnRays).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 36, alive: true, encounterName: "Magnetic Hover-Ray · Magnetic Storm" }; enemy.position = new Vector3(10 + index * 2.4, 1.25, -3 - index * 2); });
      if (encounter.event === "safe-reset") { health = 100; player.position.set(MAP006_STABILIZER.x + 1.5, 0, MAP006_STABILIZER.z + 1.2); }
      rusty.setEnabled(isMap006 && (Vector3.Distance(player.position, rusty.position) < 12 || encounter.sheltered));
      const stormPulse = encounter.stormActive && !options.reducedMotion ? 1 + Math.sin(performance.now() / 145) * 0.14 : 1;
      colossusCore.scaling.setAll(encounter.memory.state === "boss-telegraph" ? stormPulse + 0.12 : stormPulse);
      map006Elite.scaling.setAll(options.reducedMotion ? 1 : 1 + Math.sin(performance.now() / 215) * 0.08);
    }

    const bossActive = isMap001 ? map001Memory.state === "boss-active" : isMap002 ? map002Memory.state === "boss-active" : isMap003 ? map003Memory.state === "boss-active" : isMap004 ? map004Memory.state === "boss-active" : isMap005 ? map005Memory.state === "boss-active" : isMap006 ? map006Memory.state === "boss-active" : lighting.phase === "night";
    boss.setEnabled(bossActive);
    if (bossActive) {
      boss.position.x = player.position.x + Math.sin(performance.now() / 1500) * 2.5;
      boss.position.z = player.position.z - 16;
      boss.position.y = 2.8 + Math.sin(performance.now() / 420) * 0.22;
    }

    if (performance.now() - lastEmit > 180) {
      options.onSnapshot?.({
        health,
        resources: collected,
        enemies: enemies.filter(enemy => enemy.metadata?.alive).length + (isMap001 && elite.metadata?.alive ? 1 : 0) + (isMap002 && map002Elite.isEnabled() ? 1 : 0) + (isMap003 && map003Elite.isEnabled() ? 1 : 0) + (isMap004 && map004Elite.isEnabled() ? 1 : 0) + (isMap005 && map005Elite.isEnabled() ? 1 : 0) + (isMap005 && bossActive ? 1 : 0) + (isMap006 && map006Elite.isEnabled() ? 1 : 0) + (isMap006 && bossActive ? 1 : 0),
        phase: lighting.phase,
        mapState: isMap001 ? map001Memory.state : isMap002 ? map002Memory.state : isMap003 ? map003Memory.state : isMap004 ? map004Memory.state : isMap005 ? map005Memory.state : isMap006 ? map006Memory.state : "exploring",
        warning: isMap001 ? map001Warning : isMap002 ? map002Warning : isMap003 ? map003Warning : isMap004 ? map004Warning : isMap005 ? map005Warning : isMap006 ? map006Warning : sceneTreatment ? (Math.floor(performance.now() / 7000) % 2 === 0 ? sceneTreatment.ambientEvent : sceneTreatment.hudPhrasing) : undefined,
        companionState: companionRuntime.state,
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
      scene.dispose();
    },
  };
}
