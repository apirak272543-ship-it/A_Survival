import { describe, expect, it } from "vitest";
import { resolveLoadingVariant } from "../client/src/game/ui/loadingVariant";

describe("loading variants", () => {
  it("maps non-map destinations to their own loading language", () => {
    expect(resolveLoadingVariant("lobby").kind).toBe("lobby");
    expect(resolveLoadingVariant("home").metric).toBe("SHIELD 100%");
    expect(resolveLoadingVariant("maps").metric).toBe("SECTOR SCAN");
  });

  it("uses selected biome art and threat information for game entry", () => {
    const variant = resolveLoadingVariant("game", "map-005-corrosive-acid-swamps");
    expect(variant).toMatchObject({ kind: "biome", eyebrow: "EXPEDITION · T2", metric: "THREAT ◆◆" });
    expect(variant.keyArt).toContain("map_005");
  });
});
