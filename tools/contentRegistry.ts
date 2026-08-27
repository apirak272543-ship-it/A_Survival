import { createHash } from "node:crypto";
import {
  bindPixelAsset,
  CONTENT_GENERATOR_VERSION,
  type AssetManifestLike,
  type ElementId,
  type MaterialId,
  type PixelAssetBinding,
  type RarityId,
} from "./content-generator";

export const CONTENT_SUITE_VERSION = "0.1.0";

export type ContentKind = "block" | "texture" | "model" | "skin" | "mob" | "item" | "weapon" | "armor" | "loot" | "skill" | "variant";
export type GameplayRole = "building-block" | "weapon" | "armor" | "mob" | "skill" | "loot" | "plant" | "utility";

export type VisualSpecification = {
  baseColor: string;
  secondaryColor: string;
  accentColor: string;
  material: string;
  roughness: number;
  metallic: number;
  emission: number;
  pattern: string;
  surfaceDetail: string;
  edgeDetail: string;
  cracks: string;
  glow: boolean;
  symbols: string;
  markings: string;
  textureResolution: 16 | 32 | 64;
  paletteDiscipline: "muted-obsidian" | "muted-natural" | "semantic-accent";
  shapeLanguage: "readable-block" | "compact-item" | "silhouette-first" | "thin-partial";
  lightingStyle: "soft-directional" | "low-emissive-accent";
  materialLanguage: "rough" | "organic" | "metallic" | "glass-like" | "crystalline" | "heated" | "arcane";
};

export type VisualInput = {
  name: string;
  description?: string;
  material?: MaterialId | string;
  element?: ElementId | string;
  biome?: string;
  gameplayRole?: GameplayRole;
  rarity?: RarityId;
  theme?: string;
  conceptNote?: string;
  conceptSource?: "human-input" | "ai-proposed";
  humanOverride?: Partial<VisualSpecification>;
};

export type ContentSuiteInput = VisualInput & {
  kind: ContentKind;
  seed: number;
  id?: string;
  baseModelId?: string;
  modelAssetId?: string;
  textureAssetId?: string;
  animationSetId?: string;
  skinId?: string;
  behaviorId?: string;
  lootTableId?: string;
  skillIds?: string[];
  biome?: string;
  rarity?: RarityId;
  assetManifest?: AssetManifestLike;
};

export type CreativeDecisionLog = {
  conceptSource: "human-input" | "ai-proposed";
  conceptNote: string;
  semanticInputs: Pick<VisualInput, "name" | "description" | "material" | "element" | "biome" | "gameplayRole" | "rarity" | "theme">;
  decisions: string[];
  artDirection: "A-Survival crisp voxel/pixel, 16px-first, muted base with restrained semantic accents";
  overrideApplied: string[];
};

export type ContentDefinitionRecord = {
  id: string;
  kind: ContentKind;
  name: string;
  description: string;
  modelId: string;
  textureId: string;
  skinId: string;
  variantId: string;
  gameplayId: string;
  rarity: RarityId;
  biome: string;
  tags: string[];
  generatorVersion: string;
  seed: number;
};

export type ModelRecord = {
  id: string;
  asset: PixelAssetBinding;
  animationSetId: string;
  reuseKey: string;
  source: "template" | "authored";
};

export type TextureRecord = {
  id: string;
  asset: PixelAssetBinding;
  visual: VisualSpecification;
  source: "semantic-spec-awaiting-art" | "authored-pack";
};

export type SkinRecord = {
  id: string;
  modelId: string;
  textureId: string;
  visual: VisualSpecification;
  paletteKey: string;
};

export type GameplayRecord = {
  id: string;
  role: GameplayRole;
  stats: Record<string, number>;
  skillIds: string[];
  behaviorId: string;
  lootTableId: string;
  fictionalEffects: string[];
};

export type VariantRecord = {
  id: string;
  baseDefinitionId: string;
  modelId: string;
  skinId: string;
  gameplayId: string;
  biome: string;
  rarity: RarityId;
  variantSeed: number;
};

export type ContentSuiteBundle = {
  suiteVersion: string;
  definition: ContentDefinitionRecord;
  model: ModelRecord;
  texture: TextureRecord;
  skin: SkinRecord;
  gameplay: GameplayRecord;
  variant: VariantRecord;
  visual: VisualSpecification;
  decisionLog: CreativeDecisionLog;
  preview: {
    swatches: string[];
    summary: string;
    texturePrompt: string;
    finalArtStatus: "awaiting-asset" | "bound";
  };
  cacheKey: string;
  contentHash: string;
};

