# TASK CLAIM

Task ID: `AI1-PERF-001`

Requirement: `T-01`, `S-04` — เชื่อม performance profile กับ runtime visibility/telemetry/profiler แบบ pure, deterministic และ read-only

Owner: `AI-4`

Branch/worktree: `ai-4/ai1-perf-001` — `/home/ubuntu/A_Survival-ai4-perf`

Base SHA: `2998e3478480a6187916cf86bb00af0f741acda2`

Files reserved:

- `client/src/game/systems/runtimePerformanceContract.ts` (new pure adapter)
- `server/runtimePerformanceContract.test.ts` (new focused tests)
- `docs/evidence/ai4-ai1-perf-001-claim.md`

Read-only dependencies inspected: `client/src/game/systems/performanceProfile.ts`, `client/src/game/systems/runtimePerformanceTelemetry.ts`, `client/src/game/systems/runtimeVisibilitySystem.ts`, `server/generators/runtimePerformanceProfiler.ts`, and their existing tests.

Status: `AVAILABLE -> RESERVED -> IN_PROGRESS`

Forbidden scope acknowledged: `yes`

Planned bounded checkpoint: เพิ่ม pure adapter ใหม่ที่คืน budget เดียวกันสำหรับ visibility, telemetry และ profiler โดยอิง owner ปัจจุบัน ไม่เพิ่ม runtime caller, render-loop generation, player profiler UI, device benchmark, persistence/cache write, map policy, authority/auth, asset bytes หรือ database/migration.
