export type BiomeDecoration = {
  assetId: string;
  category: "flora" | "resource" | "landmark";
  position: { x: number; z: number };
  width: number;
  height: number;
  yOffset?: number;
  emissive?: number;
};

export type BiomeVisualProfile = {
  mapId: string;
  terrainAssetIds: string[];
  decorations: BiomeDecoration[];
};

/**
 * Obsidian Frontier is the first fully dressed map slice. Other maps intentionally
 * use the safe default until their own asset pass is approved and completed.
 */
export const OBSIDIAN_FRONTIER_VISUALS: BiomeVisualProfile = {
  mapId: "obsidian-frontier",
  terrainAssetIds: ["terrain.obsidian", "terrain.crystal", "terrain.ash"],
  decorations: [
    { assetId: "art.obsidian.crystal-fern", category: "flora", position: { x: -8, z: -9 }, width: 2.8, height: 3.3, yOffset: 0.02, emissive: 0.6 },
    { assetId: "art.obsidian.spore-shrub", category: "flora", position: { x: 8, z: -12 }, width: 2.9, height: 3.0, yOffset: 0.02, emissive: 0.46 },
    { assetId: "art.obsidian.glow-vine", category: "flora", position: { x: -15, z: 8 }, width: 2.7, height: 3.2, yOffset: 0.02, emissive: 0.62 },
    { assetId: "art.obsidian.crystal-fern", category: "flora", position: { x: 13, z: 14 }, width: 2.8, height: 3.3, yOffset: 0.02, emissive: 0.6 },
    { assetId: "art.obsidian.spore-shrub", category: "flora", position: { x: 24, z: -5 }, width: 2.9, height: 3.0, yOffset: 0.02, emissive: 0.46 },
    { assetId: "art.obsidian.glow-vine", category: "flora", position: { x: -27, z: -16 }, width: 2.7, height: 3.2, yOffset: 0.02, emissive: 0.62 },
    { assetId: "art.obsidian.aether-ore", category: "resource", position: { x: -6, z: 16 }, width: 2.5, height: 2.4, yOffset: 0.02, emissive: 0.58 },
    { assetId: "art.obsidian.shard-cluster", category: "resource", position: { x: 17, z: 6 }, width: 2.5, height: 2.5, yOffset: 0.02, emissive: 0.7 },
    { assetId: "art.obsidian.lumen-bulb", category: "resource", position: { x: -22, z: 22 }, width: 2.4, height: 2.4, yOffset: 0.02, emissive: 0.56 },
    { assetId: "art.obsidian.aether-ore", category: "resource", position: { x: 31, z: 17 }, width: 2.5, height: 2.4, yOffset: 0.02, emissive: 0.58 },
    { assetId: "art.obsidian.portal-ruin", category: "landmark", position: { x: -11, z: -12 }, width: 7.4, height: 8.5, yOffset: 0.02, emissive: 0.32 },
    { assetId: "art.obsidian.ancient-monolith", category: "landmark", position: { x: 13, z: 11 }, width: 6.2, height: 8.7, yOffset: 0.02, emissive: 0.4 },
  ],
};

const DEFAULT_VISUALS: BiomeVisualProfile = {
  mapId: "default",
  terrainAssetIds: ["terrain.obsidian"],
  decorations: [],
};

export function getBiomeVisualProfile(mapId: string): BiomeVisualProfile {
  return mapId === OBSIDIAN_FRONTIER_VISUALS.mapId ? OBSIDIAN_FRONTIER_VISUALS : DEFAULT_VISUALS;
}
