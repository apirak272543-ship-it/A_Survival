# AI-5 B-05 — World-state persistence boundary

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `B-05` |
| Requirement | placement/state persists across reload/map |
| Owner | AI-5 |
| Branch/worktree | `ai-5/b05-world-state-persistence-boundary` / `/home/ubuntu/A_Survival-ai5-b05` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/worldStatePersistenceBoundaryContract.ts`, `server/worldStatePersistenceBoundaryContract.test.ts`, this evidence document |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Intended pure scope

This checkpoint will provide a deterministic, read-only boundary for map-local world block state: only `obsidian-frontier` is write-eligible, the composite `mapId + playerId` namespace is explicit, reload hydration accepts block overrides without mutating the generated module, and future-map or cross-player/map writes fail closed. It will reuse the existing `WorldBlock` and `ObsidianWorldModule` data contracts as inputs without editing their owners.

It will not edit `indexedDb.ts`, `mapCache.ts`, `worldBlockPersistence.test.ts`, `offlineMapState.test.ts`, `worldStorageSystem.ts`, `directRoute.ts`, map selection, database schema, router, UI, or any creator/runtime caller. It will not claim that actual persistence, reload, cross-device synchronization, or multi-map acceptance is complete; those remain integration/device concerns for AI-0.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `B-05` |
| Requirement | placement/state persists across reload/map |
| Owner | AI-5 |
| Branch | `ai-5/b05-world-state-persistence-boundary` |
| Commit SHA | ตรวจหลัง commit ก่อน push และรายงานเป็น full SHA |
| Files changed | `server/worldStatePersistenceBoundaryContract.ts`, `server/worldStatePersistenceBoundaryContract.test.ts`, `docs/evidence/ai5-b05-world-state-persistence-boundary.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/worldStatePersistenceBoundaryContract.test.ts`: 1 file / 5 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 505 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | สร้าง namespace แบบ `mapId::playerId`, อนุญาต world-state write เฉพาะ `obsidian-frontier`, ตรวจพิกัด block และ module-id/null tombstone แบบ deterministic, และแยก namespace ข้าม map/player แบบ fail-closed โดยไม่ mutate generated module |
| Blockers/limitations | เป็น pure boundary/read-only contract ไม่ได้เรียก IndexedDB หรือแก้ persistence caller, ไม่ได้เพิ่ม reload/cross-device E2E, ไม่ได้แก้ map cache/router/UI/database และไม่อ้าง multi-map หรือ device acceptance |
| Merge request | branch จะ push ขึ้น origin หลัง commit; AI-5 ไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ source/diff/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และ Babylon vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก B-05 checkpoint โดยตรง.
