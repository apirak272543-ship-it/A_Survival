export type AssetCreditStatus = "project-original" | "license-verified" | "awaiting-contact" | "reference-only";
export type AssetCreditCategory = "terrain" | "block" | "plant" | "tree" | "item" | "character" | "monster" | "sky" | "audio" | "tool";

export type AssetCredit = {
  assetId: string;
  category: AssetCreditCategory;
  title: string;
  creator: string;
  sourceUrl?: string;
  sourceLabel?: string;
  license?: string;
  status: AssetCreditStatus;
  attribution: string;
  notes?: string;
};

/**
 * Credits are runtime-readable data, while the manifest remains the asset
 * resolver. A reference-only row never becomes a distributable asset by itself.
 */
export const ASSET_CREDITS: AssetCredit[] = [
  {
    assetId: "pack.arcane-frontier-voxel-pixel",
    category: "tool",
    title: "Arcane Frontier Voxel Pixel starter pack",
    creator: "A_Survival project",
    license: "Project-authored pack; see repository license/terms",
    status: "project-original",
    attribution: "A_Survival project · starter pack assembled for this game",
    notes: "Some starter visuals were produced with built-in generation from the project visual brief; they are not claimed as Google Gemini Image API output.",
  },
  {
    assetId: "reference.minecraft-tree-rules",
    category: "tree",
    title: "Public tree-generation reference",
    creator: "Minecraft Wiki community documentation",
    sourceUrl: "https://minecraft.wiki/w/Tree_definition",
    sourceLabel: "Minecraft Wiki — Tree definition",
    license: "Reference only; no Minecraft asset/code redistributed",
    status: "reference-only",
    attribution: "Reference: Minecraft Wiki tree definition",
    notes: "Used only to understand bounded stem/foliage template concepts. A_Survival generation and assets are original.",
  },
  {
    assetId: "reference.terraria.biomes",
    category: "terrain",
    title: "Public biome-design reference",
    creator: "Official Terraria Wiki contributors",
    sourceUrl: "https://terraria.wiki.gg/wiki/Biomes",
    sourceLabel: "Official Terraria Wiki — Biomes",
    license: "Reference only; no Terraria asset/code redistributed",
    status: "reference-only",
    attribution: "Reference: Official Terraria Wiki biome documentation",
    notes: "Used only to compare coordinated terrain, flora, items and enemies across biomes.",
  },
];

export function getAssetCredit(assetId: string): AssetCredit | undefined {
  return ASSET_CREDITS.find(credit => credit.assetId === assetId);
}

export function canDistributeAsset(credit: AssetCredit | undefined): boolean {
  return credit?.status === "project-original" || credit?.status === "license-verified";
}
