import { describe, expect, it } from "vitest";
import {
  ContentRegistry,
  generateContentSuiteBatch,
  generateContentSuiteBundle,
  validateContentSuiteBundle,
  type ContentSuiteInput,
} from "../tools/contentRegistry";

const baseInput: ContentSuiteInput = {
  kind: "block",
  name: "Obsidian Fire Block",
  description: "A readable volcanic building block with fictional fire energy.",
  material: "obsidian",
  element: "fire",
  biome: "obsidian-frontier",
  gameplayRole: "building-block",
  rarity: "rare",
  theme: "volcanic fantasy",
  conceptNote: "Dark volcanic glass with fiery cracks; shape must read as a block first.",
  seed: 9107,
};

describe("A-Survival Content Generation Suite", () => {
  it("is deterministic and cache-key stable for the same semantic input", () => {
    const first = generateContentSuiteBundle(baseInput);
    const second = generateContentSuiteBundle({ ...baseInput });
    expect(second).toEqual(first);
    expect(first.contentHash).toHaveLength(64);
    expect(first.cacheKey).toHaveLength(64);
  });

  it("derives Obsidian Fire appearance from material, element, biome, role and rarity", () => {
    const bundle = generateContentSuiteBundle(baseInput);
    expect(bundle.visual).toMatchObject({
      baseColor: "dark_obsidian",
      secondaryColor: "ash_slate",
      accentColor: "ember_orange",
      material: "obsidian",
      pattern: "volcanic cracks",
      shapeLanguage: "readable-block",
      textureResolution: 16,
    });
    expect(bundle.visual.emission).toBeLessThanOrEqual(0.28);
    expect(bundle.decisionLog.conceptSource).toBe("human-input");
    expect(bundle.decisionLog.decisions.join(" ")).toContain("element:fire");
    expect(bundle.preview.finalArtStatus).toBe("awaiting-asset");
    expect(validateContentSuiteBundle(bundle)).toEqual([]);
  });

  it("reuses one base model while allowing distinct skin/gameplay variants", () => {
    const first = generateContentSuiteBundle({ ...baseInput, id: "obsidian-fire-block-a", baseModelId: "model.template.block", seed: 1 });
    const second = generateContentSuiteBundle({ ...baseInput, id: "obsidian-fire-block-b", baseModelId: "model.template.block", seed: 2, rarity: "legendary", gameplayRole: "loot" });
    expect(first.model.id).toBe(second.model.id);
    expect(first.model.reuseKey).toBe(second.model.reuseKey);
    expect(first.variant.id).not.toBe(second.variant.id);
    expect(first.contentHash).not.toBe(second.contentHash);
  });

  it("applies human visual override without changing the reusable core model", () => {
    const bundle = generateContentSuiteBundle({ ...baseInput, humanOverride: { accentColor: "owner_gold", emission: 0.2, markings: "owner crest" } });
    expect(bundle.visual).toMatchObject({ accentColor: "owner_gold", emission: 0.2, markings: "owner crest" });
    expect(bundle.decisionLog.overrideApplied).toEqual(["accentColor", "emission", "markings"]);
    expect(bundle.model.source).toBe("template");
    expect(validateContentSuiteBundle(bundle)).toEqual([]);
  });

  it("registers a batch and exports a deterministic registry without player-facing UI", () => {
    const registry = new ContentRegistry();
    generateContentSuiteBatch([
      baseInput,
      { ...baseInput, id: "obsidian-sprout", name: "Obsidian Sprout", kind: "block", gameplayRole: "plant", material: "crystal", element: "nature", seed: 2 },
    ]).forEach(bundle => registry.register(bundle));
    const exported = registry.export();
    expect(exported.contentGenerationUi).toBe(false);
    expect(exported.records).toHaveLength(2);
    expect(exported.registryHash).toHaveLength(64);
  });

  it("rejects component reference drift before registry registration", () => {
    const bundle = generateContentSuiteBundle(baseInput);
    const invalid = { ...bundle, definition: { ...bundle.definition, modelId: "model.missing" } };
    expect(validateContentSuiteBundle(invalid)).toContain("definition.modelId does not resolve to model.id");
    expect(() => new ContentRegistry().register(invalid)).toThrow("Cannot register");
  });
});
