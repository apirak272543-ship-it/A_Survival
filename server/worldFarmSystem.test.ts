import { describe, expect, it } from "vitest";
import { createStarterInstance } from "../client/src/game/data/catalog";
import { createDefaultWorldFarmState, getWorldFarmCropStage, harvestWorldPlant, normalizeWorldFarmState, planHarvestWorldPlant, planPlantWorldSeed, plantWorldSeed, validateWorldFarmEffect } from "../client/src/game/systems/worldFarmSystem";

describe("Obsidian world farming", () => {
  it("gates a seed by playable map, plot soil, and one occupied plot", () => {
    const state = createDefaultWorldFarmState();
    const incompatible = planPlantWorldSeed({ mapId: "obsidian-frontier", state, plotId: "farm-plot-01", seedDefinitionId: "seed-002", seedInstanceId: "inst-seed-002-1", now: 1_000 });
    expect(incompatible.accepted).toBe(false);
    expect(incompatible.reason).toContain("ดิน");

    const accepted = planPlantWorldSeed({ mapId: "obsidian-frontier", state, plotId: "farm-plot-01", seedDefinitionId: "seed-001", seedInstanceId: "inst-seed-001-1", now: 1_000 });
    expect(accepted.accepted).toBe(true);
    expect(accepted.state["farm-plot-01"]?.seedInstanceId).toBe("inst-seed-001-1");
    const occupied = planPlantWorldSeed({ mapId: "obsidian-frontier", state: accepted.state, plotId: "farm-plot-01", seedDefinitionId: "seed-001", seedInstanceId: "inst-seed-001-2", now: 1_001 });
    expect(occupied.accepted).toBe(false);

    expect(planPlantWorldSeed({ mapId: "map-002-ashen-obsidian-plains", state, plotId: "farm-plot-01", seedDefinitionId: "seed-001", seedInstanceId: "inst-seed-001-1", now: 1_000 }).accepted).toBe(false);
  });

  it("advances deterministically through seed, sprout, young, and mature offline stages", () => {
    const state = createDefaultWorldFarmState();
    const planted = planPlantWorldSeed({ mapId: "obsidian-frontier", state, plotId: "farm-plot-01", seedDefinitionId: "seed-001", seedInstanceId: "inst-seed-001-1", now: 10_000 });
    expect(planted.accepted && planted.plot).toBeTruthy();
    const plot = planted.plot!;
    expect(getWorldFarmCropStage(plot, 10_000)).toBe("seed");
    expect(getWorldFarmCropStage(plot, 10_000 + plot.growthDurationMs! * 0.3)).toBe("sprout");
    expect(getWorldFarmCropStage(plot, 10_000 + plot.growthDurationMs! * 0.7)).toBe("young");
    expect(getWorldFarmCropStage(plot, 10_000 + plot.growthDurationMs!)).toBe("mature");
  });

  it("consumes a seed only after accepted planting and harvests only at maturity", () => {
    const seed = createStarterInstance("seed-001", 2);
    const state = createDefaultWorldFarmState();
    const planted = plantWorldSeed({ mapId: "obsidian-frontier", state, inventory: [seed], plotId: "farm-plot-01", seedInstanceId: seed.instanceId, now: 20_000 });
    expect(planted.accepted).toBe(true);
    expect(planted.plot?.plantId).toBe("plant-001");
    expect(planted.inventory).toEqual([]);
    const tooEarly = planHarvestWorldPlant({ mapId: "obsidian-frontier", state: planted.state, plotId: "farm-plot-01", now: 20_000 + 1 });
    expect(tooEarly.accepted).toBe(false);

    const harvested = harvestWorldPlant({ mapId: "obsidian-frontier", state: planted.state, inventory: [], plotId: "farm-plot-01", now: 20_000 + planted.plot!.growthDurationMs! });
    expect(harvested.accepted).toBe(true);
    expect(harvested.reward?.definitionId).toBe("material-002");
    expect(harvested.reward?.provenance).toMatchObject({ type: "harvest", mapId: "obsidian-frontier" });
    expect(harvested.state["farm-plot-01"]?.plantId).toBeUndefined();
    expect(harvested.inventory).toHaveLength(1);

    const rejectedPlant = plantWorldSeed({ mapId: "obsidian-frontier", state, inventory: [seed], plotId: "farm-plot-02", seedInstanceId: seed.instanceId, now: 20_000 });
    expect(rejectedPlant.accepted).toBe(false);
    expect(rejectedPlant.inventory).toEqual([seed]);
  });

  it("normalizes legacy or malformed farm state to the four bounded Obsidian plots", () => {
    const normalized = normalizeWorldFarmState({ "farm-plot-01": { plantId: "unknown", seedDefinitionId: "seed-001", coordinate: { x: 3, y: 0, z: 1 }, soilId: "terra-loam", updatedAt: 1 }, "farm-plot-02": { plantId: "world-plant-001", seedDefinitionId: "seed-001", plantedAt: 2, growthDurationMs: 3_000, coordinate: { x: 4, y: 0, z: 1 }, soilId: "ashen-volcanic", updatedAt: 2 }, "foreign-plot": { plantId: "world-plant-001" } });
    expect(Object.keys(normalized)).toEqual(["farm-plot-01", "farm-plot-02", "farm-plot-03", "farm-plot-04"]);
    expect(normalized["farm-plot-01"]?.plantId).toBeUndefined();
    expect(normalized["farm-plot-02"]?.plantId).toBe("plant-001");
    expect(normalized["farm-plot-02"]?.seedDefinitionId).toBe("seed-001");
  });

  it("accepts only capped fictional mature effects", () => {
    expect(validateWorldFarmEffect({ kind: "repel", radius: 6, durationMs: 30_000, stackable: false, label: "ไม่ทำลาย" })).toEqual({ valid: true, issues: [] });
    expect(validateWorldFarmEffect({ kind: "repel", radius: 7, durationMs: 30_000, stackable: false, label: "ไม่ทำลาย" }).valid).toBe(false);
  });
});
