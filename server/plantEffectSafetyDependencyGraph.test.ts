import { describe, expect, it } from "vitest";
import { getBlockDefinition, type BlockDefinition } from "../client/src/game/data/blockModules";
import { generateWorldPlantCatalog, type WorldPlantDefinition } from "../client/src/game/tools/plantCatalogGenerator";
import {
  OBSIDIAN_CACTUS_BLOCK_ID,
  PLANT_EFFECT_SAFETY_MAX_REPEL_DURATION_MS,
  buildPlantEffectSafetyDependencyGraph,
  buildPlantEffectSafetyDependencyGraphFromSources,
  readActivePlantEffectSafetySources,
} from "./generators/plantEffectSafetyDependencyGraph";

describe("plant effect safety dependency graph", () => {
  it("audits the canonical 300-plant catalog and cactus thorn contract deterministically", () => {
    const first = buildPlantEffectSafetyDependencyGraph({ seed: "f04-canonical", sampleCount: 300 });
    const second = buildPlantEffectSafetyDependencyGraph({ seed: "f04-canonical", sampleCount: 300 });

    expect(first.summary).toMatchObject({
      catalogCount: 300,
      sampleCount: 300,
      uniquePlantIdCount: 300,
      validRecordCount: 300,
      invalidRecordCount: 0,
      effectCount: 120,
      cactusHazardCount: 1,
      maxObservedRestoreAmount: 5,
      maxObservedRepelRadius: 6,
      maxObservedRepelDurationMs: PLANT_EFFECT_SAFETY_MAX_REPEL_DURATION_MS,
      maxObservedCactusDamage: 6,
    });
    expect(first.summary.effectKindCounts).toEqual({ repel: 60, restore: 60, none: 180 });
    expect(first.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary.issueCounts).toEqual({});
    expect(first.graph.valid).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("keeps the source effect model bounded, fictional, non-lethal, and non-stackable", () => {
    const sources = readActivePlantEffectSafetySources();
    const effects = sources.plants.map(plant => plant.effect).filter(Boolean);
    expect(effects.every(effect => effect!.kind === "repel" || effect!.kind === "restore")).toBe(true);
    expect(effects.filter(effect => effect!.kind === "repel").every(effect => effect!.radius <= 6 && effect!.durationMs <= 30_000 && effect!.stackable === false && effect!.label.includes("ไม่ทำลาย"))).toBe(true);
    expect(effects.filter(effect => effect!.kind === "restore").every(effect => effect!.amount <= 12 && effect!.cap <= 12 && effect!.label.includes("สมมติ"))).toBe(true);
    expect(sources.cactus).toMatchObject({ id: OBSIDIAN_CACTUS_BLOCK_ID, kind: "plant", collisionShape: "thin", hazard: { damage: 6, cooldownSeconds: 0.5, affects: "all" } });
  });

  it("turns unsafe restore/repel and cactus variants into required blockers", () => {
    const sources = readActivePlantEffectSafetySources();
    const basePlant = sources.plants[0]!;
    const unsafeRepel: WorldPlantDefinition = {
      ...basePlant,
      id: "plant-unsafe-repel",
      effect: { kind: "repel", radius: 99, durationMs: 60_000, stackable: true, label: "ฆ่ามอนสเตอร์ถาวร" },
    } as WorldPlantDefinition;
    const unsafeRestore: WorldPlantDefinition = {
      ...basePlant,
      id: "plant-unsafe-restore",
      effect: { kind: "restore", amount: 99, cap: 99, label: "รักษาได้จริง" },
    } as WorldPlantDefinition;
    const unsafeCactus: BlockDefinition = {
      ...getBlockDefinition(OBSIDIAN_CACTUS_BLOCK_ID)!,
      hazard: { damage: 99, cooldownSeconds: 0, affects: "player" },
      collisionShape: "full",
    };
    const output = buildPlantEffectSafetyDependencyGraphFromSources(
      { seed: "f04-invalid", sampleCount: 300 },
      { plants: [unsafeRepel, unsafeRestore], cactus: unsafeCactus },
    );

    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts["repel-radius-invalid"]).toBe(1);
    expect(output.summary.issueCounts["repel-duration-invalid"]).toBe(1);
    expect(output.summary.issueCounts["repel-stackable"]).toBe(1);
    expect(output.summary.issueCounts["repel-label-disclosure"]).toBe(1);
    expect(output.summary.issueCounts["restore-amount-invalid"]).toBe(1);
    expect(output.summary.issueCounts["restore-cap-invalid"]).toBe(1);
    expect(output.summary.issueCounts["restore-label-disclosure"]).toBe(1);
    expect(output.summary.issueCounts["cactus-collision-invalid"]).toBe(1);
    expect(output.summary.issueCounts["cactus-damage-invalid"]).toBe(1);
    expect(output.summary.issueCounts["cactus-cooldown-invalid"]).toBe(1);
    expect(output.summary.issueCounts["cactus-affects-invalid"]).toBe(1);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("detects duplicate IDs, unsupported effect kinds, missing cactus hazards, and wrong cactus identity", () => {
    const sources = readActivePlantEffectSafetySources();
    const duplicate: WorldPlantDefinition = { ...sources.plants[0]!, effect: undefined };
    const unsupported: WorldPlantDefinition = { ...sources.plants[1]!, id: "plant-unsupported", effect: { kind: "damage", power: 3 } as never };
    const wrongCactus = { ...sources.cactus!, id: "flora.future.thorn-cactus", hazard: undefined };
    const output = buildPlantEffectSafetyDependencyGraphFromSources(
      { seed: "f04-identity", sampleCount: 2 },
      { plants: [sources.plants[0]!, duplicate, unsupported], cactus: wrongCactus },
    );

    expect(output.summary.uniquePlantIdCount).toBe(2);
    expect(output.summary.issueCounts["duplicate-plant-id"]).toBe(1);
    expect(output.summary.issueCounts["unsupported-effect-kind"]).toBe(1);
    expect(output.summary.issueCounts["cactus-block-id-mismatch"]).toBe(1);
    expect(output.summary.issueCounts["cactus-hazard-missing"]).toBe(1);
    expect(output.graph.valid).toBe(false);
  });

  it("changes the artifact hash when the seed or bounded source changes", () => {
    const sources = readActivePlantEffectSafetySources();
    const original = buildPlantEffectSafetyDependencyGraph({ seed: "f04-hash", sampleCount: 3 });
    const differentSeed = buildPlantEffectSafetyDependencyGraph({ seed: "f04-hash-2", sampleCount: 3 });
    const differentSource = buildPlantEffectSafetyDependencyGraphFromSources(
      { seed: "f04-hash", sampleCount: 3 },
      { ...sources, plants: [{ ...sources.plants[0]!, name: `${sources.plants[0]!.name} altered` }, ...sources.plants.slice(1)] },
    );

    expect(differentSeed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(differentSource.artifact.contentHash).not.toBe(original.artifact.contentHash);
  });

  it("rejects unsupported rules, empty catalogs, invalid samples, and unbounded source inputs", () => {
    expect(() => buildPlantEffectSafetyDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildPlantEffectSafetyDependencyGraph({ seed: "f04", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildPlantEffectSafetyDependencyGraph({ seed: "f04", sampleCount: 301 })).toThrow(/sampleCount/);
    expect(() => buildPlantEffectSafetyDependencyGraphFromSources({ seed: "f04", sampleCount: 1 }, { plants: [] })).not.toThrow();
    expect(() => buildPlantEffectSafetyDependencyGraphFromSources({ seed: "f04", sampleCount: 1 }, { plants: generateWorldPlantCatalog().slice(0, 1) })).not.toThrow();
  });
});
