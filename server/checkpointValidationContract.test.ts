import { describe, expect, it } from "vitest";
import { validateCheckpointEvidence, type CheckpointValidationInput } from "./checkpointValidationContract";

const baseInput: CheckpointValidationInput = {
  taskId: "G-04",
  branch: "ai-5/checkpoint",
  commitSha: "0123456789abcdef0123456789abcdef01234567",
  filesChanged: ["server/example.ts", "server/example.test.ts"],
  checks: [
    { kind: "diff-check", command: "git diff --check", status: "passed", exitCode: 0, summary: "no whitespace errors" },
    { kind: "typecheck", command: "pnpm check", status: "passed", exitCode: 0, summary: "tsc completed" },
    { kind: "focused-test", command: "pnpm exec vitest run server/example.test.ts", status: "passed", exitCode: 0, summary: "1 file / 2 tests passed" },
  ],
  limitations: ["no device acceptance claim"],
};

describe("checkpoint validation evidence contract", () => {
  it("accepts complete passing evidence and normalizes it deterministically", () => {
    const result = validateCheckpointEvidence({
      ...baseInput,
      filesChanged: [...baseInput.filesChanged].reverse(),
      checks: [...baseInput.checks].reverse(),
    });

    expect(result).toMatchObject({
      contractVersion: "checkpoint-validation.v1",
      valid: true,
      issues: [],
      normalized: {
        taskId: "G-04",
        branch: "ai-5/checkpoint",
        commitSha: "0123456789abcdef0123456789abcdef01234567",
        requiredChecks: ["diff-check", "typecheck", "focused-test"],
      },
    });
    expect(result.normalized.filesChanged).toEqual(["server/example.test.ts", "server/example.ts"]);
    expect(result.normalized.checks.map(check => check.kind)).toEqual(["diff-check", "focused-test", "typecheck"]);
  });

  it("rejects failed checks and missing required evidence instead of marking the checkpoint valid", () => {
    const result = validateCheckpointEvidence({
      ...baseInput,
      checks: [
        { kind: "diff-check", command: "git diff --check", status: "passed", exitCode: 0, summary: "clean" },
        { kind: "typecheck", command: "pnpm check", status: "failed", exitCode: 1, summary: "type error" },
        { kind: "browser", command: "manual smoke", status: "not-run", exitCode: null, summary: "not collected" },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "validation check did not pass: typecheck",
      "validation check did not pass: browser",
      "required validation check is missing: focused-test",
    ]));
  });

  it("rejects duplicate files/checks and normalizes limitations", () => {
    const result = validateCheckpointEvidence({
      ...baseInput,
      filesChanged: ["server/example.ts", "server/example.ts"],
      checks: [
        ...baseInput.checks,
        { kind: "diff-check", command: "git diff --check", status: "passed", exitCode: 0, summary: "duplicate evidence" },
      ],
      limitations: ["z limitation", "a limitation"],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "duplicate changed file: server/example.ts",
      "duplicate validation check: diff-check",
    ]));
    expect(result.normalized.limitations).toEqual(["a limitation", "z limitation"]);
  });

  it("rejects main branches, short SHAs and unbounded record lists", () => {
    expect(() => validateCheckpointEvidence({ ...baseInput, branch: "main" })).toThrow("checkpoint branch must not be main");
    expect(() => validateCheckpointEvidence({ ...baseInput, commitSha: "0123456" })).toThrow("commitSha must be a full lowercase 40-character SHA");
    expect(() => validateCheckpointEvidence({ ...baseInput, filesChanged: [] })).toThrow("filesChanged must contain 1 to 64 entries");
    expect(() => validateCheckpointEvidence({ ...baseInput, checks: baseInput.checks.slice(0, 2) })).toThrow("checks must contain 3 to 12 entries");
  });
});
