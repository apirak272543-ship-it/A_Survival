import { describe, expect, it } from "vitest";
import {
  PLAYABLE_CREATOR_PACKAGE_MAP_ID,
  REQUIRED_CONTENT_GENERATION_CAPABILITIES,
  type ContentGenerationCapability,
  type ContentGenerationSuitePlugin,
  validateContentGenerationSuite,
} from "./generators/contentGenerationSuiteContract";

function plugin(capability: string, id = `generator.${capability}`): ContentGenerationSuitePlugin {
  return {
    id,
    version: "1.0.0",
    kind: capability === "texture" ? "texture" : capability === "model" ? "other" : "other",
    capabilities: [capability],
    provenanceRefs: [`source.${id}`],
    source: "backend-generator",
    runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
  };
}

function completePlugins() {
  return REQUIRED_CONTENT_GENERATION_CAPABILITIES.map(capability => plugin(capability));
}

describe("content generation suite contract", () => {
  it("accepts a complete, provenance-backed suite as reviewable metadata", () => {
    const result = validateContentGenerationSuite({ suiteId: "content.suite", suiteVersion: "1.0.0", plugins: completePlugins() });

    expect(result).toMatchObject({
      artifact: { suiteId: "content.suite", suiteVersion: "1.0.0", pluginCount: 6, capabilityCount: 6 },
      summary: { pluginCount: 6, requiredCapabilityCount: 6, coveredCapabilityCount: 6, missingCapabilities: [], provenanceCompletePluginCount: 6, runtimeSafePluginCount: 6, issueCount: 0, valid: true },
      reasons: [],
      runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
    });
    expect(result.artifact.declarationHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reports missing capabilities instead of treating partial coverage as complete", () => {
    const result = validateContentGenerationSuite({ suiteId: "content.suite", suiteVersion: "1.0.0", plugins: [plugin("definition")] });

    expect(result.summary.coveredCapabilityCount).toBe(1);
    expect(result.summary.missingCapabilities).toEqual(["model", "texture", "skin", "variant", "gameplay"] satisfies ContentGenerationCapability[]);
    expect(result.summary.valid).toBe(false);
    expect(result.reasons.filter(reason => reason.code === "MISSING_CAPABILITY")).toHaveLength(5);
  });

  it("blocks duplicate, malformed, unknown, unprovenanced and runtime-enabled plugins", () => {
    const malformed: ContentGenerationSuitePlugin = {
      ...plugin("definition", "Bad Plugin"),
      version: "v1",
      capabilities: ["definition", "unknown"],
      provenanceRefs: [],
      source: "reference-only",
      runtimePolicy: { runtimeImportAllowed: true, playerVisible: false, cacheable: false },
    };
    const result = validateContentGenerationSuite({
      suiteId: "Bad Suite",
      suiteVersion: "v1",
      plugins: [malformed, malformed],
    });

    expect(result.summary.valid).toBe(false);
    expect(result.reasons.map(reason => reason.code)).toEqual(expect.arrayContaining([
      "INVALID_SUITE_ID",
      "INVALID_SUITE_VERSION",
      "INVALID_PLUGIN_ID",
      "INVALID_PLUGIN_VERSION",
      "DUPLICATE_PLUGIN_ID",
      "UNKNOWN_CAPABILITY",
      "PLUGIN_PROVENANCE_MISSING",
      "RUNTIME_POLICY_ENABLED",
      "MISSING_CAPABILITY",
    ]));
  });

  it("produces the same declaration hash for the same suite and changes it when a declaration changes", () => {
    const first = validateContentGenerationSuite({ suiteId: "content.suite", suiteVersion: "1.0.0", plugins: completePlugins() });
    const second = validateContentGenerationSuite({ suiteId: "content.suite", suiteVersion: "1.0.0", plugins: completePlugins() });
    const changed = validateContentGenerationSuite({ suiteId: "content.suite", suiteVersion: "1.0.0", plugins: completePlugins().map((entry, index) => index === 0 ? { ...entry, version: "1.1.0" } : entry) });

    expect(second).toEqual(first);
    expect(changed.artifact.declarationHash).not.toBe(first.artifact.declarationHash);
  });

  it("keeps oversized suite declarations bounded and preview-only", () => {
    const plugins = Array.from({ length: 65 }, (_, index) => plugin("definition", `generator.${index}`));
    const result = validateContentGenerationSuite({ suiteId: "content.suite", suiteVersion: "1.0.0", plugins });

    expect(result.artifact.pluginCount).toBe(64);
    expect(result.reasons).toEqual(expect.arrayContaining([{ code: "PLUGIN_BOUNDS_EXCEEDED", detail: "suite accepts at most 64 plugin declarations" }]));
    expect(result.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(result.artifact.suiteId).not.toBe(PLAYABLE_CREATOR_PACKAGE_MAP_ID);
  });
});
