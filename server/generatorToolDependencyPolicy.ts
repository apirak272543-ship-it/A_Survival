import { hashStableJson } from "./generators/commonGeneratorApi";

export const GENERATOR_TOOL_DEPENDENCY_POLICY_SCHEMA_VERSION = "a-survival.generator-tool-dependency-policy.v1" as const;
export const GENERATOR_TOOL_DEPENDENCY_POLICY_VERSION = "1.0.0" as const;

export const GENERATOR_TOOL_INVENTORY = [
  {
    id: "world.generate",
    command: "pnpm world:generate",
    sourcePath: "tools/world-generator.ts",
    category: "world",
    outputKind: "world-export-json",
    writesLocalFiles: true,
    networkAccess: false,
    secretRequired: false,
    playerUi: false,
  },
  {
    id: "content.generate",
    command: "pnpm content:generate",
    sourcePath: "tools/content-generator.ts",
    category: "content",
    outputKind: "content-json",
    writesLocalFiles: true,
    networkAccess: false,
    secretRequired: false,
    playerUi: false,
  },
  {
    id: "content.suite",
    command: "pnpm content:suite",
    sourcePath: "tools/content-suite-generator.ts",
    category: "content",
    outputKind: "content-suite-json",
    writesLocalFiles: true,
    networkAccess: false,
    secretRequired: false,
    playerUi: false,
  },
  {
    id: "animation.generate",
    command: "pnpm animation:generate",
    sourcePath: "tools/animation-profile-generator.ts",
    category: "animation",
    outputKind: "animation-profile-json",
    writesLocalFiles: true,
    networkAccess: false,
    secretRequired: false,
    playerUi: false,
  },
  {
    id: "story.generate",
    command: "pnpm story:generate",
    sourcePath: "tools/quest-progression-generator.ts",
    category: "story",
    outputKind: "quest-progression-json",
    writesLocalFiles: true,
    networkAccess: false,
    secretRequired: false,
    playerUi: false,
  },
] as const;

const REQUIRED_PREFLIGHT_CHECKS = ["pnpm check", "pnpm test -- --run", "pnpm build"] as const;
type PreflightCheck = (typeof REQUIRED_PREFLIGHT_CHECKS)[number];
type ToolCategory = (typeof GENERATOR_TOOL_INVENTORY)[number]["category"];
type ToolInventoryEntry = (typeof GENERATOR_TOOL_INVENTORY)[number];

type PolicyIssue = {
  code: "UNKNOWN_TOOL" | "CHECKS_NOT_ARRAY" | "UNKNOWN_CHECK" | "PREFLIGHT_INCOMPLETE" | "WRITE_TARGET_REQUIRED";
  detail: string;
  toolId?: string;
};

export type GeneratorToolDependencyPolicyInput = {
  toolIds?: unknown;
  completedChecks?: unknown;
  writeTarget?: unknown;
};

export type GeneratorToolDependencyPolicyReport = {
  schemaVersion: typeof GENERATOR_TOOL_DEPENDENCY_POLICY_SCHEMA_VERSION;
  policyVersion: typeof GENERATOR_TOOL_DEPENDENCY_POLICY_VERSION;
  auditOnly: true;
  readOnly: true;
  exportOnly: true;
  publishReady: false;
  valid: boolean;
  inventoryCount: number;
  selectedToolCount: number;
  selectedTools: Array<ToolInventoryEntry & { preflightReady: boolean; missingChecks: PreflightCheck[] }>;
  requiredPreflightChecks: readonly PreflightCheck[];
  completedChecks: PreflightCheck[];
  writeTarget: string | null;
  executionPolicy: {
    backendCliOnly: true;
    runtimeInvocationAllowed: false;
    playerUi: false;
    networkAccess: false;
    secretRequired: false;
    backgroundExecution: false;
    databaseWrite: false;
    registryWrite: false;
    sourceTreeWrite: false;
  };
  issues: PolicyIssue[];
  blockers: [
    { id: "tool-execution-evidence"; required: true; status: "missing-evidence"; reason: string },
    { id: "output-path-approval"; required: true; status: "missing-evidence"; reason: string },
    { id: "runtime-stability-acceptance"; required: true; status: "missing-evidence"; reason: string },
  ];
  claims: {
    toolExecuted: false;
    externalNetworkUsed: false;
    secretRead: false;
    playerUiEnabled: false;
    backgroundProcessStarted: false;
    databaseMutated: false;
    sourceTreeMutated: false;
  };
  contentSha256: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeToolIds(input: unknown, issues: PolicyIssue[]) {
  if (input === undefined) return GENERATOR_TOOL_INVENTORY.map(tool => tool.id);
  if (!Array.isArray(input)) {
    issues.push({ code: "UNKNOWN_TOOL", detail: "toolIds must be an array; the full inspected inventory was selected" });
    return GENERATOR_TOOL_INVENTORY.map(tool => tool.id);
  }
  const knownIds: ReadonlySet<string> = new Set(GENERATOR_TOOL_INVENTORY.map(tool => tool.id));
  const selected: string[] = [];
  for (const value of input) {
    if (!isNonEmptyString(value) || !knownIds.has(value)) {
      issues.push({ code: "UNKNOWN_TOOL", detail: `tool id ${String(value)} is not in the inspected generator inventory`, toolId: isNonEmptyString(value) ? value : undefined });
      continue;
    }
    if (!selected.includes(value)) selected.push(value);
  }
  return selected;
}

function normalizeCompletedChecks(input: unknown, issues: PolicyIssue[]) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    issues.push({ code: "CHECKS_NOT_ARRAY", detail: "completedChecks must be an array of exact repository command names" });
    return [];
  }
  const checks: PreflightCheck[] = [];
  for (const value of input) {
    if (!REQUIRED_PREFLIGHT_CHECKS.includes(value as PreflightCheck)) issues.push({ code: "UNKNOWN_CHECK", detail: `preflight check ${String(value)} is not one of the required repository checks` });
    else if (!checks.includes(value as PreflightCheck)) checks.push(value as PreflightCheck);
  }
  return checks;
}

