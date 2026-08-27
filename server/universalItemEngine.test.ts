import { describe, expect, it } from "vitest";
import {
  createUniversalItemRegistry,
  evaluateCompatibility,
  generateUniversalItem,
  validateUniversalItem,
  type ItemCompatibilityRule,
  type UniversalItemGenerationInput,
} from "./generators/universalItemEngine";

function validSword(): UniversalItemGenerationInput {
  return {
    maxPowerBudget: 100,
    item: {
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
    },
  };
}

describe("Universal Item Engine", () => {
  it("accepts an item with purpose, identity, resources, trade-offs, counter and progression", () => {
    const generated = generateUniversalItem(validSword());

    expect(generated.schemaVersion).toBe("a-survival.universal-item.v1");
    expect(generated.definition.id).toBe("obsidian-rift-blade");
    expect(generated.definition.balanceProfile.totalScore).toBeLessThanOrEqual(100);
    expect(generated.definition.repair.resources[0]).toMatchObject({ source: "mining", resourceId: "obsidian-shard" });
    expect(validateUniversalItem(generated.definition)).toEqual({ valid: true, issues: [] });
  });

  it("rejects power-creep items that max out multiple axes without trade-offs", () => {
    const input = validSword();
    const overpowered = {
      ...input.item,
      id: "invalid-god-blade",
      family: "ranged" as const,
      stats: { damage: 96, range: 96, attackSpeed: 96, area: 10, critical: 95, mobility: 96, defense: 96, healing: 0, utility: 96 },
      tradeOffs: [],
    };
    const result = validateUniversalItem(overpowered);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "ranged item exceeds damage/range/speed trade-off envelope",
      "high power across four axes needs at least two trade-offs",
      "multi-stat power creep",
    ]));
  });

  it("enforces effect counters and a bounded stack limit", () => {
    const input = validSword();
    const item = {
      ...input.item,
      effects: [{ id: "burn", element: "fire" as const, strength: 90, durationSeconds: 10, stackLimit: 6, cooldownSeconds: 2, counterTags: [] }],
    };
    const result = validateUniversalItem(item);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining(["effect needs a counter: burn", "effect stack limit cannot exceed 5"]));
  });

  it("evaluates compatibility by tags and keeps non-matching combinations restricted", () => {
    const fireRule: ItemCompatibilityRule = { target: "effect", tag: "fire", result: "allowed", reason: "ไฟเข้ากับพืชธาตุไฟ" };
    const swordRule: ItemCompatibilityRule = { target: "weapon", tag: "sword", result: "forbidden", reason: "พืชนี้ไม่ใช่วัสดุทำคมดาบ" };

    expect(evaluateCompatibility(["plant", "fire"], fireRule)).toBe("allowed");
    expect(evaluateCompatibility(["plant", "water"], fireRule)).toBe("restricted");
    expect(evaluateCompatibility(["plant", "fire"], swordRule)).toBe("restricted");
  });

  it("uses the common registry for deterministic item artifacts", () => {
    const registry = createUniversalItemRegistry();
    const first = registry.generate("item.universal", validSword(), { seed: "item-seed-1", generatedAt: 10 });
    const second = registry.generate("item.universal", validSword(), { seed: "item-seed-1", generatedAt: 20 });

    expect(second.output).toEqual(first.output);
    expect(second.contentHash).toBe(first.contentHash);
    expect(registry.validate(first)).toEqual({ valid: true, issues: [] });
    expect(registry.preview(first)).toMatchObject({ kind: "item", recordCount: 1, ids: ["obsidian-rift-blade"] });
  });
});
