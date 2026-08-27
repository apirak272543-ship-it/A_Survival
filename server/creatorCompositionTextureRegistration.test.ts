import { describe, expect, it } from "vitest";
import { buildVerifiedCreatorCompositionTexture } from "./creatorCompositionTextureRegistration";

function buildInput() {
  return {
    composition: {
      templateId: "survivor-pixel-32",
      subject: "animation" as const,
      canvasWidth: 2,
      canvasHeight: 2,
      layers: [{ id: "base", label: "พื้นฐาน", role: "base" as const, zIndex: 0, visible: true, opacity: 1 }],
      parts: [{ id: "body", label: "ส่วนหลัก", slot: "body" as const, x: 0, y: 0, width: 2, height: 2, layerIds: ["base"] }],
      palette: [{ id: "green", label: "เขียว", hex: "#3f8f5b", semantic: "พื้นผิวหลัก" }],
      pixels: [{ x: 1, y: 0, colorId: "green", layerId: "base" }],
    },
    source: "starter-authored" as const,
    provenanceRef: "procedural-starter-authored",
    textureSampling: "nearest" as const,
  };
}

describe("creator composition texture registration preflight", () => {
  it("returns a canonical texture output only after byte compatibility passes", () => {
    const result = buildVerifiedCreatorCompositionTexture(buildInput());

    expect(result.compositionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.output.manifest.entries["survivor-pixel-32"]?.kind).toBe("skin");
    expect(result.exported.bundleFile.files).toEqual(["manifest.json", "skins/survivor-pixel-32.png"]);
    expect(result.compatibility.decision).toBe("compatible");
    expect(result.compatibility.reasons).toEqual([]);
    expect(result.exported.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("rejects an unsafe composition before any durable registration call can be made", () => {
    expect(() => buildVerifiedCreatorCompositionTexture({
      ...buildInput(),
      composition: { ...buildInput().composition, pixels: [{ x: 99, y: 99, colorId: "green", layerId: "base" }] },
    })).toThrow(/outside canvas bounds/);
  });
});
