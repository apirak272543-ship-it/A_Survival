import { describe, expect, it } from "vitest";
import {
  AI_NPC_PROVIDER_MAX_SAMPLE_COUNT,
  buildAiNpcProviderDependencyGraph,
  buildAiNpcProviderDependencyGraphFromSources,
  readActiveAiNpcProviderSources,
  type AiNpcProviderSources,
} from "./generators/aiNpcProviderDependencyGraph";

describe("AI NPC provider dependency graph", () => {
  it("audits one special NPC map with default-disabled, server-only, on-demand policy", () => {
    const first = buildAiNpcProviderDependencyGraph({ seed: "g06-canonical", sampleCount: 1 });
    const second = buildAiNpcProviderDependencyGraph({ seed: "g06-canonical", sampleCount: 1 });

    expect(first.summary).toMatchObject({
      allowedMapCount: 1,
      uniqueAllowedMapCount: 1,
      allowedMapIds: ["obsidian-frontier"],
      provider: "gemini",
      model: "gemini-3.7-flash",
      defaultEnabled: false,
      maxActionsPerTurn: 1,
      cooldownMs: 10_000,
      maxTurns: 8,
      timeoutMs: 7_000,
      maxMessageChars: 300,
      fallbackReasonCount: 6,
      responseRequiredFields: ["action", "mood", "speech"],
      issueCounts: {},
      policy: {
        oneSpecialNpcPerMap: true,
        serverOnly: true,
        onDemand: true,
        defaultDisabled: true,
        browserSecretAllowed: false,
        backgroundLoopAllowed: false,
        maxActionsPerTurn: 1,
        fallbackIsNonMutating: true,
        outputIsAuditOnly: true,
      },
    });
    expect(first.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.graph.valid).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("preserves the active provider source boundary without making an outbound call", () => {
    const source = readActiveAiNpcProviderSources();
    expect(source).toMatchObject({
      endpoint: "https://generativelanguage.googleapis.com/v1beta/interactions",
      serverOnly: true,
      onDemand: true,
      browserSecretAllowed: false,
      backgroundLoopAllowed: false,
      fallbackActionType: "none",
      fallbackReasons: ["disabled", "unsupported-map", "invalid-input", "cooldown", "provider-error", "invalid-provider-output"],
      responseRequiredFields: ["speech", "mood", "action"],
    });
    expect(source.config.enabled).toBe(false);
  });

  it("turns multi-map, provider, default, cap, secret, loop, fallback, and schema violations into blockers", () => {
    const base = readActiveAiNpcProviderSources();
    const invalidConfig = {
      ...base.config,
      enabled: true,
      provider: "openai" as never,
      model: "",
      maxActionsPerTurn: 2 as never,
      cooldownMs: 100,
      maxTurns: 0,
      timeoutMs: 21_000,
      maxMessageChars: 1,
    };
    const invalid: AiNpcProviderSources = {
      ...base,
      config: invalidConfig,
      allowedMaps: ["obsidian-frontier", "future-map", "obsidian-frontier"],
      endpoint: "https://example.invalid/provider",
      serverOnly: false,
      onDemand: false,
      browserSecretAllowed: true,
      backgroundLoopAllowed: true,
      fallbackReasons: ["disabled"],
      fallbackActionType: "allow-listed-action",
      responseRequiredFields: ["speech"],
    };
    const output = buildAiNpcProviderDependencyGraphFromSources({ seed: "g06-invalid", sampleCount: 2 }, invalid);

    expect(output.graph.valid).toBe(false);
    expect(output.summary.issueCounts["map-count"]).toBe(1);
    expect(output.summary.issueCounts["duplicate-map"]).toBe(3);
    expect(output.summary.issueCounts["unsupported-map"]).toBe(1);
    expect(output.summary.issueCounts["provider-invalid"]).toBe(1);
    expect(output.summary.issueCounts["model-missing"]).toBe(1);
    expect(output.summary.issueCounts["endpoint-invalid"]).toBe(1);
    expect(output.summary.issueCounts["default-enabled"]).toBe(1);
    expect(output.summary.issueCounts["action-cap-invalid"]).toBe(1);
    expect(output.summary.issueCounts["cooldown-cap-invalid"]).toBe(1);
    expect(output.summary.issueCounts["turn-cap-invalid"]).toBe(1);
    expect(output.summary.issueCounts["timeout-cap-invalid"]).toBe(1);
    expect(output.summary.issueCounts["message-cap-invalid"]).toBe(1);
    expect(output.summary.issueCounts["server-only-violation"]).toBe(1);
    expect(output.summary.issueCounts["on-demand-violation"]).toBe(1);
    expect(output.summary.issueCounts["browser-secret-allowed"]).toBe(1);
    expect(output.summary.issueCounts["background-loop-allowed"]).toBe(1);
    expect(output.summary.issueCounts["fallback-reason-missing"]).toBe(5);
    expect(output.summary.issueCounts["fallback-action-unsafe"]).toBe(1);
    expect(output.summary.issueCounts["response-schema-incomplete"]).toBe(1);
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("changes the artifact hash when provider policy changes and rejects invalid bounds", () => {
    const source = readActiveAiNpcProviderSources();
    const original = buildAiNpcProviderDependencyGraphFromSources({ seed: "g06-hash", sampleCount: 2 }, source);
    const changed = buildAiNpcProviderDependencyGraphFromSources(
      { seed: "g06-hash", sampleCount: 2 },
      { ...source, config: { ...source.config, maxTurns: source.config.maxTurns + 1 } },
    );
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildAiNpcProviderDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildAiNpcProviderDependencyGraph({ seed: "g06", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildAiNpcProviderDependencyGraph({ seed: "g06", sampleCount: AI_NPC_PROVIDER_MAX_SAMPLE_COUNT + 1 })).toThrow(/sampleCount/);
  });

  it("keeps the graph bounded and audit-only for a partial source sample", () => {
    const source = readActiveAiNpcProviderSources();
    const output = buildAiNpcProviderDependencyGraphFromSources({ seed: "g06-partial", sampleCount: 1 }, source);
    expect(output.summary.allowedMapCount).toBe(1);
    expect(output.graph.nodes).toHaveLength(3);
    expect(output.summary.policy.outputIsAuditOnly).toBe(true);
  });
});
