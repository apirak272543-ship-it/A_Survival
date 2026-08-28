export const SPECIAL_AI_NPC_MAPS = ["obsidian-frontier"] as const;
export const DEFAULT_AI_NPC_MODEL = "gemini-3.7-flash";
export const AI_NPC_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    speech: { type: "string", description: "Short in-world dialogue, maximum 360 characters." },
    mood: { type: "string", enum: ["curious", "calm", "alert", "warm", "mysterious"] },
    action: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["none", "wander-to-safe-point", "inspect-local-block", "offer-hint", "return-to-home"] },
        x: { type: "number" },
        z: { type: "number" },
        hintId: { type: "string" },
      },
      required: ["type"],
    },
  },
  required: ["speech", "mood", "action"],
} as const;

export type AiNpcActionType = "none" | "wander-to-safe-point" | "inspect-local-block" | "offer-hint" | "return-to-home";
export type AiNpcMood = "curious" | "calm" | "alert" | "warm" | "mysterious";

export type AiNpcConfig = {
  enabled: boolean;
  provider: "gemini";
  model: string;
  cooldownMs: number;
  maxTurns: number;
  maxActionsPerTurn: 1;
  timeoutMs: number;
  maxMessageChars: number;
};

export type AiNpcTurnInput = {
  playerId: string;
  mapId: string;
  npcId: string;
  message: string;
  phase: "day" | "night";
  biome: string;
  position: { x: number; z: number };
  localFacts: string[];
  nearbyBlockIds: string[];
};

export type AiNpcAction = {
  type: AiNpcActionType;
  x?: number;
  z?: number;
  hintId?: string;
};

export type AiNpcTurnResult = {
  accepted: boolean;
  source: "gemini" | "fallback";
  reason?: "disabled" | "unsupported-map" | "invalid-input" | "cooldown" | "provider-error" | "invalid-provider-output";
  npcId: string;
  speech: string;
  mood: AiNpcMood;
  action: AiNpcAction;
  remainingCooldownMs: number;
};

type GeminiResponse = {
  output_text?: string;
  response?: { output_text?: string };
};

type FetchLike = typeof fetch;

type MemoryTurn = { role: "player" | "npc"; text: string };

const ALLOWED_ACTIONS = new Set<AiNpcActionType>(["none", "wander-to-safe-point", "inspect-local-block", "offer-hint", "return-to-home"]);

export function readAiNpcConfig(env: Record<string, string | undefined> = process.env): AiNpcConfig {
  const numberFromEnv = (name: string, fallback: number, min: number, max: number) => {
    const value = Number(env[name]);
    return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.trunc(value))) : fallback;
  };
  return {
    enabled: env.AI_NPC_ENABLED === "true" && Boolean(env.GEMINI_API_KEY),
    provider: "gemini",
    model: env.AI_NPC_MODEL?.trim() || DEFAULT_AI_NPC_MODEL,
    cooldownMs: numberFromEnv("AI_NPC_COOLDOWN_MS", 10_000, 1_000, 120_000),
    maxTurns: numberFromEnv("AI_NPC_MAX_TURNS", 8, 1, 16),
    maxActionsPerTurn: 1,
    timeoutMs: numberFromEnv("AI_NPC_TIMEOUT_MS", 7_000, 1_000, 20_000),
    maxMessageChars: numberFromEnv("AI_NPC_MAX_MESSAGE_CHARS", 300, 32, 1_000),
  };
}

function clampText(value: unknown, maxChars: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maxChars) : "";
}

function validSpecialNpc(input: AiNpcTurnInput) {
  return SPECIAL_AI_NPC_MAPS.includes(input.mapId as (typeof SPECIAL_AI_NPC_MAPS)[number]) && input.npcId === `${input.mapId}:special-ai`;
}

function fallbackResult(input: AiNpcTurnInput, reason: AiNpcTurnResult["reason"], remainingCooldownMs = 0): AiNpcTurnResult {
  const speech = reason === "cooldown"
    ? "ขอเวลาสักครู่ ฉันกำลังจัดระเบียบความคิดอยู่"
    : reason === "unsupported-map"
      ? "เสียงของฉันยังเดินทางมาไม่ถึงดินแดนนี้"
      : reason === "provider-error" || reason === "invalid-provider-output"
        ? "สัญญาณอีเธอร์ขาดหาย แต่ฉันยังอยู่ที่นี่ ลองถามใหม่อีกครั้งได้"
        : "ฉันเฝ้าดูรอยต่อของเถ้าถ่านอยู่ คุยกับฉันได้เมื่อพร้อม";
  return { accepted: reason !== "invalid-input", source: "fallback", reason, npcId: input.npcId, speech, mood: "calm", action: { type: "none" }, remainingCooldownMs };
}

