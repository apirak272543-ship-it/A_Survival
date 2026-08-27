import { describe, expect, it } from "vitest";
import { ALL_ITEMS, getItemDefinition } from "../client/src/game/data/catalog";
import { PLANT_CATALOG, PLANT_ITEMS, getPlantsForBiome, getPlantsForSoil } from "../client/src/game/data/plantCatalog";
import { getDiscoveredCodexEntries } from "../client/src/game/systems/codexSystem";

describe("Obsidian plant catalog", () => {
  it("contains 300 unique plant definitions and matching seed items", () => {
    expect(PLANT_CATALOG).toHaveLength(300);
    expect(PLANT_ITEMS).toHaveLength(300);
    expect(new Set(PLANT_CATALOG.map(plant => plant.id)).size).toBe(300);
    expect(new Set(PLANT_CATALOG.map(plant => plant.seedItemId)).size).toBe(300);
    expect(PLANT_CATALOG.every(plant => plant.compatibleSoils.length > 0 && plant.biomeTags.length > 0)).toBe(true);
    expect(PLANT_CATALOG.every(plant => plant.effect.power > 0)).toBe(true);
  });

  it("keeps biome and soil queries data-driven", () => {
    expect(getPlantsForBiome("volcanic").length).toBeGreaterThan(0);
    expect(getPlantsForBiome("arcane").length).toBeGreaterThan(0);
    expect(getPlantsForSoil("ashen-volcanic").length).toBeGreaterThan(0);
    expect(getPlantsForSoil("aether-crystal").length).toBeGreaterThan(0);
  });

  it("exposes plant seeds through the shared item catalog", () => {
    const plant = PLANT_CATALOG[0]!;
    const item = getItemDefinition(plant.seedItemId);
    expect(item?.category).toBe("seed");
    expect(ALL_ITEMS.some(candidate => candidate.id === plant.seedItemId)).toBe(true);
    expect(item?.stackLimit).toBe(64);
  });

  it("does not leak undiscovered entries into Codex", () => {
    const discovered = getDiscoveredCodexEntries(["seed-plant-001", "block-obsidian-stone"]);
    expect(discovered.map(entry => entry.id)).toEqual(["block-obsidian-stone", "seed-plant-001"]);
    expect(getDiscoveredCodexEntries([])).toEqual([]);
  });
});
