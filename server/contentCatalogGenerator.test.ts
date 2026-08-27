import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT_CATALOG_INPUT,
  MINIMUM_DEFINITIONS_PER_CATEGORY,
  createContentCatalogRegistry,
  generateContentCatalog,
  validateContentCatalog,
  type ContentCatalogInput,
} from "./generators/contentCatalogGenerator";

describe("Content Catalog Generator", () => {
  it("generates at least 300 definitions for every configured category", () => {
    const output = generateContentCatalog(DEFAULT_CONTENT_CATALOG_INPUT);
    const counts = Object.values(output.categoryCounts);

    expect(output.definitions).toHaveLength(MINIMUM_DEFINITIONS_PER_CATEGORY * DEFAULT_CONTENT_CATALOG_INPUT.categories.length);
    expect(counts.every(count => count === MINIMUM_DEFINITIONS_PER_CATEGORY)).toBe(true);
    expect(validateContentCatalog(output, DEFAULT_CONTENT_CATALOG_INPUT)).toEqual({ valid: true, issues: [] });
    expect(new Set(output.definitions.map(definition => definition.id)).size).toBe(output.definitions.length);
  });

  it("keeps plant soil affinity and weapon combat metadata data-driven", () => {
    const output = generateContentCatalog({ ...DEFAULT_CONTENT_CATALOG_INPUT, categories: ["plant", "seed", "weapon-sword", "weapon-bow", "weapon-ranged"], countPerCategory: 300 });
    const plants = output.definitions.filter(definition => definition.category === "plant" || definition.category === "seed");
    const weapons = output.definitions.filter(definition => definition.category.startsWith("weapon-"));

    expect(plants).toHaveLength(600);
    expect(new Set(plants.map(plant => plant.soilAffinity)).size).toBe(5);
    expect(weapons.every(weapon => weapon.equippable && weapon.stackLimit === 1 && weapon.combat && weapon.combat.baseDamage > 0)).toBe(true);
    expect(output.assetRefs).toHaveLength(5);
    expect(output.assetRefs.every(asset => asset.provenanceRef === "ASSETS.md#logical-content-pack")).toBe(true);
  });

  it("uses the common registry for deterministic artifact validation and export", () => {
    const registry = createContentCatalogRegistry();
    const first = registry.generate("content.catalog", DEFAULT_CONTENT_CATALOG_INPUT, { seed: "content-library-v1", generatedAt: 100 });
    const second = registry.generate("content.catalog", DEFAULT_CONTENT_CATALOG_INPUT, { seed: "content-library-v1", generatedAt: 200 });

    expect(second.output).toEqual(first.output);
    expect(second.contentHash).toBe(first.contentHash);
    expect(registry.validate(first)).toEqual({ valid: true, issues: [] });
    expect(registry.preview(first)).toMatchObject({ kind: "item", recordCount: 3000, outputType: "object" });
    expect(JSON.parse(registry.export(first))).toMatchObject({ generatorId: "content.catalog", seed: "content-library-v1" });
  });

  it("rejects under-sized, duplicate, unsupported, or malformed catalog inputs", () => {
    const invalidInputs: ContentCatalogInput[] = [
      { ...DEFAULT_CONTENT_CATALOG_INPUT, countPerCategory: 299 },
      { ...DEFAULT_CONTENT_CATALOG_INPUT, categories: ["plant", "plant"] },
      { ...DEFAULT_CONTENT_CATALOG_INPUT, categories: ["plant", "weapon-sword", "tool"], assetNamespace: "Bad Namespace" },
      { ...DEFAULT_CONTENT_CATALOG_INPUT, categories: ["unsupported" as never] },
    ];
    for (const input of invalidInputs) expect(() => generateContentCatalog(input)).toThrow("Content catalog input is invalid");
  });

  it("rejects a catalog with a missing category or equippable stack violation", () => {
    const output = generateContentCatalog({ ...DEFAULT_CONTENT_CATALOG_INPUT, categories: ["plant", "weapon-sword"], countPerCategory: 300 });
    const missingCategory = { ...output, definitions: output.definitions.filter(definition => definition.category !== "plant") };
    expect(validateContentCatalog(missingCategory, { ...DEFAULT_CONTENT_CATALOG_INPUT, categories: ["plant", "weapon-sword"], countPerCategory: 300 }).valid).toBe(false);
    const badWeapon = { ...output, definitions: output.definitions.map(definition => definition.category === "weapon-sword" && definition.ordinal === 1 ? { ...definition, stackLimit: 2 } : definition) };
    expect(validateContentCatalog(badWeapon).issues).toContain("equippable content must have stackLimit 1: weapon-sword-001");
  });
});
