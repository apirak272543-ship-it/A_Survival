import { z } from "zod";
import {
  buildTexturePack,
  createTexturePackBuilderRegistry,
  validateTexturePackInput,
  validateTexturePackOutput,
  type TexturePackInput,
} from "./generators/texturePackBuilder";
import { adminProcedure, router } from "./_core/trpc";
import { listCreatorArtifacts, registerTexturePackArtifact } from "./creatorArtifactRegistry";

const identifierSchema = z.string().min(2).max(64);
const rgbaChannelSchema = z.number().int().min(0).max(255);
const textureLayerSchema = z.object({
  id: identifierSchema,
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(1).max(2048),
  height: z.number().int().min(1).max(2048),
  rgba: z.array(rgbaChannelSchema).max(16_777_216),
});
const skinPartSchema = z.object({
  id: identifierSchema,
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(1).max(2048),
  height: z.number().int().min(1).max(2048),
});
const skinLayoutSchema = z.object({
  id: identifierSchema,
  parts: z.array(skinPartSchema).max(128),
  allowPartOverlap: z.boolean(),
});
const textureAssetSchema = z.object({
  assetId: identifierSchema,
  kind: z.enum(["icon", "tile", "skin", "atlas"]),
  width: z.number().int().min(1).max(2048),
  height: z.number().int().min(1).max(2048),
  layers: z.array(textureLayerSchema).max(128),
  source: z.enum(["generated", "starter-authored", "provided", "reference-only"]),
  provenanceRef: z.string().max(512),
  skinLayout: skinLayoutSchema.optional(),
});
export const texturePackInputSchema = z.object({
  id: identifierSchema,
  namespace: identifierSchema,
  version: z.string().max(32),
  displayName: z.string().max(160),
  textureSampling: z.enum(["nearest", "linear"]),
  assets: z.array(textureAssetSchema).max(500),
});

const textureGenerationSchema = z.object({
  input: texturePackInputSchema,
  seed: z.string().min(1).max(128),
});

type TexturePackRequest = z.infer<typeof texturePackInputSchema>;

function buildGeneratedTextureResponse(input: TexturePackRequest, seed: string) {
  const registry = createTexturePackBuilderRegistry();
  const artifact = registry.generate("texture.pack", input as TexturePackInput, { seed, generatedAt: 0 });
  return { artifact, preview: registry.preview(artifact) };
}

/**
 * Creator routes deliberately use adminProcedure. The current user model has
 * only user/admin roles; until a creator-specific role exists, generator
 * writes remain an admin-only developer capability and never enter `game`.
 */
export const creatorRouter = router({
  texture: router({
    validateInput: adminProcedure.input(texturePackInputSchema).mutation(({ input }) => validateTexturePackInput(input as TexturePackInput)),
    build: adminProcedure.input(texturePackInputSchema).mutation(({ input }) => {
      const output = buildTexturePack(input as TexturePackInput);
      return { output, validation: validateTexturePackOutput(output, input as TexturePackInput) };
    }),
    generate: adminProcedure.input(textureGenerationSchema).mutation(({ input }) => buildGeneratedTextureResponse(input.input, input.seed)),
    preview: adminProcedure.input(textureGenerationSchema).mutation(({ input }) => buildGeneratedTextureResponse(input.input, input.seed).preview),
    register: adminProcedure.input(texturePackInputSchema).mutation(async ({ input, ctx }) => {
      const output = buildTexturePack(input as TexturePackInput);
      const validation = validateTexturePackOutput(output, input as TexturePackInput);
      if (!validation.valid) throw new Error(`Texture pack output is invalid: ${validation.issues.join("; ")}`);
      const artifact = await registerTexturePackArtifact({ output, createdByUserId: ctx.user.id });
      return { artifact, validation };
    }),
    list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional()).query(({ input }) => listCreatorArtifacts(input?.limit)),
  }),
});
