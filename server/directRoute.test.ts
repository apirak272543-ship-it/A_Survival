import { describe, expect, it } from "vitest";
import { resolveDirectMapId, resolveDirectRoute } from "../client/src/game/routing/directRoute";

describe("direct route contract", () => {
  it("prefers the durable route query while retaining existing demo URLs", () => {
    expect(resolveDirectRoute("?route=home")).toBe("home");
    expect(resolveDirectRoute("?demo=game&map=obsidian-frontier")).toBe("game");
    expect(resolveDirectRoute("?route=unknown")).toBe("landing");
  });

  it("uses a known map or safely falls back to MAP_001", () => {
    const maps = ["obsidian-frontier", "ashen-hellscape"];
    expect(resolveDirectMapId("?route=game&map=ashen-hellscape", maps)).toBe("ashen-hellscape");
    expect(resolveDirectMapId("?route=game&map=unknown", maps)).toBe("obsidian-frontier");
  });
});
