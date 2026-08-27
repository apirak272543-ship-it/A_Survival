export const GENERATOR_TOOL_READINESS_VERSION = "generator-tool-readiness.v1" as const;
export const MAX_TOOL_DEPENDENCIES = 16;
export const MAX_ARTIFACT_FORMATS = 8;

export type GeneratorToolExecution = "backend-only" | "developer-only" | "player-runtime";
export type GeneratorToolAssetMode = "metadata-only" | "authorized-binary" | "blocked";

export type GeneratorToolDependency = {
  id: string;
  versionRange: string;
  purpose: string;
  required: boolean;
};

export type GeneratorToolReadinessInput = {
  id: string;
  version: string;
  kind: string;
  execution: GeneratorToolExecution;
  developerOnly: boolean;
  playerInvokable: boolean;
  renderLoopInvokable: boolean;
  generateOnceStoreCacheReuse: boolean;
  contentHashRequired: boolean;
  provenanceRequired: boolean;
  assetMode: GeneratorToolAssetMode;
  artifactFormats: readonly string[];
  dependencies: readonly GeneratorToolDependency[];
};

export type GeneratorToolReadinessResult = {
  contractVersion: typeof GENERATOR_TOOL_READINESS_VERSION;
  ready: boolean;
  issues: string[];
  normalized: {
    id: string;
    version: string;
    kind: string;
    execution: "backend-only";
    artifactFormats: string[];
    dependencies: GeneratorToolDependency[];
    playerVisible: false;
    renderLoopInvokable: false;
    generateOnceStoreCacheReuse: true;
    contentHashRequired: true;
    provenanceRequired: true;
  };
};

function normalizeRequiredText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must not be empty`);
  return normalized;
}

function isSemver(value: string) {
  return /^\d+\.\d+\.\d+$/.test(value);
}

function isVersionRange(value: string) {
  return /^(?:\^|~|>=|<=|=)?\d+\.\d+(?:\.\d+)?$/.test(value.trim());
}

export function evaluateGeneratorToolReadiness(input: GeneratorToolReadinessInput): GeneratorToolReadinessResult {
  const id = normalizeRequiredText(input.id, "id");
  const version = normalizeRequiredText(input.version, "version");
  const kind = normalizeRequiredText(input.kind, "kind");
  if (!isSemver(version)) throw new Error("version must use semver x.y.z");
  if (input.artifactFormats.length > MAX_ARTIFACT_FORMATS) throw new Error(`artifactFormats must contain at most ${MAX_ARTIFACT_FORMATS} entries`);
  if (input.dependencies.length > MAX_TOOL_DEPENDENCIES) throw new Error(`dependencies must contain at most ${MAX_TOOL_DEPENDENCIES} entries`);

  const issues: string[] = [];
  if (input.execution !== "backend-only") issues.push("generator tool execution must be backend-only");
  if (!input.developerOnly) issues.push("generator tool must be developerOnly");
  if (input.playerInvokable) issues.push("generator tool cannot be playerInvokable");
  if (input.renderLoopInvokable) issues.push("generator tool cannot be renderLoopInvokable");
  if (!input.generateOnceStoreCacheReuse) issues.push("generator tool must use Generate Once → Store → Cache → Reuse");
  if (!input.contentHashRequired) issues.push("generator tool must require contentHash");
  if (!input.provenanceRequired) issues.push("generator tool must require provenance");
  if (input.assetMode === "authorized-binary" && !input.provenanceRequired) issues.push("authorized binary assets require provenance");

  const artifactFormats = input.artifactFormats.map((format, index) => normalizeRequiredText(format, `artifactFormats[${index}]`));
  const seenFormats = new Set<string>();
  for (const format of artifactFormats) {
    if (seenFormats.has(format)) issues.push(`duplicate artifact format: ${format}`);
    seenFormats.add(format);
  }
  const dependencies = input.dependencies.map((dependency, index) => ({
    id: normalizeRequiredText(dependency.id, `dependencies[${index}].id`),
    versionRange: normalizeRequiredText(dependency.versionRange, `dependencies[${index}].versionRange`),
    purpose: normalizeRequiredText(dependency.purpose, `dependencies[${index}].purpose`),
    required: dependency.required,
  }));
  const seenDependencies = new Set<string>();
  for (const dependency of dependencies) {
    if (seenDependencies.has(dependency.id)) issues.push(`duplicate dependency: ${dependency.id}`);
    seenDependencies.add(dependency.id);
    if (!isVersionRange(dependency.versionRange)) issues.push(`dependency version range is invalid: ${dependency.id}`);
  }

  return {
    contractVersion: GENERATOR_TOOL_READINESS_VERSION,
    ready: issues.length === 0,
    issues,
    normalized: {
      id,
      version,
      kind,
      execution: "backend-only",
      artifactFormats: Array.from(new Set(artifactFormats)).sort(),
      dependencies: dependencies.sort((left, right) => left.id.localeCompare(right.id)),
      playerVisible: false,
      renderLoopInvokable: false,
      generateOnceStoreCacheReuse: true,
      contentHashRequired: true,
      provenanceRequired: true,
    },
  };
}
