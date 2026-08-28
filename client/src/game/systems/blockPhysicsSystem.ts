import { getBlockDefinition, type BlockCollisionShape, type BlockHazard, type WorldBlock } from "@/game/data/blockModules";
import type { BlockWorld } from "@/game/systems/blockWorldSystem";

export type BlockEntityKind = "player" | "creature";

export type BlockEntityBounds = {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
};

export type BlockShapeBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type BlockContact = {
  block: WorldBlock;
  bounds: BlockShapeBounds;
  hazard?: BlockHazard;
};

function relativeShapeBounds(shape: BlockCollisionShape): BlockShapeBounds | null {
  if (shape === "none") return null;
  if (shape === "slab") return { minX: 0, maxX: 1, minY: 0, maxY: 0.5, minZ: 0, maxZ: 1 };
  if (shape === "thin") return { minX: 0.25, maxX: 0.75, minY: 0, maxY: 1, minZ: 0.25, maxZ: 0.75 };
  return { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 };
}

export function getBlockShapeBounds(block: WorldBlock): BlockShapeBounds | null {
  const definition = getBlockDefinition(block.blockId);
  const relative = relativeShapeBounds(definition?.collisionShape ?? (block.solid ? "full" : "none"));
  if (!relative) return null;
  return {
    minX: block.x + relative.minX,
    maxX: block.x + relative.maxX,
    minY: block.y + relative.minY,
    maxY: block.y + relative.maxY,
    minZ: block.z + relative.minZ,
    maxZ: block.z + relative.maxZ,
  };
}

function overlaps(aMin: number, aMax: number, bMin: number, bMax: number) {
  return aMin < bMax && aMax > bMin;
}

export function intersectsBlockEntity(block: WorldBlock, entity: BlockEntityBounds): boolean {
  if (![entity.x, entity.y, entity.z, entity.radius, entity.height].every(Number.isFinite) || entity.radius < 0 || entity.height < 0) return false;
  const bounds = getBlockShapeBounds(block);
  if (!bounds || block.state === "broken") return false;
  return overlaps(entity.x - entity.radius, entity.x + entity.radius, bounds.minX, bounds.maxX)
    && overlaps(entity.y, entity.y + entity.height, bounds.minY, bounds.maxY)
    && overlaps(entity.z - entity.radius, entity.z + entity.radius, bounds.minZ, bounds.maxZ);
}

export function getBlockingContacts(world: BlockWorld, entity: BlockEntityBounds): BlockContact[] {
  const contacts: BlockContact[] = [];
  for (const block of Array.from(world.blocks.values())) {
    const definition = getBlockDefinition(block.blockId);
    if (!definition?.solid || definition.collisionShape === "none" || !intersectsBlockEntity(block, entity)) continue;
    const bounds = getBlockShapeBounds(block);
    if (bounds) contacts.push({ block, bounds, hazard: definition.hazard });
  }
  return contacts;
}

export function getHazardContacts(world: BlockWorld, entity: BlockEntityBounds, entityKind: BlockEntityKind): BlockContact[] {
  const contacts: BlockContact[] = [];
  for (const block of Array.from(world.blocks.values())) {
    const definition = getBlockDefinition(block.blockId);
    const hazard = definition?.hazard;
    if (!hazard || (hazard.affects !== "all" && hazard.affects !== entityKind) || !intersectsBlockEntity(block, entity)) continue;
    const bounds = getBlockShapeBounds(block);
    if (bounds) contacts.push({ block, bounds, hazard });
  }
  return contacts;
}

export function canApplyHazardDamage(contact: BlockContact, lastAppliedAt: number | undefined, now: number) {
  if (!contact.hazard) return false;
  const cooldownSeconds = contact.hazard.cooldownSeconds;
  if (!Number.isFinite(cooldownSeconds) || cooldownSeconds < 0 || !Number.isFinite(now)) return false;
  if (lastAppliedAt !== undefined && !Number.isFinite(lastAppliedAt)) return false;
  return lastAppliedAt === undefined || now - lastAppliedAt >= cooldownSeconds * 1000;
}

function isSupportBlock(block: WorldBlock | undefined) {
  if (!block || block.state === "broken") return false;
  const definition = getBlockDefinition(block.blockId);
  return Boolean(definition?.solid && definition.collisionShape !== "none");
}

export type PlacementSupport = (x: number, y: number, z: number) => boolean;

export function hasAdjacentSupport(world: BlockWorld, x: number, y: number, z: number, terrainSupport?: PlacementSupport) {
  const neighbors = [
    [x, y - 1, z], [x + 1, y, z], [x - 1, y, z],
    [x, y, z + 1], [x, y, z - 1], [x, y + 1, z],
  ] as const;
  return neighbors.some(([nx, ny, nz]) => isSupportBlock(world.blocks.get(`${nx}:${ny}:${nz}`)) || Boolean(terrainSupport?.(nx, ny, nz)));
}

export type PlacementResult = {
  accepted: boolean;
  reason: "placed" | "occupied" | "unknown-block" | "requires-support";
};

export function canPlaceBlock(world: BlockWorld, blockId: string, x: number, y: number, z: number, terrainSupport?: PlacementSupport): PlacementResult {
  if (![x, y, z].every(Number.isFinite)) return { accepted: false, reason: "unknown-block" };
  if (world.blocks.has(`${x}:${y}:${z}`)) return { accepted: false, reason: "occupied" };
  const definition = getBlockDefinition(blockId);
  if (!definition) return { accepted: false, reason: "unknown-block" };
  if (!definition.canFloat && !hasAdjacentSupport(world, x, y, z, terrainSupport)) return { accepted: false, reason: "requires-support" };
  return { accepted: true, reason: "placed" };
}

export function getUnsupportedGravityBlocks(world: BlockWorld, terrainSupport?: PlacementSupport): WorldBlock[] {
  return Array.from(world.blocks.values()).filter(block => {
    const definition = getBlockDefinition(block.blockId);
    return Boolean(definition?.gravityAffected && !definition.canFloat && !hasAdjacentSupport(world, block.x, block.y, block.z, terrainSupport));
  });
}
