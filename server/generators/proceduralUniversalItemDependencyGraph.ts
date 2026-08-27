import { generateProceduralWeapons, type ProceduralItemDefinition, type WeaponCategory } from "../../tools/content-generator";
import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { createUniversalItemRegistry, type ItemElement, type ItemRole, type ItemProgression, type UniversalItemDefinition, type UniversalItemGenerationInput } from "./universalItemEngine";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const PROCEDURAL_UNIVERSAL_ITEM_GRAPH_RULES_VERSION = "procedural-universal-item-graph-rules.v1" as const;
export const PROCEDURAL_CONTENT_GENERATOR_VERSION = "0.1.0" as const;
export const UNIVERSAL_ITEM_GENERATOR_VERSION = "1.0.0" as const;

export type ProceduralUniversalItemDependencyGraphInput = {
  seed: number;
  count?: number;
  category?: WeaponCategory;
  maxPowerBudget?: number;
  rulesVersion?: string;
};

export type ProceduralUniversalItemReference = {
  sourceKey: string;
  referenceType: "asset-binding" | "universal-item-validation";
  referenceId: string;
  reason: string;
};

export type ProceduralUniversalItemArtifactSummary = {
  id: string;
  contentHash?: string;
  balanceScore?: number;
  valid: boolean;
  issues: string[];
};

