import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const CONTENT_GENERATOR_VERSION = "0.1.0";
export const DEFAULT_CONTENT_SEED = 829173;
export const DEFAULT_ASSET_MANIFEST_PATH = "client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json";

export type WeaponCategory = "melee" | "ranged" | "magic";
export type WeaponBaseType = "sword" | "dagger" | "axe" | "spear" | "hammer" | "mace" | "bow" | "crossbow" | "throwing" | "staff" | "wand" | "spell-weapon";
export type MaterialId = "wood" | "stone" | "iron" | "steel" | "obsidian" | "crystal" | "aether";
export type ElementId = "fire" | "ice" | "lightning" | "poison" | "shadow" | "holy" | "arcane";
export type RarityId = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export type AssetManifestEntry = {
  kind: string;
  path: string;
  mime?: string;
  sha256?: string;
  fallback?: string;
};

export type AssetManifestLike = {
  id: string;
  version: string;
  artStatus?: string;
  entries: Record<string, AssetManifestEntry>;
};

export type PixelAssetBinding = {
  assetId: string;
  packId: string;
  packVersion: string;
  path?: string;
  sha256?: string;
  status: "bound" | "awaiting-asset";
  provenance: "project-original" | "license-verified" | "reference-only";
  note: string;
};

export type GeneratedAssetRecord = PixelAssetBinding & {
  kind: string;
};

export type ProceduralItemDefinition = {
  id: string;
  definitionKey: string;
  kind: "weapon";
  category: WeaponCategory;
  baseType: WeaponBaseType;
  material: MaterialId;
  element: ElementId;
  rarity: RarityId;
  name: string;
  seed: number;
  generatorVersion: string;
  affixes: string[];
  stats: {
    power: number;
    damage: number;
    elementalPower: number;
    durability: number;
    attackSpeed: number;
    range: number;
    criticalChance: number;
    manaCost: number;
  };
  asset: PixelAssetBinding;
  storage: {
    stackLimit: 1;
    instanceMode: "definition-plus-seed";
  };
  provenance: {
    source: "a-survival-procedural-content-generator";
    gameplayEffects: "fictional";
  };
};

export type GeneratedLoot = {
  generatorVersion: string;
  seed: number;
  monsterId: string;
  biome: string;
  isBoss: boolean;
  drops: ProceduralItemDefinition[];
  lootHash: string;
};

export type GeneratedAssetCatalog = {
  generatorVersion: string;
  packId: string;
  packVersion: string;
  assets: GeneratedAssetRecord[];
  catalogHash: string;
};

export type ContentGeneratorOptions = {
  seed?: number;
  count?: number;
  category?: WeaponCategory;
  assetManifest?: AssetManifestLike;
  generatorVersion?: string;
  rarity?: RarityId;
};

const BASE_TYPES: Record<WeaponBaseType, { category: WeaponCategory; baseDamage: number; speed: number; range: number; mana: number; assetId: string }> = {
  sword: { category: "melee", baseDamage: 30, speed: 1.0, range: 2.6, mana: 0, assetId: "items.blade" },
  dagger: { category: "melee", baseDamage: 20, speed: 1.35, range: 1.8, mana: 0, assetId: "items.blade" },
  axe: { category: "melee", baseDamage: 36, speed: 0.78, range: 2.4, mana: 0, assetId: "items.blade" },
  spear: { category: "melee", baseDamage: 27, speed: 0.92, range: 3.4, mana: 0, assetId: "items.blade" },
  hammer: { category: "melee", baseDamage: 42, speed: 0.62, range: 2.2, mana: 0, assetId: "items.blade" },
  mace: { category: "melee", baseDamage: 34, speed: 0.82, range: 2.3, mana: 0, assetId: "items.blade" },
  bow: { category: "ranged", baseDamage: 25, speed: 0.74, range: 8.5, mana: 0, assetId: "items.energy" },
  crossbow: { category: "ranged", baseDamage: 40, speed: 0.48, range: 10.5, mana: 0, assetId: "items.energy" },
  throwing: { category: "ranged", baseDamage: 22, speed: 1.12, range: 6.0, mana: 0, assetId: "items.energy" },
  staff: { category: "magic", baseDamage: 18, speed: 0.65, range: 7.0, mana: 8, assetId: "items.energy" },
  wand: { category: "magic", baseDamage: 14, speed: 1.12, range: 6.5, mana: 5, assetId: "items.energy" },
  "spell-weapon": { category: "magic", baseDamage: 32, speed: 0.52, range: 8.0, mana: 12, assetId: "items.energy" },
};

