import { blockKey, getBlockDefinition, OBSIDIAN_ROCK_TEMPLATES, OBSIDIAN_TREE_TEMPLATES, type BlockState, type BlockOffset, type RockTemplate, type TreeTemplate, type WorldBlock } from "@/game/data/blockModules";

export type BlockWorld = {
  mapId: string;
  seed: number;
  blocks: Map<string, WorldBlock>;
};

export type GeneratedBlockGroup = {
  groupId: string;
  moduleId: string;
  blocks: WorldBlock[];
};

function hashSeed(seed: number, salt: number): number {
  let value = (seed ^ salt) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function seededUnit(seed: number, salt: number): number {
  return hashSeed(seed, salt) / 0xffffffff;
}

function seededInt(seed: number, salt: number, min: number, max: number): number {
  return min + Math.floor(seededUnit(seed, salt) * (max - min + 1));
}

function createWorldBlock(input: { blockId: string; moduleId: string; x: number; y: number; z: number; seed: number; state?: BlockState; groupId: string }): WorldBlock {
  const definition = getBlockDefinition(input.blockId);
  const maxHitPoints = Math.max(1, definition?.hardness ?? 1);
  const x = Math.round(input.x);
  const y = Math.round(input.y);
  const z = Math.round(input.z);
  return {
    key: blockKey(x, y, z),
    blockId: input.blockId,
    moduleId: input.moduleId,
    x,
    y,
    z,
    state: input.state ?? "intact",
    hitPoints: maxHitPoints,
    maxHitPoints,
    solid: definition?.solid ?? true,
    seed: input.seed,
    groupId: input.groupId,
  };
}

function addIfEmpty(blocks: WorldBlock[], occupied: Set<string>, block: WorldBlock) {
  if (occupied.has(block.key)) return;
  occupied.add(block.key);
  blocks.push(block);
}

export function createBlockWorld(mapId = "obsidian-frontier", seed = 1): BlockWorld {
  return { mapId, seed, blocks: new Map() };
}

export function getWorldBlock(world: BlockWorld, x: number, y: number, z: number): WorldBlock | undefined {
  return world.blocks.get(blockKey(x, y, z));
}

export function setWorldBlock(world: BlockWorld, block: WorldBlock): BlockWorld {
  const blocks = new Map(world.blocks);
  blocks.set(block.key, block);
  return { ...world, blocks };
}

export function removeWorldBlock(world: BlockWorld, x: number, y: number, z: number): { world: BlockWorld; removed?: WorldBlock } {
  const key = blockKey(x, y, z);
  const removed = world.blocks.get(key);
  if (!removed) return { world };
  const blocks = new Map(world.blocks);
  blocks.delete(key);
  return { world: { ...world, blocks }, removed };
}

export function generateBlockGroup(input: { moduleId: string; groupId: string; seed: number; offsets: BlockOffset[]; state?: BlockState }): GeneratedBlockGroup {
  const occupied = new Set<string>();
  const blocks: WorldBlock[] = [];
  for (const offset of input.offsets) {
    addIfEmpty(blocks, occupied, createWorldBlock({
      blockId: offset.blockId,
      moduleId: input.moduleId,
      groupId: input.groupId,
      seed: input.seed,
      x: offset.x,
      y: offset.y,
      z: offset.z,
      state: input.state,
    }));
  }
  return { groupId: input.groupId, moduleId: input.moduleId, blocks };
}

function treeHeight(template: TreeTemplate, seed: number, state: Extract<BlockState, "sapling" | "young" | "mature">): number {
  if (state === "sapling") return template.stageHeights.sapling;
  if (state === "young") return template.stageHeights.young;
  return seededInt(seed, 17, template.stageHeights.mature[0], Math.min(template.maxHeight, template.stageHeights.mature[1]));
}

export function generateTreeBlocks(input: { x: number; z: number; seed: number; baseY?: number; template?: TreeTemplate; state?: Extract<BlockState, "sapling" | "young" | "mature"> }): GeneratedBlockGroup {
  const template = input.template ?? OBSIDIAN_TREE_TEMPLATES[seededInt(input.seed, 3, 0, OBSIDIAN_TREE_TEMPLATES.length - 1)]!;
  const state = input.state ?? "mature";
  const groupId = `${template.id}:${input.x}:${input.z}`;
  const blocks: WorldBlock[] = [];
  const occupied = new Set<string>();
  const height = treeHeight(template, input.seed, state);
  const baseY = Math.max(0, Math.floor(input.baseY ?? 0));

  for (let y = 0; y < height; y += 1) {
    addIfEmpty(blocks, occupied, createWorldBlock({ blockId: template.trunkBlockId, moduleId: template.moduleId, groupId, seed: input.seed, x: input.x, y: baseY + y, z: input.z, state }));
  }

  if (state !== "sapling") {
    const branchY = Math.max(1, height - 2);
    const branchDirection = seededInt(input.seed, 29, 0, 3);
    if (seededUnit(input.seed, 31) <= template.branchChance) {
      const branch = [[1, 0], [-1, 0], [0, 1], [0, -1]][branchDirection]!;
      addIfEmpty(blocks, occupied, createWorldBlock({ blockId: template.trunkBlockId, moduleId: template.moduleId, groupId, seed: input.seed, x: input.x + branch[0], y: baseY + branchY, z: input.z + branch[1], state }));
    }

    const crownBase = Math.max(1, height - 2);
    const crownLayers = state === "young" ? 1 : 2;
    for (let layer = 0; layer <= crownLayers; layer += 1) {
      const y = crownBase + layer;
      const radius = Math.max(1, Math.min(template.maxCrownRadius, layer === crownLayers ? 1 : template.maxCrownRadius));
      for (let dx = -radius; dx <= radius; dx += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
          if (Math.abs(dx) + Math.abs(dz) > radius + (layer === crownLayers ? 0 : 1)) continue;
          addIfEmpty(blocks, occupied, createWorldBlock({ blockId: template.leafBlockId, moduleId: template.moduleId, groupId, seed: input.seed, x: input.x + dx, y: baseY + y, z: input.z + dz, state }));
        }
      }
    }
  }

  return { groupId, moduleId: template.moduleId, blocks };
}

