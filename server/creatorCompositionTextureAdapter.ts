import type { TexturePackInput } from "./generators/texturePackBuilder";
import type { CreatorCompositionPreview } from "./creatorCompositionBuilder";

export type CreatorCompositionTextureOptions = {
  source: "generated" | "starter-authored" | "provided" | "reference-only";
  provenanceRef: string;
  textureSampling: "nearest" | "linear";
};

function hexToRgba(hex: string): [number, number, number, number] {
  const value = hex.slice(1);
  const normalized = value.length === 6 ? `${value}ff` : value;
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
    Number.parseInt(normalized.slice(6, 8), 16),
  ];
}

function textureKind(subject: CreatorCompositionPreview["composition"]["subject"]): "icon" | "tile" {
  return subject === "block" || subject === "structure" ? "tile" : "icon";
}

export function buildCompositionTextureInput(preview: CreatorCompositionPreview, options: CreatorCompositionTextureOptions): TexturePackInput {
  if (!options.provenanceRef.trim()) throw new Error("Composition texture provenanceRef is required");
  const { width, height } = preview.composition.canvas;
  const palette = new Map(preview.composition.palette.map(color => [color.id, hexToRgba(color.hex)]));
  const rgba = new Array<number>(width * height * 4).fill(0);
  for (const pixel of preview.composition.pixels) {
    const color = palette.get(pixel.colorId);
    if (!color) throw new Error(`Composition texture pixel references missing palette color: ${pixel.colorId}`);
    const targetIndex = (pixel.y * width + pixel.x) * 4;
    rgba[targetIndex] = color[0];
    rgba[targetIndex + 1] = color[1];
    rgba[targetIndex + 2] = color[2];
    rgba[targetIndex + 3] = color[3];
  }
  const provenanceRef = `${options.provenanceRef.trim()}#composition-sha256=${preview.registryMetadata.contentSha256}`;
  return {
    id: `creator-${preview.registryMetadata.contentSha256.slice(0, 16)}`,
    namespace: "creator",
    version: "0.1.0",
    displayName: `Composition preview · ${preview.composition.templateId}`.slice(0, 160),
    textureSampling: options.textureSampling,
    assets: [{
      assetId: preview.composition.templateId,
      kind: textureKind(preview.composition.subject),
      width,
      height,
      layers: [{ id: "composition-pixels", x: 0, y: 0, width, height, rgba }],
      source: options.source,
      provenanceRef,
    }],
  };
}
