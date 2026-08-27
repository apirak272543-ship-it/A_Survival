export const OBSIDIAN_TERRAIN_MAX_HEIGHT = 4;

function fract(value: number) {
  return value - Math.floor(value);
}

function valueNoise(x: number, z: number) {
  const value = Math.sin(x * 12.9898 + z * 78.233 + 37.719) * 43758.5453;
  return fract(value) * 2 - 1;
}

/**
 * A small, deterministic height field for the first map. It is intentionally
 * low-frequency and stepped so the top-down voxel read remains clear. The same
 * sampler is used by terrain geometry and player grounding/collision.
 */
export function sampleObsidianTerrainHeight(x: number, z: number): number {
  const distance = Math.hypot(x, z);
  const edgeShelf = Math.max(0, Math.min(1, (distance - 18) / 72));
  const ridge = Math.max(0, Math.sin(x * 0.16 + z * 0.06) * 0.5 + 0.5);
  const crossRidge = Math.max(0, Math.cos(z * 0.19 - x * 0.08) * 0.5 + 0.5);
  const noise = valueNoise(Math.floor(x / 4), Math.floor(z / 4)) * 0.18;
  const raw = edgeShelf * (0.8 + ridge * 1.15 + crossRidge * 0.65) + noise;
  return Math.max(0, Math.min(OBSIDIAN_TERRAIN_MAX_HEIGHT, Math.round(raw * 2) / 2));
}

export function isObsidianTerrainPassable(x: number, z: number) {
  return sampleObsidianTerrainHeight(x, z) <= OBSIDIAN_TERRAIN_MAX_HEIGHT;
}
