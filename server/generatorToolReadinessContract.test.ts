import { describe, expect, it } from "vitest";
import {
  evaluateGeneratorToolReadiness,
  MAX_ARTIFACT_FORMATS,
  MAX_TOOL_DEPENDENCIES,
  type GeneratorToolReadinessInput,
} from "./generatorToolReadinessContract";

const baseInput: GeneratorToolReadinessInput = {
  id: "content-suite-generator",
  version: "1.0.0",
  kind: "content-suite",
  execution: "backend-only",
  developerOnly: true,
  playerInvokable: false,
  renderLoopInvokable: false,
  generateOnceStoreCacheReuse: true,
  contentHashRequired: true,
  provenanceRequired: true,
  assetMode: "metadata-only",
  artifactFormats: ["json", "preview-json"],
  dependencies: [
    { id: "asset-manifest", versionRange: "^1.0.0", purpose: "bind authored assets", required: true },
    { id: "common-generator-api", versionRange: "1.0.0", purpose: "create deterministic artifacts", required: true },
  ],
};

describe("generator tool readiness contract", () => {
  it("accepts a backend-only Generate Once → Store → Cache → Reuse tool", () => {
    const result = evaluateGeneratorToolReadiness(baseInput);

    expect(result).toMatchObject({
      contractVersion: "generator-tool-readiness.v1",
      ready: true,
      issues: [],
      normalized: {
        id: "content-suite-generator",
        version: "1.0.0",
        kind: "content-suite",
        execution: "backend-only",
        playerVisible: false,
        renderLoopInvokable: false,
        generateOnceStoreCacheReuse: true,
        contentHashRequired: true,
        provenanceRequired: true,
      },
    });
    expect(result.normalized.artifactFormats).toEqual(["json", "preview-json"]);
    expect(result.normalized.dependencies.map(dependency => dependency.id)).toEqual(["asset-manifest", "common-generator-api"]);
  });

  it("rejects player/render-loop execution and missing content safeguards", () => {
    const result = evaluateGeneratorToolReadiness({
      ...baseInput,
      execution: "player-runtime",
      developerOnly: false,
      playerInvokable: true,
      renderLoopInvokable: true,
      generateOnceStoreCacheReuse: false,
      contentHashRequired: false,
      provenanceRequired: false,
    });

    expect(result.ready).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "generator tool execution must be backend-only",
      "generator tool must be developerOnly",
      "generator tool cannot be playerInvokable",
      "generator tool cannot be renderLoopInvokable",
      "generator tool must use Generate Once → Store → Cache → Reuse",
      "generator tool must require contentHash",
      "generator tool must require provenance",
    ]));
  });

  it("rejects duplicate or malformed formats and dependencies", () => {
    const result = evaluateGeneratorToolReadiness({
      ...baseInput,
      artifactFormats: ["json", "json"],
      dependencies: [
        { id: "common-generator-api", versionRange: "latest", purpose: "first", required: true },
        { id: "common-generator-api", versionRange: "1.0.0", purpose: "duplicate", required: true },
      ],
    });

    expect(result.ready).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "duplicate artifact format: json",
      "duplicate dependency: common-generator-api",
      "dependency version range is invalid: common-generator-api",
    ]));
  });

  it("keeps normalization bounded and rejects invalid configuration", () => {
    expect(() => evaluateGeneratorToolReadiness({ ...baseInput, version: "v1" })).toThrow("version must use semver x.y.z");
    expect(() => evaluateGeneratorToolReadiness({ ...baseInput, artifactFormats: Array.from({ length: MAX_ARTIFACT_FORMATS + 1 }, (_, index) => `format-${index}`) })).toThrow("artifactFormats must contain at most 8 entries");
    expect(() => evaluateGeneratorToolReadiness({ ...baseInput, dependencies: Array.from({ length: MAX_TOOL_DEPENDENCIES + 1 }, (_, index) => ({ id: `dependency-${index}`, versionRange: "1.0.0", purpose: "bounded", required: true })) })).toThrow("dependencies must contain at most 16 entries");
    expect(() => evaluateGeneratorToolReadiness({ ...baseInput, artifactFormats: [" "] })).toThrow("artifactFormats[0] must not be empty");
  });
});
