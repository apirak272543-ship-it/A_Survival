# AI-5 M-02/S-04 Runtime Visibility Budget Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `M-02` |
| Requirement | render/load ใกล้ player และปรับตามสเปก |
| Related requirement | `S-04` adaptive performance tiers/visibility policy |
| Owner | AI-5 |
| Branch/worktree | `ai-5/m02-runtime-visibility-budget` / `/home/ubuntu/A_Survival-ai5-m02` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/runtimeVisibilityBudgetContract.ts`, `server/runtimeVisibilityBudgetContract.test.ts`, `docs/evidence/ai5-m02-runtime-visibility-budget.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure adapter สำหรับเชื่อม performance tier กับ visibility/LOD/shadow/particle budgets ที่มีอยู่จริง โดย normalize requested view distance/FPS ผ่าน `getPerformanceBudget`, รายงาน budget exceedance และคง render-loop generator/asset-generation/cache-write เป็น false. งานนี้ไม่ทำ device benchmark ไม่แก้ render loop ไม่อ้าง GPU/mobile acceptance และไม่แตะ map/cache/offline/Workbench/router.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `M-02` |
| Related requirement | `S-04` |
| Requirement | render/load ใกล้ player และปรับตามสเปก |
| Owner | AI-5 |
| Branch | `ai-5/m02-runtime-visibility-budget` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/runtimeVisibilityBudgetContract.ts`, `server/runtimeVisibilityBudgetContract.test.ts`, `docs/evidence/ai5-m02-runtime-visibility-budget.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/runtimeVisibilityBudgetContract.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | เชื่อม `getPerformanceBudget` กับ tier/view-distance/FPS/LOD/shadow/particle policy, รายงาน particle over-budget และคง `renderLoopGeneratorCallsAllowed=false`, `assetGenerationAllowed=false`, `cacheWriteAllowed=false`, `sleepOutsideRadius=true` |
| Blockers/limitations | เป็น pure adapter ไม่แก้ render loop ไม่ทำ culling/occlusion/pooling จริง ไม่ทำ device benchmark ไม่อ้าง GPU/mobile acceptance และไม่เปลี่ยน map/cache/offline/Workbench/router |
| Merge request | branch จะ push ขึ้น origin หลัง commit; ยังไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก visibility checkpoint โดยตรง.