const MATERIAL_RULES: Record<string, Pick<VisualSpecification, "baseColor" | "roughness" | "metallic" | "materialLanguage" | "surfaceDetail" | "edgeDetail">> = {
  wood: { baseColor: "warm_wood", roughness: 0.82, metallic: 0, materialLanguage: "organic", surfaceDetail: "subtle grain", edgeDetail: "soft chipped edge" },
  stone: { baseColor: "slate_stone", roughness: 0.9, metallic: 0, materialLanguage: "rough", surfaceDetail: "fine strata", edgeDetail: "readable chipped edge" },
  iron: { baseColor: "charcoal_iron", roughness: 0.55, metallic: 0.72, materialLanguage: "metallic", surfaceDetail: "brushed grain", edgeDetail: "hard bevel" },
  steel: { baseColor: "cool_steel", roughness: 0.34, metallic: 0.88, materialLanguage: "metallic", surfaceDetail: "clean forged plane", edgeDetail: "bright pixel rim" },
  obsidian: { baseColor: "dark_obsidian", roughness: 0.25, metallic: 0.2, materialLanguage: "glass-like", surfaceDetail: "volcanic glass facets", edgeDetail: "sharp readable silhouette" },
  crystal: { baseColor: "deep_crystal", roughness: 0.18, metallic: 0.08, materialLanguage: "crystalline", surfaceDetail: "faceted growth", edgeDetail: "crisp refractive edge" },
  aether: { baseColor: "slate_aether", roughness: 0.38, metallic: 0.28, materialLanguage: "arcane", surfaceDetail: "fine energy grain", edgeDetail: "controlled rune edge" },
};

const ELEMENT_RULES: Record<string, { secondaryColor: string; accentColor: string; pattern: string; emission: number; markings: string }> = {
  fire: { secondaryColor: "deep_red", accentColor: "ember_orange", pattern: "volcanic cracks", emission: 0.35, markings: "heat-line markings" },
  ice: { secondaryColor: "frost_blue", accentColor: "quiet_white", pattern: "frost facets", emission: 0.12, markings: "frozen vein markings" },
  lightning: { secondaryColor: "storm_blue", accentColor: "pale_cyan", pattern: "forked pixel arcs", emission: 0.24, markings: "charge marks" },
  poison: { secondaryColor: "moss_green", accentColor: "bruise_purple", pattern: "organic droplets", emission: 0.1, markings: "warning specks" },
  shadow: { secondaryColor: "deep_purple", accentColor: "quiet_violet", pattern: "soft void seams", emission: 0.08, markings: "shadow glyph" },
  holy: { secondaryColor: "warm_white", accentColor: "restrained_gold", pattern: "clean radial lines", emission: 0.16, markings: "ward sigil" },
  arcane: { secondaryColor: "deep_violet", accentColor: "muted_cyan", pattern: "arcane runes", emission: 0.2, markings: "small rune marks" },
};

const BIOME_RULES: Array<{ match: string[]; secondaryColor: string; accentColor: string; palette: VisualSpecification["paletteDiscipline"] }> = [
  { match: ["obsidian", "volcanic", "ash"], secondaryColor: "ash_slate", accentColor: "muted_violet", palette: "muted-obsidian" },
  { match: ["forest", "nature", "grove"], secondaryColor: "bark_brown", accentColor: "moss_green", palette: "muted-natural" },
  { match: ["desert", "sand"], secondaryColor: "dust_orange", accentColor: "sun_gold", palette: "muted-natural" },
  { match: ["snow", "frost", "glacier"], secondaryColor: "frost_blue", accentColor: "quiet_white", palette: "muted-natural" },
  { match: ["magical", "arcane"], secondaryColor: "deep_violet", accentColor: "muted_cyan", palette: "semantic-accent" },
  { match: ["shadow", "void"], secondaryColor: "deep_purple", accentColor: "quiet_violet", palette: "muted-obsidian" },
];

