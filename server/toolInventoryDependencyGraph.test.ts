import { describe, expect, it } from "vitest";
import {
  TOOL_INVENTORY_MAX_SAMPLE_COUNT,
  buildToolInventoryDependencyGraph,
  buildToolInventoryDependencyGraphFromSources,
  readActiveToolInventorySources,
  type BackendGeneratorToolSource,
  type RuntimeDataHelperSource,
} from "./generators/toolInventoryDependencyGraph";

describe("tool inventory dependency graph", () => {
  it("audits registered backend generators and the canonical runtime data helper", () => {
    const first = buildToolInventoryDependencyGraph({ seed: "o04-canonical", sampleCount: 6 });
    const second = buildToolInventoryDependencyGraph({ seed: "o04-canonical", sampleCount: 6 });

    expect(first.summary).toMatchObject({
      backendGeneratorCount: 6,
      sampledBackendGeneratorCount: 6,
      runtimeDataHelperCount: 1,
      uniqueToolIdCount: 6,
      registeredGeneratorCount: 6,
      generateHookCount: 6,
      validateHookCount: 6,
      previewHookCount: 6,
      backendOnlyCount: 6,
      runtimeCallerCount: 0,
      playerVisibleCount: 0,
      cacheWriteCount: 0,
      databaseWriteCount: 0,
      binaryWriteCount: 0,
      runtimePublishCount: 0,
      toolIds: ["animation.profile", "content.catalog", "item.universal", "quest.progression", "structure.placement", "texture.pack"],
      helperPaths: ["client/src/game/tools/plantCatalogGenerator.ts"],
      issueCounts: {},
      dependencyPolicy: {
        backendGeneratorsMustBeRegistered: true,
        backendGeneratorsGenerateOnce: true,
        previewsAreReadOnly: true,
        runtimeImportsAreClosed: true,
        playerUiExposureIsClosed: true,
        cacheWritesAreClosed: true,
        databaseWritesAreClosed: true,
        binaryWritesAreClosed: true,
        runtimePublishIsClosed: true,
        runtimeDataHelpersAreMetadataOnly: true,
        outputIsAuditOnly: true,
      },
    });
    expect(first.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.graph.valid).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("keeps the canonical runtime data helper explicit and metadata-only", () => {
    const source = readActiveToolInventorySources();
    const helper = source.runtimeDataHelpers[0]!;
    expect(helper).toMatchObject({
      toolId: "plant-catalog-runtime-data",
      sourcePath: "client/src/game/tools/plantCatalogGenerator.ts",
      callers: ["client/src/game/systems/worldFarmSystem.ts", "client/src/game/scene.ts"],
      classification: "canonical-runtime-data-helper",
      generatedOnce: false,
      playerVisible: false,
      cacheWriteAllowed: false,
      databaseWriteAllowed: false,
      binaryWriteAllowed: false,
      runtimePublishAllowed: false,
    });
  });

  it("turns unregistered, runtime-called, player-visible, writable, and non-deterministic tool flags into blockers", () => {
    const source = readActiveToolInventorySources();
    const original = source.backendGenerators[0]!;
    const unsafe: BackendGeneratorToolSource = {
      ...original,
      toolId: "Unsafe Tool",
      registryVersions: [],
      runtimeCallers: ["client/src/pages/ArcaneFrontier.tsx"],
      generatedOnce: false,
      previewReadOnly: false,
      runtimeImportAllowed: true,
      playerVisible: true,
      cacheWriteAllowed: true,
      databaseWriteAllowed: true,
      binaryWriteAllowed: true,
      runtimePublishAllowed: true,
    };
    const unsafeHelper: RuntimeDataHelperSource = {
      ...source.runtimeDataHelpers[0]!,
      toolId: "unsafe-runtime-helper",
      callers: [],
      playerVisible: true as never,
    };
    const output = buildToolInventoryDependencyGraphFromSources(
      { seed: "o04-invalid", sampleCount: 2 },
      { backendGenerators: [original, unsafe], runtimeDataHelpers: [unsafeHelper] },
    );

    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts["tool-id-invalid"]).toBe(1);
    expect(output.summary.issueCounts["registry-missing"]).toBe(1);
    expect(output.summary.issueCounts["registry-version-mismatch"]).toBe(1);
    expect(output.summary.issueCounts["runtime-caller"]).toBe(1);
    expect(output.summary.issueCounts["generated-once-false"]).toBe(1);
    expect(output.summary.issueCounts["preview-not-readonly"]).toBe(1);
    expect(output.summary.issueCounts["runtime-import-allowed"]).toBe(1);
    expect(output.summary.issueCounts["player-visible"]).toBe(1);
    expect(output.summary.issueCounts["cache-write-allowed"]).toBe(1);
    expect(output.summary.issueCounts["database-write-allowed"]).toBe(1);
    expect(output.summary.issueCounts["binary-write-allowed"]).toBe(1);
    expect(output.summary.issueCounts["runtime-publish-allowed"]).toBe(1);
    expect(output.summary.issueCounts["helper-caller-missing"]).toBe(1);
    expect(output.summary.issueCounts["helper-boundary-violation"]).toBe(1);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("detects duplicate tool IDs without changing the source truth", () => {
    const source = readActiveToolInventorySources();
    const duplicate = { ...source.backendGenerators[1]! };
    const output = buildToolInventoryDependencyGraphFromSources(
      { seed: "o04-duplicate", sampleCount: 1 },
      { backendGenerators: [source.backendGenerators[0]!, duplicate, source.backendGenerators[1]!], runtimeDataHelpers: [] },
    );

    expect(output.summary.backendGeneratorCount).toBe(3);
    expect(output.summary.sampledBackendGeneratorCount).toBe(1);
    expect(output.summary.uniqueToolIdCount).toBe(2);
    expect(output.summary.issueCounts["duplicate-tool-id"]).toBe(1);
    expect(output.graph.valid).toBe(false);
  });

  it("changes the artifact hash when inventory metadata changes and rejects invalid bounds", () => {
    const source = readActiveToolInventorySources();
    const original = buildToolInventoryDependencyGraphFromSources({ seed: "o04-hash", sampleCount: 2 }, source);
    const changed = buildToolInventoryDependencyGraphFromSources(
      { seed: "o04-hash", sampleCount: 2 },
      { ...source, runtimeDataHelpers: source.runtimeDataHelpers.map(helper => ({ ...helper, callers: [...helper.callers, "server/audit.ts"] })) },
    );
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildToolInventoryDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildToolInventoryDependencyGraph({ seed: "o04", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildToolInventoryDependencyGraph({ seed: "o04", sampleCount: TOOL_INVENTORY_MAX_SAMPLE_COUNT + 1 })).toThrow(/sampleCount/);
  });

  it("keeps partial sampling bounded while retaining the full inventory count", () => {
    const output = buildToolInventoryDependencyGraph({ seed: "o04-partial", sampleCount: 2 });
    expect(output.summary.backendGeneratorCount).toBe(6);
    expect(output.summary.sampledBackendGeneratorCount).toBe(2);
    expect(output.graph.nodes).toHaveLength(3);
  });
});
