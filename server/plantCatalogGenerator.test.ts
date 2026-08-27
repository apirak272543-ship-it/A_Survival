import { describe, expect, it } from "vitest";
import { generateWorldPlantCatalog, validateWorldPlantCatalog, WORLD_FARM_MAX_FICTIONAL_RESTORE, WORLD_FARM_MAX_REPEL_RADIUS, WORLD_PLANT_CATALOG, WORLD_PLANT_CATALOG_SIZE } from "../client/src/game/tools/plantCatalogGenerator";
import { getItemDefinition } from "../client/src/game/data/catalog";

describe("Obsidian world plant catalog generator", () => {
  it("generates and validates exactly 300 deterministic plant records", () => {
    expect(WORLD_PLANT_CATALOG).toHaveLength(WORLD_PLANT_CATALOG_SIZE);
    expect(validateWorldPlantCatalog()).toEqual({ valid: true, issues: [] });
    expect(generateWorldPlantCatalog()).toEqual(WORLD_PLANT_CATALOG);
    expect(new Set(WORLD_PLANT_CATALOG.map(plant => plant.id)).size).toBe(300);
  });

  it("links each plant to a seed, soil, biome and material harvest definition", () => {
    for (const plant of WORLD_PLANT_CATALOG) {
      expect(getItemDefinition(plant.seedDefinitionId)?.category).toBe("seed");
      expect(getItemDefinition(plant.seedDefinitionId)?.soilId).toBe(plant.soilId);
      expect(plant.biomeId).toBe("obsidian-frontier");
      expect(getItemDefinition(plant.harvestDefinitionId)?.category).toBe("material");
    }
  });

  it("keeps fictional restore and repellent effects capped and non-lethal", () => {
    for (const plant of WORLD_PLANT_CATALOG) {
      if (plant.effect?.kind === "restore") expect(plant.effect.amount).toBeLessThanOrEqual(WORLD_FARM_MAX_FICTIONAL_RESTORE);
      if (plant.effect?.kind === "repel") {
        expect(plant.effect.radius).toBeLessThanOrEqual(WORLD_FARM_MAX_REPEL_RADIUS);
        expect(plant.effect.stackable).toBe(false);
        expect(plant.effect.label).toContain("ไม่ทำลาย");
      }
    }
  });
});
