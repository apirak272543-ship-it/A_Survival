import { describe, expect, it } from "vitest";
import {
  SCENE_MATERIAL_CONTRAST_DEFAULT_SAMPLE_RADIUS,
  SCENE_MATERIAL_CONTRAST_GRAPH_RULES_VERSION,
  buildSceneMaterialContrastDependencyGraph,
  getDefaultSceneMaterialContrastDependencyGraphInput,
} from "./generators/sceneMaterialContrastDependencyGraph";

describe("scene material contrast dependency graph", () => {
  it("audits stepped Obsidian terrain relief and active scene/profile sources", () => {
    const result = buildSceneMaterialContrastDependencyGraph(getDefaultSceneMaterialContrastDependencyGraphInput());

    expect(result.summary.terrain).toMatchObject({
      activeRenderer: "createPixelTerrainChunks",
      usesHeightSampler: true,
      usesNeighborHeightSideFaces: true,
      sampleRadius: SCENE_MATERIAL_CONTRAST_DEFAULT_SAMPLE_RADIUS,
      sampleCount: 4225,
      terrainAssetIds: ["terrain.ash", "terrain.obsidian"],
      flatLegacyHelperCaller: false,
      nonFlatReliefEvidence: true,
    });
    expect(result.summary.terrain.heightRange).toBeGreaterThan(0);
    expect(result.summary.terrain.uniqueHeightCount).toBeGreaterThan(1);
    expect(result.summary.terrain.positiveReliefStepCount).toBeGreaterThan(0);
    expect(result.summary.mapProfile).toMatchObject({ sceneTreatmentPresent: true, biomeVisualProfilePresent: true, terrainFamilyCount: 2, landmarkCount: 2, allAssetsReferenceOnly: true });
    expect(result.graph.valid).toBe(false);
  });

  it("keeps player, pet, and enemy palette bindings distinct and readable against terrain", () => {
    const result = buildSceneMaterialContrastDependencyGraph();
    const readability = result.summary.actorReadability;

    expect(readability.paletteBindings).toEqual([
      { role: "player", paletteKey: "violet", hex: "#8057d8", assetId: "voxel/survivor-v1" },
      { role: "pet", paletteKey: "cyan", hex: "#5ff4ed", assetId: "voxel/cyber-fox-v1" },
      { role: "enemy", paletteKey: "crimson", hex: "#ef476f", assetId: "voxel/corrupted-husk-v1" },
    ]);
    expect(readability.playerPetEnemyHaveDistinctPaletteBindings).toBe(true);
    expect(readability.readableAgainstAtLeastOneTerrain).toEqual({ player: true, pet: true, enemy: true });
    expect(readability.actorEmissiveWithinCap).toBe(true);
    expect(Object.values(readability.maximumContrastByRole).every(value => value >= 1.25)).toBe(true);
  });

  it("audits bounded glow, base-color, lighting, and fog inputs without claiming screenshot proof", () => {
    const result = buildSceneMaterialContrastDependencyGraph();
    const materialLighting = result.summary.materialLighting;

    expect(materialLighting).toMatchObject({
      terrainTextureEmissive: { r: 0.025, g: 0.03, b: 0.035 },
      actorTextureEmissive: { r: 0.08, g: 0.08, b: 0.08 },
      sceneBlockMaterialEmissive: 0.08,
      sceneFarmMaterialEmissive: 0.05,
      decorationEmissiveValues: [0.16, 0.18],
      maximumDecorationEmissive: 0.18,
      decorationEmissiveWithinCap: true,
      fogDensityInput: 0.07,
      appliedFogDensity: 0.007700000000000001,
      glowDoesNotReplaceBaseColor: true,
    });
    expect(materialLighting.skyLightIntensity).toBeCloseTo(0.87);
    expect(materialLighting.keyLightIntensity).toBe(1.25);
    expect(result.summary.policy).toEqual({ visualContrastAuditOnly: true, runtimeImportAllowed: false, playerVisible: false, cacheable: false, binaryAssetsCreated: false, runtimeSceneMutated: false });
  });

  it("records missing screenshot/camera acceptance owners as required blockers", () => {
    const result = buildSceneMaterialContrastDependencyGraph();

    expect(result.summary.owners).toEqual({ sceneMaterialSource: true, sceneLightingSource: true, terrainReliefSource: true, pixelPaletteSource: true, mapVisualProfileSource: true, runtimeScreenshotAcceptance: false, cameraModeContrastAcceptance: false });
    expect(result.summary.blockerCodes).toEqual(["visual-runtime-screenshot-owner-missing", "camera-mode-contrast-acceptance-missing"]);
    expect(result.graph.issues.filter(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toHaveLength(2);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("is deterministic and rejects future maps, invalid rules, and unbounded sample radii fail-closed", () => {
    const input = getDefaultSceneMaterialContrastDependencyGraphInput();
    const first = buildSceneMaterialContrastDependencyGraph(input);
    const second = buildSceneMaterialContrastDependencyGraph(input);
    const changed = buildSceneMaterialContrastDependencyGraph({ ...input, sampleRadius: input.sampleRadius! + 1 });

    expect(first).toEqual(second);
    expect(first.artifact.contentHash).not.toBe(changed.artifact.contentHash);
    expect(() => buildSceneMaterialContrastDependencyGraph({ mapId: "map-002-ashen-obsidian-plains" })).toThrow(/Only obsidian-frontier/);
    expect(() => buildSceneMaterialContrastDependencyGraph({ rulesVersion: "future-rules" })).toThrow(/Unsupported/);
    expect(() => buildSceneMaterialContrastDependencyGraph({ sampleRadius: 0 })).toThrow(/bounded integer/);
    expect(() => buildSceneMaterialContrastDependencyGraph({ sampleRadius: 1.5 })).toThrow(/bounded integer/);
    expect(() => buildSceneMaterialContrastDependencyGraph({ sampleRadius: 65 })).toThrow(/bounded integer/);
    expect(() => buildSceneMaterialContrastDependencyGraph({ rulesVersion: SCENE_MATERIAL_CONTRAST_GRAPH_RULES_VERSION, sampleRadius: Number.MAX_SAFE_INTEGER })).toThrow(/bounded integer/);
  });
});
