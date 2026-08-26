import { describe, expect, it } from "vitest";
import {
  buildTexturePack,
  createTexturePackBuilderRegistry,
  solidRgba,
  validateTexturePackInput,
  type TexturePackInput,
} from "./generators/texturePackBuilder";

function validPack(): TexturePackInput {
  return {
    id: "a-survival-test-pack",
    namespace: "test",
    version: "0.1.0",
    displayName: "A_Survival Test Pack",
    textureSampling: "nearest",
    assets: [
      {
        assetId: "weapon-spark",
        kind: "icon",
        width: 4,
        height: 4,
        layers: [{ id: "core", x: 0, y: 0, width: 4, height: 4, rgba: solidRgba(4, 4, [0, 220, 210, 255]) }],
        source: "generated",
        provenanceRef: "test/weapon-spark",
      },
      {
        assetId: "frontier-scout",
        kind: "skin",
        width: 8,
        height: 8,
        layers: [
          { id: "torso", x: 0, y: 0, width: 4, height: 4, rgba: solidRgba(4, 4, [18, 25, 38, 255]) },
          { id: "head", x: 4, y: 0, width: 4, height: 4, rgba: solidRgba(4, 4, [245, 174, 70, 255]) },
        ],
        source: "generated",
        provenanceRef: "test/frontier-scout",
        skinLayout: {
          id: "humanoid-skin-v1",
          parts: [
            { id: "torso", x: 0, y: 0, width: 4, height: 4 },
            { id: "head", x: 4, y: 0, width: 4, height: 4 },
          ],
          allowPartOverlap: false,
        },
      },
    ],
  };
}

describe("Texture Pack Builder", () => {
  it("composes pixel layers into PNG assets and emits a pack manifest", () => {
    const output = buildTexturePack(validPack());
    const skin = output.assets.find(asset => asset.assetId === "frontier-scout")!;
    const pngBytes = Buffer.from(skin.pngBase64, "base64");

    expect(output.schemaVersion).toBe("a-survival.texture-pack-output.v1");
    expect(output.assets.map(asset => asset.assetId)).toEqual(["frontier-scout", "weapon-spark"]);
    expect(output.manifest.id).toBe("a-survival-test-pack");
    expect(Object.keys(output.manifest.entries)).toHaveLength(2);
    expect(pngBytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(pngBytes.readUInt32BE(16)).toBe(8);
    expect(pngBytes.readUInt32BE(20)).toBe(8);
  });

  it("validates grid geometry, RGBA channels, skin layout and provenance before building", () => {
    const invalid: TexturePackInput = {
      ...validPack(),
      assets: [{
        ...validPack().assets[0]!,
        assetId: "bad-asset",
        width: 4,
        height: 4,
        layers: [{ id: "bad", x: 3, y: 3, width: 2, height: 2, rgba: [0, 0, 0, 255] }],
        provenanceRef: "",
      }],
    };
    const result = validateTexturePackInput(invalid);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "asset provenanceRef is required: bad-asset",
      "layer is outside canvas: bad-asset/bad",
      "layer rgba length does not match geometry: bad-asset/bad",
    ]));
    expect(() => buildTexturePack(invalid)).toThrow("Texture pack input is invalid");
  });

  it("rejects overlapping skin parts when the layout does not allow overlap", () => {
    const input = validPack();
    const skin = input.assets.find(asset => asset.kind === "skin")!;
    skin.skinLayout = {
      ...skin.skinLayout!,
      parts: [
        { id: "torso", x: 0, y: 0, width: 5, height: 5 },
        { id: "head", x: 4, y: 4, width: 4, height: 4 },
      ],
    };
    expect(validateTexturePackInput(input).issues).toContain("skin layout parts overlap: frontier-scout");
  });

  it("uses Common Generator Registry for deterministic export, asset refs and tamper detection", () => {
    const registry = createTexturePackBuilderRegistry();
    const first = registry.generate("texture.pack", validPack(), { seed: "texture-seed", generatedAt: 1 });
    const second = registry.generate("texture.pack", validPack(), { seed: "texture-seed", generatedAt: 2 });

    expect(second.output).toEqual(first.output);
    expect(second.contentHash).toBe(first.contentHash);
    expect(first.assetRefs).toHaveLength(2);
    expect(first.assetRefs.every(asset => asset.source === "generated" && asset.provenanceRef)).toBe(true);
    expect(registry.validate(first)).toEqual({ valid: true, issues: [] });
    expect(registry.preview(first)).toMatchObject({ kind: "texture", recordCount: 2, outputType: "object" });

    const tampered = { ...first, output: { ...first.output, manifest: { ...first.output.manifest, packSha256: "0".repeat(64) } } };
    expect(registry.validate(tampered).issues).toContain("texture pack manifest hash mismatch");
    expect(registry.validate(tampered).issues).toContain("content hash does not match artifact payload");
  });
});
