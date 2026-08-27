import { describe, expect, it } from "vitest";
import { ALL_ITEMS, createStarterInstance, getItemDefinition } from "../client/src/game/data/catalog";
import { getItemCategoryDetail, getItemLongDetail, getItemShortDetail, ITEM_DETAIL_HOLD_MS } from "../client/src/game/systems/itemDetailSystem";

describe("item detail presentation", () => {
  it("uses the canonical definition for short swap detail", () => {
    const definition = getItemDefinition("sword-001")!;
    expect(getItemShortDetail(definition)).toMatchObject({ definitionId: "sword-001", title: definition.name, category: "sword", tier: "ธรรมดา", summary: definition.effect });
  });

  it("keeps full detail separate and preserves item provenance", () => {
    const definition = getItemDefinition("block-obsidian-sand")!;
    const instance = createStarterInstance(definition.id, 10);
    const detail = getItemLongDetail(definition, instance);
    expect(detail).toMatchObject({ definitionId: definition.id, stackLimit: 64, placeableBlockId: "terrain.obsidian.sand", provenanceType: "starter", provenanceEventId: instance.provenance.eventId, enhancement: 0 });
    expect(detail.tags).toContain("gravity");
  });

  it("uses a 3.5 second hold threshold", () => {
    expect(ITEM_DETAIL_HOLD_MS).toBe(3500);
  });

  it("reports weapon damage as unavailable instead of inventing a combat number", () => {
    const definition = getItemDefinition("sword-001")!;
    const detail = getItemCategoryDetail(definition);
    const damage = detail.facts.find(fact => fact.key === "attack-damage");
    expect(detail.category).toBe("weapon");
    expect(detail.unavailable).toEqual(["attack-damage"]);
    expect(damage).toMatchObject({ label: "พลังโจมตี", value: "ยังไม่มีข้อมูล", available: false });
    expect(damage?.reason).toContain("ไม่มี field เจ้าของค่าความเสียหาย");
  });

  it("exposes plant soil/effect facts from the canonical seed definition", () => {
    const definition = getItemDefinition("seed-plant-001")!;
    const detail = getItemCategoryDetail(definition, createStarterInstance(definition.id, 1));
    expect(detail.category).toBe("plant");
    expect(detail.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "plant-soil", available: true, value: definition.soilId }),
      expect.objectContaining({ key: "plant-effect", available: true, value: definition.effect }),
    ]));
    expect(detail.provenanceType).toBe("starter");
    expect(detail.enhancement).toBe(0);
  });

  it("exposes block placement and tool-tag facts only when the definition owns them", () => {
    const block = getItemCategoryDetail(getItemDefinition("block-obsidian-stone")!);
    const toolDefinition = ALL_ITEMS.find(item => item.category === "tool")!;
    const tool = getItemCategoryDetail(toolDefinition);
    expect(block).toMatchObject({ category: "block", definitionId: "block-obsidian-stone" });
    expect(block.facts).toContainEqual(expect.objectContaining({ key: "placeable-block", value: "terrain.obsidian", available: true }));
    expect(tool).toMatchObject({ category: "tool", definitionId: toolDefinition.id });
    expect(tool.facts).toContainEqual(expect.objectContaining({ key: "tool-tag", value: toolDefinition.toolTag, available: true }));
  });
});
