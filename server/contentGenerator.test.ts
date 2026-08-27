import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateLootDrop, generateProceduralWeapon, generateProceduralWeapons, type AssetManifestLike } from "../tools/content-generator";

const manifest = JSON.parse(readFileSync("client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json", "utf8")) as AssetManifestLike;

const rarityBounds: Record<string, [number, number]> = {
  common: [1, 20],
  uncommon: [15, 35],
  rare: [30, 55],
  epic: [50, 80],
  legendary: [70, 120],
  mythic: [100, 180],
};

describe("A-Survival Procedural Content Generator", () => {
  it("reproduces the same procedural item from the same seed and definition", () => {
    const first = generateProceduralWeapon({ seed: 829173, index: 4, category: "melee", assetManifest: manifest });
    const second = generateProceduralWeapon({ seed: 829173, index: 4, category: "melee", assetManifest: manifest });
    expect(second).toEqual(first);
    expect(first.seed).toBe(860849);
    expect(first.storage).toEqual({ stackLimit: 1, instanceMode: "definition-plus-seed" });
  });

  it("generates a large unique batch without hand-writing each item", () => {
    const items = generateProceduralWeapons({ seed: 829173, count: 300, category: "melee", assetManifest: manifest });
    expect(items).toHaveLength(300);
    expect(new Set(items.map(item => item.id)).size).toBe(300);
    expect(new Set(items.map(item => item.seed)).size).toBe(300);
    expect(items.every(item => item.category === "melee" && item.asset.status === "bound")).toBe(true);
    expect(items.every(item => item.asset.assetId === "items.blade")).toBe(true);
  });

  it("keeps smart-random power within the selected rarity range and caps affixes", () => {
    const items = generateProceduralWeapons({ seed: 1729, count: 240, assetManifest: manifest });
    for (const item of items) {
      const [minPower, maxPower] = rarityBounds[item.rarity]!;
      expect(item.stats.power).toBeGreaterThanOrEqual(minPower);
      expect(item.stats.power).toBeLessThanOrEqual(maxPower);
      expect(item.affixes.length).toBeLessThanOrEqual(item.rarity === "common" ? 0 : item.rarity === "mythic" ? 4 : item.rarity === "legendary" || item.rarity === "epic" ? 3 : 2);
      expect(item.stats.damage).toBeLessThan(500);
    }
  });

  it("creates boss loot with seeded high rarity and verified replaceable pixel assets", () => {
    const loot = generateLootDrop({ seed: 829173, monsterId: "void-reaper", biome: "obsidian-frontier", isBoss: true, count: 3, assetManifest: manifest });
    expect(loot.drops).toHaveLength(3);
    expect(loot.drops.every(item => ["epic", "legendary", "mythic"].includes(item.rarity))).toBe(true);
    expect(loot.drops.every(item => item.asset.status === "bound" && item.asset.sha256)).toBe(true);
    expect(loot.lootHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("never treats an unknown texture as distributable runtime art", () => {
    const item = generateProceduralWeapon({ seed: 7, assetManifest: { ...manifest, entries: {} } });
    expect(item.asset.status).toBe("awaiting-asset");
    expect(item.asset.provenance).toBe("reference-only");
  });
});
