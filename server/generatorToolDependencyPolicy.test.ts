import { describe, expect, it } from "vitest";
import { GENERATOR_TOOL_INVENTORY, buildGeneratorToolDependencyPolicyReport } from "./generatorToolDependencyPolicy";

describe("generator tool dependency policy", () => {
  it("reports every inspected CLI tool and fails closed without an approved output target", () => {
    const report = buildGeneratorToolDependencyPolicyReport();

    expect(report).toMatchObject({
      schemaVersion: "a-survival.generator-tool-dependency-policy.v1",
      policyVersion: "1.0.0",
      auditOnly: true,
      readOnly: true,
      exportOnly: true,
      publishReady: false,
      valid: false,
      inventoryCount: GENERATOR_TOOL_INVENTORY.length,
      selectedToolCount: GENERATOR_TOOL_INVENTORY.length,
      writeTarget: null,
      executionPolicy: { backendCliOnly: true, runtimeInvocationAllowed: false, playerUi: false, networkAccess: false, secretRequired: false, backgroundExecution: false, databaseWrite: false, registryWrite: false, sourceTreeWrite: false },
    });
    expect(report.selectedTools.every(tool => tool.preflightReady === false)).toBe(true);
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["WRITE_TARGET_REQUIRED", "PREFLIGHT_INCOMPLETE"]));
    expect(report.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("marks selected tools preflight-ready only when every required check and a target are supplied", () => {
    const report = buildGeneratorToolDependencyPolicyReport({
      toolIds: ["world.generate", "animation.generate", "world.generate"],
      completedChecks: ["pnpm check", "pnpm test -- --run", "pnpm build"],
      writeTarget: "/tmp/a-survival-generator-output",
    });

    expect(report).toMatchObject({ valid: true, selectedToolCount: 2, completedChecks: ["pnpm check", "pnpm test -- --run", "pnpm build"], writeTarget: "/tmp/a-survival-generator-output" });
    expect(report.selectedTools.map(tool => tool.id)).toEqual(["world.generate", "animation.generate"]);
    expect(report.selectedTools.every(tool => tool.preflightReady && tool.missingChecks.length === 0)).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("rejects unknown tools and checks instead of inventing a tool capability", () => {
    const report = buildGeneratorToolDependencyPolicyReport({ toolIds: ["content.suite", "unknown.tool", null], completedChecks: ["pnpm check", "pnpm unknown"], writeTarget: "/tmp/a-survival-generator-output" });

    expect(report.valid).toBe(false);
    expect(report.selectedToolCount).toBe(1);
    expect(report.selectedTools[0]?.id).toBe("content.suite");
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["UNKNOWN_TOOL", "UNKNOWN_CHECK", "PREFLIGHT_INCOMPLETE"]));
    expect(report.selectedTools[0]?.missingChecks).toEqual(["pnpm test -- --run", "pnpm build"]);
  });

  it("keeps all execution, secret, persistence, and player claims false even with a complete policy input", () => {
    const report = buildGeneratorToolDependencyPolicyReport({ toolIds: ["content.suite"], completedChecks: ["pnpm check", "pnpm test -- --run", "pnpm build"], writeTarget: "/tmp/a-survival-generator-output" });

    expect(report.claims).toEqual({ toolExecuted: false, externalNetworkUsed: false, secretRead: false, playerUiEnabled: false, backgroundProcessStarted: false, databaseMutated: false, sourceTreeMutated: false });
    expect(report.blockers.map(blocker => blocker.id)).toEqual(["tool-execution-evidence", "output-path-approval", "runtime-stability-acceptance"]);
    expect(report.executionPolicy.runtimeInvocationAllowed).toBe(false);
  });

  it("produces deterministic metadata for the same bounded policy input", () => {
    const input = { toolIds: ["story.generate", "content.generate"], completedChecks: ["pnpm check"], writeTarget: "artifacts/generator-preview" };

    expect(buildGeneratorToolDependencyPolicyReport(input)).toEqual(buildGeneratorToolDependencyPolicyReport(input));
  });
});