function parseProviderOutput(raw: string, input: AiNpcTurnInput): Omit<AiNpcTurnResult, "accepted" | "source" | "remainingCooldownMs" | "npcId"> | null {
  try {
    const parsed = JSON.parse(raw) as { speech?: unknown; mood?: unknown; action?: { type?: unknown; x?: unknown; z?: unknown; hintId?: unknown } };
    const speech = clampText(parsed.speech, 360);
    const mood = parsed.mood;
    const actionType = parsed.action?.type;
    if (!speech || typeof mood !== "string" || !["curious", "calm", "alert", "warm", "mysterious"].includes(mood) || typeof actionType !== "string" || !ALLOWED_ACTIONS.has(actionType as AiNpcActionType)) return null;
    const action: AiNpcAction = { type: actionType as AiNpcActionType };
    if (actionType === "wander-to-safe-point" || actionType === "inspect-local-block") {
      const x = Number(parsed.action?.x);
      const z = Number(parsed.action?.z);
      if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x - input.position.x) > 24 || Math.abs(z - input.position.z) > 24) return null;
      action.x = Number(x.toFixed(2));
      action.z = Number(z.toFixed(2));
    }
    if (actionType === "offer-hint") {
      const hintId = clampText(parsed.action?.hintId, 64);
      if (!hintId || !/^[a-z0-9._-]+$/i.test(hintId)) return null;
      action.hintId = hintId;
    }
    return { speech, mood: mood as AiNpcMood, action };
  } catch {
    return null;
  }
}

function createPrompt(input: AiNpcTurnInput, memory: MemoryTurn[]) {
  const context = {
    mapId: input.mapId,
    npcId: input.npcId,
    phase: input.phase,
    biome: input.biome.slice(0, 80),
    position: { x: Number(input.position.x.toFixed(1)), z: Number(input.position.z.toFixed(1)) },
    localFacts: input.localFacts.slice(0, 8).map(fact => fact.slice(0, 120)),
    nearbyBlockIds: input.nearbyBlockIds.slice(0, 12).map(id => id.slice(0, 80)),
  };
  const transcript = memory.map(turn => `${turn.role}: ${turn.text}`).join("\n");
  return [
    "You are the one special AI-driven NPC in A-Survival Obsidian Frontier.",
    "Stay in character, be concise, and never claim hidden catalog entries or private player data.",
    "Return only JSON matching the provided response schema.",
    "You may suggest one allow-listed action, but you cannot mutate blocks, inventory, chests, currency, quests, combat, or the database.",
    "The server validates every action; do not invent tools or URLs.",
    `World context: ${JSON.stringify(context)}`,
    `Recent conversation:\n${transcript || "(none)"}`,
    `Player says: ${input.message}`,
  ].join("\n\n");
}

export class AiNpcService {
  private readonly memory = new Map<string, MemoryTurn[]>();
  private readonly lastRequestAt = new Map<string, number>();

  constructor(private readonly config: AiNpcConfig, private readonly fetcher: FetchLike = fetch) {}

  reset() {
    this.memory.clear();
    this.lastRequestAt.clear();
  }

  async turn(input: AiNpcTurnInput): Promise<AiNpcTurnResult> {
    const cleaned: AiNpcTurnInput = {
      ...input,
      playerId: clampText(input.playerId, 64),
      mapId: clampText(input.mapId, 64),
      npcId: clampText(input.npcId, 96),
      message: clampText(input.message, this.config.maxMessageChars),
      biome: clampText(input.biome, 80),
      localFacts: input.localFacts.slice(0, 8).map(fact => clampText(fact, 120)),
      nearbyBlockIds: input.nearbyBlockIds.slice(0, 12).map(id => clampText(id, 80)),
      position: { x: Number(input.position.x), z: Number(input.position.z) },
    };
    if (!cleaned.playerId || !cleaned.mapId || !cleaned.npcId || !cleaned.message || !Number.isFinite(cleaned.position.x) || !Number.isFinite(cleaned.position.z)) return fallbackResult(cleaned, "invalid-input");
    if (!validSpecialNpc(cleaned)) return fallbackResult(cleaned, "unsupported-map");
    if (!this.config.enabled) return fallbackResult(cleaned, "disabled");
    const key = `${cleaned.mapId}:${cleaned.npcId}:${cleaned.playerId}`;
    const now = Date.now();
    const previous = this.lastRequestAt.get(key) ?? 0;
    const elapsed = now - previous;
    if (elapsed < this.config.cooldownMs) return fallbackResult(cleaned, "cooldown", this.config.cooldownMs - elapsed);
    this.lastRequestAt.set(key, now);
    const turns = this.memory.get(key) ?? [];
    const prompt = createPrompt(cleaned, turns);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
      const response = await this.fetcher("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
        body: JSON.stringify({
          model: this.config.model,
          input: prompt,
          response_format: { type: "text", mime_type: "application/json", schema: AI_NPC_RESPONSE_SCHEMA },
        }),
        signal: controller.signal,
      });
      if (!response.ok) return fallbackResult(cleaned, "provider-error");
      const body = await response.json() as GeminiResponse;
      const raw = body.output_text ?? body.response?.output_text ?? "";
      const parsed = parseProviderOutput(raw, cleaned);
      if (!parsed) return fallbackResult(cleaned, "invalid-provider-output");
      const nextMemory = [...turns, { role: "player" as const, text: cleaned.message }, { role: "npc" as const, text: parsed.speech }].slice(-(this.config.maxTurns * 2));
      this.memory.set(key, nextMemory);
      return { accepted: true, source: "gemini", npcId: cleaned.npcId, ...parsed, remainingCooldownMs: this.config.cooldownMs };
    } catch {
      return fallbackResult(cleaned, "provider-error");
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }
}

export const aiNpcService = new AiNpcService(readAiNpcConfig());
