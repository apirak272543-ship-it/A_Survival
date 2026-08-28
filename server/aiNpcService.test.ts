import { describe, expect, it, vi } from "vitest";
import { AiNpcService, readAiNpcConfig, type AiNpcConfig, type AiNpcTurnInput } from "./aiNpcService";

const baseInput: AiNpcTurnInput = {
  playerId: "player-001",
  mapId: "obsidian-frontier",
  npcId: "obsidian-frontier:special-ai",
  message: "มีอะไรให้ช่วยไหม",
  phase: "day",
  biome: "Obsidian Frontier",
  position: { x: 2, z: -3 },
  localFacts: ["safe-zone nearby", "ash path east"],
  nearbyBlockIds: ["terrain.ash", "rock.obsidian.small"],
};

const enabledConfig: AiNpcConfig = {
  enabled: true,
  provider: "gemini",
  model: "gemini-3.7-flash",
  cooldownMs: 0,
  maxTurns: 2,
  maxActionsPerTurn: 1,
  timeoutMs: 1000,
  maxMessageChars: 300,
};

function providerResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify({ output_text: JSON.stringify(value) }), { status, headers: { "Content-Type": "application/json" } });
}

describe("Optional AI NPC service", () => {
  it("defaults to disabled unless both the flag and server key exist", () => {
    expect(readAiNpcConfig({ AI_NPC_ENABLED: "true" })).toMatchObject({ enabled: false, provider: "gemini" });
    expect(readAiNpcConfig({ AI_NPC_ENABLED: "false", GEMINI_API_KEY: "not-used-in-test" })).toMatchObject({ enabled: false });
  });

  it("uses deterministic fallback without calling a provider when disabled", async () => {
    const fetcher = vi.fn();
    const service = new AiNpcService({ ...enabledConfig, enabled: false }, fetcher as never);
    const result = await service.turn(baseInput);
    expect(result).toMatchObject({ accepted: true, source: "fallback", reason: "disabled", action: { type: "none" } });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects unsupported map or NPC identity before provider access", async () => {
    const fetcher = vi.fn();
    const service = new AiNpcService(enabledConfig, fetcher as never);
    const result = await service.turn({ ...baseInput, mapId: "map-002-ashen-obsidian-plains", npcId: "map-002-ashen-obsidian-plains:special-ai" });
    expect(result).toMatchObject({ accepted: true, source: "fallback", reason: "unsupported-map" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts only structured allow-listed actions and enforces cooldown", async () => {
    const fetcher = vi.fn(async () => providerResponse({ speech: "ฉันเห็นรอยทางไปทางตะวันออก", mood: "curious", action: { type: "offer-hint", hintId: "ash.path.east" } }));
    const service = new AiNpcService({ ...enabledConfig, cooldownMs: 10_000 }, fetcher as never);
    const first = await service.turn(baseInput);
    const second = await service.turn({ ...baseInput, message: "บอกทางอีกครั้ง" });
    expect(first).toMatchObject({ accepted: true, source: "gemini", mood: "curious", action: { type: "offer-hint", hintId: "ash.path.east" } });
    expect(second).toMatchObject({ accepted: true, source: "fallback", reason: "cooldown" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects provider actions outside local bounds and falls back safely", async () => {
    const fetcher = vi.fn(async () => providerResponse({ speech: "ไปที่นี่สิ", mood: "alert", action: { type: "wander-to-safe-point", x: 1000, z: 1000 } }));
    const service = new AiNpcService(enabledConfig, fetcher as never);
    const result = await service.turn(baseInput);
    expect(result).toMatchObject({ accepted: true, source: "fallback", reason: "invalid-provider-output", action: { type: "none" } });
  });

  it("clears the timeout after a provider abort and falls back safely", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }));
      const service = new AiNpcService(enabledConfig, fetcher as never);
      const pending = service.turn(baseInput);
      await vi.advanceTimersByTimeAsync(enabledConfig.timeoutMs);
      await expect(pending).resolves.toMatchObject({ accepted: true, source: "fallback", reason: "provider-error", action: { type: "none" } });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("limits conversation memory and falls back on provider errors", async () => {
    const prompts: string[] = [];
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { input: string };
      prompts.push(body.input);
      return providerResponse({ speech: "ฉันกำลังเฝ้าดูแนวเขา", mood: "calm", action: { type: "none" } });
    });
    const service = new AiNpcService(enabledConfig, fetcher as never);
    for (let index = 0; index < 6; index += 1) await service.turn({ ...baseInput, message: `คำถาม ${index}` });
    const lastPrompt = prompts.at(-1) ?? "";
    expect((lastPrompt.match(/player:/g) ?? []).length).toBeLessThanOrEqual(2);

    const failed = new AiNpcService(enabledConfig, vi.fn(async () => providerResponse({}, 503)) as never);
    await expect(failed.turn(baseInput)).resolves.toMatchObject({ accepted: true, source: "fallback", reason: "provider-error" });
  });
});
