import { createHash } from "node:crypto";

export const COMMON_GENERATOR_SCHEMA_VERSION = "a-survival.generator-artifact.v1" as const;

export type GeneratorSeed = string | number;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type GeneratorKind =
  | "world"
  | "biome"
  | "structure"
  | "item"
  | "plant"
  | "mob"
  | "animation"
  | "texture"
  | "quest"
  | "dungeon"
  | "loot"
  | "crafting"
  | "economy"
  | "audio"
  | "weather"
  | "vegetation"
  | "simulation"
  | "migration"
  | "other";

export type GeneratorAssetRef = {
  assetId: string;
  kind: "texture" | "model" | "animation" | "audio" | "icon" | "key-art" | "other";
  source: "generated" | "starter-authored" | "provided" | "reference-only";
  relativePath?: string;
  sha256?: string;
  license?: string;
  provenanceRef?: string;
};

export type GeneratorInput = JsonValue;
export type GeneratorOutput = JsonValue;

export type GeneratorContext = {
  generatorId: string;
  generatorVersion: string;
  seed: string;
};

export type GeneratorValidationResult = {
  valid: boolean;
  issues: string[];
};

export type GeneratorPreview = {
  generatorId: string;
  generatorVersion: string;
  kind: GeneratorKind;
  contentHash: string;
  outputType: "array" | "object" | "primitive";
  recordCount: number;
  ids: string[];
  assetRefs: GeneratorAssetRef[];
};

export type GeneratorProvenance = {
  generatorId: string;
  generatorVersion: string;
  seed: string;
  source: "backend-generator";
  generatedAt: number;
};

export type GeneratorArtifact<I extends GeneratorInput = GeneratorInput, O extends GeneratorOutput = GeneratorOutput> = {
  schemaVersion: typeof COMMON_GENERATOR_SCHEMA_VERSION;
  generatorId: string;
  generatorVersion: string;
  kind: GeneratorKind;
  seed: string;
  input: I;
  output: O;
  assetRefs: GeneratorAssetRef[];
  contentHash: string;
  provenance: GeneratorProvenance;
};

export type SavedGeneratorArtifact<I extends GeneratorInput = GeneratorInput, O extends GeneratorOutput = GeneratorOutput> = {
  artifact: GeneratorArtifact<I, O>;
  savedAt: number;
};

export type GeneratorPlugin<I extends GeneratorInput = GeneratorInput, O extends GeneratorOutput = GeneratorOutput> = {
  id: string;
  version: string;
  kind: GeneratorKind;
  generate: (input: I, context: GeneratorContext) => O;
  validate: (output: O, input: I) => GeneratorValidationResult;
  preview?: (output: O) => Pick<GeneratorPreview, "recordCount" | "ids" | "assetRefs">;
};