const MATERIALS: Record<MaterialId, { multiplier: number; durability: number }> = {
  wood: { multiplier: 0.72, durability: 0.72 },
  stone: { multiplier: 0.86, durability: 0.9 },
  iron: { multiplier: 1.0, durability: 1.05 },
  steel: { multiplier: 1.12, durability: 1.2 },
  obsidian: { multiplier: 1.24, durability: 1.16 },
  crystal: { multiplier: 1.16, durability: 0.92 },
  aether: { multiplier: 1.08, durability: 1.08 },
};

const ELEMENTS: Record<ElementId, { bonus: number; prefix: string; suffix: string; affix: string; compatible: WeaponCategory[] }> = {
  fire: { bonus: 8, prefix: "Burning", suffix: "of Flames", affix: "ember-burst", compatible: ["melee", "ranged", "magic"] },
  ice: { bonus: 8, prefix: "Frozen", suffix: "of Frost", affix: "slow-on-hit", compatible: ["melee", "ranged", "magic"] },
  lightning: { bonus: 7, prefix: "Thunder", suffix: "of the Storm", affix: "chain-spark", compatible: ["melee", "ranged", "magic"] },
  poison: { bonus: 6, prefix: "Venomous", suffix: "of Venom", affix: "toxin-trace", compatible: ["melee", "ranged"] },
  shadow: { bonus: 10, prefix: "Umbral", suffix: "of Shadows", affix: "veil-strike", compatible: ["melee", "magic"] },
  holy: { bonus: 9, prefix: "Radiant", suffix: "of Wards", affix: "warding-light", compatible: ["melee", "ranged", "magic"] },
  arcane: { bonus: 11, prefix: "Aetheric", suffix: "of Runes", affix: "spell-surge", compatible: ["magic", "ranged"] },
};

const RARITIES: Record<RarityId, { minPower: number; maxPower: number; maxAffixes: number; weight: number }> = {
  common: { minPower: 1, maxPower: 20, maxAffixes: 0, weight: 48 },
  uncommon: { minPower: 15, maxPower: 35, maxAffixes: 1, weight: 28 },
  rare: { minPower: 30, maxPower: 55, maxAffixes: 1, weight: 14 },
  epic: { minPower: 50, maxPower: 80, maxAffixes: 2, weight: 7 },
  legendary: { minPower: 70, maxPower: 120, maxAffixes: 2, weight: 2.6 },
  mythic: { minPower: 100, maxPower: 180, maxAffixes: 3, weight: 0.4 },
};

const PREFIXES = ["Ancient", "Tempered", "Starglass", "Frontier", "Runed"];
const STAT_AFFIXES = ["critical-edge", "swift-grip", "deep-reach", "reinforced-core", "aether-channel"];