export function generateRockBlocks(input: { x: number; z: number; seed: number; baseY?: number; template?: RockTemplate }): GeneratedBlockGroup {
  const template = input.template ?? OBSIDIAN_ROCK_TEMPLATES[seededInt(input.seed, 41, 0, OBSIDIAN_ROCK_TEMPLATES.length - 1)]!;
  const groupId = `${template.id}:${input.x}:${input.z}`;
  const blocks: WorldBlock[] = [];
  const occupied = new Set<string>();
  const width = seededInt(input.seed, 43, template.minWidth, template.maxWidth);
  const height = seededInt(input.seed, 47, template.minHeight, template.maxHeight);
  const baseY = Math.max(0, Math.floor(input.baseY ?? 0));
  for (let y = 0; y < height; y += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      for (let dz = 0; dz < width; dz += 1) {
        if (blocks.length >= template.maxBlocks) break;
        const edge = dx === 0 || dz === 0 || dx === width - 1 || dz === width - 1;
        if (edge && seededUnit(input.seed, 53 + y * 19 + dx * 7 + dz) < 0.18) continue;
        addIfEmpty(blocks, occupied, createWorldBlock({ blockId: template.blockId, moduleId: template.moduleId, groupId, seed: input.seed, x: input.x + dx, y: baseY + y, z: input.z + dz }));
      }
    }
  }
  return { groupId, moduleId: template.moduleId, blocks };
}

export function mergeGeneratedGroup(world: BlockWorld, group: GeneratedBlockGroup): BlockWorld {
  const blocks = new Map(world.blocks);
  group.blocks.forEach(block => blocks.set(block.key, block));
  return { ...world, blocks };
}

export function listWorldBlocks(world: BlockWorld): WorldBlock[] {
  return Array.from(world.blocks.values());
}
