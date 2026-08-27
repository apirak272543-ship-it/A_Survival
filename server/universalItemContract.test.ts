import { describe, expect, it } from "vitest";
import type { UniversalItemGenerationInput } from "./generators/universalItemEngine";
import { evaluateUniversalItemContract } from "./universalItemContract";

function validSword(): UniversalItemGenerationInput["item"] {
  return {
    id: "obsidian-rift-blade",
    name: "Obsidian Rift Blade",
    family: "melee",
    category: "weapon-sword",
    role: "dps",
    materialTags: ["obsidian", "metal"],
    environmentTags: ["volcanic", "frontier"],
    progression: "mid",
    element: "dark",
    damageType: "physical",
    purpose: "ตัดผ่านเกราะของศัตรูระยะประชิด",
    identity: "ดาบหนักที่เน้นจังหวะและตำแหน่ง ไม่ใช่ระยะไกล",
    weakness: "เคลื่อนที่ช้าลงและเสียเปรียบเมื่อถูกกดจากระยะไกล",
    counters: ["cover", "mobility"],
    stats: { damage: 70, range: 20, attackSpeed: 70, area: 10, critical: 25, mobility: 60, defense: 20, healing: 0, utility: 25 },
    tradeOffs: [
      { stat: "range", amount: 20, reason: "ต้องเข้าใกล้เพื่อแลกความเสียหาย" },
      { stat: "defense", amount: 15, reason: "ไม่มีโล่จึงรับการโจมตีได้น้อย" },
    ],
    effects: [],
    durability: { maximum: 300, current: 300 },
    repair: { method: "station", resources: [{ source: "mining", resourceId: "obsidian-shard", quantity: 2 }], baseCost: 8 },
    compatibility: [
      { target: "material", tag: "obsidian", result: "allowed", reason: "วัสดุเข้ากับรูปแบบคมตัด" },
      { target: "plant", tag: "fire", result: "restricted", reason: "ใช้ร่วมได้เฉพาะ enchant ที่รองรับ" },
    ],
    resources: [{ source: "mining", resourceId: "obsidian-shard", quantity: 3 }],
    recommendedBuilds: ["dps", "assassin"],
    performanceCost: 12,
  };
}

describe("universal item contract", () => {
  it("accepts canonical item data and exposes balance/coverage without runtime mutation", () => {
    const result = evaluateUniversalItemContract({ item: validSword() });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.definition.balanceProfile.totalScore).toBeLessThanOrEqual(100);
    expect(result.coverage).toMatchObject({ hasStats: true, effectCount: 0, resourceLinkCount: 1, compatibilityRuleCount: 2, recommendedBuildCount: 2, combatRuntimeTransactionImplemented: false, craftingRuntimeTransactionImplemented: false });
    expect(result.runtimePolicy).toEqual({ generatorReadOnly: true, inventoryMutationAllowed: false, equipmentMutationAllowed: false, combatMutationAllowed: false, craftingMutationAllowed: false, assetGenerationAllowed: false });
  });

  it("rejects power creep and reports canonical validation issues", () => {
    const item = validSword();
    const result = evaluateUniversalItemContract({
      item: {
        ...item,
        id: "invalid-god-blade",
        family: "ranged",
        stats: { damage: 96, range: 96, attackSpeed: 96, area: 10, critical: 95, mobility: 96, defense: 96, healing: 0, utility: 96 },
        tradeOffs: [],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "ranged item exceeds damage/range/speed trade-off envelope",
      "high power across four axes needs at least two trade-offs",
      "multi-stat power creep",
    ]));
  });

  it("keeps explicit effect counters and resource/compatibility coverage", () => {
    const item = validSword();
    const result = evaluateUniversalItemContract({
      item: {
        ...item,
        effects: [{ id: "burn", element: "fire", strength: 20, durationSeconds: 5, stackLimit: 2, cooldownSeconds: 2, counterTags: ["water"] }],
        resources: [...item.resources, { source: "plant", resourceId: "ember-herb", quantity: 2 }],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.coverage.effectCount).toBe(1);
    expect(result.coverage.resourceLinkCount).toBe(2);
    expect(result.definition.effects[0]).toMatchObject({ id: "burn", counterTags: ["water"] });
  });

  it("is deterministic and bounds the requested power budget", () => {
    const first = evaluateUniversalItemContract({ item: validSword(), maxPowerBudget: 100 });
    const second = evaluateUniversalItemContract({ item: validSword(), maxPowerBudget: 100 });

    expect(second).toEqual(first);
    expect(() => evaluateUniversalItemContract({ item: validSword(), maxPowerBudget: 0 })).toThrow("maxPowerBudget must be between 1 and 100");
    expect(() => evaluateUniversalItemContract({ item: validSword(), maxPowerBudget: 101 })).toThrow("maxPowerBudget must be between 1 and 100");
  });
});
