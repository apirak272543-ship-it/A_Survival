# AGENTS.md — Persistent Project Memory

## 🔒 Gemini API Usage Policy (MANDATORY — applies to every API call)

Key location: `.env` (`GEMINI_API_KEY`, `GEMINI_MODEL`). Never commit `.env`.

### Hard constraints (user-mandated, always enforced)

| Rule | Limit | Note |
|---|---|---|
| Max request rate | **≤ 15 requests/minute** | Treat as ceiling; prefer staying well below |
| Max batch per request | **≤ 15 items batched in one request** | Combine related prompts into a single call instead of many calls |
| Token budget | **Never let tokens run dry** | Design prompts to get maximum value per call |
| First-call analysis | **Always analyze/think on the first call** | Plan the full task in one well-designed request before issuing follow-ups |

### Observed facts about this key (verified 2026-08-23)

- Endpoint that works: `https://generativelanguage.googleapis.com/v1beta/...` (AI Studio key). Vertex AI (`aiplatform.googleapis.com`) returns 403 — do not use it.
- Response header shows `x-gemini-service-tier: standard` → **free tier** limits apply.
- Free-tier published limits (per project, not per key): Gemini 2.5 Flash ≈ 10 RPM / 250 RPD / 250k TPM; Flash-Lite ≈ 15 RPM / 1,000 RPD. Exceeding any dimension → HTTP 429.
- `gemini-2.5-flash` generateContent returns 404 for this project ("no longer available to new users"). Use `gemini-flash-latest`, `gemini-2.5-flash-lite`, or `gemini-3-flash-preview` instead.
- Model context: input 1,048,576 tokens / output 65,536 tokens (flash-latest), thinking supported.

### Operating rules for every command

1. **Think before calling.** Design the request once — include all needed context, questions, and expected output format in the first call. Never "probe" the API with exploratory calls.
2. **Batch aggressively.** Up to 15 related sub-prompts/units per single request (e.g., multiple asset prompts, multiple reviews) instead of separate calls.
3. **Rate guard.** Never fire more than 15 requests in any rolling minute; space bursts with sleeps if needed. On HTTP 429, stop and apply exponential backoff — do not retry loops.
4. **Token frugality.** Request concise structured output (JSON/bullets). Avoid re-sending large unchanged context; summarize and carry forward only what is needed.
5. **Daily budget awareness.** Free tier RPD is small (≈250/day on Flash). Track cumulative calls in a session and warn the user before approaching ~200/day.
6. **Cost-effectiveness first.** Before any API call, ask: "Is this the most valuable use of one request?" If a task can be done locally (grep, code, math), do it locally — spend API calls only where LLM judgment is required.
