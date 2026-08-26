import { describe, expect, it } from "vitest";
import { createStarterInstance } from "../client/src/game/data/catalog";
import { dispatchHotbarAction, getHotbarActionKind } from "../client/src/game/systems/itemActionSystem";

describe("Arcane hotbar item actions", () => {
  it("dispatches equipment without mutating the inventory", () => {
    const sword = createStarterInstance("sword-001", 1);
    const result = dispatchHotbarAction([sword], { 0: "sword-001" }, 0);
    expect(result.accepted).toBe(true);
    expect(result.kind).toBe("equip");
    expect(result.inventory).toEqual([sword]);
  });

  it("keeps a seed instance until contextual world planting accepts it", () => {
    const seed = createStarterInstance("seed-001", 2);
    const result = dispatchHotbarAction([seed], { 1: "seed-001" }, 1);
    expect(result.accepted).toBe(true);
    expect(result.kind).toBe("plant");
    expect(result.inventory).toEqual([seed]);
    expect(result.instance?.instanceId).toBe(seed.instanceId);
  });

  it("keeps deployable items available for contextual placement", () => {
    const structure = createStarterInstance("structure-001", 3);
    const result = dispatchHotbarAction([structure], { 2: "structure-001" }, 2);
    expect(result.accepted).toBe(true);
    expect(result.kind).toBe("deploy");
    expect(result.inventory).toEqual([structure]);
    expect(getHotbarActionKind("material")).toBe("harvest");
  });
});
