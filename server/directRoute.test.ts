import { describe, expect, it } from "vitest";
import { RUNTIME_MAP_ID, resolveDirectMapId, resolveDirectRoute } from "../client/src/game/routing/directRoute";

describe("direct route contract", () => {
  it("prefers the durable route query while retaining existing demo URLs", () => {
    expect(resolveDirectRoute("?route=home")).toBe("home");
    expect(resolveDirectRoute("?demo=game&map=obsidian-frontier")).toBe("game");
    expect(resolveDirectRoute("?route=unknown")).toBe("landing");
  });

  it("allows only the Obsidian runtime map and safely falls back for future maps", () => {
    const maps = [RUNTIME_MAP_ID, "ashen-hellscape", "planned-frontier-001"];
    expect(resolveDirectMapId(`?route=game&map=${RUNTIME_MAP_ID}`, maps)).toBe(RUNTIME_MAP_ID);
    expect(resolveDirectMapId("?route=game&map=ashen-hellscape", maps)).toBe(RUNTIME_MAP_ID);
    expect(resolveDirectMapId("?route=game&map=planned-frontier-001", maps)).toBe(RUNTIME_MAP_ID);
    expect(resolveDirectMapId("?route=game&map=unknown", maps)).toBe(RUNTIME_MAP_ID);

  });
});
