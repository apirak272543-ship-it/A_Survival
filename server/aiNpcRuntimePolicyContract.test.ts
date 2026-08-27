import { describe, expect, it } from "vitest";
import {
  evaluateAiNpcRuntimePolicy,
  validateAiNpcTurnBoundary,
  type AiNpcRuntimePolicyInput,
} from "./aiNpcRuntimePolicyContract";

const baseInput: AiNpcRuntimePolicyInput = {
  enabled: false,
  defaultEnabled: false,
  provider: "gemini",
  providerConfigured: false,
  model: "gemini-3.7-flash",
  maxNpcsPerMap: 1,
  requestSource: "player-interaction",
  backgroundLoop: false,
  maxActionsPerTurn: 1,
  cooldownMs: 10_000,
  maxTurns: 8,
  maxMessageChars: 300,
  browserSecretExposure: false,
  allowedMutationDomains: [],
};

describe("AI NPC runtime policy contract", () => {
  it("keeps the default policy disabled, server-only and on-demand", () => {
    const result = evaluateAiNpcRuntimePolicy(baseInput);

    expect(result).toMatchObject({
      policyVersion: "ai-npc-runtime-policy.v1",
      valid: true,
      enabled: false,
      issues: [],
      runtimePolicy: {
        npcPerMap: 1,
        serverOnly: true,
        onDemand: true,
        backgroundLoop: false,
        playerCanCreateAgent: false,
        maxActionsPerTurn: 1,
        allowedMutationDomains: [],
      },
    });
    expect(result.runtimePolicy.allowedActions).toEqual(["none", "wander-to-safe-point", "inspect-local-block", "offer-hint", "return-to-home"]);
  });

  it("allows enabling only when the server provider is configured", () => {
    const result = evaluateAiNpcRuntimePolicy({ ...baseInput, enabled: true, providerConfigured: true });

    expect(result.valid).toBe(true);
    expect(result.enabled).toBe(true);
  });

  it("rejects background/player execution, secret exposure and direct mutations", () => {
    const result = evaluateAiNpcRuntimePolicy({
      ...baseInput,
      enabled: true,
      defaultEnabled: true,
      providerConfigured: false,
      maxNpcsPerMap: 2,
      requestSource: "background-loop",
      backgroundLoop: true,
      maxActionsPerTurn: 2,
      cooldownMs: 0,
      browserSecretExposure: true,
      allowedMutationDomains: ["inventory"],
    });

    expect(result.valid).toBe(false);
    expect(result.enabled).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "AI NPC defaultEnabled must be false",
      "enabled AI NPC requires server provider configuration",
      "AI NPC maxNpcsPerMap must be 1",
      "AI NPC requests must be player-interaction sourced",
      "AI NPC backgroundLoop must be false",
      "AI NPC maxActionsPerTurn must be 1",
      "AI NPC cooldownMs must be between 1000 and 120000",
      "AI NPC provider secret must not be exposed to browser",
      "AI NPC allowedMutationDomains must be empty",
    ]));
  });

  it("validates turn boundaries and converts unsafe requested actions to none", () => {
    const safe = validateAiNpcTurnBoundary({ playerId: "player-1", mapId: "map-001", npcId: "map-001:special-ai", requestSource: "player-interaction", distance: 12, action: "offer-hint", requestedMutations: [] });
    const unsafe = validateAiNpcTurnBoundary({ playerId: "player-1", mapId: "map-001", npcId: "map-001:special-ai", requestSource: "background-loop", distance: -1, action: "offer-hint", requestedMutations: ["inventory"] });

    expect(safe).toEqual({ valid: true, issues: [], acceptedAction: "offer-hint" });
    expect(unsafe.valid).toBe(false);
    expect(unsafe.acceptedAction).toBe("none");
    expect(unsafe.issues).toEqual(expect.arrayContaining([
      "AI NPC turn must be player-interaction sourced",
      "AI NPC turn distance must be finite and non-negative",
      "AI NPC turn cannot request direct game mutations",
    ]));
  });
});
