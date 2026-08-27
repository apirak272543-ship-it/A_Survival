import { describe, expect, it } from "vitest";
import { ALL_ITEMS, BLOCK_ITEM_DEFINITIONS } from "@/game/data/catalog";
import { ASSET_CREDITS, canDistributeAsset, getAssetCredit } from "@/game/data/assetProvenance";
import { createCodexEntry, getDiscoveredCodexEntries } from "@/game/systems/codexSystem";

describe("Codex discovery and asset credits", () => {
  it("never exposes undiscovered entries, including when the requested id is unknown", () => {
    expect(getDiscoveredCodexEntries([])).toEqual([]);
    expect(getDiscoveredCodexEntries(["not-a-real-item", "future-secret-item"])).toEqual([]);
    expect(getDiscoveredCodexEntries([ALL_ITEMS[0]!.id])).toHaveLength(1);
  });

  it("keeps placeable block details in the discovered entry", () => {
    const block = BLOCK_ITEM_DEFINITIONS.find(item => item.id === "block-obsidian-ash")!;
    expect(createCodexEntry(block)).toMatchObject({ category: "blocks", blockId: "terrain.ash", stackLimit: 64 });
  });

  it("keeps runtime distribution status explicit in the provenance registry", () => {
    const pack = getAssetCredit("pack.arcane-frontier-voxel-pixel");
    const reference = getAssetCredit("reference.minecraft-tree-rules");
    expect(pack).toBeDefined();
    expect(reference).toMatchObject({ status: "reference-only", sourceUrl: "https://minecraft.wiki/w/Tree_definition" });
    expect(canDistributeAsset(pack)).toBe(true);
    expect(canDistributeAsset(reference)).toBe(false);
    expect(ASSET_CREDITS.some(credit => credit.status === "reference-only" && credit.sourceUrl)).toBe(true);
  });
});