const ROLE_RULES: Record<GameplayRole, { shapeLanguage: VisualSpecification["shapeLanguage"]; surfaceDetail: string; tags: string[] }> = {
  "building-block": { shapeLanguage: "readable-block", surfaceDetail: "single-material readable plane", tags: ["block", "placeable"] },
  weapon: { shapeLanguage: "silhouette-first", surfaceDetail: "functional grip and edge cue", tags: ["combat", "equipment"] },
  armor: { shapeLanguage: "silhouette-first", surfaceDetail: "layered protective plates", tags: ["combat", "equipment"] },
  mob: { shapeLanguage: "silhouette-first", surfaceDetail: "recognizable body planes", tags: ["actor", "behavior"] },
  skill: { shapeLanguage: "compact-item", surfaceDetail: "clear effect marker", tags: ["ability"] },
  loot: { shapeLanguage: "compact-item", surfaceDetail: "pickup-readable icon cue", tags: ["pickup"] },
  plant: { shapeLanguage: "thin-partial", surfaceDetail: "simple botanical silhouette", tags: ["plant", "partial"] },
  utility: { shapeLanguage: "compact-item", surfaceDetail: "functional readable detail", tags: ["utility"] },
};

const RARITY_EMISSION_LIMIT: Record<RarityId, number> = { common: 0.12, uncommon: 0.18, rare: 0.28, epic: 0.45, legendary: 0.65, mythic: 0.8 };
const suiteCache = new Map<string, ContentSuiteBundle>();

function hash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function safeId(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "content";
}

function findBiomeRule(biome: string) {
  const lowered = biome.toLowerCase();
  return BIOME_RULES.find(rule => rule.match.some(token => lowered.includes(token))) ?? { secondaryColor: "ash_slate", accentColor: "muted_cyan", palette: "muted-obsidian" as const };
}

export function createSemanticVisualSpecification(input: VisualInput): { visual: VisualSpecification; decisionLog: CreativeDecisionLog } {
  const material = input.material ?? "stone";
  const element = input.element ?? "arcane";
  const biome = input.biome ?? "obsidian-frontier";
  const rarity = input.rarity ?? "common";
  const role = input.gameplayRole ?? "utility";
  const materialRule = MATERIAL_RULES[material] ?? MATERIAL_RULES.stone;
  const elementRule = ELEMENT_RULES[element] ?? ELEMENT_RULES.arcane;
  const biomeRule = findBiomeRule(biome);
  const roleRule = ROLE_RULES[role];
  const visual: VisualSpecification = {
    baseColor: materialRule.baseColor,
    secondaryColor: biomeRule.secondaryColor || elementRule.secondaryColor,
    accentColor: elementRule.accentColor || biomeRule.accentColor,
    material,
    roughness: materialRule.roughness,
    metallic: materialRule.metallic,
    emission: Math.min(elementRule.emission, RARITY_EMISSION_LIMIT[rarity]),
    pattern: elementRule.pattern,
    surfaceDetail: roleRule.surfaceDetail || materialRule.surfaceDetail,
    edgeDetail: materialRule.edgeDetail,
    cracks: element === "fire" || material === "obsidian" ? "restrained heat/facet cracks" : "none",
    glow: elementRule.emission >= 0.16 && rarity !== "common",
    symbols: element === "arcane" || element === "holy" ? "small semantic sigil" : "none",
    markings: elementRule.markings,
    textureResolution: 16,
    paletteDiscipline: biomeRule.palette,
    shapeLanguage: roleRule.shapeLanguage,
    lightingStyle: elementRule.emission > 0.2 ? "low-emissive-accent" : "soft-directional",
    materialLanguage: materialRule.materialLanguage,
  };
  const overrideApplied: string[] = [];
  for (const [key, value] of Object.entries(input.humanOverride ?? {})) {
    if (value !== undefined) {
      (visual as unknown as Record<string, unknown>)[key] = value;
      overrideApplied.push(key);
    }
  }
  const decisions = [
    `material:${material}→${materialRule.materialLanguage}/${materialRule.baseColor}`,
    `element:${element}→${elementRule.pattern}/${elementRule.accentColor}`,
    `biome:${biome}→${biomeRule.palette}/${biomeRule.accentColor}`,
    `role:${role}→${roleRule.shapeLanguage}`,
    `rarity:${rarity}→emission≤${RARITY_EMISSION_LIMIT[rarity]}`,
    `style→16px-first crisp voxel/pixel with restrained glow`,
  ];
  return {
    visual,
    decisionLog: {
      conceptSource: input.conceptSource ?? "human-input",
      conceptNote: input.conceptNote ?? `Semantic concept derived from ${input.name}: ${material} + ${element} + ${biome} + ${role} + ${rarity}.`,
      semanticInputs: { name: input.name, description: input.description, material, element, biome, gameplayRole: role, rarity, theme: input.theme },
      decisions,
      artDirection: "A-Survival crisp voxel/pixel, 16px-first, muted base with restrained semantic accents",
      overrideApplied,
    },
  };
}

