export const VOXEL_BLOCK_PIXEL_SIZE = 16;
export const VOXEL_BLOCK_METERS = 1;

export type BlockKind = "terrain" | "rock" | "ore" | "log" | "leaf" | "plant" | "obstacle" | "liquid" | "storage";
export type BlockActionKind = "break" | "chop" | "harvest";
export type BlockToolTag = "pickaxe" | "axe" | "shears";
export type BlockState = "intact" | "damaged" | "sapling" | "young" | "mature" | "decaying" | "broken";
export type BlockCollisionShape = "full" | "slab" | "thin" | "none";
export type BlockHazard = {
  damage: number;
  cooldownSeconds: number;
  affects: "player" | "creature" | "all";
};

export type BlockDefinition = {
  id: string;
  assetId: string;
  kind: BlockKind;
  solid: boolean;
  collisionShape: BlockCollisionShape;
  action: BlockActionKind;
  hardness: number;
  requiredToolTag?: BlockToolTag;
  dropDefinitionId: string;
  dropQuantity: number;
  blockItemDefinitionId?: string;
  stage?: "sapling" | "young" | "mature";
  hazard?: BlockHazard;
  requiresSupport: boolean;
  gravityAffected: boolean;
  canFloat: boolean;
};

export type WorldBlock = {
  key: string;
  blockId: string;
  moduleId: string;
  x: number;
  y: number;
  z: number;
  state: BlockState;
  hitPoints: number;
  maxHitPoints: number;
  solid: boolean;
  seed: number;
  groupId?: string;
};

export type BlockOffset = {
  x: number;
  y: number;
  z: number;
  blockId: string;
};

export type TreeTemplate = {
  id: string;
  moduleId: string;
  trunkBlockId: string;
  leafBlockId: string;
  minHeight: number;
  maxHeight: number;
  maxCrownRadius: number;
  branchChance: number;
  stageHeights: { sapling: number; young: number; mature: [number, number] };
};

export type RockTemplate = {
  id: string;
  moduleId: string;
  blockId: string;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  maxBlocks: number;
};

/**
 * The first Obsidian slice uses existing verified pack IDs. A future texture-pack
 * replacement can swap the assetId without changing block generation or actions.
 */
