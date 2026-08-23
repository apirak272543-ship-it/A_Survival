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
import { getGameAssetUrl } from "@/game/assets/pollinations";

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

const map007Asset = {
  frost: "/manus-storage/scout-frost_9dca1a23.jpg",
  weaver: "/manus-storage/frostbite-weaver_10752103.jpg",
  elite: "/manus-storage/cryo-beast_c26d6444.jpg",
  boss: "/manus-storage/glacial-terror_c5edf25c.jpg",
  crystal: "/manus-storage/cryo-crystal_bdf10c85.jpg",
};

const map008Asset = {
  kael: "/manus-storage/historian-kael_91aba0ed.jpg",
  drone: "/manus-storage/sentinel-drone_d76e8dac.jpg",
  elite: "/manus-storage/ruin-guardian_8b582e9f.jpg",
  boss: "/manus-storage/matrix-overlord_ebc672f3.jpg",
  relic: "/manus-storage/ancient-relic_4bed6a8a.jpg",
};

const map009Asset = {
  iris: "/manus-storage/botanist-iris_6ee1f067.jpg",
  stalker: "/manus-storage/vine-stalker_5d03728e.jpg",
  elite: "/manus-storage/thornback-behemoth_1319f41f.jpg",
  boss: "/manus-storage/verdant-hive-mind_f4e78c03.jpg",
  bloom: "/manus-storage/alien-bloom_eb6b9201.jpg",
};

const map010Asset = {
  wanderer: "/manus-storage/void-wanderer-final_388eac96.jpg",
  larva: "/manus-storage/void-larva_17e9a4a9.jpg",
  elite: "/manus-storage/rift-horror_7749a2c0.jpg",
  boss: "/manus-storage/void-singularity_6a946640.jpg",
  essence: "/manus-storage/void-essence-final_17daa419.jpg",
};

const map011Asset = {
  npc: getGameAssetUrl("portrait of a rugged obsidian forgemaster with glowing ember eyes and heavy leather apron, dark fantasy sci-fi game art, no text no ui", { seed: 11021 }),
  regular: getGameAssetUrl("small obsidian lava crawler with glowing orange cracks, dark fantasy sci-fi game monster, no text no ui", { seed: 11022 }),
  elite: getGameAssetUrl("hulking pyroclast brute made of jagged obsidian and molten rock, dark fantasy sci-fi game elite monster, no text no ui", { seed: 11023 }),
  boss: getGameAssetUrl("towering ignis colossus of black glass and lava with a molten crown, dark fantasy sci-fi game boss, no text no ui", { seed: 11024 }),
  resource: getGameAssetUrl("glowing orange cinder bloom flower growing from black basalt, dark fantasy sci-fi game resource, no text no ui", { seed: 11025 }),
};

const map012Asset = {
  npc: getGameAssetUrl("portrait of a wind-scarred scout with a hood and brass goggles, dark fantasy sci-fi game art, no text no ui", { seed: 11026 }),
  regular: getGameAssetUrl("lean spire stalker with razor glass wings and obsidian limbs, dark fantasy sci-fi game monster, no text no ui", { seed: 11027 }),
  elite: getGameAssetUrl("gale-talon alpha with jagged black feathers and a purple wind aura, dark fantasy sci-fi game elite monster, no text no ui", { seed: 11028 }),
  boss: getGameAssetUrl("gale-terror zephyr a massive storm bird of obsidian and violet lightning, dark fantasy sci-fi game boss, no text no ui", { seed: 11029 }),
  resource: getGameAssetUrl("shard of razor glass with purple internal glow on dark rock, dark fantasy sci-fi game resource, no text no ui", { seed: 11030 }),
};

const map013Asset = {
  npc: getGameAssetUrl("portrait of a masked alchemist with green sulfur stains and brass filters, dark fantasy sci-fi game art, no text no ui", { seed: 11031 }),
  regular: getGameAssetUrl("mire leaper a bloated frog-like creature with sulfur pustules, dark fantasy sci-fi game monster, no text no ui", { seed: 11032 }),
  elite: getGameAssetUrl("corrosive aberration a dripping mass of acid and black chitin, dark fantasy sci-fi game elite monster, no text no ui", { seed: 11033 }),
  boss: getGameAssetUrl("bile-mother vile a massive sulfur hydra with glowing yellow boils, dark fantasy sci-fi game boss, no text no ui", { seed: 11034 }),
  resource: getGameAssetUrl("yellow sulfur crust crystal on black mire stone, dark fantasy sci-fi game resource, no text no ui", { seed: 11035 }),
};

