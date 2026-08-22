import { describe, expect, it } from "vitest";
import { createStarterInstance } from "../client/src/game/data/catalog";
import { DEFAULT_GROWTH_DURATION_MS, getCropStage, getPetBonus, harvestCrop, moveStructure, placeHomeObject, placeStructure, plantSeed, recallStructure, transferPetEquipment, type HomeState } from "../client/src/game/home/homeSystemV2";

const emptyHome = (): HomeState => ({
  structures: [],
  plots: [{ id: "plot-a", soilId: "terra-loam" }],
  petName: "NOVA-7",
  petEquipment: {},
});

describe("home relationship contract", () => {
  it("prevents two building instances from occupying the same home grid cells", () => {
    const first = createStarterInstance("structure-001", 1);
    const second = createStarterInstance("structure-002", 2);
    const placed = placeStructure({ home: emptyHome(), inventory: [first, second], instanceId: first.instanceId, x: 0, z: 0, now: 10 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const overlap = placeStructure({ home: placed.home, inventory: placed.inventory, instanceId: second.instanceId, x: 1, z: 1, now: 20 });
    expect(overlap).toMatchObject({ ok: false });
  });

  it("preserves the exact structure instance and provenance when recalling it", () => {
    const structure = createStarterInstance("structure-001", 3);
    const placed = placeStructure({ home: emptyHome(), inventory: [structure], instanceId: structure.instanceId, x: 0, z: 0, now: 10 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const recalled = recallStructure(placed.home, placed.inventory, structure.instanceId, 20);
    expect(recalled.ok).toBe(true);
    if (!recalled.ok) return;
    expect(recalled.inventory).toHaveLength(1);
    expect(recalled.inventory[0]).toEqual(structure);
  });

  it("allows decoration placement and moves a placed object without overlapping another object", () => {
    const decoration = createStarterInstance("decoration-001", 30);
    const structure = createStarterInstance("structure-001", 31);
    const placedDecoration = placeHomeObject({ home: emptyHome(), inventory: [decoration, structure], instanceId: decoration.instanceId, x: 0, z: 0, now: 10 });
    expect(placedDecoration.ok).toBe(true);
    if (!placedDecoration.ok) return;
    const moved = moveStructure(placedDecoration.home, decoration.instanceId, 4, 4, 20);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.home.structures[0]).toMatchObject({ id: decoration.instanceId, x: 4, z: 4 });
  });

  it("requires compatible soil, calculates offline crop maturity, and creates harvest provenance", () => {
    const seed = createStarterInstance("seed-001", 4);
    const planted = plantSeed(emptyHome(), [seed], "plot-a", seed.instanceId, 100);
    expect(planted.ok).toBe(true);
    if (!planted.ok) return;
    expect(getCropStage(planted.home.plots[0], 100 + DEFAULT_GROWTH_DURATION_MS)).toBe("mature");
    const harvested = harvestCrop(planted.home, planted.inventory, "plot-a", 100 + DEFAULT_GROWTH_DURATION_MS + 1);
    expect(harvested.ok).toBe(true);
    if (!harvested.ok) return;
    expect(harvested.inventory[0]?.provenance.type).toBe("harvest");
    expect(harvested.inventory[0]?.definitionId).toBe("material-001");
    expect(harvested.home.plots[0]?.seedDefinitionId).toBeUndefined();
  });

  it("moves one item atomically between inventory and a pet slot without duplication", () => {
    const collar = createStarterInstance("decoration-001", 5);
    const equipped = transferPetEquipment(emptyHome(), [collar], "collar", collar.instanceId, 10);
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) return;
    expect(equipped.inventory).toHaveLength(0);
    expect(equipped.home.petEquipment?.collar?.instanceId).toBe(collar.instanceId);
    const unequipped = transferPetEquipment(equipped.home, equipped.inventory, "collar", null, 20);
    expect(unequipped.ok).toBe(true);
    if (!unequipped.ok) return;
    expect(unequipped.inventory).toEqual([collar]);
    expect(unequipped.home.petEquipment?.collar).toBeUndefined();
  });

  it("derives explicit scouting and harvest bonuses from pet equipment", () => {
    const collar = createStarterInstance("decoration-001", 40);
    const core = createStarterInstance("material-001", 41);
    const collarEquipped = transferPetEquipment(emptyHome(), [collar, core], "collar", collar.instanceId, 10);
    expect(collarEquipped.ok).toBe(true);
    if (!collarEquipped.ok) return;
    const coreEquipped = transferPetEquipment(collarEquipped.home, collarEquipped.inventory, "core", core.instanceId, 20);
    expect(coreEquipped.ok).toBe(true);
    if (!coreEquipped.ok) return;
    expect(getPetBonus(coreEquipped.home)).toEqual({ following: true, scoutRadiusMeters: 18, harvestBonusPercent: 10 });
  });
});