export const OBSIDIAN_BLOCKS: Record<string, BlockDefinition> = {
  "terrain.obsidian": {
    id: "terrain.obsidian",
    assetId: "terrain.obsidian",
    kind: "terrain",
    solid: true,
    collisionShape: "full",
    action: "break",
    hardness: 2,
    requiredToolTag: "pickaxe",
    dropDefinitionId: "material-003",
    dropQuantity: 1,
    blockItemDefinitionId: "block-obsidian-stone",
    requiresSupport: false,
    gravityAffected: false,
    canFloat: true,
  },
  "terrain.ash": {
    id: "terrain.ash",
    assetId: "terrain.ash",
    kind: "terrain",
    solid: true,
    collisionShape: "full",
    action: "break",
    hardness: 1,
    requiredToolTag: "pickaxe",
    dropDefinitionId: "material-003",
    dropQuantity: 1,
    blockItemDefinitionId: "block-obsidian-ash",
    requiresSupport: false,
    gravityAffected: false,
    canFloat: true,
  },
  "terrain.obsidian.sand": {
    id: "terrain.obsidian.sand",
    assetId: "terrain.ash",
    kind: "terrain",
    solid: true,
    collisionShape: "full",
    action: "break",
    hardness: 1,
    requiredToolTag: "pickaxe",
    dropDefinitionId: "material-003",
    dropQuantity: 1,
    blockItemDefinitionId: "block-obsidian-sand",
    requiresSupport: true,
    gravityAffected: true,
    canFloat: false,
  },
  "water.obsidian.surface": {
    id: "water.obsidian.surface",
    assetId: "terrain.crystal",
    kind: "liquid",
    solid: false,
    collisionShape: "none",
    action: "harvest",
    hardness: 1,
    dropDefinitionId: "material-004",
    dropQuantity: 1,
    requiresSupport: false,
    gravityAffected: false,
    canFloat: true,
  },
  "rock.obsidian.small": {
    id: "rock.obsidian.small",
    assetId: "terrain.obsidian",
    kind: "rock",
    solid: true,
    collisionShape: "full",
    action: "break",
    hardness: 2,
    requiredToolTag: "pickaxe",
    dropDefinitionId: "material-003",
    dropQuantity: 1,
    blockItemDefinitionId: "block-obsidian-pebble",
    requiresSupport: true,
    gravityAffected: false,
    canFloat: false,
  },
  "rock.obsidian.large": {
    id: "rock.obsidian.large",
    assetId: "terrain.ash",
    kind: "rock",
    solid: true,
    collisionShape: "slab",
    action: "break",
    hardness: 3,
    requiredToolTag: "pickaxe",
    dropDefinitionId: "material-003",
    dropQuantity: 2,
    blockItemDefinitionId: "block-obsidian-slab",
    requiresSupport: true,
    gravityAffected: false,
    canFloat: false,
  },
  "ore.aether.block": {
    id: "ore.aether.block",
    assetId: "terrain.crystal",
    kind: "ore",
    solid: true,
    collisionShape: "full",
    action: "harvest",
    hardness: 4,
    requiredToolTag: "pickaxe",
    dropDefinitionId: "material-003",
    dropQuantity: 2,
    blockItemDefinitionId: "block-aether-ore",
    requiresSupport: true,
    gravityAffected: false,
    canFloat: false,
  },
  "wood.obsidian.log": {
    id: "wood.obsidian.log",
    assetId: "terrain.ash",
    kind: "log",
    solid: true,
    collisionShape: "full",
    action: "chop",
    hardness: 2,
    requiredToolTag: "axe",
    dropDefinitionId: "material-003",
    dropQuantity: 1,
    blockItemDefinitionId: "block-obsidian-log",
    requiresSupport: true,
    gravityAffected: false,
    canFloat: false,
  },
  "leaves.obsidian": {
    id: "leaves.obsidian",
    assetId: "terrain.foliage",
    kind: "leaf",
    solid: false,
    collisionShape: "none",
    action: "chop",
    hardness: 1,
    requiredToolTag: "shears",
    dropDefinitionId: "material-005",
    dropQuantity: 1,
    blockItemDefinitionId: "block-obsidian-leaves",
    requiresSupport: false,
    gravityAffected: false,
    canFloat: true,
  },
  "flora.obsidian.sprout": {
    id: "flora.obsidian.sprout",
    assetId: "art.obsidian.crystal-fern",
    kind: "plant",
    solid: false,
    collisionShape: "thin",
    action: "harvest",
    hardness: 1,
    dropDefinitionId: "material-005",
    dropQuantity: 1,
    blockItemDefinitionId: "block-obsidian-sprout",
    requiresSupport: true,
    gravityAffected: false,
    canFloat: false,
  },
  "obstacle.obsidian.slab": {
    id: "obstacle.obsidian.slab",
    assetId: "terrain.obsidian",
    kind: "obstacle",
    solid: true,
    collisionShape: "slab",
    action: "break",
    hardness: 3,
    requiredToolTag: "pickaxe",
    dropDefinitionId: "material-003",
    dropQuantity: 2,
    blockItemDefinitionId: "block-obsidian-slab",
    requiresSupport: true,
    gravityAffected: false,
    canFloat: false,
  },
  "storage.obsidian.chest": {
    id: "storage.obsidian.chest",
    assetId: "terrain.obsidian",
    kind: "storage",
    solid: true,
    collisionShape: "full",
    action: "break",
    hardness: 4,
    requiredToolTag: "pickaxe",
    dropDefinitionId: "material-007",
    dropQuantity: 1,
    requiresSupport: true,
    gravityAffected: false,
    canFloat: false,
  },
  "flora.obsidian.thorn-cactus": {
    id: "flora.obsidian.thorn-cactus",
    assetId: "terrain.crystal",
    kind: "plant",
    solid: false,
    collisionShape: "thin",
    action: "harvest",
    hardness: 1,
    dropDefinitionId: "material-005",
    dropQuantity: 1,
    blockItemDefinitionId: "block-obsidian-cactus",
    hazard: { damage: 6, cooldownSeconds: 0.5, affects: "all" },
    requiresSupport: true,
    gravityAffected: false,
    canFloat: false,
  },
};

export const OBSIDIAN_TREE_TEMPLATES: TreeTemplate[] = [
  {
    id: "obsidian-ash-tree",
    moduleId: "flora.tree.obsidian-ash",
    trunkBlockId: "wood.obsidian.log",
    leafBlockId: "leaves.obsidian",
    minHeight: 3,
    maxHeight: 6,
    maxCrownRadius: 2,
    branchChance: 0.28,
    stageHeights: { sapling: 1, young: 2, mature: [3, 6] },
  },
  {
    id: "obsidian-crystal-tree",
    moduleId: "flora.tree.obsidian-crystal",
    trunkBlockId: "wood.obsidian.log",
    leafBlockId: "leaves.obsidian",
    minHeight: 4,
    maxHeight: 7,
    maxCrownRadius: 2,
    branchChance: 0.42,
    stageHeights: { sapling: 1, young: 3, mature: [4, 7] },
  },
];

export const OBSIDIAN_ROCK_TEMPLATES: RockTemplate[] = [
  { id: "obsidian-pebble-cluster", moduleId: "rock.cluster.obsidian", blockId: "rock.obsidian.small", minWidth: 1, maxWidth: 2, minHeight: 1, maxHeight: 2, maxBlocks: 5 },
  { id: "obsidian-slab-outcrop", moduleId: "rock.outcrop.obsidian", blockId: "obstacle.obsidian.slab", minWidth: 2, maxWidth: 3, minHeight: 1, maxHeight: 3, maxBlocks: 12 },
  { id: "aether-ore-outcrop", moduleId: "ore.outcrop.aether", blockId: "ore.aether.block", minWidth: 1, maxWidth: 2, minHeight: 1, maxHeight: 2, maxBlocks: 6 },
];

export function getBlockDefinition(blockId: string): BlockDefinition | undefined {
  return OBSIDIAN_BLOCKS[blockId];
}

export function blockKey(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}