export class GeneratorValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Generator validation failed: ${issues.join("; ")}`);
    this.name = "GeneratorValidationError";
  }
}

function assertValidIdentifier(value: string, field: string) {
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(value)) {
    throw new Error(`${field} must use a lowercase identifier with 2–64 characters`);
  }
}

function compareVersions(left: string, right: string) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
  }
  return 0;
}

function validateAssetRefs(assetRefs: GeneratorAssetRef[]) {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const asset of assetRefs) {
    if (!asset.assetId) issues.push("asset reference is missing assetId");
    if (ids.has(asset.assetId)) issues.push(`duplicate asset reference: ${asset.assetId}`);
    ids.add(asset.assetId);
    if (asset.sha256 && !/^[a-f0-9]{64}$/.test(asset.sha256)) issues.push(`invalid asset sha256: ${asset.assetId}`);
    if (asset.source === "reference-only" && !asset.provenanceRef) issues.push(`reference-only asset needs provenanceRef: ${asset.assetId}`);
  }
  return issues;
}

function normalizeSeed(seed: GeneratorSeed) {
  const normalized = String(seed);
  if (!normalized || normalized.length > 128) throw new Error("Generator seed must be 1–128 characters");
  return normalized;
}

export function stableStringify(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key]!)}`).join(",")}}`;
}

export function hashStableJson(value: JsonValue) {
  return createHash("sha256").update(stableStringify(value), "utf8").digest("hex");
}

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectIds(value: JsonValue): string[] {
  if (!Array.isArray(value)) return isObject(value) && typeof value.id === "string" ? [value.id] : [];
  return value
    .filter(isObject)
    .map(record => record.id)
    .filter((id): id is string => typeof id === "string")
    .slice(0, 100);
}

function defaultPreview(output: GeneratorOutput): Pick<GeneratorPreview, "recordCount" | "ids" | "assetRefs"> {
  return {
    recordCount: Array.isArray(output) ? output.length : 1,
    ids: collectIds(output),
    assetRefs: [],
  };
}

function outputType(output: GeneratorOutput): GeneratorPreview["outputType"] {
  if (Array.isArray(output)) return "array";
  if (isObject(output)) return "object";
  return "primitive";
}

function combineIssues(...results: GeneratorValidationResult[]) {
  const issues = results.flatMap(result => result.issues);
  return { valid: issues.length === 0, issues };
}

export function calculateGeneratorContentHash(input: {
  generatorId: string;
  generatorVersion: string;
  kind: GeneratorKind;
  seed: string;
  input: GeneratorInput;
  output: GeneratorOutput;
  assetRefs: GeneratorAssetRef[];
}) {
  const canonicalPayload = {
    schemaVersion: COMMON_GENERATOR_SCHEMA_VERSION,
    generatorId: input.generatorId,
    generatorVersion: input.generatorVersion,
    kind: input.kind,
    seed: input.seed,
    input: input.input,
    output: input.output,
    assetRefs: input.assetRefs,
  };
  return hashStableJson(canonicalPayload as unknown as JsonValue);
}

export class CommonGeneratorRegistry {
  private readonly plugins = new Map<string, Map<string, GeneratorPlugin>>();

  register<I extends GeneratorInput, O extends GeneratorOutput>(plugin: GeneratorPlugin<I, O>) {
    assertValidIdentifier(plugin.id, "generator id");
    if (!/^\d+\.\d+\.\d+$/.test(plugin.version)) throw new Error("Generator version must use semver x.y.z");
    const versions = this.plugins.get(plugin.id) ?? new Map<string, GeneratorPlugin>();
    if (versions.has(plugin.version)) throw new Error(`Generator version already registered: ${plugin.id}@${plugin.version}`);
    versions.set(plugin.version, plugin as unknown as GeneratorPlugin);
    this.plugins.set(plugin.id, versions);
    return this;
  }

  version(generatorId: string) {
    const versions = this.plugins.get(generatorId);
    if (!versions) return undefined;
    const sortedVersions = Array.from(versions.keys()).sort(compareVersions);
    return sortedVersions[sortedVersions.length - 1];
  }

  versions(generatorId: string) {
    return Array.from(this.plugins.get(generatorId)?.keys() ?? []).sort(compareVersions);
  }

  private resolve(generatorId: string, requestedVersion?: string) {
    const versions = this.plugins.get(generatorId);
    if (!versions) throw new Error(`Unknown generator: ${generatorId}`);
    const version = requestedVersion ?? this.version(generatorId);
    if (!version) throw new Error(`Generator has no registered version: ${generatorId}`);
    const plugin = versions.get(version);
    if (!plugin) throw new Error(`Unknown generator version: ${generatorId}@${version}`);
    return plugin;
  }

  generate<I extends GeneratorInput, O extends GeneratorOutput>(
    generatorId: string,
    input: I,
    options: { seed: GeneratorSeed; version?: string; generatedAt?: number },
  ): GeneratorArtifact<I, O> {
    const plugin = this.resolve(generatorId, options.version) as unknown as GeneratorPlugin<I, O>;
    const seed = normalizeSeed(options.seed);
    const context: GeneratorContext = { generatorId, generatorVersion: plugin.version, seed };
    const output = plugin.generate(input, context);
    const outputValidation = plugin.validate(output, input);
    if (!outputValidation.valid) throw new GeneratorValidationError(outputValidation.issues);
    const assetRefs = plugin.preview?.(output).assetRefs ?? [];
    const assetRefIssues = validateAssetRefs(assetRefs);
    if (assetRefIssues.length > 0) throw new GeneratorValidationError(assetRefIssues);
    const artifact: GeneratorArtifact<I, O> = {
      schemaVersion: COMMON_GENERATOR_SCHEMA_VERSION,
      generatorId,
      generatorVersion: plugin.version,
      kind: plugin.kind,
      seed,
      input,
      output,
      assetRefs,
      contentHash: "",
      provenance: {
        generatorId,
        generatorVersion: plugin.version,
        seed,
        source: "backend-generator",
        generatedAt: options.generatedAt ?? 0,
      },
    };
    artifact.contentHash = calculateGeneratorContentHash(artifact);
    return artifact;
  }

  validate<I extends GeneratorInput, O extends GeneratorOutput>(artifact: GeneratorArtifact<I, O>): GeneratorValidationResult {
    const plugin = this.resolve(artifact.generatorId, artifact.generatorVersion) as unknown as GeneratorPlugin<I, O>;
    const issues: string[] = [];
    if (artifact.schemaVersion !== COMMON_GENERATOR_SCHEMA_VERSION) issues.push(`unsupported schema version: ${artifact.schemaVersion}`);
    if (artifact.provenance.generatorId !== artifact.generatorId || artifact.provenance.generatorVersion !== artifact.generatorVersion) {
      issues.push("provenance generator identity does not match artifact");
    }
    if (artifact.provenance.seed !== artifact.seed) issues.push("provenance seed does not match artifact");
    if (artifact.provenance.source !== "backend-generator") issues.push("artifact provenance source is not backend-generator");
    if (artifact.kind !== plugin.kind) issues.push("artifact kind does not match registered generator");
    issues.push(...validateAssetRefs(artifact.assetRefs));
    const expectedHash = calculateGeneratorContentHash(artifact);
    if (expectedHash !== artifact.contentHash) issues.push("content hash does not match artifact payload");
    return combineIssues({ valid: issues.length === 0, issues }, plugin.validate(artifact.output, artifact.input));
  }

  preview<I extends GeneratorInput, O extends GeneratorOutput>(artifact: GeneratorArtifact<I, O>): GeneratorPreview {
    const plugin = this.resolve(artifact.generatorId, artifact.generatorVersion) as unknown as GeneratorPlugin<I, O>;
    const preview = plugin.preview?.(artifact.output) ?? defaultPreview(artifact.output);
    return {
      generatorId: artifact.generatorId,
      generatorVersion: artifact.generatorVersion,
      kind: artifact.kind,
      contentHash: artifact.contentHash,
      outputType: outputType(artifact.output),
      ...preview,
    };
  }

  save<I extends GeneratorInput, O extends GeneratorOutput>(artifact: GeneratorArtifact<I, O>, savedAt = 0): SavedGeneratorArtifact<I, O> {
    const validation = this.validate(artifact);
    if (!validation.valid) throw new GeneratorValidationError(validation.issues);
    if (!Number.isFinite(savedAt) || savedAt < 0) throw new Error("savedAt must be a non-negative finite number");
    return { artifact, savedAt };
  }

  export<I extends GeneratorInput, O extends GeneratorOutput>(artifact: GeneratorArtifact<I, O>) {
    const validation = this.validate(artifact);
    if (!validation.valid) throw new GeneratorValidationError(validation.issues);
    return stableStringify(artifact);
  }
}
