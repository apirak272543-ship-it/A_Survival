import { createStarterInstance, getItemDefinition, isPlantCompatibleWithSoil, type ItemInstance, type SoilId } from "@/game/data/catalog";

export type PetSlot = "collar" | "core";
export type CompanionRuntimeState = "resting" | "idle" | "following" | "teleporting";
export type CompanionPosition = { x: number; z: number };

export type HomeStructure = {
  id: string;
  definitionId: string;
  x: number;
  z: number;
  rotation: 0 | 90 | 180 | 270;
  item?: ItemInstance;
};

export type HomePlot = {
  id: string;
  soilId: SoilId;
  seedDefinitionId?: string;
  seedInstanceId?: string;
  plantedAt?: number;
  growthDurationMs?: number;
};

export type HomeState = {
  structures: HomeStructure[];
  plots: HomePlot[];
  petName: string;
  petFollowing?: boolean;
  petEquipment?: Partial<Record<PetSlot, ItemInstance>>;
};

export type HomeAction = {
  id: string;
  type: "place-structure" | "move-structure" | "rotate-structure" | "recall-structure" | "plant-seed" | "harvest-crop" | "equip-pet-item" | "unequip-pet-item" | "toggle-pet-follow" | "use-item" | "block-place" | "block-break" | "plant-world-seed" | "harvest-world-crop";
  createdAt: number;
  payload: Record<string, unknown>;
};

export const HOME_GRID_SIZE = 12;
export const DEFAULT_GROWTH_DURATION_MS = 2 * 60 * 1000;

export type CropStage = "seeded" | "sprout" | "mature" | "withered";

const actionId = (type: string, now: number) => `${type}-${now}-${Math.random().toString(36).slice(2, 8)}`;

export function getCropStage(plot: HomePlot, now = Date.now()): CropStage | null {
  if (!plot.seedDefinitionId || !plot.plantedAt) return null;
  const progress = Math.max(0, (now - plot.plantedAt) / (plot.growthDurationMs ?? DEFAULT_GROWTH_DURATION_MS));
  if (progress < 0.4) return "seeded";
  if (progress < 1) return "sprout";
  if (progress < 2) return "mature";
  return "withered";
}

function footprint(definitionId: string, rotation: HomeStructure["rotation"]) {
  const ordinal = Number(definitionId.split("-").at(-1) ?? 1);
  const base = ordinal % 3 === 0 ? { width: 3, height: 2 } : ordinal % 2 === 0 ? { width: 1, height: 2 } : { width: 2, height: 2 };
  return rotation === 90 || rotation === 270 ? { width: base.height, height: base.width } : base;
}

function occupies(structure: HomeStructure, x: number, z: number) {
  const size = footprint(structure.definitionId, structure.rotation);
  return x >= structure.x && x < structure.x + size.width && z >= structure.z && z < structure.z + size.height;
}

function isValidPlacement(structures: HomeStructure[], candidate: HomeStructure) {
  const size = footprint(candidate.definitionId, candidate.rotation);
  if (candidate.x < 0 || candidate.z < 0 || candidate.x + size.width > HOME_GRID_SIZE || candidate.z + size.height > HOME_GRID_SIZE) return false;
  for (let x = candidate.x; x < candidate.x + size.width; x += 1) {
    for (let z = candidate.z; z < candidate.z + size.height; z += 1) {
      if (structures.some(structure => occupies(structure, x, z))) return false;
    }
  }
  return true;
}

export function placeHomeObject(input: { home: HomeState; inventory: ItemInstance[]; instanceId: string; x: number; z: number; rotation?: HomeStructure["rotation"]; now?: number }) {
  const item = input.inventory.find(candidate => candidate.instanceId === input.instanceId);
  const definition = item ? getItemDefinition(item.definitionId) : undefined;
  if (!item || !definition || !["structure", "furniture", "decoration"].includes(definition.category)) return { ok: false as const, reason: "เลือก structure, furniture หรือ decoration instance จากคลังก่อน" };
  const structure: HomeStructure = { id: item.instanceId, definitionId: item.definitionId, x: input.x, z: input.z, rotation: input.rotation ?? 0, item };
  if (!isValidPlacement(input.home.structures, structure)) return { ok: false as const, reason: "พื้นที่นี้ทับซ้อนหรืออยู่นอกขอบเขต Home grid" };
  const now = input.now ?? Date.now();
  return {
    ok: true as const,
    home: { ...input.home, structures: input.home.structures.concat(structure) },
    inventory: input.inventory.filter(candidate => candidate.instanceId !== item.instanceId),
    action: { id: actionId("place-structure", now), type: "place-structure" as const, createdAt: now, payload: { instanceId: item.instanceId, definitionId: item.definitionId, x: input.x, z: input.z, rotation: structure.rotation } },
  };
}

