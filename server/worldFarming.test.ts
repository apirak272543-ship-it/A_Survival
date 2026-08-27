import { describe, expect, it } from "vitest";
import { getActiveRepellentAuras, getPlantDefinitionForSeed, getRepellentInfluence, OBSIDIAN_FARM_PLOTS, getSafeWorldPlantEffect, getWorldPlantStage, harvestWorldPlant, plantWorldSeed } from "../client/src/game/systems/worldFarmingSystem";

const plot = OBSIDIAN_FARM_PLOTS[0]!;

describe("Obsidian world farming", () => {
  it("binds generated plant seeds and preserves compatibility for starter seed ids", () => {
    expect(getPlantDefinitionForSeed("seed-plant-001")?.id).toBe("plant-001");
    expect(getPlantDefinitionForSeed("seed-001")?.id).toBe("plant-001");
    expect(getPlantDefinitionForSeed("sword-001")).toBeUndefined();
  });

  it("requires an unoccupied compatible soil and biome plot", () => {
    expect(plantWorldSeed({ seedItemId: "seed-plant-001", plot, occupied: false, now: 1 }).accepted).toBe(true);
    expect(plantWorldSeed({ seedItemId: "seed-plant-001", plot, occupied: true, now: 1 })).toMatchObject({ accepted: false, reason: "แปลงนี้มีพืชอยู่แล้ว" });
    expect(plantWorldSeed({ seedItemId: "seed-plant-002", plot: { ...plot, soilId: "aether-crystal" }, occupied: false, now: 1 }).accepted).toBe(false);
    expect(plantWorldSeed({ seedItemId: "seed-plant-001", plot: { ...plot, biome: "wetland" }, occupied: false, now: 1 }).accepted).toBe(false);
  });

  it("moves through deterministic growth stages and harvests only when mature", () => {
    const planted = plantWorldSeed({ seedItemId: "seed-plant-001", plot, occupied: false, now: 1, seed: 9107 });
    if (!planted.accepted) throw new Error("expected plant to be accepted");
    expect(getWorldPlantStage(planted.state, 1)).toBe("seed");
    expect(getWorldPlantStage(planted.state, planted.state.plantedAt + planted.state.growthDurationMs * 0.6)).toBe("young");
    expect(harvestWorldPlant(planted.state, planted.state.plantedAt + planted.state.growthDurationMs).accepted).toBe(true);
    expect(harvestWorldPlant(planted.state, planted.state.plantedAt + planted.state.growthDurationMs - 1)).toMatchObject({ accepted: false, reason: "พืชยังโตไม่เต็มที่" });
  });

  it("activates capped repellent only after maturity and only inside its radius", () => {
    const planted = plantWorldSeed({ seedItemId: "seed-plant-041", plot, occupied: false, now: 40, seed: 7 });
    if (!planted.accepted) throw new Error("expected repellent plant to be accepted");
    expect(getActiveRepellentAuras({ [planted.state.key]: planted.state }, planted.state.plantedAt)).toEqual([]);
    const auras = getActiveRepellentAuras({ [planted.state.key]: planted.state }, planted.state.plantedAt + planted.state.growthDurationMs);
    expect(auras).toHaveLength(1);
    expect(auras[0]?.radiusMeters).toBeLessThanOrEqual(8);
    expect(auras[0]?.power).toBeLessThanOrEqual(8);
    expect(getRepellentInfluence({ x: planted.state.x + 0.5, z: planted.state.z + 0.5 }, auras).repelled).toBe(true);
    expect(getRepellentInfluence({ x: planted.state.x + 20, z: planted.state.z + 20 }, auras).repelled).toBe(false);
  });

  it("caps fictional effects and keeps harvest output within the catalog range", () => {
    const planted = plantWorldSeed({ seedItemId: "seed-plant-133", plot: { ...plot, soilId: "aether-crystal", biome: "arcane" }, occupied: false, now: 20, seed: 77 });
    if (!planted.accepted) throw new Error("expected arcane plant to be accepted");
    const effect = getSafeWorldPlantEffect(planted.state.plantId);
    expect(effect?.power).toBeLessThanOrEqual(8);
    if (effect?.radiusMeters !== undefined) expect(effect.radiusMeters).toBeLessThanOrEqual(8);
    const harvest = harvestWorldPlant(planted.state, planted.state.plantedAt + planted.state.growthDurationMs);
    if (!harvest.accepted) throw new Error("expected mature plant to harvest");
    const source = getPlantDefinitionForSeed("seed-plant-133")!;
    expect(harvest.reward.quantity).toBeGreaterThanOrEqual(source.yieldQuantity[0]);
    expect(harvest.reward.quantity).toBeLessThanOrEqual(source.yieldQuantity[1]);
  });
});
