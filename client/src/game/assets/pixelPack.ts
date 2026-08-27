import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { AssetPackManifest } from "@/game/assets/assetPackLoader";
import { resolveAssetUrl } from "@/game/assets/assetPackLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { BiomeDecoration } from "@/game/data/biomeProfiles";
import { getBlockDefinition, type WorldBlock } from "@/game/data/blockModules";
import type { RenderDistanceConfig } from "@/game/systems/renderDistance";
import { sampleObsidianTerrainHeight } from "@/game/systems/terrainHeight";

export const PIXEL_PACK_MANIFEST = {
  id: "arcane-frontier-voxel-pixel",
  basePath: "/assets/packs/arcane-frontier-voxel-pixel",
  version: "0.3.0",
  designSource: "google-gemini",
  logicalResolution: { width: 640, height: 360 },
  tileSize: 16,
  textureSampling: "nearest",
  assets: {
    survivor: "voxel/survivor-v1",
    companion: "voxel/cyber-fox-v1",
    enemy: "voxel/corrupted-husk-v1",
    elite: "voxel/obsidian-golem-v1",
    boss: "voxel/void-reaper-v1",
    resource: "voxel/ley-crystal-v1",
    terrain: "tiles/obsidian-frontier-v1",
  },
} as const;

type PaletteKey = keyof typeof PIXEL_PALETTE;
type Cell = { x: number; y: number; z: number; color: PaletteKey };
export type PixelModelId = "survivor" | "companion" | "enemy" | "elite" | "boss" | "resource" | "landmark";
type VoxelModel = { id: string; width: number; height: number; depth: number; cells: Cell[]; voxelSize: number };

type SceneVoxelOptions = {
  position?: { x: number; y: number; z: number };
  scale?: number;
  name?: string;
  material?: StandardMaterial;
};

export const PIXEL_PALETTE = {
  void: "#07101f",
  ink: "#121a35",
  indigo: "#27386a",
  violet: "#8057d8",
  cyan: "#5ff4ed",
  ice: "#d7ffff",
  skin: "#e39a72",
  ember: "#ff7453",
  gold: "#ffc857",
  moss: "#6dcc87",
  crimson: "#ef476f",
  obsidian: "#171323",
  glass: "#bd8cff",
  ash: "#718093",
  bone: "#d5c5a4",
  white: "#ffffff",
} as const;

const paletteColor = Object.fromEntries(Object.entries(PIXEL_PALETTE).map(([key, value]) => [key, Color3.FromHexString(value)])) as Record<PaletteKey, Color3>;
const SYMBOL_PALETTE: Record<string, PaletteKey> = {
  K: "ink",
  C: "cyan",
  V: "violet",
  S: "skin",
  R: "crimson",
  O: "obsidian",
  G: "glass",
};

const shadeMap: Partial<Record<PaletteKey, PaletteKey>> = {
  cyan: "indigo",
  ice: "cyan",
  violet: "indigo",
  glass: "violet",
  skin: "ember",
  gold: "ember",
  moss: "indigo",
  crimson: "obsidian",
  bone: "ash",
  white: "ice",
};

function fromSilhouette(id: string, rows: string[], depth: number, voxelSize = 0.34): VoxelModel {
  const width = Math.max(...rows.map(row => row.length));
  const cells: Cell[] = [];
  rows.forEach((row, rowIndex) => {
    const y = rows.length - rowIndex - 1;
    row.padEnd(width, " ").split("").forEach((symbol, x) => {
      if (symbol === " ") return;
      const color = SYMBOL_PALETTE[symbol];
      if (!color) return;
      for (let z = 0; z < depth; z += 1) {
        const sideShade = z > 0 && shadeMap[color] ? shadeMap[color]! : color;
        cells.push({ x, y, z, color: sideShade });
      }
    });
  });
  return { id, width, height: rows.length, depth, cells, voxelSize };
}

