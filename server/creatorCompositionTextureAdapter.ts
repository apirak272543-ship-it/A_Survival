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

function compositePixel(base: [number, number, number, number], overlay: [number, number, number, number], opacity: number): [number, number, number, number] {
  const overlayAlpha = (overlay[3] / 255) * opacity;
  const baseAlpha = base[3] / 255;
  const outputAlpha = overlayAlpha + baseAlpha * (1 - overlayAlpha);
  if (outputAlpha <= 0) return [0, 0, 0, 0];
  return [
    Math.round((overlay[0] * overlayAlpha + base[0] * baseAlpha * (1 - overlayAlpha)) / outputAlpha),
    Math.round((overlay[1] * overlayAlpha + base[1] * baseAlpha * (1 - overlayAlpha)) / outputAlpha),
    Math.round((overlay[2] * overlayAlpha + base[2] * baseAlpha * (1 - overlayAlpha)) / outputAlpha),
    Math.round(outputAlpha * 255),
  ];
}

export function buildCompositionTextureInput(preview: CreatorCompositionPreview, options: CreatorCompositionTextureOptions): TexturePackInput {
  if (!options.provenanceRef.trim()) throw new Error("Composition texture provenanceRef is required");
  const { width, height } = preview.composition.canvas;
  const palette = new Map(preview.composition.palette.map(color => [color.id, hexToRgba(color.hex)]));
  const layers = new Map(preview.composition.layers.map(layer => [layer.id, layer]));
  const rgba = new Array<number>(width * height * 4).fill(0);
  for (const pixel of [...preview.composition.pixels].sort((left, right) => (layers.get(left.layerId)?.zIndex ?? 0) - (layers.get(right.layerId)?.zIndex ?? 0))) {
    const layer = layers.get(pixel.layerId);
    if (!layer) throw new Error(`Composition texture pixel references missing layer: ${pixel.layerId}`);
    if (!layer.visible || layer.opacity <= 0) continue;
    const color = palette.get(pixel.colorId);
    if (!color) throw new Error(`Composition texture pixel references missing palette color: ${pixel.colorId}`);
    const targetIndex = (pixel.y * width + pixel.x) * 4;
    const composed = compositePixel([rgba[targetIndex] ?? 0, rgba[targetIndex + 1] ?? 0, rgba[targetIndex + 2] ?? 0, rgba[targetIndex + 3] ?? 0], color, layer.opacity);
    rgba[targetIndex] = composed[0];
    rgba[targetIndex + 1] = composed[1];
    rgba[targetIndex + 2] = composed[2];
    rgba[targetIndex + 3] = composed[3];
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
