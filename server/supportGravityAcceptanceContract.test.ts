import { describe, expect, it } from "vitest";
import { blockKey } from "../client/src/game/data/blockModules";
import { createBlockWorld, setWorldBlock } from "../client/src/game/systems/blockWorldSystem";
import { evaluateSupportGravity, summarizeSupportGravity, validateSupportGravitySummary } from "./supportGravityAcceptanceContract";

function block(blockId: string, x: number, y: number, z: number) {
  return { key: blockKey(x, y, z), blockId, moduleId: blockId, x, y, z, state: "intact" as const, hitPoints: 1, maxHitPoints: 1, solid: true, seed: 1 };
}

describe("support and gravity acceptance contract", () => {
  it("accepts a supported block and rejects the same block when it would float", () => {
    const supportedWorld = setWorldBlock(createBlockWorld(), block("terrain.ash", 0, 0, 0));
    const floatingWorld = createBlockWorld();

    expect(evaluateSupportGravity(supportedWorld, "player.placed", { x: 0, y: 1, z: 0 })).toMatchObject({ accepted: true, supported: true, reason: "supported" });
    expect(evaluateSupportGravity(floatingWorld, "player.placed", { x: 0, y: 1, z: 0 })).toMatchObject({ accepted: false, supported: false, reason: "requires-support" });
  });

  it("keeps explicitly float-capable blocks accepted without adjacent support", () => {
    const result = evaluateSupportGravity(createBlockWorld(), "leaves.obsidian", { x: 4, y: 8, z: -3 });

    expect(result.known).toBe(true);
    expect(result.supportRequired).toBe(false);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe("floating-allowed");
  });

  it("fails closed for unknown blocks and invalid coordinates", () => {
    expect(evaluateSupportGravity(createBlockWorld(), "missing.block", { x: 0, y: 0, z: 0 })).toMatchObject({ known: false, accepted: false, reason: "unknown-block" });
    expect(evaluateSupportGravity(createBlockWorld(), "player.placed", { x: 0.5, y: 0, z: 0 })).toMatchObject({ known: false, accepted: false, reason: "unknown-block" });
  });

  it("returns a deterministic summary and rejects tampered counts", () => {
    const world = setWorldBlock(createBlockWorld(), block("player.placed", 0, 0, 0));
    const summary = summarizeSupportGravity(world);

    expect(summary).toEqual({ blockCount: 1, supportRequiredCount: 1, gravityAffectedCount: 0, unsupportedGravityCount: 0, safe: true });
    expect(validateSupportGravitySummary(world, summary).valid).toBe(true);
    expect(validateSupportGravitySummary(world, { ...summary, blockCount: 99 }).valid).toBe(false);
  });
});