function buildBlockers(): GeneratorToolDependencyPolicyReport["blockers"] {
  return [
    { id: "tool-execution-evidence", required: true, status: "missing-evidence", reason: "this checkpoint inventories and gates tools but deliberately does not execute a generator CLI" },
    { id: "output-path-approval", required: true, status: "missing-evidence", reason: "generator CLIs can write local JSON/cache artifacts; a caller must provide and approve a non-source output target" },
    { id: "runtime-stability-acceptance", required: true, status: "missing-evidence", reason: "repository check/test/build are represented as preflight requirements, not a claim that generator output is production-ready" },
  ];
}

export function buildGeneratorToolDependencyPolicyReport(input: GeneratorToolDependencyPolicyInput = {}): GeneratorToolDependencyPolicyReport {
  const issues: PolicyIssue[] = [];
  const selectedIds = normalizeToolIds(input.toolIds, issues);
  const completedChecks = normalizeCompletedChecks(input.completedChecks, issues);
  const writeTarget = isNonEmptyString(input.writeTarget) ? input.writeTarget.trim() : null;
  if (selectedIds.length > 0 && !writeTarget) issues.push({ code: "WRITE_TARGET_REQUIRED", detail: "a non-empty writeTarget is required before any local-writing generator tool may be considered preflight-ready" });
  const selectedTools = selectedIds.flatMap(toolId => {
    const tool = GENERATOR_TOOL_INVENTORY.find(candidate => candidate.id === toolId);
    if (!tool) return [];
    const missingChecks = REQUIRED_PREFLIGHT_CHECKS.filter(check => !completedChecks.includes(check));
    return [{ ...tool, preflightReady: missingChecks.length === 0 && Boolean(writeTarget), missingChecks }];
  });
  const hasIncompleteTool = selectedTools.some(tool => !tool.preflightReady);
  if (hasIncompleteTool) issues.push({ code: "PREFLIGHT_INCOMPLETE", detail: "one or more selected tools are not ready because required checks or an output target are missing" });
  const payload = {
    schemaVersion: GENERATOR_TOOL_DEPENDENCY_POLICY_SCHEMA_VERSION,
    policyVersion: GENERATOR_TOOL_DEPENDENCY_POLICY_VERSION,
    auditOnly: true,
    readOnly: true,
    exportOnly: true,
    publishReady: false,
    valid: issues.length === 0,
    inventoryCount: GENERATOR_TOOL_INVENTORY.length,
    selectedToolCount: selectedTools.length,
    selectedTools,
    requiredPreflightChecks: REQUIRED_PREFLIGHT_CHECKS,
    completedChecks,
    writeTarget,
    executionPolicy: { backendCliOnly: true, runtimeInvocationAllowed: false, playerUi: false, networkAccess: false, secretRequired: false, backgroundExecution: false, databaseWrite: false, registryWrite: false, sourceTreeWrite: false },
    issues,
    blockers: buildBlockers(),
    claims: { toolExecuted: false as const, externalNetworkUsed: false as const, secretRead: false as const, playerUiEnabled: false as const, backgroundProcessStarted: false as const, databaseMutated: false as const, sourceTreeMutated: false as const },
  } satisfies Omit<GeneratorToolDependencyPolicyReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}

export type { PreflightCheck, ToolCategory };
