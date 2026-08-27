export const CHECKPOINT_VALIDATION_CONTRACT_VERSION = "checkpoint-validation.v1" as const;
export const MAX_CHECKS = 12;
export const MAX_CHANGED_FILES = 64;

export type ValidationCheckKind = "diff-check" | "typecheck" | "focused-test" | "full-test" | "build" | "browser";
export type ValidationCheckStatus = "passed" | "failed" | "not-run";

export type ValidationCheck = {
  kind: ValidationCheckKind;
  command: string;
  status: ValidationCheckStatus;
  exitCode: number | null;
  summary: string;
};

export type CheckpointValidationInput = {
  taskId: string;
  branch: string;
  commitSha: string;
  filesChanged: readonly string[];
  checks: readonly ValidationCheck[];
  limitations?: readonly string[];
};

export type CheckpointValidationResult = {
  contractVersion: typeof CHECKPOINT_VALIDATION_CONTRACT_VERSION;
  valid: boolean;
  issues: string[];
  normalized: {
    taskId: string;
    branch: string;
    commitSha: string;
    filesChanged: string[];
    checks: ValidationCheck[];
    limitations: string[];
    requiredChecks: ValidationCheckKind[];
  };
};

const REQUIRED_CHECKS: ValidationCheckKind[] = ["diff-check", "typecheck", "focused-test"];

function normalizeRequiredText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must not be empty`);
  return normalized;
}

function hasFullCommitSha(value: string) {
  return /^[a-f0-9]{40}$/.test(value);
}

export function validateCheckpointEvidence(input: CheckpointValidationInput): CheckpointValidationResult {
  const taskId = normalizeRequiredText(input.taskId, "taskId");
  const branch = normalizeRequiredText(input.branch, "branch");
  const commitSha = normalizeRequiredText(input.commitSha, "commitSha");
  if (!hasFullCommitSha(commitSha)) throw new Error("commitSha must be a full lowercase 40-character SHA");
  if (branch === "main" || branch === "origin/main") throw new Error("checkpoint branch must not be main");
  if (input.filesChanged.length < 1 || input.filesChanged.length > MAX_CHANGED_FILES) throw new Error(`filesChanged must contain 1 to ${MAX_CHANGED_FILES} entries`);
  if (input.checks.length < REQUIRED_CHECKS.length || input.checks.length > MAX_CHECKS) throw new Error(`checks must contain ${REQUIRED_CHECKS.length} to ${MAX_CHECKS} entries`);

  const issues: string[] = [];
  const filesChanged = input.filesChanged.map((file, index) => normalizeRequiredText(file, `filesChanged[${index}]`));
  const uniqueFiles = new Set<string>();
  for (const file of filesChanged) {
    if (uniqueFiles.has(file)) issues.push(`duplicate changed file: ${file}`);
    uniqueFiles.add(file);
  }

  const checks = input.checks.map((check, index) => ({
    kind: check.kind,
    command: normalizeRequiredText(check.command, `checks[${index}].command`),
    status: check.status,
    exitCode: check.exitCode,
    summary: normalizeRequiredText(check.summary, `checks[${index}].summary`),
  }));
  const seenKinds = new Set<ValidationCheckKind>();
  for (const check of checks) {
    if (seenKinds.has(check.kind)) issues.push(`duplicate validation check: ${check.kind}`);
    seenKinds.add(check.kind);
    if (check.status !== "passed" || check.exitCode !== 0) issues.push(`validation check did not pass: ${check.kind}`);
  }
  for (const required of REQUIRED_CHECKS) if (!seenKinds.has(required)) issues.push(`required validation check is missing: ${required}`);

  const limitations = (input.limitations ?? []).map((limitation, index) => normalizeRequiredText(limitation, `limitations[${index}]`));
  return {
    contractVersion: CHECKPOINT_VALIDATION_CONTRACT_VERSION,
    valid: issues.length === 0,
    issues,
    normalized: {
      taskId,
      branch,
      commitSha,
      filesChanged: Array.from(uniqueFiles).sort(),
      checks: checks.sort((left, right) => left.kind.localeCompare(right.kind)),
      limitations: [...limitations].sort(),
      requiredChecks: [...REQUIRED_CHECKS],
    },
  };
}
