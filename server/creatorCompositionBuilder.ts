import { buildCreatorDomainArtifactMetadata, type CreatorDomainArtifactMetadata } from "./creatorDomainArtifactRegistry";

export const CREATOR_COMPOSITION_SCHEMA_VERSION = "a-survival.creator-composition.v1";
export const CREATOR_COMPOSITION_GENERATOR_VERSION = "1.0.0";

export type CreatorCompositionSubject = "block" | "structure" | "item" | "weapon" | "animation";
export type CreatorCompositionLayerRole = "base" | "outline" | "shadow" | "detail" | "accent" | "mask";
export type CreatorCompositionPartSlot = "head" | "body" | "arm" | "leg" | "tool" | "weapon" | "surface" | "accent";

export type CreatorCompositionInput = {
  templateId: string;
  subject: CreatorCompositionSubject;
  canvasWidth: number;
  canvasHeight: number;
  layers: Array<{ id: string; label: string; role: CreatorCompositionLayerRole; zIndex: number; visible: boolean; opacity: number }>;
  parts: Array<{ id: string; label: string; slot: CreatorCompositionPartSlot; x: number; y: number; width: number; height: number; layerIds: string[] }>;
  palette: Array<{ id: string; label: string; hex: string; semantic: string }>;
  pixels: Array<{ x: number; y: number; colorId: string }>;
};

export type CreatorCompositionPreview = {
  previewOnly: true;
  runtimePolicy: { runtimeImportAllowed: false; playerVisible: false; cacheable: false };
  composition: {
    schemaVersion: typeof CREATOR_COMPOSITION_SCHEMA_VERSION;
    templateId: string;
    subject: CreatorCompositionSubject;
    canvas: { width: number; height: number };
    layers: CreatorCompositionInput["layers"];
    parts: CreatorCompositionInput["parts"];
    palette: CreatorCompositionInput["palette"];
    pixels: CreatorCompositionInput["pixels"];
  };
  summary: { layerCount: number; partCount: number; paletteCount: number; pixelBudget: number; paintedPixelCount: number; meshRequired: false };
  registryMetadata: CreatorDomainArtifactMetadata;
};

const UNSAFE_KEYS = new Set(["base64", "pngBase64", "bytes", "dataUri", "mesh", "vertices", "indices", "geometry", "glb", "obj"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;

function assertNoUnsafeKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoUnsafeKeys);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (UNSAFE_KEYS.has(key)) throw new Error(`Composition metadata cannot contain ${key}`);
    assertNoUnsafeKeys(nested);
  }
}

function uniqueIds(values: string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${label} ids must be unique`);
}

export function buildCreatorComposition(input: CreatorCompositionInput): CreatorCompositionPreview {
  assertNoUnsafeKeys(input);
  if (!ID_PATTERN.test(input.templateId)) throw new Error("Composition templateId is invalid");
  if (!Number.isInteger(input.canvasWidth) || input.canvasWidth < 1 || input.canvasWidth > 128 || !Number.isInteger(input.canvasHeight) || input.canvasHeight < 1 || input.canvasHeight > 128) throw new Error("Composition canvas must be between 1 and 128 pixels");
  if (input.layers.length < 1 || input.layers.length > 32) throw new Error("Composition layers must contain 1 to 32 layers");
  if (input.parts.length < 1 || input.parts.length > 64) throw new Error("Composition parts must contain 1 to 64 parts");
  if (input.palette.length < 1 || input.palette.length > 64) throw new Error("Composition palette must contain 1 to 64 colors");
  if (input.pixels.length > input.canvasWidth * input.canvasHeight) throw new Error("Composition pixels exceed the canvas budget");
  uniqueIds(input.layers.map(layer => layer.id), "Layer");
  uniqueIds(input.parts.map(part => part.id), "Part");
  uniqueIds(input.palette.map(color => color.id), "Palette");
  const layerIds = new Set(input.layers.map(layer => layer.id));
  input.layers.forEach(layer => {
    if (!ID_PATTERN.test(layer.id) || !layer.label.trim()) throw new Error("Composition layer identity is invalid");
    if (!Number.isInteger(layer.zIndex) || layer.zIndex < -128 || layer.zIndex > 128) throw new Error("Composition layer zIndex is invalid");
    if (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1) throw new Error("Composition layer opacity must be between 0 and 1");
  });
  input.parts.forEach(part => {
    if (!ID_PATTERN.test(part.id) || !part.label.trim()) throw new Error("Composition part identity is invalid");
    if (!Number.isInteger(part.x) || !Number.isInteger(part.y) || !Number.isInteger(part.width) || !Number.isInteger(part.height) || part.width < 1 || part.height < 1 || part.x < 0 || part.y < 0 || part.x + part.width > input.canvasWidth || part.y + part.height > input.canvasHeight) throw new Error(`Composition part ${part.id} is outside canvas bounds`);
    if (part.layerIds.length < 1 || part.layerIds.some(layerId => !layerIds.has(layerId))) throw new Error(`Composition part ${part.id} references an unknown layer`);
  });
  input.palette.forEach(color => {
    if (!ID_PATTERN.test(color.id) || !color.label.trim() || !color.semantic.trim() || !/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(color.hex)) throw new Error(`Composition palette color ${color.id} is invalid`);
  });
  const paletteIds = new Set(input.palette.map(color => color.id));
  const pixelKeys = new Set<string>();
  input.pixels.forEach(pixel => {
    const key = `${pixel.x}:${pixel.y}`;
    if (!Number.isInteger(pixel.x) || !Number.isInteger(pixel.y) || pixel.x < 0 || pixel.y < 0 || pixel.x >= input.canvasWidth || pixel.y >= input.canvasHeight) throw new Error(`Composition pixel ${key} is outside canvas bounds`);
    if (pixelKeys.has(key)) throw new Error(`Composition pixel ${key} is duplicated`);
    if (!paletteIds.has(pixel.colorId)) throw new Error(`Composition pixel ${key} references an unknown palette color`);
    pixelKeys.add(key);
  });
  const composition = {
    schemaVersion: CREATOR_COMPOSITION_SCHEMA_VERSION,
    templateId: input.templateId,
    subject: input.subject,
    canvas: { width: input.canvasWidth, height: input.canvasHeight },
    layers: input.layers.map(layer => ({ ...layer })),
    parts: input.parts.map(part => ({ ...part, layerIds: [...part.layerIds] })),
    palette: input.palette.map(color => ({ ...color })),
    pixels: input.pixels.map(pixel => ({ ...pixel })).sort((left, right) => left.y - right.y || left.x - right.x || left.colorId.localeCompare(right.colorId)),
  } satisfies CreatorCompositionPreview["composition"];
  const summary = { layerCount: input.layers.length, partCount: input.parts.length, paletteCount: input.palette.length, pixelBudget: input.canvasWidth * input.canvasHeight, paintedPixelCount: input.pixels.length, meshRequired: false as const };
  const registryMetadata = buildCreatorDomainArtifactMetadata({
    domain: input.subject,
    artifactId: `composition.${input.templateId}`,
    artifactVersion: "0.1.0",
    generatorId: "creator.composition",
    generatorVersion: CREATOR_COMPOSITION_GENERATOR_VERSION,
    manifest: composition,
    summary,
    sources: ["creator-workbench", "procedural-starter-authored"],
    provenanceRefs: ["creator-composition-v1", "procedural-starter-authored"],
  });
  return { previewOnly: true, runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false }, composition, summary, registryMetadata };
}