export const placeStructure = placeHomeObject;

export function rotateStructure(home: HomeState, structureId: string, now = Date.now()) {
  const current = home.structures.find(structure => structure.id === structureId);
  if (!current) return { ok: false as const, reason: "ไม่พบโครงสร้างที่เลือก" };
  const rotation = ((current.rotation + 90) % 360) as HomeStructure["rotation"];
  const candidate = { ...current, rotation };
  const others = home.structures.filter(structure => structure.id !== structureId);
  if (!isValidPlacement(others, candidate)) return { ok: false as const, reason: "หมุนไม่ได้ เพราะชิ้นส่วนจะชนขอบเขตหรือโครงสร้างอื่น" };
  return { ok: true as const, home: { ...home, structures: others.concat(candidate) }, action: { id: actionId("rotate-structure", now), type: "rotate-structure" as const, createdAt: now, payload: { structureId, rotation } } };
}

export function moveStructure(home: HomeState, structureId: string, x: number, z: number, now = Date.now()) {
  const current = home.structures.find(structure => structure.id === structureId);
  if (!current) return { ok: false as const, reason: "ไม่พบโครงสร้างที่เลือก" };
  const candidate = { ...current, x, z };
  const others = home.structures.filter(structure => structure.id !== structureId);
  if (!isValidPlacement(others, candidate)) return { ok: false as const, reason: "ย้ายไม่ได้ เพราะตำแหน่งใหม่ทับซ้อนหรืออยู่นอก Home grid" };
  return { ok: true as const, home: { ...home, structures: others.concat(candidate) }, action: { id: actionId("move-structure", now), type: "move-structure" as const, createdAt: now, payload: { structureId, x, z } } };
}

export function recallStructure(home: HomeState, inventory: ItemInstance[], structureId: string, now = Date.now()) {
  const structure = home.structures.find(candidate => candidate.id === structureId);
  if (!structure?.item) return { ok: false as const, reason: "ชิ้นส่วนนี้เป็นข้อมูลเก่า จึงยังเก็บคืนไม่ได้" };
  if (inventory.some(item => item.instanceId === structure.item?.instanceId)) return { ok: false as const, reason: "ตรวจพบ instance ซ้ำ จึงระงับการเก็บคืน" };
  return { ok: true as const, home: { ...home, structures: home.structures.filter(candidate => candidate.id !== structureId) }, inventory: inventory.concat(structure.item), action: { id: actionId("recall-structure", now), type: "recall-structure" as const, createdAt: now, payload: { structureId, instanceId: structure.item.instanceId } } };
}

export function plantSeed(home: HomeState, inventory: ItemInstance[], plotId: string, seedInstanceId: string, now = Date.now()) {
  const plot = home.plots.find(candidate => candidate.id === plotId);
  const seed = inventory.find(candidate => candidate.instanceId === seedInstanceId);
  const definition = seed ? getItemDefinition(seed.definitionId) : undefined;
  if (!plot || !seed || !definition || !isPlantCompatibleWithSoil(definition, plot.soilId)) return { ok: false as const, reason: "เมล็ดนี้ไม่เข้ากับดินแปลงที่เลือก" };
  if (plot.seedDefinitionId) return { ok: false as const, reason: "แปลงนี้มีพืชอยู่แล้ว" };
  const planted: HomePlot = { ...plot, seedDefinitionId: seed.definitionId, seedInstanceId: seed.instanceId, plantedAt: now, growthDurationMs: DEFAULT_GROWTH_DURATION_MS };
  return { ok: true as const, home: { ...home, plots: home.plots.map(candidate => candidate.id === plotId ? planted : candidate) }, inventory: inventory.filter(candidate => candidate.instanceId !== seed.instanceId), action: { id: actionId("plant-seed", now), type: "plant-seed" as const, createdAt: now, payload: { plotId, seedDefinitionId: seed.definitionId, seedInstanceId: seed.instanceId, plantedAt: now } } };
}

