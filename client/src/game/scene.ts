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
import { MAP001_DISTRESS_POD, MAP001_MONOLITH, initialMap001Encounter, resolveMap001Encounter } from "@/game/map001/encounter";
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
  skyLight.intensity = 0.88;
  const keyLight = new DirectionalLight("arcane-key", new Vector3(-0.6, -1, -0.35), scene);
  keyLight.position = new Vector3(18, 28, 12);
  keyLight.intensity = 1.25;
  const glow = new GlowLayer("arcane-glow", scene, { blurKernelSize: 32 });
  glow.intensity = 0.82;

  const ground = MeshBuilder.CreateGround("obsidian-terrain", { width: worldRadius * 2.15, height: worldRadius * 2.15, subdivisions: 2 }, scene);
  const terrainMaterial = mapDefinition?.keyArt
    ? assetMaterial(scene, `${mapDefinition.id}-terrain-key-art`, mapDefinition.keyArt, 0.14)
    : material(scene, "obsidian-ground", "#101824", 0.1);
  terrainMaterial.alpha = mapDefinition?.keyArt ? 0.28 : 1;
  ground.material = terrainMaterial;

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

  const enemyMaterial = assetMaterial(scene, "glass-stalker-material", map001Asset.stalker, 0.62);
  const enemies = Array.from({ length: 7 }, (_, index) => {
    const enemy = MeshBuilder.CreatePlane(`${regularMonster.toLowerCase().replaceAll(" ", "-")}-${index}`, { width: 2.5, height: 2.5 }, scene);
    const angle = (Math.PI * 2 * index) / 7;
    enemy.position = new Vector3(Math.cos(angle) * (10 + index * 1.2), 1.25, Math.sin(angle) * (10 + index * 1.2));
    enemy.billboardMode = 7;
    enemy.material = enemyMaterial;
    enemy.metadata = { health: 30, alive: true, encounterName: regularMonster };
    return enemy;
  });

  const resourceMaterial = assetMaterial(scene, "ley-crystal-material", map001Asset.crystal, 0.82);
  const resources = Array.from({ length: 10 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 10 + 0.3;
    const resource = MeshBuilder.CreatePlane(`ley-crystal-${index}`, { width: 1.35, height: 1.35 }, scene);
    resource.position = new Vector3(Math.cos(angle) * (7 + (index % 4) * 2), 0.72, Math.sin(angle) * (7 + (index % 4) * 2));
    resource.billboardMode = 7;
    resource.material = resourceMaterial;
    return resource;
  });

  const boss = MeshBuilder.CreatePlane(`${eventBoss.toLowerCase().replaceAll(" ", "-")}-event-boss`, { width: 5.8, height: 5.8 }, scene);
  boss.position = new Vector3(0, 2.8, -18);
  boss.billboardMode = 7;
  boss.material = assetMaterial(scene, "void-reaper-boss-material", map001Asset.boss, 0.92);
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

  let move = { x: 0, y: 0 };
  let health = 100;
  let collected = 0;
  let attackPulse = 0;
  let dashPulse = 0;
  let lastEmit = 0;
  let lastDamage = 0;
  let map001Memory = initialMap001Encounter();
  let pendingMapInteraction = false;
  let map001Warning: string | undefined;

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
      const speed = dashPulse > 0 ? 18 : 7.8;
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
      const delta = player.position.subtract(enemy.position);
      const distance = delta.length();
      if (distance < 14) {
        delta.normalize();
        enemy.position.addInPlace(delta.scale(dt * (1.5 + index * 0.05)));
        enemy.rotation.y = Math.atan2(delta.x, delta.z);
      }
      if (attackPulse > 0 && distance < 4.2) {
        enemy.metadata.health -= 36 * dt * 12;
        if (enemy.metadata.health <= 0) {
          enemy.metadata.alive = false;
          enemy.setEnabled(false);
          collected += 2;
        }
      }
      if (distance < 1.7 && performance.now() - lastDamage > 800) {
        health = Math.max(0, health - Math.max(1, Math.round(4 * (1 - companion.damageMitigation))));
        lastDamage = performance.now();
      }
    });

    const lighting = getWorldLighting(options.mapId);
    const sky = Color3.FromHexString(lighting.sky);
    scene.clearColor = new Color4(sky.r, sky.g, sky.b, 1);
    skyLight.diffuse = Color3.FromHexString(lighting.ambient);
    keyLight.diffuse = Color3.FromHexString(lighting.directional);
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

    const bossActive = isMap001 ? map001Memory.state === "boss-active" : lighting.phase === "night";
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
        enemies: enemies.filter(enemy => enemy.metadata?.alive).length + (isMap001 && elite.metadata?.alive ? 1 : 0),
        phase: lighting.phase,
        mapState: isMap001 ? map001Memory.state : "exploring",
        warning: map001Warning,
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