const MODELS: Record<string, VoxelModel> = {
  survivor: fromSilhouette("survivor", [
    "   KK   ",
    "  KKKK  ",
    "  CKKC  ",
    "   S    ",
    "  VVVV  ",
    " VVVVVV ",
    "  VVVV  ",
    "  KK K  ",
    " KKK KK ",
  ], 3, 0.32),
  companion: fromSilhouette("companion", [
    "  C C  ",
    " CCCC  ",
    "CCKKCC ",
    "C KKC  ",
    " CCCC  ",
    "  CC   ",
  ], 3, 0.25),
  enemy: fromSilhouette("enemy", [
    "  RRR  ",
    " RRRRR ",
    "R RRR R",
    " RRRRR ",
    "  RRR  ",
    " R R R ",
    "R     R",
  ], 3, 0.34),
  elite: fromSilhouette("elite", [
    "   O   ",
    "  OOO  ",
    " OOOO O",
    "OOOOOOO",
    " OOOOO ",
    "OOOOOOO",
    " OO OO ",
    "OO   OO",
  ], 4, 0.37),
  boss: fromSilhouette("boss", [
    "   G G   ",
    "  GGGGG  ",
    " GGGGGGG ",
    "GGGCGGGGG",
    " GGGGGGG ",
    "  GGGGG  ",
    " GGGGGGG ",
    "GG     GG",
    "GG     GG",
  ], 5, 0.44),
  resource: fromSilhouette("resource", [
    "   C   ",
    "  CCC  ",
    " CCCCC ",
    "CCCCCCC",
    " CCCCC ",
    "  CCC  ",
  ], 2, 0.24),
  landmark: fromSilhouette("landmark", [
    "   G   ",
    "  GGG  ",
    " GGGGG ",
    "GGGGGGG",
    "  GGG  ",
    "  GGG  ",
    " GGGGG ",
  ], 3, 0.3),
};

function resolveModelColor(model: VoxelModel, cell: Cell): PaletteKey {
  if (cell.color === "ink" && model.id === "elite") return "obsidian";
  if (cell.color === "crimson" && model.id === "enemy") return "crimson";
  if (cell.color === "glass" && model.id === "boss") return "glass";
  return cell.color;
}

const PIXEL_TEXTURE_ASSET_IDS: Partial<Record<PixelModelId, string>> = {
  survivor: "entities.survivor",
  companion: "entities.companion",
  enemy: "entities.enemy",
  elite: "entities.elite",
  boss: "entities.boss",
  resource: "entities.resource",
  landmark: "terrain.crystal",
};

let activeAssetPackManifest: AssetPackManifest | null = null;

export function setActiveAssetPackManifest(manifest: AssetPackManifest | null) {
  activeAssetPackManifest = manifest;
}

function resolveTextureAssetUrl(assetId: string, fallbackPath: string) {
  return activeAssetPackManifest ? resolveAssetUrl(activeAssetPackManifest, assetId) ?? fallbackPath : fallbackPath;
}

function createPixelMaterial(scene: Scene, name: string, textureAssetId?: string) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.White();
  material.emissiveColor = textureAssetId?.startsWith("terrain.") ? new Color3(0.025, 0.03, 0.035) : new Color3(0.08, 0.08, 0.08);
  material.specularColor = Color3.Black();
  material.backFaceCulling = false;
  if (textureAssetId) {
    const fallbackPath = `${PIXEL_PACK_MANIFEST.basePath}/${textureAssetId.replace(/\./g, "/")}.png`;
    const texture = new Texture(resolveTextureAssetUrl(textureAssetId, fallbackPath), scene, true, false, Texture.NEAREST_SAMPLINGMODE);
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    texture.hasAlpha = textureAssetId.startsWith("entities.") || textureAssetId.startsWith("art.");
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    if (texture.hasAlpha) {
      material.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
      material.needDepthPrePass = true;
    }
  }
  return material;
}

const BLOCK_MATERIALS_BY_SCENE = new WeakMap<Scene, Map<string, StandardMaterial>>();

