import { describe, expect, it } from "vitest";
import { buildCreatorComposition } from "./creatorCompositionBuilder";

function input(overrides: Partial<Parameters<typeof buildCreatorComposition>[0]> = {}) {
  return {
    templateId: "survivor-pixel-32",
    subject: "animation" as const,
    canvasWidth: 32,
    canvasHeight: 32,
    layers: [
      { id: "base", label: "พื้นฐาน", role: "base" as const, zIndex: 0, visible: true, opacity: 1 },
      { id: "outline", label: "เส้นขอบ", role: "outline" as const, zIndex: 10, visible: true, opacity: 0.9 },
    ],
    parts: [{ id: "body", label: "ลำตัว", slot: "body" as const, x: 8, y: 8, width: 16, height: 18, layerIds: ["base", "outline"] }],
    palette: [{ id: "leaf-green", label: "เขียวใบไม้", hex: "#3f8f5b", semantic: "ใบไม้" }],
    pixels: [{ x: 8, y: 8, colorId: "leaf-green", layerId: "base" }, { x: 9, y: 8, colorId: "leaf-green", layerId: "base" }],
    ...overrides,
  };
}

describe("creator composition builder", () => {
  it("builds registry-compatible metadata without triangle mesh requirements", () => {
    const result = buildCreatorComposition(input());
    expect(result).toMatchObject({ previewOnly: true, runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false }, summary: { layerCount: 2, partCount: 1, paletteCount: 1, pixelBudget: 1024, paintedPixelCount: 2, meshRequired: false }, registryMetadata: { domain: "animation", generatorId: "creator.composition", runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false } } });
    expect(result.composition.parts[0]?.layerIds).toEqual(["base", "outline"]);
    expect(result.registryMetadata.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for the same no-code input", () => {
    expect(buildCreatorComposition(input()).registryMetadata).toEqual(buildCreatorComposition(input()).registryMetadata);
  });

  it("rejects invalid bounds, unknown layers, duplicate ids and unsafe payload keys", () => {
    expect(() => buildCreatorComposition(input({ parts: [{ id: "body", label: "ลำตัว", slot: "body", x: 24, y: 8, width: 16, height: 8, layerIds: ["base"] }] }))).toThrow("outside canvas");
    expect(() => buildCreatorComposition(input({ parts: [{ id: "body", label: "ลำตัว", slot: "body", x: 8, y: 8, width: 8, height: 8, layerIds: ["missing"] }] }))).toThrow("unknown layer");
    expect(() => buildCreatorComposition(input({ pixels: [{ x: 32, y: 0, colorId: "leaf-green", layerId: "base" }] }))).toThrow("outside canvas");
    expect(() => buildCreatorComposition(input({ pixels: [{ x: 1, y: 1, colorId: "missing", layerId: "base" }] }))).toThrow("unknown palette color");
    expect(() => buildCreatorComposition(input({ pixels: [{ x: 1, y: 1, colorId: "leaf-green", layerId: "base" }, { x: 1, y: 1, colorId: "leaf-green", layerId: "base" }] }))).toThrow("duplicated");
    expect(() => buildCreatorComposition(input({ pixels: [{ x: 1, y: 1, colorId: "leaf-green", layerId: "missing" }] }))).toThrow("unknown layer");
    expect(() => buildCreatorComposition(input({ layers: [input().layers[0]!, input().layers[0]!] }))).toThrow("ids must be unique");
    expect(() => buildCreatorComposition(input({ summary: { pngBase64: "blocked" } } as never))).toThrow("pngBase64");
  });

  it("allows a coordinate to be painted once on each distinct layer", () => {
    const result = buildCreatorComposition(input({ pixels: [{ x: 1, y: 1, colorId: "leaf-green", layerId: "base" }, { x: 1, y: 1, colorId: "leaf-green", layerId: "outline" }] }));
    expect(result.summary.paintedPixelCount).toBe(2);
    expect(result.composition.pixels.map(pixel => pixel.layerId)).toEqual(["base", "outline"]);
  });
});
