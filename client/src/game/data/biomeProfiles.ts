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
  // Ash is the readable walkable base; obsidian remains a darker accent band.
  // Flora and resource dressing is intentionally not rendered as billboards here:
  // those objects belong to the block-first world registry and will be added there
  // as individual plant/ore blocks instead of decorative mesh groups.
  terrainAssetIds: ["terrain.ash", "terrain.obsidian"],
  decorations: [
    { assetId: "art.obsidian.portal-ruin", category: "landmark", position: { x: -11, z: -12 }, width: 7.4, height: 8.5, yOffset: 0.02, emissive: 0.16 },
    { assetId: "art.obsidian.ancient-monolith", category: "landmark", position: { x: 13, z: 11 }, width: 6.2, height: 8.7, yOffset: 0.02, emissive: 0.18 },
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
