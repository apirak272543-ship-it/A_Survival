import { describe, expect, it } from "vitest";
import { resolveDirectMapId, resolveDirectRoute } from "../client/src/game/routing/directRoute";

describe("direct route contract", () => {
  it("prefers the durable route query while retaining existing demo URLs", () => {
    expect(resolveDirectRoute("?route=home")).toBe("home");
    expect(resolveDirectRoute("?demo=game&map=obsidian-frontier")).toBe("game");
    expect(resolveDirectRoute("?route=unknown")).toBe("landing");
  });

  it("only enters the approved Obsidian vertical-slice map and safely falls back for other ids", () => {
    const maps = ["obsidian-frontier", "ashen-hellscape"];
    expect(resolveDirectMapId("?route=game&map=obsidian-frontier", maps)).toBe("obsidian-frontier");
    expect(resolveDirectMapId("?route=game&map=ashen-hellscape", maps)).toBe("obsidian-frontier");
    expect(resolveDirectMapId("?route=game&map=unknown", maps)).toBe("obsidian-frontier");
  });
});
