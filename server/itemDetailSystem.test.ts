import { describe, expect, it } from "vitest";
import { createStarterInstance, getItemDefinition } from "../client/src/game/data/catalog";
import { getItemLongDetail, getItemShortDetail, ITEM_DETAIL_HOLD_MS } from "../client/src/game/systems/itemDetailSystem";

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
});
