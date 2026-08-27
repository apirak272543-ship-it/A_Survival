import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCreatorComposition } from "./creatorCompositionBuilder";
import { buildCompositionTextureInput } from "./creatorCompositionTextureAdapter";
import { buildCreatorCompositionTextureExport } from "./creatorCompositionTextureExport";
import { buildTexturePack } from "./generators/texturePackBuilder";

function buildOutput() {
  const composition = buildCreatorComposition({
    templateId: "survivor-pixel-32",
    subject: "animation",
    canvasWidth: 2,
    canvasHeight: 2,
    layers: [{ id: "base", label: "พื้นฐาน", role: "base", zIndex: 0, visible: true, opacity: 1 }],
    parts: [{ id: "body", label: "ส่วนหลัก", slot: "body", x: 0, y: 0, width: 2, height: 2, layerIds: ["base"] }],
    palette: [{ id: "green", label: "เขียว", hex: "#3f8f5b", semantic: "พื้นผิวหลัก" }],
    pixels: [{ x: 1, y: 0, colorId: "green", layerId: "base" }],
  });
  const textureInput = buildCompositionTextureInput(composition, { source: "starter-authored", provenanceRef: "procedural-starter-authored", textureSampling: "nearest" });
  return { composition, output: buildTexturePack(textureInput) };
}

describe("creator composition texture export", () => {
  it("returns a deterministic downloadable PNG bundle with hard runtime deny policy", () => {
    const first = buildOutput();
    const second = buildOutput();
    const firstExport = buildCreatorCompositionTextureExport({ output: first.output, compositionHash: first.composition.registryMetadata.contentSha256 });
    const secondExport = buildCreatorCompositionTextureExport({ output: second.output, compositionHash: second.composition.registryMetadata.contentSha256 });

    expect(secondExport).toEqual(firstExport);
    expect(firstExport).toMatchObject({
      exportSchemaVersion: "a-survival.creator-composition-texture-export.v1",
      previewOnly: true,
      downloadable: true,
      registerRequiresSeparateAction: true,
      reviewRequired: true,
      runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
    });
    expect(firstExport.exportId).toMatch(/^[a-f0-9]{64}$/);
    expect(firstExport.manifestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(firstExport.bundleFile).toMatchObject({ mime: "application/zip", files: ["manifest.json", "skins/survivor-pixel-32.png"] });
    expect(firstExport.bundleFile.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(firstExport.bundleFile.contentBase64.startsWith("UEsDB")).toBe(true);
    expect(createHash("sha256").update(Buffer.from(firstExport.bundleFile.contentBase64, "base64")).digest("hex")).toBe(firstExport.bundleFile.sha256);
    expect(firstExport.manifestFile).toMatchObject({ fileName: "manifest.json", mime: "application/json", sha256: firstExport.manifestSha256 });
    const manifestBytes = Buffer.from(firstExport.manifestFile.contentBase64, "base64");
    expect(manifestBytes.toString("utf8").endsWith("\n")).toBe(true);
    expect(JSON.parse(manifestBytes.toString("utf8"))).toEqual(firstExport.manifest);
    expect(createHash("sha256").update(manifestBytes).digest("hex")).toBe(firstExport.manifestSha256);
    expect(firstExport.assets[0]).toMatchObject({ downloadFileName: "survivor-pixel-32.png", mime: "image/png" });
    expect(firstExport.assets[0]?.pngBase64.startsWith("iVBORw0KGgo")).toBe(true);
    expect(Buffer.from(firstExport.assets[0]!.pngBase64, "base64").subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(firstExport.assets[0]?.provenanceRef).toContain(`composition-sha256=${firstExport.compositionHash}`);
  });

  it("rejects malformed composition hashes and tampered PNG output before export", () => {
    const { composition, output } = buildOutput();
    expect(() => buildCreatorCompositionTextureExport({ output, compositionHash: "not-a-sha" })).toThrow(/lowercase SHA-256/);
    const tampered = { ...output, assets: output.assets.map(asset => ({ ...asset, pngBase64: Buffer.concat([Buffer.from(asset.pngBase64, "base64"), Buffer.from([0])]).toString("base64") })) };
    expect(() => buildCreatorCompositionTextureExport({ output: tampered, compositionHash: composition.registryMetadata.contentSha256 })).toThrow(/input is invalid/);
  });
});
