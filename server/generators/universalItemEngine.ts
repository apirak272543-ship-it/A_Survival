import {
  CommonGeneratorRegistry,
  type GeneratorPlugin,
  type GeneratorValidationResult,
} from "./commonGeneratorApi";

export type ItemFamily = "melee" | "ranged" | "magic" | "technology" | "modern" | "hybrid" | "armor" | "tool" | "consumable" | "material" | "artifact" | "clothing" | "accessory";
export type ItemRole = "dps" | "tank" | "assassin" | "ranger" | "mage" | "support" | "farmer" | "explorer" | "crafter" | "technician" | "hybrid";
export type ItemProgression = "early" | "mid" | "late" | "end" | "special";
export type ItemElement = "fire" | "water" | "ice" | "earth" | "wind" | "lightning" | "light" | "dark" | "poison" | "nature" | "arcane" | "neutral";
export type DamageType = "physical" | "magic" | "elemental" | "energy" | "projectile" | "explosive" | "poison" | "environmental";
export type ResourceSource = "mining" | "plant" | "animal" | "mob" | "farming" | "fishing" | "structure" | "dungeon" | "boss";
export type CompatibilityResult = "allowed" | "restricted" | "forbidden" | "special";

export type ItemStats = {
  damage: number;
  range: number;
  attackSpeed: number;
  area: number;
  critical: number;
  mobility: number;
  defense: number;
  healing: number;
  utility: number;
};

export type ItemEffect = {
  id: string;
  element: ItemElement;
  damageType?: DamageType;
  strength: number;
  durationSeconds: number;
  stackLimit: number;
  cooldownSeconds: number;
  counterTags: string[];
};

export type ItemTradeOff = {
  stat: keyof ItemStats;
  amount: number;
  reason: string;
};

export type ItemResourceLink = {
  source: ResourceSource;
  resourceId: string;
  quantity: number;
};

export type ItemRepairProfile = {
  method: "station" | "material" | "magic" | "machine" | "quest";
  resources: ItemResourceLink[];
  baseCost: number;
};

export type ItemCompatibilityRule = {
  target: "material" | "plant" | "weapon" | "armor" | "effect" | "build";
  tag: string;
  result: CompatibilityResult;
  reason: string;
};

export type UniversalItemDefinition = {
  id: string;
  name: string;
  family: ItemFamily;
  category: string;
  role: ItemRole;
  materialTags: string[];
  environmentTags: string[];
  progression: ItemProgression;
  element: ItemElement;
  damageType?: DamageType;
  purpose: string;
  identity: string;
  weakness: string;
  counters: string[];
  stats: ItemStats;
  tradeOffs: ItemTradeOff[];
  effects: ItemEffect[];
  durability: { maximum: number; current: number };
  uses?: number;
  charges?: number;
  repair: ItemRepairProfile;
  compatibility: ItemCompatibilityRule[];
  resources: ItemResourceLink[];
  recommendedBuilds: ItemRole[];
  performanceCost: number;
  balanceProfile: ItemBalanceProfile;
};

export type ItemBalanceProfile = {
  powerScore: number;
  utilityScore: number;
  costScore: number;
  riskScore: number;
  rarityScore: number;
  synergyScore: number;
  totalScore: number;
  flags: string[];
};

export type UniversalItemGenerationInput = {
  item: Omit<UniversalItemDefinition, "balanceProfile">;
  maxPowerBudget: number;
};

export type UniversalItemGenerationOutput = {
  schemaVersion: "a-survival.universal-item.v1";
  definition: UniversalItemDefinition;
};

const MAX_STAT = 100;
const MAX_POWER_BUDGET = 100;
const ITEM_FAMILIES: ItemFamily[] = ["melee", "ranged", "magic", "technology", "modern", "hybrid", "armor", "tool", "consumable", "material", "artifact", "clothing", "accessory"];
const ITEM_ROLES: ItemRole[] = ["dps", "tank", "assassin", "ranger", "mage", "support", "farmer", "explorer", "crafter", "technician", "hybrid"];
const PROGRESSIONS: ItemProgression[] = ["early", "mid", "late", "end", "special"];
const ELEMENTS: ItemElement[] = ["fire", "water", "ice", "earth", "wind", "lightning", "light", "dark", "poison", "nature", "arcane", "neutral"];
const DAMAGE_TYPES: DamageType[] = ["physical", "magic", "elemental", "energy", "projectile", "explosive", "poison", "environmental"];
const RESOURCE_SOURCES: ResourceSource[] = ["mining", "plant", "animal", "mob", "farming", "fishing", "structure", "dungeon", "boss"];

