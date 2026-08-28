import { describe, expect, it } from "vitest";
import {
  CATALOG_LIMIT_PER_CATEGORY,
  ITEM_CATALOG,
  createStarterInstance,
  getItemDefinition,
  isPlantCompatibleWithSoil,
  validateItemInstances,
} from "../client/src/game/data/catalog";
import { getWorldLighting } from "../client/src/game/data/worldTime";

describe("Arcane Frontier item rules", () => {
  it("creates exactly 400 definitions for every principal catalog category", () => {
    Object.values(ITEM_CATALOG).forEach(category => {
      expect(category).toHaveLength(CATALOG_LIMIT_PER_CATEGORY);
    });
  });

  it("keeps equippable item instances to one unit while allowing multiple instances", () => {
    const first = createStarterInstance("sword-001", 1);
    const second = createStarterInstance("sword-001", 2);
    expect(validateItemInstances([first, second])).toEqual({ valid: true, issues: [] });

    const invalidStack = { ...first, instanceId: "stacked-sword", quantity: 2 };
    expect(validateItemInstances([invalidStack]).valid).toBe(false);
  });

  it("links each seed to one readable compatible soil group", () => {
    const seed = getItemDefinition("seed-001");
    expect(seed?.soilId).toBeDefined();
    expect(isPlantCompatibleWithSoil(seed!, seed!.soilId!)).toBe(true);
    expect(isPlantCompatibleWithSoil(seed!, "aether-crystal")).toBe(seed!.soilId === "aether-crystal");
  });
});

describe("Arcane Frontier world time", () => {
  it("uses special lighting for biome exceptions and a day/night cycle elsewhere", () => {
    expect(getWorldLighting("ashen-hellscape").phase).toBe("night");
    expect(getWorldLighting("astral-drift").ambience).toBe("void-hum");
    expect(getWorldLighting("obsidian-frontier", 0).phase).toBe("day");
    expect(getWorldLighting("obsidian-frontier", 16 * 60 * 1000).phase).toBe("night");
  });

  it("normalizes malformed world time to a deterministic cycle origin", () => {
    for (const now of [Number.NaN, Number.POSITIVE_INFINITY, -1.5]) {
      const lighting = getWorldLighting("obsidian-frontier", now);
      expect(lighting.phase).toBe("day");
      expect(lighting.progress).toBe(0);
    }
  });
});
