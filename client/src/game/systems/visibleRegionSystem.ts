export type VisibleRegionInput = {
  positionX: number;
  positionZ: number;
  terrainTiles: number;
  tileSize: number;
  chunkSize: number;
  radiusChunks: number;
};

export function chunkKey(x: number, z: number) {
  return `${x}:${z}`;
}

export function getVisibleChunkKeys(input: VisibleRegionInput) {
  const columns = Math.ceil(input.terrainTiles / input.chunkSize);
  const rows = Math.ceil(input.terrainTiles / input.chunkSize);
  const originX = -(input.terrainTiles * input.tileSize) / 2;
  const originZ = -(input.terrainTiles * input.tileSize) / 2;
  const worldChunkSize = input.chunkSize * input.tileSize;
  const centerX = Math.floor((input.positionX - originX) / worldChunkSize);
  const centerZ = Math.floor((input.positionZ - originZ) / worldChunkSize);
  const radius = Math.max(0, Math.floor(input.radiusChunks));
  const visible = new Set<string>();

  for (let z = centerZ - radius; z <= centerZ + radius; z += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (x >= 0 && x < columns && z >= 0 && z < rows) visible.add(chunkKey(x, z));
    }
  }
  return visible;
}