export function validateVisualSpecification(visual: VisualSpecification, rarity: RarityId): string[] {
  const errors: string[] = [];
  if (![16, 32, 64].includes(visual.textureResolution)) errors.push("textureResolution must be 16, 32, or 64");
  for (const key of ["roughness", "metallic", "emission"] as const) if (!Number.isFinite(visual[key]) || visual[key] < 0 || visual[key] > 1) errors.push(`${key} must be within 0..1`);
  if (visual.emission > RARITY_EMISSION_LIMIT[rarity]) errors.push(`emission exceeds ${rarity} rarity limit`);
  if (visual.glow && visual.emission === 0) errors.push("glow cannot be enabled with zero emission");
  if (visual.paletteDiscipline !== "muted-obsidian" && visual.paletteDiscipline !== "muted-natural" && visual.paletteDiscipline !== "semantic-accent") errors.push("unknown palette discipline");
  return errors;
}

function defaultAsset(assetId: string, manifest?: AssetManifestLike) {
  return bindPixelAsset(assetId, manifest);
}

export function generateContentSuiteBundle(input: ContentSuiteInput): ContentSuiteBundle {
  const normalized = {
    ...input,
    seed: Math.trunc(input.seed),
    biome: input.biome ?? "obsidian-frontier",
    rarity: input.rarity ?? "common",
    gameplayRole: input.gameplayRole ?? (input.kind === "block" ? "building-block" : input.kind === "mob" ? "mob" : input.kind === "weapon" ? "weapon" : "utility"),
  } satisfies ContentSuiteInput;
  const cacheKey = hash(`${CONTENT_SUITE_VERSION}:${stable(normalized)}`);
  const cached = suiteCache.get(cacheKey);
  if (cached) return cached;
  const baseId = input.id ?? `${safeId(input.kind)}-${safeId(input.name)}`;
  const modelId = input.baseModelId ?? `model.template.${safeId(input.kind)}`;
  const textureId = input.textureAssetId ? `texture.asset.${safeId(input.textureAssetId)}` : `texture.semantic.${safeId(baseId)}`;
  const skinId = input.skinId ?? `skin.${safeId(baseId)}`;
  const gameplayId = `gameplay.${safeId(baseId)}`;
  const variantId = `variant.${safeId(baseId)}.${normalized.seed}`;
  const { visual, decisionLog } = createSemanticVisualSpecification(normalized);
  const visualErrors = validateVisualSpecification(visual, normalized.rarity);
  if (visualErrors.length > 0) throw new Error(`Semantic visual validation failed: ${visualErrors.join("; ")}`);
  const model: ModelRecord = {
    id: modelId,
    asset: defaultAsset(input.modelAssetId ?? "model.voxel.template", input.assetManifest),
    animationSetId: input.animationSetId ?? (normalized.gameplayRole === "mob" ? "animation.humanoid.template" : "animation.none"),
    reuseKey: modelId,
    source: input.modelAssetId ? "authored" : "template",
  };
  const texture: TextureRecord = {
    id: textureId,
    asset: defaultAsset(input.textureAssetId ?? "texture.semantic.awaiting-asset", input.assetManifest),
    visual,
    source: input.textureAssetId ? "authored-pack" : "semantic-spec-awaiting-art",
  };
  const skin: SkinRecord = { id: skinId, modelId, textureId, visual, paletteKey: `${visual.paletteDiscipline}:${visual.baseColor}:${visual.accentColor}` };
  const gameplay: GameplayRecord = {
    id: gameplayId,
    role: normalized.gameplayRole,
    stats: { power: 1 + (normalized.seed % 20), defense: normalized.gameplayRole === "armor" ? 5 + (normalized.seed % 12) : 0, speed: normalized.gameplayRole === "mob" ? 1 + (normalized.seed % 4) / 10 : 0 },
    skillIds: input.skillIds ?? [],
    behaviorId: input.behaviorId ?? (normalized.gameplayRole === "mob" ? "behavior.template.guard" : "behavior.none"),
    lootTableId: input.lootTableId ?? (normalized.gameplayRole === "mob" ? `loot.${safeId(baseId)}` : "loot.none"),
    fictionalEffects: normalized.description ? [`fictional:${normalized.description}`] : [],
  };
  const definition: ContentDefinitionRecord = {
    id: baseId,
    kind: input.kind,
    name: input.name,
    description: input.description ?? `${input.name} generated from reusable A-Survival templates.`,
    modelId,
    textureId,
    skinId,
    variantId,
    gameplayId,
    rarity: normalized.rarity,
    biome: normalized.biome,
    tags: [...new Set([normalized.gameplayRole, normalized.material ?? "stone", normalized.element ?? "arcane", ...ROLE_RULES[normalized.gameplayRole].tags])],
    generatorVersion: CONTENT_SUITE_VERSION,
    seed: normalized.seed,
  };
  const variant: VariantRecord = { id: variantId, baseDefinitionId: baseId, modelId, skinId, gameplayId, biome: normalized.biome, rarity: normalized.rarity, variantSeed: normalized.seed };
  const bundleWithoutHash = { suiteVersion: CONTENT_SUITE_VERSION, definition, model, texture, skin, gameplay, variant, visual, decisionLog };
  const contentHash = hash(stable(bundleWithoutHash));
  const bundle: ContentSuiteBundle = {
    ...bundleWithoutHash,
    preview: {
      swatches: [visual.baseColor, visual.secondaryColor, visual.accentColor],
      summary: `${visual.material} ${visual.pattern}; ${visual.shapeLanguage}; emission ${visual.emission.toFixed(2)}`,
      texturePrompt: `${visual.baseColor} ${visual.material} ${visual.pattern}, ${visual.shapeLanguage}, ${visual.textureResolution}x${visual.textureResolution} crisp pixel texture, ${visual.paletteDiscipline}, restrained semantic accent, no photorealism`,
      finalArtStatus: texture.asset.status === "bound" ? "bound" : "awaiting-asset",
    },
    cacheKey,
    contentHash,
  };
  suiteCache.set(cacheKey, bundle);
  return bundle;
}