function hashSeed(seed: number, salt: number) {
  let value = (seed ^ Math.imul(salt, 0x45d9f3b)) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function unit(seed: number, salt: number) {
  return hashSeed(seed, salt) / 0xffffffff;
}

function choose<T>(values: readonly T[], seed: number, salt: number) {
  return values[Math.floor(unit(seed, salt) * values.length)]!;
}

function chooseWeighted<T extends string>(values: readonly T[], weights: Record<T, number>, seed: number, salt: number) {
  const total = values.reduce((sum, value) => sum + weights[value], 0);
  let cursor = unit(seed, salt) * total;
  for (const value of values) {
    cursor -= weights[value];
    if (cursor <= 0) return value;
  }
  return values[values.length - 1]!;
}

function integerBetween(min: number, max: number, seed: number, salt: number) {
  return min + Math.floor(unit(seed, salt) * (max - min + 1));
}

function categoryBases(category?: WeaponCategory) {
  return (Object.keys(BASE_TYPES) as WeaponBaseType[]).filter(base => !category || BASE_TYPES[base].category === category);
}

export function bindPixelAsset(assetId: string, manifest?: AssetManifestLike): PixelAssetBinding {
  if (!manifest) {
    return { assetId, packId: "arcane-frontier-voxel-pixel", packVersion: "unknown", status: "awaiting-asset", provenance: "reference-only", note: "No manifest supplied; bind a verified pack asset before runtime use." };
  }
  const entry = manifest.entries[assetId];
  if (!entry) {
    return { assetId, packId: manifest.id, packVersion: manifest.version, status: "awaiting-asset", provenance: "reference-only", note: "Asset ID is not present in the supplied manifest; runtime must use fallback or await an authored asset." };
  }
  return { assetId, packId: manifest.id, packVersion: manifest.version, path: entry.path, sha256: entry.sha256, status: "bound", provenance: manifest.artStatus === "starter-authored-from-gemini-brief" ? "project-original" : "license-verified", note: `Bound to ${entry.path}; visual art remains replaceable through the manifest.` };
}

export function generateProceduralWeapon(options: ContentGeneratorOptions & { index?: number }): ProceduralItemDefinition {
  const generatorVersion = options.generatorVersion ?? CONTENT_GENERATOR_VERSION;
  const seed = Math.trunc(options.seed ?? DEFAULT_CONTENT_SEED) + (options.index ?? 0) * 7919;
  const baseType = choose(categoryBases(options.category), seed, 11);
  const base = BASE_TYPES[baseType];
  const material = choose(Object.keys(MATERIALS) as MaterialId[], seed, 17);
  const compatibleElements = (Object.keys(ELEMENTS) as ElementId[]).filter(element => ELEMENTS[element].compatible.includes(base.category));
  const element = choose(compatibleElements, seed, 23);
  const rarity = options.rarity ?? chooseWeighted(Object.keys(RARITIES) as RarityId[], Object.fromEntries(Object.entries(RARITIES).map(([key, rule]) => [key, rule.weight])) as Record<RarityId, number>, seed, 29);
  const rarityRule = RARITIES[rarity];
  const materialRule = MATERIALS[material];
  const targetPower = integerBetween(rarityRule.minPower, rarityRule.maxPower, seed, 31);
  const materialPower = Math.round(targetPower * materialRule.multiplier);
  const elementalPower = Math.max(1, Math.round(ELEMENTS[element].bonus * (targetPower / 45)));
  const damage = Math.max(1, Math.round(base.baseDamage * materialRule.multiplier + materialPower * 0.42));
  const affixes = rarityRule.maxAffixes > 0 ? [ELEMENTS[element].affix] : [];
  if (rarityRule.maxAffixes > 0) affixes.push(choose(STAT_AFFIXES, seed, 37));
  if (rarityRule.maxAffixes > 1) affixes.push(choose(STAT_AFFIXES.filter(affix => !affixes.includes(affix)), seed, 41));
  const prefix = unit(seed, 43) > 0.42 ? choose(PREFIXES, seed, 47) : ELEMENTS[element].prefix;
  const suffix = ELEMENTS[element].suffix;
  const name = `${prefix} ${rarity[0]!.toUpperCase()}${rarity.slice(1)} ${material[0]!.toUpperCase()}${material.slice(1)} ${baseType.replace("-", " ")} ${suffix}`;
  const definitionKey = `weapon:${baseType}:${material}:${element}:${rarity}`;
  const id = `generated-${createHash("sha1").update(`${generatorVersion}:${definitionKey}:${seed}`).digest("hex").slice(0, 12)}`;
  const power = Math.max(rarityRule.minPower, Math.min(rarityRule.maxPower, Math.round(targetPower + elementalPower * 0.35)));
  return {
    id,
    definitionKey,
    kind: "weapon",
    category: base.category,
    baseType,
    material,
    element,
    rarity,
    name,
    seed,
    generatorVersion,
    affixes: affixes.slice(0, rarityRule.maxAffixes + 1),
    stats: {
      power,
      damage,
      elementalPower,
      durability: Math.max(1, Math.round(80 * materialRule.durability + targetPower * 1.8)),
      attackSpeed: Number((base.speed * (0.94 + unit(seed, 53) * 0.16)).toFixed(2)),
      range: Number((base.range * (0.96 + unit(seed, 59) * 0.12)).toFixed(2)),
      criticalChance: Number((2 + (rarityRule.maxAffixes > 0 ? unit(seed, 61) * 8 : 0)).toFixed(1)),
      manaCost: base.mana > 0 ? Math.max(1, Math.round(base.mana * (1.12 - unit(seed, 67) * 0.18))) : 0,
    },
    asset: bindPixelAsset(base.assetId, options.assetManifest),
    storage: { stackLimit: 1, instanceMode: "definition-plus-seed" },
    provenance: { source: "a-survival-procedural-content-generator", gameplayEffects: "fictional" },
  };
}

export function generateProceduralWeapons(options: ContentGeneratorOptions = {}): ProceduralItemDefinition[] {
  const count = Math.max(0, Math.min(30000, Math.trunc(options.count ?? 1)));
  return Array.from({ length: count }, (_, index) => generateProceduralWeapon({ ...options, index }));
}

export function generateAssetCatalog(manifest: AssetManifestLike): GeneratedAssetCatalog {
  const assets = Object.entries(manifest.entries).sort(([left], [right]) => left.localeCompare(right)).map(([assetId, entry]) => ({
    ...bindPixelAsset(assetId, manifest),
    kind: entry.kind,
  }));
  const payload = { generatorVersion: CONTENT_GENERATOR_VERSION, packId: manifest.id, packVersion: manifest.version, assets };
  return { ...payload, catalogHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex") };
}

export function generateLootDrop(input: { seed: number; monsterId: string; biome: string; isBoss?: boolean; count?: number; category?: WeaponCategory; assetManifest?: AssetManifestLike }): GeneratedLoot {
  const isBoss = Boolean(input.isBoss);
  const count = Math.max(1, Math.min(8, Math.trunc(input.count ?? (isBoss ? 2 : 1))));
  const drops = Array.from({ length: count }, (_, index) => {
    const forcedRarity: RarityId = isBoss
      ? (["epic", "legendary", "mythic"] as RarityId[])[Math.floor(unit(input.seed, 701 + index) * 3)]!
      : (["common", "uncommon", "rare", "epic"] as RarityId[])[Math.floor(unit(input.seed, 701 + index) * 4)]!;
    const item = generateProceduralWeapon({ seed: input.seed + index * 101, category: input.category, index, rarity: forcedRarity, assetManifest: input.assetManifest });
    return { ...item, name: `${item.name.split(" ").slice(0, 1).join(" ")} ${forcedRarity[0]!.toUpperCase()}${forcedRarity.slice(1)} ${item.name.split(" ").slice(2).join(" ")}` };
  });
  const payload = { generatorVersion: CONTENT_GENERATOR_VERSION, seed: input.seed, monsterId: input.monsterId, biome: input.biome, isBoss, drops };
  return { ...payload, lootHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex") };
}

async function readManifest(path: string): Promise<AssetManifestLike | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as AssetManifestLike;
  } catch {
    return undefined;
  }
}

function readArg(name: string, fallback: string) {
  const prefix = `--${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("A-Survival Content Generator\nUsage: pnpm content:generate -- --kind=weapons --count=300 --category=melee --seed=829173 --out=artifacts/generated-weapons.json\nLoot: pnpm content:generate -- --kind=loot --monster=void-reaper --boss=true --count=2 --seed=829173 --out=artifacts/generated-loot.json\nAssets: pnpm content:generate -- --kind=assets --out=artifacts/asset-catalog.json\nBackend only: generated content is not exposed as an in-game editor.");
    return;
  }
  const kind = readArg("kind", "weapons");
  const seed = Number(readArg("seed", String(DEFAULT_CONTENT_SEED)));
  const assetManifestPath = resolve(process.cwd(), readArg("asset-manifest", DEFAULT_ASSET_MANIFEST_PATH));
  const assetManifest = await readManifest(assetManifestPath);
  const output = resolve(process.cwd(), readArg("out", kind === "loot" ? "artifacts/generated-loot.json" : "artifacts/generated-weapons.json"));
  const payload = kind === "loot"
    ? generateLootDrop({ seed, monsterId: readArg("monster", "glass-stalker"), biome: readArg("biome", "obsidian-frontier"), isBoss: readArg("boss", "false") === "true", count: Number(readArg("count", "2")), category: readArg("category", "") as WeaponCategory | undefined, assetManifest })
    : kind === "assets"
      ? assetManifest ? generateAssetCatalog(assetManifest) : { generatorVersion: CONTENT_GENERATOR_VERSION, packId: "missing", packVersion: "unknown", assets: [], catalogHash: "" }
      : { generatorVersion: CONTENT_GENERATOR_VERSION, kind: "weapons", seed, count: Number(readArg("count", "1")), items: generateProceduralWeapons({ seed, count: Number(readArg("count", "1")), category: readArg("category", "") as WeaponCategory | undefined, assetManifest }) };
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const count = "items" in payload ? payload.items.length : "drops" in payload ? payload.drops.length : payload.assets.length;
  console.log(JSON.stringify({ output, kind, seed, assetManifest: assetManifest?.id ?? "missing", count, contentGenerationUi: false }, null, 2));
}

if (process.argv[1]?.endsWith("content-generator.ts")) void main();
