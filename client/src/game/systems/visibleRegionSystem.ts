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


export type StreamingRegionInput = {
  positionX: number;
  positionZ: number;
  chunkWorldSize: number;
  visibleRadiusMeters: number;
  mapRadiusMeters: number;
};

export function getStreamingChunkKeys(input: StreamingRegionInput) {
  const chunkWorldSize = Math.max(0.001, input.chunkWorldSize);
  const centerX = Math.floor(input.positionX / chunkWorldSize);
  const centerZ = Math.floor(input.positionZ / chunkWorldSize);
  const radiusChunks = Math.max(0, Math.ceil(input.visibleRadiusMeters / chunkWorldSize));
  const mapChunkRadius = Math.max(0, Math.ceil(input.mapRadiusMeters / chunkWorldSize));
  const visible = new Set<string>();

  for (let z = centerZ - radiusChunks; z <= centerZ + radiusChunks; z += 1) {
    for (let x = centerX - radiusChunks; x <= centerX + radiusChunks; x += 1) {
      if (x >= -mapChunkRadius && x <= mapChunkRadius && z >= -mapChunkRadius && z <= mapChunkRadius) {
        visible.add(chunkKey(x, z));
      }
    }
  }
  return visible;
}

export function getStreamingChunkCoordinate(position: number, chunkWorldSize: number) {
  return Math.floor(position / Math.max(0.001, chunkWorldSize));
}