export function generateContentSuiteBatch(inputs: readonly ContentSuiteInput[]): ContentSuiteBundle[] {
  if (inputs.length > 30000) throw new Error("Content suite batch exceeds 30000 records");
  return inputs.map(generateContentSuiteBundle);
}

export function validateContentSuiteBundle(bundle: ContentSuiteBundle): string[] {
  const errors = validateVisualSpecification(bundle.visual, bundle.definition.rarity);
  if (bundle.definition.modelId !== bundle.model.id) errors.push("definition.modelId does not resolve to model.id");
  if (bundle.definition.textureId !== bundle.texture.id) errors.push("definition.textureId does not resolve to texture.id");
  if (bundle.definition.skinId !== bundle.skin.id) errors.push("definition.skinId does not resolve to skin.id");
  if (bundle.definition.gameplayId !== bundle.gameplay.id) errors.push("definition.gameplayId does not resolve to gameplay.id");
  if (bundle.variant.baseDefinitionId !== bundle.definition.id) errors.push("variant.baseDefinitionId does not resolve to definition.id");
  if (bundle.skin.modelId !== bundle.model.id) errors.push("skin.modelId does not resolve to model.id");
  if (bundle.skin.textureId !== bundle.texture.id) errors.push("skin.textureId does not resolve to texture.id");
  if (bundle.variant.modelId !== bundle.model.id || bundle.variant.skinId !== bundle.skin.id || bundle.variant.gameplayId !== bundle.gameplay.id) errors.push("variant references are not separated component IDs");
  if (bundle.preview.finalArtStatus === "bound" && bundle.texture.asset.status !== "bound") errors.push("bound preview requires bound texture asset");
  return errors;
}

export class ContentRegistry {
  private readonly bundles = new Map<string, ContentSuiteBundle>();

  register(bundle: ContentSuiteBundle) {
    const errors = validateContentSuiteBundle(bundle);
    if (errors.length > 0) throw new Error(`Cannot register ${bundle.definition.id}: ${errors.join("; ")}`);
    this.bundles.set(bundle.definition.id, bundle);
    return bundle;
  }

  get(id: string) {
    return this.bundles.get(id);
  }

  list() {
    return Array.from(this.bundles.values());
  }

  export() {
    const records = this.list().sort((left, right) => left.definition.id.localeCompare(right.definition.id));
    return { suiteVersion: CONTENT_SUITE_VERSION, contentGenerationUi: false, records, registryHash: hash(stable(records)) };
  }
}

export function clearContentSuiteCache() {
  suiteCache.clear();
}
