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

export const PIXEL_PACK_MANIFEST = {
  id: "arcane-frontier-voxel-pixel",
  basePath: "/assets/packs/arcane-frontier-voxel-pixel",
  version: "0.2.0",
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
  material.emissiveColor = new Color3(0.18, 0.18, 0.18);
  material.specularColor = Color3.Black();
  material.backFaceCulling = false;
  if (textureAssetId) {
    const fallbackPath = `${PIXEL_PACK_MANIFEST.basePath}/${textureAssetId.replace(/\./g, "/")}.png`;
    const texture = new Texture(resolveTextureAssetUrl(textureAssetId, fallbackPath), scene, true, false, Texture.NEAREST_SAMPLINGMODE);
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
  }
  return material;
}

const FACE_DEFINITIONS = [
  { normal: [0, 0, 1], corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { normal: [0, 0, -1], corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
  { normal: [1, 0, 0], corners: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
  { normal: [-1, 0, 0], corners: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  { normal: [0, 1, 0], corners: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
  { normal: [0, -1, 0], corners: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
] as const;

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

export function createPixelTerrainChunks(scene: Scene, width: number, depth: number, tileSize = 2, chunkSize = PIXEL_CHUNK_SIZE) {
  const root = new TransformNode("pixel-terrain-root", scene);
  const terrainColors = [paletteColor.void, paletteColor.ink, paletteColor.indigo, paletteColor.obsidian, paletteColor.ash];
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const columns = Math.ceil(width / chunkSize);
  const rows = Math.ceil(depth / chunkSize);
  let chunkCount = 0;

  for (let chunkZ = 0; chunkZ < rows; chunkZ += 1) {
    for (let chunkX = 0; chunkX < columns; chunkX += 1) {
      const mesh = new Mesh(`pixel-terrain-chunk-${chunkX}-${chunkZ}`, scene);
      const positions: number[] = [];
      const normals: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];
      let vertex = 0;
      const startX = chunkX * chunkSize;
      const startZ = chunkZ * chunkSize;
      const endX = Math.min(width, startX + chunkSize);
      const endZ = Math.min(depth, startZ + chunkSize);

      for (let z = startZ; z < endZ; z += 1) {
        for (let x = startX; x < endX; x += 1) {
          const left = x * tileSize - halfWidth * tileSize;
          const right = left + tileSize;
          const top = z * tileSize - halfDepth * tileSize;
          const bottom = top + tileSize;
          const tile = terrainColors[(x * 17 + z * 31 + ((x ^ z) % 3)) % terrainColors.length]!;
          positions.push(left, 0, top, right, 0, top, right, 0, bottom, left, 0, bottom);
          for (let index = 0; index < 4; index += 1) normals.push(0, 1, 0);
          for (let index = 0; index < 4; index += 1) colors.push(tile.r, tile.g, tile.b, 1);
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
      mesh.metadata = { assetPack: PIXEL_PACK_MANIFEST.id, assetId: "terrain.obsidian", chunk: { x: chunkX, z: chunkZ, size: chunkSize } };
      mesh.parent = root;
      chunkCount += 1;
    }
  }
  root.metadata = { assetPack: PIXEL_PACK_MANIFEST.id, assetId: "terrain.obsidian", chunkSize, chunkCount, width, depth };
  return root;
}

export function getPixelPaletteColor(key: PaletteKey) {
  return paletteColor[key];
}

export function resolvePixelSymbol(symbol: string): PaletteKey {
  return SYMBOL_PALETTE[symbol] ?? "ink";
}
