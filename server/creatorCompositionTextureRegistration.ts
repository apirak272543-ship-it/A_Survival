import { buildCreatorComposition, type CreatorCompositionInput } from "./creatorCompositionBuilder";
import { buildCompositionTextureInput } from "./creatorCompositionTextureAdapter";
import { validateCreatorCompositionTextureExport } from "./creatorCompositionTextureCompatibility";
import { buildCreatorCompositionTextureExport, type CreatorCompositionTextureExport } from "./creatorCompositionTextureExport";
import { buildTexturePack, validateTexturePackOutput, type TexturePackOutput } from "./generators/texturePackBuilder";

export type CreatorCompositionTextureBuildInput = {
  composition: CreatorCompositionInput;
  source: "generated" | "starter-authored" | "provided" | "reference-only";
  provenanceRef: string;
  textureSampling: "nearest" | "linear";
};

export type VerifiedCreatorCompositionTexture = {
  compositionHash: string;
  output: TexturePackOutput;
  exported: CreatorCompositionTextureExport;
  compatibility: ReturnType<typeof validateCreatorCompositionTextureExport>;
};

export function buildVerifiedCreatorCompositionTexture(input: CreatorCompositionTextureBuildInput): VerifiedCreatorCompositionTexture {
  const composition = buildCreatorComposition(input.composition);
  const textureInput = buildCompositionTextureInput(composition, {
    source: input.source,
    provenanceRef: input.provenanceRef,
    textureSampling: input.textureSampling,
  });
  const output = buildTexturePack(textureInput);
  const validation = validateTexturePackOutput(output, textureInput);
  if (!validation.valid) throw new Error(`Composition texture output is invalid: ${validation.issues.join("; ")}`);
  const compositionHash = composition.registryMetadata.contentSha256;
  const exported = buildCreatorCompositionTextureExport({ output, compositionHash });
  const compatibility = validateCreatorCompositionTextureExport(exported);
  if (compatibility.decision !== "compatible") throw new Error(`Composition texture byte compatibility blocked: ${compatibility.reasons.map(item => `${item.code}: ${item.detail}`).join("; ")}`);
  return { compositionHash, output, exported, compatibility };
}