const map014Asset = {
  npc: getGameAssetUrl("portrait of a stern warden in cracked basalt armor, dark fantasy sci-fi game art, no text no ui", { seed: 11036 }),
  regular: getGameAssetUrl("bastion hound a muscular obsidian canine with magma veins, dark fantasy sci-fi game monster, no text no ui", { seed: 11037 }),
  elite: getGameAssetUrl("magma drake sentinel a wingless drake of black rock and fire, dark fantasy sci-fi game elite monster, no text no ui", { seed: 11038 }),
  boss: getGameAssetUrl("trench-lord baelrok a colossal armored magma titan with a broken bridge for a crown, dark fantasy sci-fi game boss, no text no ui", { seed: 11039 }),
  resource: getGameAssetUrl("chunk of hardened magma with cooling orange cracks, dark fantasy sci-fi game resource, no text no ui", { seed: 11040 }),
};

const map015Asset = {
  npc: getGameAssetUrl("portrait of a serene forge avatar with glowing white tattoos and obsidian robes, dark fantasy sci-fi game art, no text no ui", { seed: 11041 }),
  regular: getGameAssetUrl("crucible myrmidon a soldier of living obsidian with a furnace core, dark fantasy sci-fi game monster, no text no ui", { seed: 11042 }),
  elite: getGameAssetUrl("dread infernal goliath a massive horned demon of black glass and red fire, dark fantasy sci-fi game elite monster, no text no ui", { seed: 11043 }),
  boss: getGameAssetUrl("the crucible overlord a god-like obsidian titan with a burning anvil heart, dark fantasy sci-fi game boss, no text no ui", { seed: 11044 }),
  resource: getGameAssetUrl("primal core ember a perfect sphere of white-hot obsidian, dark fantasy sci-fi game resource, no text no ui", { seed: 11045 }),
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

  const enemyMaterial = isMap010
    ? assetMaterial(scene, "void-larva-material", map010Asset.larva, 0.76)
    : isMap011
    ? assetMaterial(scene, "cinder-crawler-material", map011Asset.regular, 0.72)
    : isMap012
    ? assetMaterial(scene, "spire-stalker-material", map012Asset.regular, 0.72)
    : isMap013
    ? assetMaterial(scene, "mire-leaper-material", map013Asset.regular, 0.72)
    : isMap014
    ? assetMaterial(scene, "bastion-hound-material", map014Asset.regular, 0.72)
    : isMap015
    ? assetMaterial(scene, "crucible-myrmidon-material", map015Asset.regular, 0.72)
    : isMap009
    ? assetMaterial(scene, "vine-stalker-material", map009Asset.stalker, 0.74)
    : isMap008
    ? assetMaterial(scene, "sentinel-drone-material", map008Asset.drone, 0.74)
    : isMap007
    ? assetMaterial(scene, "frostbite-weaver-material", map007Asset.weaver, 0.72)
    : isMap006
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
    if ((isMap002 || isMap006 || isMap007 || isMap008 || isMap009 || isMap010) && index > 4) enemy.setEnabled(false);
    return enemy;
  });

  const resourceMaterial = isMap010
    ? assetMaterial(scene, "void-essence-material", map010Asset.essence, 0.88)
    : isMap011
    ? assetMaterial(scene, "cinder-bloom-material", map011Asset.resource, 0.82)
    : isMap012
    ? assetMaterial(scene, "razor-glass-material", map012Asset.resource, 0.82)
    : isMap013
    ? assetMaterial(scene, "sulfur-crust-material", map013Asset.resource, 0.82)
    : isMap014
    ? assetMaterial(scene, "hardened-magma-material", map014Asset.resource, 0.82)
    : isMap015
    ? assetMaterial(scene, "primal-ember-material", map015Asset.resource, 0.82)
    : isMap009
    ? assetMaterial(scene, "alien-bloom-material", map009Asset.bloom, 0.86)
    : isMap008
    ? assetMaterial(scene, "ancient-relic-material", map008Asset.relic, 0.86)
    : isMap007
    ? assetMaterial(scene, "cryo-crystal-material", map007Asset.crystal, 0.88)
    : isMap006
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
    const resource = MeshBuilder.CreatePlane(`${isMap010 ? "void-essence" : isMap011 ? "cinder-bloom" : isMap012 ? "razor-glass" : isMap013 ? "sulfur-crust" : isMap014 ? "hardened-magma" : isMap015 ? "primal-ember" : isMap009 ? "alien-bloom" : isMap008 ? "ancient-relic" : isMap007 ? "cryo-crystal" : isMap006 ? "magnetite-sand" : isMap005 ? "toxic-lily" : isMap004 ? "resonance-shard" : isMap003 ? "glow-crystal" : isMap002 ? "ember-ore" : "ley-crystal"}-${index}`, { width: 1.35, height: 1.35 }, scene);
    resource.position = new Vector3(Math.cos(angle) * (7 + (index % 4) * 2), 0.72, Math.sin(angle) * (7 + (index % 4) * 2));
    resource.billboardMode = 7;
    resource.material = resourceMaterial;
    return resource;
  });

  const boss = MeshBuilder.CreatePlane(`${eventBoss.toLowerCase().replaceAll(" ", "-")}-event-boss`, { width: 5.8, height: 5.8 }, scene);
  boss.position = new Vector3(0, 2.8, -18);
  boss.billboardMode = 7;
  boss.material = isMap010
    ? assetMaterial(scene, "void-singularity-material", map010Asset.boss, 0.98)
    : isMap011
    ? assetMaterial(scene, "ignis-colossus-material", map011Asset.boss, 0.96)
    : isMap012
    ? assetMaterial(scene, "gale-terror-zephyr-material", map012Asset.boss, 0.96)
    : isMap013
    ? assetMaterial(scene, "bile-mother-vile-material", map013Asset.boss, 0.96)
    : isMap014
    ? assetMaterial(scene, "trench-lord-baelrok-material", map014Asset.boss, 0.96)
    : isMap015
    ? assetMaterial(scene, "crucible-overlord-material", map015Asset.boss, 0.96)
    : isMap009
    ? assetMaterial(scene, "verdant-hive-mind-material", map009Asset.boss, 0.98)
    : isMap008
    ? assetMaterial(scene, "matrix-overlord-material", map008Asset.boss, 0.98)
    : isMap007
    ? assetMaterial(scene, "glacial-terror-material", map007Asset.boss, 0.97)
    : isMap006
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

  const scoutFrost = MeshBuilder.CreatePlane("scout-frost-steam-vent", { width: 2.8, height: 2.8 }, scene);
  scoutFrost.position = new Vector3(MAP007_STEAM_VENT.x, 1.4, MAP007_STEAM_VENT.z);
  scoutFrost.billboardMode = 7;
  scoutFrost.material = assetMaterial(scene, "scout-frost-material", map007Asset.frost, 0.6);
  scoutFrost.setEnabled(isMap007);
  const map007Elite = MeshBuilder.CreatePlane("cryo-beast-elite", { width: 4.3, height: 4.3 }, scene);
  map007Elite.position = new Vector3(-18, 2.1, 24);
  map007Elite.billboardMode = 7;
  map007Elite.material = assetMaterial(scene, "cryo-beast-material", map007Asset.elite, 0.74);
  map007Elite.setEnabled(false);
  const terrorRift = MeshBuilder.CreatePlane("glacial-terror-rift", { width: 2.65, height: 2.65 }, scene);
  terrorRift.position = new Vector3(MAP007_TERROR_RIFT.x, 1.4, MAP007_TERROR_RIFT.z);
  terrorRift.billboardMode = 7;
  terrorRift.material = assetMaterial(scene, "glacial-terror-rift-material", map007Asset.crystal, 0.84);
  terrorRift.setEnabled(isMap007);

  const kael = MeshBuilder.CreatePlane("historian-kael-rune-terminal", { width: 2.8, height: 2.8 }, scene);
  kael.position = new Vector3(MAP008_RUNE_TERMINAL.x, 1.4, MAP008_RUNE_TERMINAL.z);
  kael.billboardMode = 7;
  kael.material = assetMaterial(scene, "historian-kael-material", map008Asset.kael, 0.6);
  kael.setEnabled(isMap008);
  const map008Elite = MeshBuilder.CreatePlane("ruin-guardian-elite", { width: 4.3, height: 4.3 }, scene);
  map008Elite.position = new Vector3(-18, 2.1, 24);
  map008Elite.billboardMode = 7;
  map008Elite.material = assetMaterial(scene, "ruin-guardian-material", map008Asset.elite, 0.74);
  map008Elite.setEnabled(false);
  const matrixCore = MeshBuilder.CreatePlane("matrix-overlord-core", { width: 2.65, height: 2.65 }, scene);
  matrixCore.position = new Vector3(MAP008_MATRIX_CORE.x, 1.4, MAP008_MATRIX_CORE.z);
  matrixCore.billboardMode = 7;
  matrixCore.material = assetMaterial(scene, "matrix-core-material", map008Asset.relic, 0.84);
  matrixCore.setEnabled(isMap008);

  const iris = MeshBuilder.CreatePlane("botanist-iris-canopy-haven", { width: 2.8, height: 2.8 }, scene);
  iris.position = new Vector3(MAP009_CANOPY_HAVEN.x, 1.4, MAP009_CANOPY_HAVEN.z);
  iris.billboardMode = 7;
  iris.material = assetMaterial(scene, "botanist-iris-material", map009Asset.iris, 0.6);
  iris.setEnabled(isMap009);
  const map009Elite = MeshBuilder.CreatePlane("thornback-behemoth-elite", { width: 4.3, height: 4.3 }, scene);
  map009Elite.position = new Vector3(-18, 2.1, 24);
  map009Elite.billboardMode = 7;
  map009Elite.material = assetMaterial(scene, "thornback-behemoth-material", map009Asset.elite, 0.74);
  map009Elite.setEnabled(false);
  const hiveRoot = MeshBuilder.CreatePlane("verdant-hive-root", { width: 2.65, height: 2.65 }, scene);
  hiveRoot.position = new Vector3(MAP009_HIVE_ROOT.x, 1.4, MAP009_HIVE_ROOT.z);
  hiveRoot.billboardMode = 7;
  hiveRoot.material = assetMaterial(scene, "verdant-hive-root-material", map009Asset.bloom, 0.84);
  hiveRoot.setEnabled(isMap009);

  const voidWanderer = MeshBuilder.CreatePlane("void-wanderer-stable-pylon", { width: 2.8, height: 2.8 }, scene);
  voidWanderer.position = new Vector3(MAP010_STABLE_PYLON.x, 1.4, MAP010_STABLE_PYLON.z);
  voidWanderer.billboardMode = 7;
  voidWanderer.material = assetMaterial(scene, "void-wanderer-material", map010Asset.wanderer, 0.62);
  voidWanderer.setEnabled(isMap010);
  const map010Elite = MeshBuilder.CreatePlane("rift-horror-elite", { width: 4.3, height: 4.3 }, scene);
  map010Elite.position = new Vector3(-18, 2.1, 24);
  map010Elite.billboardMode = 7;
  map010Elite.material = assetMaterial(scene, "rift-horror-material", map010Asset.elite, 0.76);
  map010Elite.setEnabled(false);
  const singularityGate = MeshBuilder.CreatePlane("void-singularity-gate", { width: 2.65, height: 2.65 }, scene);
  singularityGate.position = new Vector3(MAP010_SINGULARITY_GATE.x, 1.4, MAP010_SINGULARITY_GATE.z);
  singularityGate.billboardMode = 7;
  singularityGate.material = assetMaterial(scene, "void-singularity-gate-material", map010Asset.essence, 0.86);
  singularityGate.setEnabled(isMap010);

  const forgemasterVael = MeshBuilder.CreatePlane("forgemaster-vael-camp", { width: 2.8, height: 2.8 }, scene);
  forgemasterVael.position = new Vector3(MAP011_FORGE_CAMP.x, 1.4, MAP011_FORGE_CAMP.z);
  forgemasterVael.billboardMode = 7;
  forgemasterVael.material = assetMaterial(scene, "forgemaster-vael-material", map011Asset.npc, 0.58);
  forgemasterVael.setEnabled(isMap011);
  const map011Elite = MeshBuilder.CreatePlane("pyroclast-brute-elite", { width: 4.3, height: 4.3 }, scene);
  map011Elite.position = new Vector3(-18, 2.1, 24);
  map011Elite.billboardMode = 7;
  map011Elite.material = assetMaterial(scene, "pyroclast-brute-material", map011Asset.elite, 0.74);
  map011Elite.setEnabled(false);
  const smelterArch = MeshBuilder.CreatePlane("shattered-smelter-arch", { width: 2.65, height: 2.65 }, scene);
  smelterArch.position = new Vector3(MAP011_SMELTER_ARCH.x, 1.4, MAP011_SMELTER_ARCH.z);
  smelterArch.billboardMode = 7;
  smelterArch.material = assetMaterial(scene, "smelter-arch-material", map011Asset.resource, 0.82);
  smelterArch.setEnabled(isMap011);

  const scoutKaelen = MeshBuilder.CreatePlane("scout-kaelen-overlook", { width: 2.8, height: 2.8 }, scene);
  scoutKaelen.position = new Vector3(MAP012_SCOUT_OVERLOOK.x, 1.4, MAP012_SCOUT_OVERLOOK.z);
  scoutKaelen.billboardMode = 7;
  scoutKaelen.material = assetMaterial(scene, "scout-kaelen-material", map012Asset.npc, 0.58);
  scoutKaelen.setEnabled(isMap012);
  const map012Elite = MeshBuilder.CreatePlane("gale-talon-alpha-elite", { width: 4.3, height: 4.3 }, scene);
  map012Elite.position = new Vector3(-18, 2.1, 24);
  map012Elite.billboardMode = 7;
  map012Elite.material = assetMaterial(scene, "gale-talon-alpha-material", map012Asset.elite, 0.74);
  map012Elite.setEnabled(false);
  const windMonolith = MeshBuilder.CreatePlane("wind-monolith", { width: 2.65, height: 2.65 }, scene);
  windMonolith.position = new Vector3(MAP012_WIND_MONOLITH.x, 1.4, MAP012_WIND_MONOLITH.z);
  windMonolith.billboardMode = 7;
  windMonolith.material = assetMaterial(scene, "wind-monolith-material", map012Asset.resource, 0.82);
  windMonolith.setEnabled(isMap012);

  const alchemistTheron = MeshBuilder.CreatePlane("alchemist-theron-boardwalk", { width: 2.8, height: 2.8 }, scene);
  alchemistTheron.position = new Vector3(MAP013_THERON_BOARDWALK.x, 1.4, MAP013_THERON_BOARDWALK.z);
  alchemistTheron.billboardMode = 7;
  alchemistTheron.material = assetMaterial(scene, "alchemist-theron-material", map013Asset.npc, 0.58);
  alchemistTheron.setEnabled(isMap013);
  const map013Elite = MeshBuilder.CreatePlane("corrosive-aberration-elite", { width: 4.3, height: 4.3 }, scene);
  map013Elite.position = new Vector3(-18, 2.1, 24);
  map013Elite.billboardMode = 7;
  map013Elite.material = assetMaterial(scene, "corrosive-aberration-material", map013Asset.elite, 0.74);
  map013Elite.setEnabled(false);
  const sulfurFalls = MeshBuilder.CreatePlane("sulfur-falls", { width: 2.65, height: 2.65 }, scene);
  sulfurFalls.position = new Vector3(MAP013_SULFUR_FALLS.x, 1.4, MAP013_SULFUR_FALLS.z);
  sulfurFalls.billboardMode = 7;
  sulfurFalls.material = assetMaterial(scene, "sulfur-falls-material", map013Asset.resource, 0.82);
  sulfurFalls.setEnabled(isMap013);

  const wardenSonya = MeshBuilder.CreatePlane("warden-sonya-post", { width: 2.8, height: 2.8 }, scene);
  wardenSonya.position = new Vector3(MAP014_WARDEN_POST.x, 1.4, MAP014_WARDEN_POST.z);
  wardenSonya.billboardMode = 7;
  wardenSonya.material = assetMaterial(scene, "warden-sonya-material", map014Asset.npc, 0.58);
  wardenSonya.setEnabled(isMap014);
  const map014Elite = MeshBuilder.CreatePlane("magma-drake-sentinel-elite", { width: 4.3, height: 4.3 }, scene);
  map014Elite.position = new Vector3(-18, 2.1, 24);
  map014Elite.billboardMode = 7;
  map014Elite.material = assetMaterial(scene, "magma-drake-sentinel-material", map014Asset.elite, 0.74);
  map014Elite.setEnabled(false);
  const citadelGate = MeshBuilder.CreatePlane("citadel-gate", { width: 2.65, height: 2.65 }, scene);
  citadelGate.position = new Vector3(MAP014_CITADEL_GATE.x, 1.4, MAP014_CITADEL_GATE.z);
  citadelGate.billboardMode = 7;
  citadelGate.material = assetMaterial(scene, "citadel-gate-material", map014Asset.resource, 0.82);
  citadelGate.setEnabled(isMap014);

  const forgeAvatar = MeshBuilder.CreatePlane("forge-avatar-shrine", { width: 2.8, height: 2.8 }, scene);
  forgeAvatar.position = new Vector3(MAP015_FORGE_SHRINE.x, 1.4, MAP015_FORGE_SHRINE.z);
  forgeAvatar.billboardMode = 7;
  forgeAvatar.material = assetMaterial(scene, "forge-avatar-material", map015Asset.npc, 0.58);
  forgeAvatar.setEnabled(isMap015);
  const map015Elite = MeshBuilder.CreatePlane("dread-infernal-goliath-elite", { width: 4.3, height: 4.3 }, scene);
  map015Elite.position = new Vector3(-18, 2.1, 24);
  map015Elite.billboardMode = 7;
  map015Elite.material = assetMaterial(scene, "dread-infernal-goliath-material", map015Asset.elite, 0.74);
  map015Elite.setEnabled(false);
  const primalAnvil = MeshBuilder.CreatePlane("primal-anvil", { width: 2.65, height: 2.65 }, scene);
  primalAnvil.position = new Vector3(MAP015_PRIMAL_ANVIL.x, 1.4, MAP015_PRIMAL_ANVIL.z);
  primalAnvil.billboardMode = 7;
  primalAnvil.material = assetMaterial(scene, "primal-anvil-material", map015Asset.resource, 0.82);
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

    if (isMap007) {
      const encounter = resolveMap007Encounter(map007Memory, { x: player.position.x, z: player.position.z, health, harvestedCrystals: map007HarvestedCrystals, defeatedWeavers: map007DefeatedWeavers, interacted: pendingMapInteraction, now: performance.now() });
      map007Memory = encounter.memory;
      pendingMapInteraction = false;
      map007Warning = encounter.warning;
      if (encounter.coldDamagePerSecond > 0) health = Math.max(0, health - encounter.coldDamagePerSecond * dt);
      map007Elite.setEnabled(encounter.activateElite);
      if (encounter.spawnWeavers > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnWeavers).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 36, alive: true, encounterName: "Frostbite Weaver · Blizzard" }; enemy.position = new Vector3(10 + index * 2.4, 1.25, -3 - index * 2); });
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
      if (encounter.spawnDrones > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnDrones).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 36, alive: true, encounterName: "Sentinel Drone · Defense Sweep" }; enemy.position = new Vector3(10 + index * 2.4, 1.25, -3 - index * 2); });
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
      if (encounter.spawnStalkers > 0) enemies.filter(enemy => !enemy.isEnabled()).slice(0, encounter.spawnStalkers).forEach((enemy, index) => { enemy.setEnabled(true); enemy.metadata = { health: 36, alive: true, encounterName: "Vine Stalker · Toxic Downpour" }; enemy.position = new Vector3(10 + index * 2.4, 1.25, -3 - index * 2); });
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
      boss.position.y = 2.8 + Math.sin(performance.now() / 420) * 0.22;
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