function bounded(value: number, min = 0, max = MAX_STAT) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function sumStats(stats: ItemStats) {
  return Object.values(stats).reduce((sum, value) => sum + bounded(value), 0);
}

function hasText(value: string) {
  return typeof value === "string" && value.trim().length >= 3;
}

function hasTags(values: string[]) {
  return values.length > 0 && values.every(value => /^[a-z0-9][a-z0-9._-]{1,48}$/.test(value));
}

function roleFamilyIsCoherent(item: UniversalItemDefinition, issues: string[]) {
  if (item.family === "melee" && item.stats.range > 65) issues.push("melee item cannot have long-range identity without a hybrid family");
  if (item.family === "ranged" && item.stats.damage > 90 && item.stats.range > 85 && item.stats.attackSpeed > 85) issues.push("ranged item exceeds damage/range/speed trade-off envelope");
  if (item.family === "magic" && item.stats.utility > 85 && item.effects.length === 0) issues.push("magic item with high utility needs an explicit effect");
  if (item.family === "tool" && item.role === "dps" && item.stats.damage > 80) issues.push("tool must keep a primary tool identity instead of becoming a dominant weapon");
}

export function calculateItemBalance(item: Omit<UniversalItemDefinition, "balanceProfile">): ItemBalanceProfile {
  const powerScore = bounded(Math.round(sumStats(item.stats) / 9));
  const utilityScore = bounded(Math.round((item.stats.utility + item.stats.mobility + item.stats.healing) / 3));
  const costScore = bounded(Math.round((100 - item.durability.current / Math.max(1, item.durability.maximum) * 100) + item.repair.baseCost / 2));
  const riskScore = bounded(Math.round((item.tradeOffs.length * 15) + (item.effects.length * 5) + (item.weakness.length > 0 ? 10 : 0)));
  const rarityScore = item.progression === "early" ? 10 : item.progression === "mid" ? 25 : item.progression === "late" ? 50 : item.progression === "end" ? 80 : 65;
  const synergyScore = bounded(Math.round(item.compatibility.filter(rule => rule.result === "allowed" || rule.result === "special").length * 8), 0, 40);
  const totalScore = bounded(Math.round((powerScore * 0.35) + (utilityScore * 0.15) + (costScore * 0.15) + (riskScore * 0.15) + (rarityScore * 0.1) + (synergyScore * 0.1)), 0, MAX_POWER_BUDGET);
  const flags: string[] = [];
  if (powerScore > 85 && item.tradeOffs.length === 0) flags.push("high-power item has no trade-off");
  if (item.effects.some(effect => effect.stackLimit > 5)) flags.push("effect stack limit needs review");
  if (item.stats.damage > 90 && item.stats.defense > 90 && item.stats.mobility > 90) flags.push("multi-stat power creep");
  return { powerScore, utilityScore, costScore, riskScore, rarityScore, synergyScore, totalScore, flags };
}