export function harvestCrop(home: HomeState, inventory: ItemInstance[], plotId: string, now = Date.now()) {
  const plot = home.plots.find(candidate => candidate.id === plotId);
  if (!plot || getCropStage(plot, now) !== "mature") return { ok: false as const, reason: "พืชยังไม่พร้อมเก็บเกี่ยว" };
  const sourceDefinition = plot.seedDefinitionId!;
  const seedOrdinal = Number(sourceDefinition.split("-").at(-1) ?? 1);
  const materialDefinitionId = `material-${String(Math.min(400, Math.max(1, seedOrdinal))).padStart(3, "0")}`;
  const harvested = createStarterInstance(materialDefinitionId, Math.max(1, Math.floor(now % 100000)));
  harvested.instanceId = `harvest-${plot.id}-${now}`;
  harvested.provenance = { eventId: `harvest-${plot.id}-${now}`, type: "harvest", timestamp: now, parentEventId: plot.seedInstanceId, integrityHash: `local-harvest:${sourceDefinition}:${now}` };
  const cleared: HomePlot = { id: plot.id, soilId: plot.soilId };
  return { ok: true as const, home: { ...home, plots: home.plots.map(candidate => candidate.id === plotId ? cleared : candidate) }, inventory: inventory.concat(harvested), action: { id: actionId("harvest-crop", now), type: "harvest-crop" as const, createdAt: now, payload: { plotId, seedDefinitionId: sourceDefinition, harvestInstanceId: harvested.instanceId, harvestedAt: now } } };
}

export function transferPetEquipment(home: HomeState, inventory: ItemInstance[], slot: PetSlot, instanceId: string | null, now = Date.now()) {
  const equipment = home.petEquipment ?? {};
  const occupied = equipment[slot];
  if (instanceId === null) {
    if (!occupied || inventory.some(item => item.instanceId === occupied.instanceId)) return { ok: false as const, reason: "ไม่มีอุปกรณ์ที่ถอดได้หรือพบ instance ซ้ำ" };
    return { ok: true as const, home: { ...home, petEquipment: { ...equipment, [slot]: undefined } }, inventory: inventory.concat(occupied), action: { id: actionId("unequip-pet-item", now), type: "unequip-pet-item" as const, createdAt: now, payload: { slot, instanceId: occupied.instanceId } } };
  }
  const item = inventory.find(candidate => candidate.instanceId === instanceId);
  const definition = item ? getItemDefinition(item.definitionId) : undefined;
  const validSlot = (slot === "collar" && definition?.category === "decoration") || (slot === "core" && definition?.category === "material");
  if (!item || !validSlot) return { ok: false as const, reason: slot === "collar" ? "Collar รับเฉพาะ decoration instance" : "Core รับเฉพาะ material instance" };
  const nextInventory = inventory.filter(candidate => candidate.instanceId !== item.instanceId).concat(occupied ? [occupied] : []);
  return { ok: true as const, home: { ...home, petEquipment: { ...equipment, [slot]: item } }, inventory: nextInventory, action: { id: actionId("equip-pet-item", now), type: "equip-pet-item" as const, createdAt: now, payload: { slot, instanceId: item.instanceId, swappedInstanceId: occupied?.instanceId } } };
}

export function getPetBonus(home: HomeState) {
  const equipment = home.petEquipment ?? {};
  const lootRadius = Math.min(6, 2 + (equipment.collar ? 1.5 : 0) + (equipment.core ? 0.5 : 0));
  const resourceYieldMultiplier = Math.min(2.5, 1 + (equipment.core ? 0.1 : 0));
  const damageMitigation = Math.min(0.35, equipment.collar && equipment.core ? 0.05 : 0);
  return { scoutRadiusMeters: lootRadius, harvestBonusPercent: Math.round((resourceYieldMultiplier - 1) * 100), lootRadius, resourceYieldMultiplier, damageMitigation, following: home.petFollowing ?? true };
}

export function resolveCompanionRuntime(input: { pet: CompanionPosition; player: CompanionPosition; following: boolean; playerMoving: boolean; reducedMotion?: boolean; deltaSeconds: number }): { position: CompanionPosition; state: CompanionRuntimeState } {
  if (!input.following) return { position: input.pet, state: "resting" };
  const target = { x: input.player.x - 1.3, z: input.player.z - 1.15 };
  const distance = Math.hypot(target.x - input.pet.x, target.z - input.pet.z);
  if (distance > 15) return { position: target, state: "teleporting" };
  if (!input.playerMoving && distance < 1.8) return { position: input.pet, state: "idle" };
  const factor = input.reducedMotion ? Math.min(1, 5 * input.deltaSeconds) : 1 - Math.exp(-4.5 * input.deltaSeconds);
  return { position: { x: input.pet.x + (target.x - input.pet.x) * factor, z: input.pet.z + (target.z - input.pet.z) * factor }, state: "following" };
}

export function togglePetFollowing(home: HomeState, now = Date.now()) {
  const petFollowing = !(home.petFollowing ?? true);
  return { home: { ...home, petFollowing }, action: { id: actionId("toggle-pet-follow", now), type: "toggle-pet-follow" as const, createdAt: now, payload: { mode: petFollowing ? "follow" : "stay" } } };
}
