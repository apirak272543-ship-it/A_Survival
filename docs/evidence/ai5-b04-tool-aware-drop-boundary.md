# AI-5 B-04 — Tool-aware block drop boundary

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `B-04` |
| Requirement | wrong tool no drop, correct tool placeable block drop |
| Owner | AI-5 |
| Branch/worktree | `ai-5/b04-tool-aware-drop-boundary` / `/home/ubuntu/A_Survival-ai5-b04` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/toolAwareBlockDropBoundaryContract.ts`, `server/toolAwareBlockDropBoundaryContract.test.ts`, this evidence document |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Intended pure scope

This checkpoint will provide a deterministic read-only projection over the existing block definition and `resolveBlockBreak` behavior: a known definition must yield a block-item drop only when its required tool tag matches, while an incorrect or absent tool yields no drop; broken/unknown blocks fail closed. It will also expose the distinction between a placeable block item and a material-only drop without mutating inventory or world overrides.

It will not edit `blockActionSystem.ts`, `blockModules.ts`, inventory/persistence callers, router/UI, gameplay authority, database, map policy, or creator tools. It will not claim a universal combat/drop transaction, inventory capacity integration, durability mutation, browser/device acceptance, or production gameplay completion.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `B-04` |
| Requirement | wrong tool no drop, correct tool placeable block drop |
| Owner | AI-5 |
| Branch | `ai-5/b04-tool-aware-drop-boundary` |
| Commit SHA | ตรวจหลัง commit ก่อน push และรายงานเป็น full SHA |
| Files changed | `server/toolAwareBlockDropBoundaryContract.ts`, `server/toolAwareBlockDropBoundaryContract.test.ts`, `docs/evidence/ai5-b04-tool-aware-drop-boundary.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/toolAwareBlockDropBoundaryContract.test.ts`: 1 file / 5 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 505 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | projection แบบ deterministic ยืนยัน matching tool ให้ block-item drop, wrong/absent tool ให้ no drop, shears/axe/pickaxe ตาม canonical definitions, และ unknown/broken block fail closed พร้อม read-only policy |
| Blockers/limitations | pure adapter เท่านั้น ไม่แก้ `blockActionSystem.ts`, ไม่ mutate inventory/world override/durability, ไม่เพิ่ม universal transaction, capacity integration, browser/device acceptance หรือ production gameplay claim |
| Merge request | branch จะ push ขึ้น origin หลัง commit; AI-5 ไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ source/diff/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และ Babylon vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก B-04 checkpoint โดยตรง.
