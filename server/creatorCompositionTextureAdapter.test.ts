import { describe, expect, it } from "vitest";
import { buildCreatorComposition, type CreatorCompositionInput } from "./creatorCompositionBuilder";
import { buildCompositionTextureInput } from "./creatorCompositionTextureAdapter";
import { buildTexturePack, validateTexturePackOutput } from "./generators/texturePackBuilder";

function compositionInput(overrides: Partial<CreatorCompositionInput> = {}): CreatorCompositionInput {
  return {
    templateId: "fern-icon",
    subject: "item",
    canvasWidth: 4,
    canvasHeight: 4,
    layers: [{ id: "base", label: "พื้นฐาน", role: "base", zIndex: 0, visible: true, opacity: 1 }],
    parts: [{ id: "body", label: "ส่วนหลัก", slot: "body", x: 0, y: 0, width: 4, height: 4, layerIds: ["base"] }],
    palette: [{ id: "leaf-green", label: "เขียวใบไม้", hex: "#3f8f5b", semantic: "ใบไม้" }],
    pixels: [{ x: 2, y: 1, colorId: "leaf-green", layerId: "base" }],
    ...overrides,
  };
}

describe("creator composition texture adapter", () => {
  it("maps sparse palette cells into a texture-pack layer with transparent background", () => {
    const composition = buildCreatorComposition(compositionInput());
    const texture = buildCompositionTextureInput(composition, { source: "starter-authored", provenanceRef: "procedural-starter-authored", textureSampling: "nearest" });
    const rgba = texture.assets[0]!.layers[0]!.rgba;
    expect(texture.assets[0]).toMatchObject({ assetId: "fern-icon", kind: "icon", width: 4, height: 4, source: "starter-authored" });
    expect(rgba.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(rgba.slice((1 * 4 + 2) * 4, (1 * 4 + 2) * 4 + 4)).toEqual([63, 143, 91, 255]);
    expect(texture.assets[0]!.provenanceRef).toContain("procedural-starter-authored#composition-sha256=");
  });

  it("keeps the adapter and built PNG manifest deterministic for the same composition", () => {
    const first = buildCompositionTextureInput(buildCreatorComposition(compositionInput()), { source: "generated", provenanceRef: "builder-test", textureSampling: "nearest" });
    const second = buildCompositionTextureInput(buildCreatorComposition(compositionInput()), { source: "generated", provenanceRef: "builder-test", textureSampling: "nearest" });
    expect(second).toEqual(first);
    expect(buildTexturePack(second)).toEqual(buildTexturePack(first));
    expect(validateTexturePackOutput(buildTexturePack(first), first)).toEqual({ valid: true, issues: [] });
  });

  it("requires provenance before a texture handoff can be previewed", () => {
    const composition = buildCreatorComposition(compositionInput());
    expect(() => buildCompositionTextureInput(composition, { source: "generated", provenanceRef: " ", textureSampling: "nearest" })).toThrow("provenanceRef is required");
  });

  it("composites overlapping layers by z-index and opacity while skipping hidden layers", () => {
    const composition = buildCreatorComposition(compositionInput({
      layers: [{ id: "base", label: "พื้นฐาน", role: "base", zIndex: 0, visible: true, opacity: 1 }, { id: "outline", label: "เส้นขอบ", role: "outline", zIndex: 10, visible: true, opacity: 0.5 }, { id: "hidden", label: "ซ่อน", role: "detail", zIndex: 20, visible: false, opacity: 1 }],
      palette: [{ id: "leaf-green", label: "เขียวใบไม้", hex: "#3f8f5b", semantic: "ใบไม้" }, { id: "outline-red", label: "แดงเส้นขอบ", hex: "#ff0000", semantic: "เส้นขอบ" }],
      pixels: [{ x: 2, y: 1, colorId: "leaf-green", layerId: "base" }, { x: 2, y: 1, colorId: "outline-red", layerId: "outline" }, { x: 2, y: 1, colorId: "outline-red", layerId: "hidden" }],
    }));
    const texture = buildCompositionTextureInput(composition, { source: "generated", provenanceRef: "layer-test", textureSampling: "nearest" });
    const rgba = texture.assets[0]!.layers[0]!.rgba;
    expect(rgba.slice((1 * 4 + 2) * 4, (1 * 4 + 2) * 4 + 4)).toEqual([159, 72, 46, 255]);
  });

  it("maps block and structure compositions to tile textures without enabling runtime import", () => {
    const composition = buildCreatorComposition(compositionInput({ subject: "block", templateId: "obsidian-tile" }));
    const texture = buildCompositionTextureInput(composition, { source: "starter-authored", provenanceRef: "procedural-starter-authored", textureSampling: "nearest" });
    expect(texture.assets[0]!.kind).toBe("tile");
    expect(composition.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });
});