export type ProceduralUniversalItemDependencyGraphOutput = {
  artifact: {
    generatorId: string;
    generatorVersion: string;
    seed: number;
    contentHash: string;
    generatedWeaponCount: number;
    universalItemCount: number;
    blockedItemCount: number;
  };
  summary: {
    generatedWeaponCount: number;
    universalItemCount: number;
    blockedItemCount: number;
    assetIds: string[];
    universalItemIds: string[];
    balanceScores: number[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<ProceduralUniversalItemReference["referenceType"], number>;
  };
  universalItems: ProceduralUniversalItemArtifactSummary[];
  unresolvedReferences: ProceduralUniversalItemReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, label: string) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return normalized;
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return { key: target.key, kind: target.kind, required: true, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function mapElement(element: ProceduralItemDefinition["element"]): ItemElement {
  if (element === "shadow") return "dark";
  if (element === "holy") return "light";
  return element === "fire" || element === "ice" || element === "lightning" || element === "poison" || element === "arcane" ? element : "neutral";
}

function mapRole(category: WeaponCategory): ItemRole {
  return category === "magic" ? "mage" : category === "ranged" ? "ranger" : "dps";
}

function mapProgression(rarity: ProceduralItemDefinition["rarity"]): ItemProgression {
  if (rarity === "common" || rarity === "uncommon") return "early";
  if (rarity === "rare") return "mid";
  if (rarity === "epic") return "late";
  if (rarity === "legendary") return "end";
  return "special";
}

function rarityCost(rarity: ProceduralItemDefinition["rarity"]) {
  return rarity === "common" ? 1 : rarity === "uncommon" ? 2 : rarity === "rare" ? 4 : rarity === "epic" ? 7 : rarity === "legendary" ? 10 : 14;
}

function buildUniversalItemInput(weapon: ProceduralItemDefinition): UniversalItemGenerationInput {
  const element = mapElement(weapon.element);
  const role = mapRole(weapon.category);
  const effect = {
    id: `element-${element}`,
    element,
    damageType: weapon.category === "magic" ? "magic" as const : "elemental" as const,
    strength: Math.max(1, Math.min(100, weapon.stats.elementalPower)),
    durationSeconds: weapon.category === "magic" ? 4 : 2,
    stackLimit: 1,
    cooldownSeconds: weapon.category === "magic" ? 5 : 3,
    counterTags: [`counter-${element}`],
  };
  const item: Omit<UniversalItemDefinition, "balanceProfile"> = {
    id: weapon.id,
    name: weapon.name,
    family: weapon.category,
    category: "procedural-weapon",
    role,
    materialTags: [weapon.material, "procedural"],
    environmentTags: ["obsidian", "frontier"],
    progression: mapProgression(weapon.rarity),
    element,
    damageType: weapon.category === "magic" ? "magic" : weapon.category === "ranged" ? "projectile" : "physical",
    purpose: `อาวุธ procedural ${weapon.category} ที่สร้างจาก seed และ definition key แบบ deterministic`,
    identity: weapon.definitionKey,
    weakness: "ต้องตรวจ asset binding และ trade-off ก่อนนำไปใช้ใน runtime",
    counters: [`counter-${element}`, "counter-range"],
    stats: {
      damage: Math.min(100, weapon.stats.damage),
      range: Math.min(100, Math.round(weapon.stats.range * 10)),
      attackSpeed: Math.min(100, Math.round(weapon.stats.attackSpeed * 50)),
      area: weapon.category === "magic" ? 15 : 5,
      critical: Math.min(100, Math.round(weapon.stats.criticalChance * 10)),
      mobility: weapon.category === "ranged" ? 25 : 8,
      defense: 0,
      healing: 0,
      utility: weapon.category === "magic" ? Math.min(100, weapon.stats.manaCost * 4) : weapon.category === "ranged" ? 12 : 6,
    },
    tradeOffs: [
      { stat: "attackSpeed", amount: weapon.stats.attackSpeed < 0.8 ? 8 : 4, reason: "ความเร็วโจมตีแลกกับพลังและระยะของอาวุธ procedural" },
      { stat: "defense", amount: 6, reason: "อาวุธเน้นการโจมตีไม่มีค่าป้องกันโดยอัตโนมัติ" },
    ],
    effects: [effect],
    durability: { maximum: Math.max(1, Math.min(100, Math.round(weapon.stats.durability))), current: Math.max(1, Math.min(100, Math.round(weapon.stats.durability))) },
    repair: { method: "material", resources: [{ source: "mining", resourceId: weapon.material, quantity: 1 }], baseCost: rarityCost(weapon.rarity) },
    compatibility: [
      { target: "weapon", tag: weapon.baseType, result: "allowed", reason: `ตรงกับรูปแบบ ${weapon.baseType} ของ procedural owner` },
      { target: "material", tag: weapon.material, result: "allowed", reason: `ใช้วัสดุ ${weapon.material} จาก procedural owner` },
      { target: "effect", tag: element, result: "special", reason: `ตรวจ effect ธาตุ ${element} แยกก่อน runtime` },
    ],
    resources: [{ source: "mining", resourceId: weapon.material, quantity: 1 }],
    recommendedBuilds: [role],
    performanceCost: weapon.category === "magic" ? 18 : weapon.category === "ranged" ? 12 : 8,
  };
  return { item, maxPowerBudget: 100 };
}

function addUnresolved(list: ProceduralUniversalItemReference[], sourceKey: string, referenceType: ProceduralUniversalItemReference["referenceType"], referenceId: string, reason: string) {
  list.push({ sourceKey, referenceType, referenceId, reason });
}

export function buildProceduralUniversalItemDependencyGraph(input: ProceduralUniversalItemDependencyGraphInput): ProceduralUniversalItemDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? PROCEDURAL_UNIVERSAL_ITEM_GRAPH_RULES_VERSION;
  if (rulesVersion !== PROCEDURAL_UNIVERSAL_ITEM_GRAPH_RULES_VERSION) throw new Error(`Unsupported procedural universal item graph rules version: ${rulesVersion}`);
  if (!Number.isInteger(input.seed)) throw new Error("seed must be an integer");
  const count = boundedInteger(input.count, 8, 1, 8, "count");
  const maxPowerBudget = boundedInteger(input.maxPowerBudget, 100, 1, 100, "maxPowerBudget");
  const weapons = generateProceduralWeapons({ seed: input.seed, count, category: input.category });
  const sourceHash = hashStableJson(weapons as never);
  const sourceRoot: DependencyGraphNode = {
    key: `procedural-content:${sourceHash}`,
    kind: "other",
    generatorId: "content.generator",
    generatorVersion: PROCEDURAL_CONTENT_GENERATOR_VERSION,
    schemaVersion: "a-survival.procedural-content.v1",
    seed: String(input.seed),
    rulesVersion,
    contentHash: sourceHash,
    dependencies: [],
  };
  const universalRegistry = createUniversalItemRegistry();
  const unresolvedReferences: ProceduralUniversalItemReference[] = [];
  const universalItems: ProceduralUniversalItemArtifactSummary[] = [];
  const weaponNodes: DependencyGraphNode[] = [];
  const universalNodes: DependencyGraphNode[] = [];
  for (const weapon of weapons) {
    const weaponNode: DependencyGraphNode = {
      key: `procedural-item:${weapon.id}`,
      kind: "item",
      generatorId: "content.generator",
      generatorVersion: PROCEDURAL_CONTENT_GENERATOR_VERSION,
      schemaVersion: "a-survival.procedural-item.v1",
      seed: String(weapon.seed),
      rulesVersion,
      contentHash: hashStableJson(weapon as never),
      dependencies: [dependencyFor(sourceRoot)],
    };
    weaponNode.dependencies.push(missingDependency(`asset:${weapon.asset.assetId}`, "texture"));
    addUnresolved(unresolvedReferences, weaponNode.key, "asset-binding", weapon.asset.assetId, "procedural weapon has no supplied verified asset manifest binding in this preview");
    weaponNodes.push(weaponNode);
    const universalInput = { ...buildUniversalItemInput(weapon), maxPowerBudget };
    try {
      const artifact = universalRegistry.generate<UniversalItemGenerationInput, { schemaVersion: "a-survival.universal-item.v1"; definition: UniversalItemDefinition }>("item.universal", universalInput, { seed: String(weapon.seed), generatedAt: 0 });
      const universalNode: DependencyGraphNode = {
        key: `item-universal:${artifact.contentHash}`,
        kind: "item",
        generatorId: "item.universal",
        generatorVersion: UNIVERSAL_ITEM_GENERATOR_VERSION,
        schemaVersion: artifact.output.schemaVersion,
        seed: String(weapon.seed),
        rulesVersion,
        contentHash: artifact.contentHash,
        dependencies: [dependencyFor(weaponNode)],
      };
      universalNodes.push(universalNode);
      universalItems.push({ id: artifact.output.definition.id, contentHash: artifact.contentHash, balanceScore: artifact.output.definition.balanceProfile.totalScore, valid: true, issues: [] });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      universalItems.push({ id: weapon.id, valid: false, issues: [reason] });
      universalNodes.push({
        key: `item-universal:${weapon.id}`,
        kind: "item",
        generatorId: "item.universal",
        generatorVersion: UNIVERSAL_ITEM_GENERATOR_VERSION,
        schemaVersion: "a-survival.universal-item.v1",
        seed: String(weapon.seed),
        rulesVersion,
        contentHash: hashStableJson({ id: weapon.id, reason } as never),
        dependencies: [dependencyFor(weaponNode), missingDependency(`item.universal.output:${weapon.id}`, "item")],
      });
      addUnresolved(unresolvedReferences, weaponNode.key, "universal-item-validation", weapon.id, reason);
    }
  }
  const unresolvedReferenceTypes = {
    "asset-binding": unresolvedReferences.filter(reference => reference.referenceType === "asset-binding").length,
    "universal-item-validation": unresolvedReferences.filter(reference => reference.referenceType === "universal-item-validation").length,
  } satisfies Record<ProceduralUniversalItemReference["referenceType"], number>;
  const graphNodes = [sourceRoot, ...weaponNodes, ...universalNodes];
  const contentHash = hashStableJson({ sourceHash, universalItems, rulesVersion } as never);
  const balanceScores = universalItems.flatMap(item => item.balanceScore === undefined ? [] : [item.balanceScore]);
  return {
    artifact: {
      generatorId: "content.generator",
      generatorVersion: PROCEDURAL_CONTENT_GENERATOR_VERSION,
      seed: input.seed,
      contentHash,
      generatedWeaponCount: weapons.length,
      universalItemCount: universalItems.filter(item => item.valid).length,
      blockedItemCount: universalItems.filter(item => !item.valid).length,
    },
    summary: {
      generatedWeaponCount: weapons.length,
      universalItemCount: universalItems.filter(item => item.valid).length,
      blockedItemCount: universalItems.filter(item => !item.valid).length,
      assetIds: Array.from(new Set(weapons.map(weapon => weapon.asset.assetId))).sort(),
      universalItemIds: universalItems.map(item => item.id).sort(),
      balanceScores,
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    universalItems,
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes: graphNodes,
    graph: validateGeneratorDependencyGraph(graphNodes),
  };
}
