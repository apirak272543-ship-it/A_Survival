# AI-5 G-06 AI NPC Policy Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `G-06` |
| Requirement | optional one AI NPC/map, server-only/on-demand/default disabled |
| Owner | AI-5 |
| Branch/worktree | `ai-5/g06-ai-npc-policy` / `/home/ubuntu/A_Survival-ai5-g06` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/aiNpcRuntimePolicyContract.ts`, `server/aiNpcRuntimePolicyContract.test.ts`, `docs/evidence/ai5-g06-ai-npc-policy.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure policy contract สำหรับตรวจ config และ request boundary ของ AI NPC โดยยืนยัน one-NPC-per-map, server-only provider, on-demand interaction, default-disabled kill switch, one action per turn และ no direct mutation ต่อ block/inventory/chest/currency/quest/database. งานนี้ไม่เรียก provider ไม่ส่ง secret ไม่สร้าง background loop และไม่แก้ player UI หรือ map policy.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `G-06` |
| Requirement | optional one AI NPC/map, server-only/on-demand/default disabled |
| Owner | AI-5 |
| Branch | `ai-5/g06-ai-npc-policy` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/aiNpcRuntimePolicyContract.ts`, `server/aiNpcRuntimePolicyContract.test.ts`, `docs/evidence/ai5-g06-ai-npc-policy.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/aiNpcRuntimePolicyContract.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | policy contract บังคับ one NPC/map, default disabled, server-only provider, player-interaction source, cooldown/action limits, no browser secret exposure และ empty direct-mutation domains; unsafe turn request ถูกลดเป็น `none` |
| Blockers/limitations | contract เป็น policy gate ไม่เรียก Gemini/provider ไม่สร้าง background loop ไม่แก้ `aiNpcService`/player UI ไม่ยืนยัน API key/health/integration/browser proof และไม่ใช่ production acceptance |
| Merge request | branch จะ push ขึ้น origin หลัง commit; ยังไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก policy checkpoint โดยตรง.