function getPixelBlockMaterial(scene: Scene, assetId: string) {
  let materials = BLOCK_MATERIALS_BY_SCENE.get(scene);
  if (!materials) {
    materials = new Map();
    BLOCK_MATERIALS_BY_SCENE.set(scene, materials);
  }
  const existing = materials.get(assetId);
  if (existing) return existing;
  const material = createPixelMaterial(scene, `world-block-material-${assetId.replace(/[^a-z0-9-]/gi, "-")}`, assetId);
  material.diffuseColor = Color3.White();
  material.specularColor = Color3.Black();
  materials.set(assetId, material);
  return material;
}

export function createPixelBlockMesh(scene: Scene, block: WorldBlock): Mesh {
  const definition = getBlockDefinition(block.blockId);
  const mesh = MeshBuilder.CreateBox(`world-block-${block.key}`, { size: 1 }, scene);
  mesh.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
  mesh.material = getPixelBlockMaterial(scene, definition?.assetId ?? "terrain.obsidian");
  mesh.metadata = { ...block, worldBlock: true, replaceable: true };
  return mesh;
}

export function updatePixelBlockMesh(mesh: Mesh, block: WorldBlock) {
  mesh.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
  mesh.metadata = { ...block, worldBlock: true, replaceable: true };
  mesh.setEnabled(block.state !== "broken");
}

