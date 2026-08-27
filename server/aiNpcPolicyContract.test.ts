import { describe, expect, it } from "vitest";
import { buildAiNpcPolicyReport } from "./aiNpcPolicyContract";

describe("AI NPC policy contract", () => {
  it("defaults to disabled and never performs a provider or credential operation", () => {
    const report = buildAiNpcPolicyReport();

    expect(report).toMatchObject({
      schemaVersion: "a-survival.ai-npc-policy.v1",
      contractVersion: "1.0.0",
      auditOnly: true,
      readOnly: true,
      exportOnly: true,
      publishReady: false,
      valid: true,
      requestedEnabled: false,
      eligibleForOnDemandCall: false,
      eligibilityReason: "disabled-by-default",
      allowedMaps: ["obsidian-frontier"],
      provider: { provider: "gemini", callPerformed: false, credentialRead: false, backgroundLoop: false },
    });
    expect(report.action).toMatchObject({ accepted: true, maxActionsPerTurn: 1, value: { type: "none" } });
    expect(report.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("accepts only the canonical Obsidian special-NPC identity and one bounded allow-listed action", () => {
    const report = buildAiNpcPolicyReport({
      requestedEnabled: true,
      mapId: "obsidian-frontier",
      npcId: "obsidian-frontier:special-ai",
      message: "ช่วยชี้ทางไปค่ายหน่อย",
      position: { x: 2, z: -3 },
      action: { type: "offer-hint", hintId: "ash.path.east" },
    });

    expect(report).toMatchObject({ valid: true, eligibleForOnDemandCall: true, eligibilityReason: "eligible-policy-only", npcIdentity: { mapAccepted: true, identityAccepted: true }, request: { messageChars: 21, position: { x: 2, z: -3 }, positionAccepted: true }, action: { accepted: true, value: { type: "offer-hint", hintId: "ash.path.east" } } });
    expect(report.issues).toEqual([]);
  });

  it("rejects unsupported map and mismatched NPC identity before any provider eligibility", () => {
    const report = buildAiNpcPolicyReport({ requestedEnabled: true, mapId: "map-002-ashen-obsidian-plains", npcId: "map-002-ashen-obsidian-plains:special-ai", message: "คุยหน่อย", position: { x: 0, z: 0 } });

    expect(report.valid).toBe(false);
    expect(report.eligibleForOnDemandCall).toBe(false);
    expect(report.eligibilityReason).toBe("unsupported-map");
    expect(report.npcIdentity).toMatchObject({ mapAccepted: false, identityAccepted: false });
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["UNSUPPORTED_MAP"]));
    expect(report.claims.providerCall).toBe(false);
  });

  it("rejects out-of-bounds action coordinates and unknown action types", () => {
    const farAction = buildAiNpcPolicyReport({ requestedEnabled: true, message: "ไปดูตรงนั้น", position: { x: 0, z: 0 }, action: { type: "wander-to-safe-point", x: 25, z: 0 } });
    const unknownAction = buildAiNpcPolicyReport({ requestedEnabled: true, message: "ลองทำอย่างอื่น", position: { x: 0, z: 0 }, action: { type: "grant-reward" } });

    expect(farAction.valid).toBe(false);
    expect(farAction.eligibilityReason).toBe("invalid-action");
    expect(farAction.issues.map(issue => issue.code)).toContain("ACTION_OUTSIDE_LOCAL_BOUNDS");
    expect(unknownAction.valid).toBe(false);
    expect(unknownAction.issues.map(issue => issue.code)).toContain("ACTION_TYPE_UNSUPPORTED");
  });

  it("bounds request text and position without inventing a browser or device acceptance", () => {
    const report = buildAiNpcPolicyReport({ requestedEnabled: true, message: "x".repeat(301), position: { x: 501, z: 0 } });

    expect(report.valid).toBe(false);
    expect(report.request.messageChars).toBe(300);
    expect(report.request.positionAccepted).toBe(false);
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["MESSAGE_TRUNCATED", "POSITION_INVALID"]));
    expect(report.blockers.map(blocker => blocker.id)).toEqual(["provider-runtime-call", "gameplay-action-executor", "server-auth-and-rate-limit-acceptance"]);
  });

  it("is deterministic for the same policy input and keeps all mutation claims false", () => {
    const input = { requestedEnabled: true, message: "ขอคำใบ้", position: { x: 1.234, z: -2.345 }, action: { type: "inspect-local-block", x: 4.2, z: -2.3 } };
    const first = buildAiNpcPolicyReport(input);
    const second = buildAiNpcPolicyReport(input);

    expect(first).toEqual(second);
    expect(first.claims).toEqual({ providerCall: false, secretRead: false, backgroundLoop: false, persistenceWrite: false, gameplayMutation: false, multiNpc: false, playerVisible: false });
  });
});
