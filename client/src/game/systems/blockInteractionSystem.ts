import { blockKey, getBlockDefinition, type WorldBlock } from "@/game/data/blockModules";
import type { BlockWorld } from "@/game/systems/blockWorldSystem";

export type BlockInteractionTarget = {
  block: WorldBlock;
  distance: number;
};

export type GridPosition = { x: number; y: number; z: number };

export function findNearestReachableWorldBlock(world: BlockWorld, origin: GridPosition, reach: number): BlockInteractionTarget | undefined {
  let nearest: BlockInteractionTarget | undefined;
  for (const block of Array.from(world.blocks.values())) {
    if (block.state === "broken") continue;
    const center = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };
    const distance = Math.hypot(origin.x - center.x, origin.y - center.y, origin.z - center.z);
    if (distance > reach || (nearest && distance >= nearest.distance)) continue;
    nearest = { block, distance };
  }
  return nearest;
}

export function getPlacementCandidates(player: GridPosition, facing: { x: number; z: number }, groundY: number): GridPosition[] {
  const directionX = Math.round(facing.x);
  const directionZ = Math.round(facing.z);
  const stepX = directionX || 1;
  const stepZ = directionZ || 0;
  return [
    { x: player.x + stepX, y: groundY + 1, z: player.z + stepZ },
    { x: player.x + stepX, y: groundY + 2, z: player.z + stepZ },
    { x: player.x, y: groundY + 1, z: player.z },
  ];
}

export function createPlacedWorldBlock(input: { blockId: string; position: GridPosition; seed: number; groupId?: string }): WorldBlock | undefined {
  const definition = getBlockDefinition(input.blockId);
  if (!definition) return undefined;
  const { x, y, z } = input.position;
  const maxHitPoints = Math.max(1, definition.hardness);
  return {
    key: blockKey(x, y, z),
    blockId: input.blockId,
    moduleId: "player.placed",
    groupId: input.groupId ?? `placed:${x}:${y}:${z}`,
    x,
    y,
    z,
    state: "intact",
    hitPoints: maxHitPoints,
    maxHitPoints,
    solid: definition.solid,
    seed: input.seed,
  };
}
