import { describe, expect, it } from "vitest";
import { CommonGeneratorRegistry, GeneratorValidationError, type GeneratorAssetRef, type GeneratorPlugin } from "./generators/commonGeneratorApi";

type StructureInput = { biome: string; count: number };
type StructureRecord = { id: string; biome: string; assetId: string };

function makeStructureGenerator(assetRefs: GeneratorAssetRef[] = [{ assetId: "models.structure.placeholder", kind: "model", source: "starter-authored" }]): GeneratorPlugin<StructureInput, StructureRecord[]> {
  return {
    id: "structure-basic",
    version: "1.0.0",
    kind: "structure",
    generate: (input, context) => Array.from({ length: input.count }, (_, index) => ({
      id: `${context.seed}-${input.biome}-${index + 1}`,
      biome: input.biome,
      assetId: "models.structure.placeholder",
    })),
    validate: (output, input) => {
      const issues: string[] = [];
      if (output.length !== input.count) issues.push("generated count does not match input");
      if (output.some(record => record.biome !== input.biome)) issues.push("generated biome does not match input");
      if (output.some(record => !record.id || !record.assetId)) issues.push("generated record is missing an id or asset");
      return { valid: issues.length === 0, issues };
    },
    preview: output => ({
      recordCount: output.length,
      ids: output.map(record => record.id),
      assetRefs,
    }),
  };
}

describe("CommonGeneratorRegistry", () => {
  it("registers versions and resolves the latest version deterministically", () => {
    const registry = new CommonGeneratorRegistry();
    registry.register(makeStructureGenerator());
    registry.register({ ...makeStructureGenerator(), version: "1.1.0" });
    registry.register({ ...makeStructureGenerator(), version: "1.10.0" });

    expect(registry.versions("structure-basic")).toEqual(["1.0.0", "1.1.0", "1.10.0"]);
    expect(registry.version("structure-basic")).toBe("1.10.0");
  });

  it("generates the same content hash for the same input and seed", () => {
    const registry = new CommonGeneratorRegistry().register(makeStructureGenerator());
    const first = registry.generate<StructureInput, StructureRecord[]>("structure-basic", { biome: "obsidian", count: 2 }, { seed: "frontier-01", generatedAt: 100 });
    const second = registry.generate<StructureInput, StructureRecord[]>("structure-basic", { biome: "obsidian", count: 2 }, { seed: "frontier-01", generatedAt: 200 });
    const otherSeed = registry.generate<StructureInput, StructureRecord[]>("structure-basic", { biome: "obsidian", count: 2 }, { seed: "frontier-02" });

    expect(second.output).toEqual(first.output);
    expect(second.contentHash).toBe(first.contentHash);
    expect(otherSeed.contentHash).not.toBe(first.contentHash);
    expect(first.provenance.source).toBe("backend-generator");
  });

  it("creates a reusable preview with ids and asset references", () => {
    const registry = new CommonGeneratorRegistry().register(makeStructureGenerator());
    const artifact = registry.generate("structure-basic", { biome: "obsidian", count: 2 }, { seed: 7 });

    expect(registry.preview(artifact)).toMatchObject({
      kind: "structure",
      recordCount: 2,
      ids: ["7-obsidian-1", "7-obsidian-2"],
      assetRefs: [{ assetId: "models.structure.placeholder", kind: "model", source: "starter-authored" }],
    });
  });

  it("keeps a valid generated asset reference on the generated artifact", () => {
    const assetRefs: GeneratorAssetRef[] = [{
      assetId: "generated.structure.key-art",
      kind: "key-art",
      source: "generated",
      sha256: "a".repeat(64),
    }];
    const registry = new CommonGeneratorRegistry().register(makeStructureGenerator(assetRefs));
    const artifact = registry.generate("structure-basic", { biome: "obsidian", count: 1 }, { seed: "asset-safe" });

    expect(artifact.assetRefs).toEqual(assetRefs);
  });

  it("fails closed during generate when asset references are invalid", () => {
    const invalidAssetRefs: GeneratorAssetRef[] = [
      { assetId: "invalid.structure", kind: "model", source: "generated", sha256: "bad" },
      { assetId: "reference.structure", kind: "model", source: "reference-only" },
      { assetId: "invalid.structure", kind: "model", source: "starter-authored" },
    ];
    const registry = new CommonGeneratorRegistry().register(makeStructureGenerator(invalidAssetRefs));

    let caught: unknown;
    try {
      registry.generate("structure-basic", { biome: "obsidian", count: 1 }, { seed: "asset-invalid" });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GeneratorValidationError);
    expect((caught as GeneratorValidationError).issues).toEqual(expect.arrayContaining([
      "invalid asset sha256: invalid.structure",
      "reference-only asset needs provenanceRef: reference.structure",
      "duplicate asset reference: invalid.structure",
    ]));
  });

  it("validates before save/export and rejects a tampered artifact", () => {
    const registry = new CommonGeneratorRegistry().register(makeStructureGenerator());
    const artifact = registry.generate("structure-basic", { biome: "obsidian", count: 1 }, { seed: "safe" });
    const saved = registry.save(artifact, 123);

    expect(saved.savedAt).toBe(123);
    expect(JSON.parse(registry.export(artifact))).toMatchObject({ generatorId: "structure-basic", seed: "safe" });

    const tampered = { ...artifact, output: [{ id: "tampered", biome: "other", assetId: "models.structure.placeholder" }] };
    expect(registry.validate(tampered).valid).toBe(false);
    const invalidAsset = { ...artifact, assetRefs: [{ assetId: "reference.structure", kind: "model" as const, source: "reference-only" as const }] };
    expect(registry.validate(invalidAsset).issues).toContain("reference-only asset needs provenanceRef: reference.structure");
    expect(() => registry.save(tampered)).toThrow(GeneratorValidationError);
    expect(() => registry.export(tampered)).toThrow("Generator validation failed");
  });

  it("rejects malformed registrations and invalid generated output", () => {
    const registry = new CommonGeneratorRegistry();
    expect(() => registry.register({ ...makeStructureGenerator(), id: "Bad ID" })).toThrow("lowercase identifier");
    expect(() => registry.register({ ...makeStructureGenerator(), version: "v1" })).toThrow("semver");
    expect(() => registry.register(makeStructureGenerator())).not.toThrow();
    expect(() => registry.register(makeStructureGenerator())).toThrow("already registered");

    const invalidPlugin: GeneratorPlugin<StructureInput, StructureRecord[]> = {
      ...makeStructureGenerator(),
      id: "structure-invalid",
      generate: () => [],
    };
    registry.register(invalidPlugin);
    expect(() => registry.generate("structure-invalid", { biome: "obsidian", count: 1 }, { seed: "bad" })).toThrow(GeneratorValidationError);
  });
});
