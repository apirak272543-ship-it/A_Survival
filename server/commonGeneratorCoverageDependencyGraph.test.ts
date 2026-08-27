import { describe, expect, it } from "vitest";
import {
  COMMON_GENERATOR_COVERAGE_MAX_PLUGIN_COUNT,
  buildCommonGeneratorCoverageDependencyGraph,
  buildCommonGeneratorCoverageDependencyGraphFromSources,
  readActiveCommonGeneratorSources,
  type CommonGeneratorPluginSource,
} from "./generators/commonGeneratorCoverageDependencyGraph";

describe("common generator coverage dependency graph", () => {
  it("audits all active generator domains through the shared registry contract", () => {
    const first = buildCommonGeneratorCoverageDependencyGraph({ seed: "t04-canonical", sampleCount: 6 });
    const second = buildCommonGeneratorCoverageDependencyGraph({ seed: "t04-canonical", sampleCount: 6 });

    expect(first.summary).toMatchObject({
      pluginCount: 6,
      sampleCount: 6,
      uniquePluginIdCount: 6,
      registeredPluginCount: 6,
      previewPluginCount: 6,
      generatePluginCount: 6,
      validatePluginCount: 6,
      kindCounts: { animation: 1, item: 2, quest: 1, structure: 1, texture: 1 },
      domainCounts: { animation: 1, content: 1, quest: 1, structure: 1, texture: 1, item: 1 },
      issueCounts: {},
      runtimePolicy: { generatedOnce: true, cacheReuseAllowed: true, playerVisible: false, runtimeImportAllowed: false, runtimePublishAllowed: false },
    });
    expect(first.summary.sourcePaths).toEqual([
      "server/generators/animationProfileGenerator.ts",
      "server/generators/contentCatalogGenerator.ts",
      "server/generators/questProgressionGenerator.ts",
      "server/generators/structureGenerator.ts",
      "server/generators/texturePackBuilder.ts",
      "server/generators/universalItemEngine.ts",
    ]);
    expect(first.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.graph.valid).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("confirms every active plugin has generate, validate, preview, semver, and registry identity", () => {
    const sources = readActiveCommonGeneratorSources();
    expect(sources.plugins).toHaveLength(6);
    for (const source of sources.plugins) {
      expect(source.plugin.id).toMatch(/^[a-z0-9][a-z0-9.-]{2,63}$/);
      expect(source.plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(source.registryVersions).toContain(source.plugin.version);
      expect(typeof source.plugin.generate).toBe("function");
      expect(typeof source.plugin.validate).toBe("function");
      expect(typeof source.plugin.preview).toBe("function");
    }
  });

  it("turns invalid identity, version, registry, kind, and missing preview contracts into blockers", () => {
    const sources = readActiveCommonGeneratorSources();
    const original = sources.plugins[0]!;
    const invalid = {
      ...original,
      plugin: { ...original.plugin, id: "INVALID ID", version: "v1", kind: "unsupported" as never, preview: undefined },
      registryVersions: [],
    } satisfies CommonGeneratorPluginSource;
    const output = buildCommonGeneratorCoverageDependencyGraphFromSources(
      { seed: "t04-invalid", sampleCount: 1 },
      { plugins: [original, invalid] },
    );

    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts["invalid-plugin-id"]).toBe(1);
    expect(output.summary.issueCounts["invalid-version"]).toBe(1);
    expect(output.summary.issueCounts["registry-version-mismatch"]).toBe(1);
    expect(output.summary.issueCounts["registry-version-missing"]).toBe(1);
    expect(output.summary.issueCounts["unsupported-kind"]).toBe(1);
    expect(output.summary.issueCounts["preview-missing"]).toBe(1);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("detects duplicate plugin IDs and keeps a bounded sample separate from full source audit", () => {
    const sources = readActiveCommonGeneratorSources();
    const duplicate = { ...sources.plugins[1]! };
    const output = buildCommonGeneratorCoverageDependencyGraphFromSources(
      { seed: "t04-duplicate", sampleCount: 1 },
      { plugins: [sources.plugins[0]!, duplicate, sources.plugins[1]!] },
    );

    expect(output.summary.pluginCount).toBe(3);
    expect(output.summary.sampleCount).toBe(1);
    expect(output.summary.uniquePluginIdCount).toBe(2);
    expect(output.summary.issueCounts["duplicate-plugin-id"]).toBe(1);
    expect(output.graph.valid).toBe(false);
  });

  it("changes the artifact hash when source metadata changes and rejects invalid bounds", () => {
    const sources = readActiveCommonGeneratorSources();
    const original = buildCommonGeneratorCoverageDependencyGraphFromSources({ seed: "t04-hash", sampleCount: 2 }, sources);
    const changed = buildCommonGeneratorCoverageDependencyGraphFromSources(
      { seed: "t04-hash", sampleCount: 2 },
      { plugins: sources.plugins.map((source, index) => index === 0 ? { ...source, sourcePath: `${source.sourcePath}.changed` } : source) },
    );
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildCommonGeneratorCoverageDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildCommonGeneratorCoverageDependencyGraph({ seed: "t04", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildCommonGeneratorCoverageDependencyGraph({ seed: "t04", sampleCount: COMMON_GENERATOR_COVERAGE_MAX_PLUGIN_COUNT + 1 })).toThrow(/sampleCount/);
  });

  it("keeps an audit-only output bounded when the caller requests a partial sample", () => {
    const output = buildCommonGeneratorCoverageDependencyGraph({ seed: "t04-partial", sampleCount: 2 });
    expect(output.summary.pluginCount).toBe(6);
    expect(output.summary.sampleCount).toBe(2);
    expect(output.graph.nodes).toHaveLength(3);
  });
});