export function validateUniversalItem(item: UniversalItemDefinition, maxPowerBudget = MAX_POWER_BUDGET): GeneratorValidationResult {
  const issues: string[] = [];
  if (!/^[a-z0-9][a-z0-9.-]{2,63}$/.test(item.id)) issues.push("item id is invalid");
  if (!hasText(item.name) || !hasText(item.purpose) || !hasText(item.identity) || !hasText(item.weakness)) issues.push("item must have name, purpose, identity, and weakness");
  if (!ITEM_FAMILIES.includes(item.family)) issues.push("item family is unsupported");
  if (!ITEM_ROLES.includes(item.role)) issues.push("item role is unsupported");
  if (!PROGRESSIONS.includes(item.progression)) issues.push("item progression is unsupported");
  if (!ELEMENTS.includes(item.element)) issues.push("item element is unsupported");
  if (item.damageType && !DAMAGE_TYPES.includes(item.damageType)) issues.push("item damage type is unsupported");
  if (!hasTags(item.materialTags) || !hasTags(item.environmentTags)) issues.push("item needs material and environment tags");
  if (item.counters.length === 0) issues.push("item needs at least one counter");
  if (item.recommendedBuilds.length === 0 || item.recommendedBuilds.some(role => !ITEM_ROLES.includes(role))) issues.push("item needs valid recommended builds");
  if (item.resources.length === 0 || item.resources.some(resource => !RESOURCE_SOURCES.includes(resource.source) || !resource.resourceId || resource.quantity <= 0)) issues.push("item needs valid world resource links");
  for (const [stat, value] of Object.entries(item.stats)) if (!Number.isFinite(value) || value < 0 || value > MAX_STAT) issues.push(`stat out of range: ${stat}`);
  if (!Number.isInteger(item.durability.maximum) || item.durability.maximum < 1 || item.durability.current < 0 || item.durability.current > item.durability.maximum) issues.push("durability is invalid");
  if (item.uses !== undefined && (!Number.isInteger(item.uses) || item.uses < 1)) issues.push("uses must be a positive integer");
  if (item.charges !== undefined && (!Number.isInteger(item.charges) || item.charges < 1)) issues.push("charges must be a positive integer");
  for (const effect of item.effects) {
    if (!effect.id || !ELEMENTS.includes(effect.element) || effect.strength < 0 || effect.durationSeconds < 0 || effect.stackLimit < 1 || effect.cooldownSeconds < 0) issues.push(`effect is invalid: ${effect.id}`);
    if (effect.counterTags.length === 0) issues.push(`effect needs a counter: ${effect.id}`);
  }
  for (const tradeOff of item.tradeOffs) if (!(tradeOff.stat in item.stats) || tradeOff.amount <= 0 || !hasText(tradeOff.reason)) issues.push("trade-off is invalid");
  for (const resource of item.repair.resources) if (!RESOURCE_SOURCES.includes(resource.source) || resource.quantity <= 0 || !resource.resourceId) issues.push("repair resource link is invalid");
  for (const rule of item.compatibility) if (!rule.target || !rule.tag || !["allowed", "restricted", "forbidden", "special"].includes(rule.result) || !hasText(rule.reason)) issues.push("compatibility rule is invalid");
  if (item.performanceCost < 0 || item.performanceCost > MAX_STAT) issues.push("performanceCost must be 0–100");
  roleFamilyIsCoherent(item, issues);
  if (item.effects.some(effect => effect.stackLimit > 5)) issues.push("effect stack limit cannot exceed 5");
  if (item.stats.damage > 85 && item.stats.range > 85 && item.stats.attackSpeed > 85 && item.stats.defense > 85 && item.tradeOffs.length < 2) issues.push("high power across four axes needs at least two trade-offs");
  const profile = calculateItemBalance(item);
  if (profile.flags.length > 0) issues.push(...profile.flags);
  if (profile.totalScore > maxPowerBudget) issues.push(`item exceeds power budget ${maxPowerBudget}`);
  return { valid: issues.length === 0, issues };
}

export function generateUniversalItem(input: UniversalItemGenerationInput): UniversalItemGenerationOutput {
  const balanceProfile = calculateItemBalance(input.item);
  const definition = { ...input.item, balanceProfile };
  const validation = validateUniversalItem(definition, input.maxPowerBudget);
  if (!validation.valid) throw new Error(`Universal item is invalid: ${validation.issues.join("; ")}`);
  return { schemaVersion: "a-survival.universal-item.v1", definition };
}

export function evaluateCompatibility(sourceTags: string[], rule: ItemCompatibilityRule) {
  return sourceTags.includes(rule.tag) ? rule.result : "restricted" as const;
}

export const universalItemGeneratorPlugin: GeneratorPlugin<UniversalItemGenerationInput, UniversalItemGenerationOutput> = {
  id: "item.universal",
  version: "1.0.0",
  kind: "item",
  generate: input => generateUniversalItem(input),
  validate: (output, input) => {
    if (output.schemaVersion !== "a-survival.universal-item.v1") return { valid: false, issues: ["unsupported universal item schema"] };
    return validateUniversalItem(output.definition, input.maxPowerBudget);
  },
  preview: output => ({ recordCount: 1, ids: [output.definition.id], assetRefs: [] }),
};

export function createUniversalItemRegistry() {
  return new CommonGeneratorRegistry().register(universalItemGeneratorPlugin);
}
