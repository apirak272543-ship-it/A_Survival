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
  if (![input.positionX, input.positionZ, input.terrainTiles, input.tileSize, input.chunkSize, input.radiusChunks].every(Number.isFinite)) return new Set<string>();
  if (input.terrainTiles <= 0 || input.tileSize <= 0 || input.chunkSize <= 0) return new Set<string>();
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
  if (![input.positionX, input.positionZ, input.chunkWorldSize, input.visibleRadiusMeters, input.mapRadiusMeters].every(Number.isFinite)) return new Set<string>();
  if (input.chunkWorldSize <= 0 || input.mapRadiusMeters < 0) return new Set<string>();
  const chunkWorldSize = input.chunkWorldSize;
  const centerX = Math.floor(input.positionX / chunkWorldSize);
  const centerZ = Math.floor(input.positionZ / chunkWorldSize);
  const mapChunkRadius = Math.ceil(input.mapRadiusMeters / chunkWorldSize);
  const radiusChunks = Math.min(mapChunkRadius, Math.max(0, Math.ceil(input.visibleRadiusMeters / chunkWorldSize)));
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
  if (!Number.isFinite(position) || !Number.isFinite(chunkWorldSize) || chunkWorldSize <= 0) return null;
  return Math.floor(position / chunkWorldSize);
}