const FACE_DEFINITIONS = [
  { normal: [0, 0, 1], corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { normal: [0, 0, -1], corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
  { normal: [1, 0, 0], corners: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
  { normal: [-1, 0, 0], corners: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  { normal: [0, 1, 0], corners: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
  { normal: [0, -1, 0], corners: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
] as const;

export function createPixelBillboard(scene: Scene, decoration: BiomeDecoration): Mesh {
  const safeName = decoration.assetId.replace(/[^a-z0-9-]/gi, "-");
  const mesh = MeshBuilder.CreatePlane(`pixel-pack-${decoration.category}-${safeName}`, { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
  const material = createPixelMaterial(scene, `pixel-pack-material-${safeName}`, decoration.assetId);
  material.disableLighting = true;
  material.emissiveColor = Color3.White().scale(decoration.emissive ?? 0.28);
  material.alpha = 0.98;
  material.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
  material.useAlphaFromDiffuseTexture = true;
  material.needDepthPrePass = true;
  mesh.material = material;
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  mesh.scaling.set(decoration.width, decoration.height, 1);
  mesh.position.set(decoration.position.x, decoration.height / 2 + (decoration.yOffset ?? 0), decoration.position.z);
  mesh.metadata = { assetPack: PIXEL_PACK_MANIFEST.id, assetId: decoration.assetId, category: decoration.category, replaceable: true };
  return mesh;
}

export function createBiomeDressing(scene: Scene, decorations: BiomeDecoration[]): TransformNode {
  const root = new TransformNode("biome-dressing-root", scene);
  decorations.forEach(decoration => { createPixelBillboard(scene, decoration).parent = root; });
  root.metadata = { assetPack: PIXEL_PACK_MANIFEST.id, replaceable: true, decorationCount: decorations.length };
  return root;
}

export function createVoxelModel(scene: Scene, modelId: string, options: SceneVoxelOptions = {}): AbstractMesh {
  const model = MODELS[modelId] ?? MODELS.resource;
  const mesh = new Mesh(options.name ?? `pixel-${model.id}`, scene);
  const size = model.voxelSize;
  const occupied = new Set(model.cells.map(cell => `${cell.x},${cell.y},${cell.z}`));
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const addFace = (cell: Cell, face: (typeof FACE_DEFINITIONS)[number]) => {
    const centerX = (cell.x - (model.width - 1) / 2) * size;
    const centerY = (cell.y + 0.5) * size;
    const centerZ = (cell.z - (model.depth - 1) / 2) * size;
    const color = paletteColor[resolveModelColor(model, cell)];
    const start = positions.length / 3;
    face.corners.forEach(corner => {
      positions.push(centerX + corner[0] * size * 0.5, centerY + corner[1] * size * 0.5, centerZ + corner[2] * size * 0.5);
      normals.push(face.normal[0], face.normal[1], face.normal[2]);
      colors.push(color.r, color.g, color.b, 1);
      uvs.push(0, 1, 1, 1, 1, 0, 0, 0);
    });
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };

  for (const cell of model.cells) {
    for (const face of FACE_DEFINITIONS) {
      const nx = cell.x + face.normal[0];
      const ny = cell.y + face.normal[1];
      const nz = cell.z + face.normal[2];
      if (!occupied.has(`${nx},${ny},${nz}`)) addFace(cell, face);
    }
  }

  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.normals = normals;
  vertexData.colors = colors;
  vertexData.uvs = uvs;
  vertexData.indices = indices;
  vertexData.applyToMesh(mesh, true);
  const textureAssetId = PIXEL_TEXTURE_ASSET_IDS[model.id as PixelModelId];
  mesh.material = options.material ?? createPixelMaterial(scene, `${model.id}-pixel-material`, textureAssetId);
  mesh.position.set(options.position?.x ?? 0, options.position?.y ?? 0, options.position?.z ?? 0);
  mesh.scaling.setAll(options.scale ?? 1);
  mesh.metadata = { assetPack: PIXEL_PACK_MANIFEST.id, assetId: PIXEL_PACK_MANIFEST.assets[modelId as keyof typeof PIXEL_PACK_MANIFEST.assets] ?? `voxel/${model.id}-v1`, modelId };
  return mesh;
}

export function createPixelTerrain(scene: Scene, width: number, depth: number, tileSize = 2) {
  const mesh = new Mesh("pixel-terrain", scene);
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const terrainColors = [paletteColor.void, paletteColor.ink, paletteColor.indigo, paletteColor.obsidian, paletteColor.ash];
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  let vertex = 0;
  for (let z = 0; z < depth; z += 1) {
    for (let x = 0; x < width; x += 1) {
      const left = x * tileSize - halfWidth * tileSize;
      const right = left + tileSize;
      const top = z * tileSize - halfDepth * tileSize;
      const bottom = top + tileSize;
      const tile = terrainColors[(x * 17 + z * 31 + ((x ^ z) % 3)) % terrainColors.length]!;
      positions.push(left, 0, top, right, 0, top, right, 0, bottom, left, 0, bottom);
      for (let i = 0; i < 4; i += 1) normals.push(0, 1, 0);
      for (let i = 0; i < 4; i += 1) colors.push(tile.r, tile.g, tile.b, 1);
      indices.push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3);
      vertex += 4;
    }
  }
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.normals = normals;
  vertexData.colors = colors;
  vertexData.indices = indices;
  vertexData.applyToMesh(mesh, true);
  mesh.material = createPixelMaterial(scene, "pixel-terrain-material", "terrain.obsidian");
  mesh.metadata = { assetPack: PIXEL_PACK_MANIFEST.id, assetId: PIXEL_PACK_MANIFEST.assets.terrain };
  return mesh;
}

export const PIXEL_CHUNK_SIZE = 16;

export function createPixelTerrainChunks(scene: Scene, width: number, depth: number, tileSize = 2, chunkSize = PIXEL_CHUNK_SIZE, terrainAssetIds: string[] = ["terrain.obsidian"], renderDistance: RenderDistanceConfig = { preset: "balanced", visibleRadiusMeters: 96, prefetchRadiusMeters: 128, label: "Balanced · recommended" }) {
  const root = new TransformNode("pixel-terrain-root", scene);
  const terrainColors = [paletteColor.ash, paletteColor.ash.scale(0.82), paletteColor.indigo.scale(0.82), paletteColor.obsidian.scale(1.18)];
  const terrainFamilies = terrainAssetIds.length > 0 ? terrainAssetIds : ["terrain.obsidian"];
  const terrainMaterials: Record<string, StandardMaterial> = {};
  terrainFamilies.forEach(assetId => { terrainMaterials[assetId] = createPixelMaterial(scene, `pixel-terrain-material-${assetId.replaceAll(".", "-")}`, assetId); });
  const chunkWorldSize = chunkSize * tileSize;
  const visibleRadiusMeters = renderDistance.visibleRadiusMeters;
  const prefetchRadiusMeters = renderDistance.prefetchRadiusMeters;
  // Render only the selected visible window; the wider prefetch window remains a data budget.
  // Keeping the margin out of the mesh pool caps mobile draw calls per selected preset.
  const slotRadius = Math.max(1, Math.ceil(visibleRadiusMeters / chunkWorldSize));
  const prefetchSlotRadius = Math.max(slotRadius, Math.ceil(prefetchRadiusMeters / chunkWorldSize));
  const slotsPerAxis = slotRadius * 2 + 1;
  const mapRadiusMeters = 500;
  const mapChunkRadius = Math.ceil(mapRadiusMeters / chunkWorldSize);
  const chunkMeshes: Mesh[] = [];

  const assignChunk = (mesh: Mesh, chunkX: number, chunkZ: number, terrainAssetId: string) => {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let vertex = 0;
    const addQuad = (points: number[][], normal: number[], color: Color3) => {
      const start = vertex;
      points.forEach(point => {
        positions.push(point[0]!, point[1]!, point[2]!);
        normals.push(normal[0]!, normal[1]!, normal[2]!);
        colors.push(color.r, color.g, color.b, 1);
      });
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
      vertex += 4;
    };
    for (let z = 0; z < chunkSize; z += 1) {
      for (let x = 0; x < chunkSize; x += 1) {
        const left = x * tileSize;
        const right = left + tileSize;
        const top = z * tileSize;
        const bottom = top + tileSize;
        const absoluteX = chunkX * chunkSize + x;
        const absoluteZ = chunkZ * chunkSize + z;
        const height = sampleObsidianTerrainHeight(absoluteX, absoluteZ);
        const tile = terrainColors[Math.abs(absoluteX * 17 + absoluteZ * 31 + ((absoluteX ^ absoluteZ) % 3)) % terrainColors.length]!;
        addQuad([[left, height, top], [right, height, top], [right, height, bottom], [left, height, bottom]], [0, 1, 0], tile);
        const sideColor = tile.scale(0.72);
        const sides = [
          { neighbor: sampleObsidianTerrainHeight(absoluteX, absoluteZ - 1), points: [[left, 0, top], [right, 0, top], [right, height, top], [left, height, top]], normal: [0, 0, -1] },
          { neighbor: sampleObsidianTerrainHeight(absoluteX, absoluteZ + 1), points: [[right, 0, bottom], [left, 0, bottom], [left, height, bottom], [right, height, bottom]], normal: [0, 0, 1] },
          { neighbor: sampleObsidianTerrainHeight(absoluteX - 1, absoluteZ), points: [[left, 0, bottom], [left, 0, top], [left, height, top], [left, height, bottom]], normal: [-1, 0, 0] },
          { neighbor: sampleObsidianTerrainHeight(absoluteX + 1, absoluteZ), points: [[right, 0, top], [right, 0, bottom], [right, height, bottom], [right, height, top]], normal: [1, 0, 0] },
        ];
        sides.forEach(side => {
          if (height > side.neighbor) addQuad(side.points, side.normal, sideColor);
        });
      }
    }
    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.colors = colors;
    vertexData.uvs = uvs;
    vertexData.indices = indices;
    vertexData.applyToMesh(mesh, true);
    mesh.position.set(chunkX * chunkWorldSize, 0, chunkZ * chunkWorldSize);
    mesh.material = terrainMaterials[terrainAssetId] ?? terrainMaterials["terrain.obsidian"];
    mesh.metadata = { assetPack: PIXEL_PACK_MANIFEST.id, assetId: terrainAssetId, terrainFamily: terrainFamilies, chunk: { x: chunkX, z: chunkZ, size: chunkSize }, inMap: Math.abs(chunkX) <= mapChunkRadius && Math.abs(chunkZ) <= mapChunkRadius };
  };

  for (let slotZ = -slotRadius; slotZ <= slotRadius; slotZ += 1) {
    for (let slotX = -slotRadius; slotX <= slotRadius; slotX += 1) {
      const mesh = new Mesh(`pixel-terrain-stream-slot-${slotX + slotRadius}-${slotZ + slotRadius}`, scene);
      mesh.parent = root;
      const terrainAssetId = terrainFamilies[Math.abs(slotX * 5 + slotZ * 11) % terrainFamilies.length]!;
      assignChunk(mesh, slotX, slotZ, terrainAssetId);
      chunkMeshes.push(mesh);
    }
  }

  root.metadata = {
    assetPack: PIXEL_PACK_MANIFEST.id,
    assetId: terrainFamilies[0],
    terrainFamily: terrainFamilies,
    chunkSize,
    chunkCount: chunkMeshes.length,
    width,
    depth,
    stream: {
      meshes: chunkMeshes,
      chunkWorldSize,
      visibleRadiusMeters,
      prefetchRadiusMeters,
      slotRadius,
      prefetchSlotRadius,
      slotsPerAxis,
      mapRadiusMeters,
      terrainAssetIds: terrainFamilies,
      terrainMaterials,
      assignChunk,
      renderDistancePreset: renderDistance.preset,
      centerX: 0,
      centerZ: 0,
    },
  };
  return root;
}

export function updatePixelTerrainStream(root: TransformNode, position: { x: number; z: number }, mapRadiusMeters = 500) {
  const stream = root.metadata?.stream as {
    meshes: Mesh[];
    chunkWorldSize: number;
    slotRadius: number;
    prefetchSlotRadius: number;
    mapRadiusMeters: number;
    centerX: number;
    centerZ: number;
    terrainAssetIds: string[];
    terrainMaterials: Record<string, StandardMaterial>;
    assignChunk: (mesh: Mesh, chunkX: number, chunkZ: number, terrainAssetId: string) => void;
  } | undefined;
  if (!stream) return;
  const centerX = Math.floor(position.x / stream.chunkWorldSize);
  const centerZ = Math.floor(position.z / stream.chunkWorldSize);
  if (centerX === stream.centerX && centerZ === stream.centerZ && stream.mapRadiusMeters === mapRadiusMeters) return;
  stream.centerX = centerX;
  stream.centerZ = centerZ;
  stream.mapRadiusMeters = mapRadiusMeters;
  const mapChunkRadius = Math.ceil(mapRadiusMeters / stream.chunkWorldSize);
  const slotsPerAxis = stream.slotRadius * 2 + 1;
  stream.meshes.forEach((mesh, index) => {
    const slotX = (index % slotsPerAxis) - stream.slotRadius;
    const slotZ = Math.floor(index / slotsPerAxis) - stream.slotRadius;
    const chunkX = centerX + slotX;
    const chunkZ = centerZ + slotZ;
    const terrainAssetId = stream.terrainAssetIds[Math.abs(chunkX * 5 + chunkZ * 11) % stream.terrainAssetIds.length] ?? stream.terrainAssetIds[0];
    if (terrainAssetId) stream.assignChunk(mesh, chunkX, chunkZ, terrainAssetId);
    mesh.metadata = { ...mesh.metadata, assetId: terrainAssetId, terrainFamily: stream.terrainAssetIds, chunk: { ...mesh.metadata?.chunk, x: chunkX, z: chunkZ }, inMap: Math.abs(chunkX) <= mapChunkRadius && Math.abs(chunkZ) <= mapChunkRadius };
    mesh.setEnabled(Boolean(mesh.metadata.inMap));
  });
}


export function getPixelPaletteColor(key: PaletteKey) {
  return paletteColor[key];
}

export function resolvePixelSymbol(symbol: string): PaletteKey {
  return SYMBOL_PALETTE[symbol] ?? "ink";
}
