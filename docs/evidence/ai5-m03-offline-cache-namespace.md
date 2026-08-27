# AI-5 M-03 Offline Cache Namespace Boundary Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `M-03` |
| Requirement | offline-first cache/integrity เล่นต่อเมื่อ network หาย |
| Owner | AI-5 |
| Branch/worktree | `ai-5/m03-offline-cache-namespace` / `/home/ubuntu/A_Survival-ai5-m03` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/offlineCacheNamespaceContract.ts`, `server/offlineCacheNamespaceContract.test.ts`, `docs/evidence/ai5-m03-offline-cache-namespace.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure contract สำหรับตรวจ cache/offline operation ต่อ map ID โดยอนุญาตเฉพาะ `obsidian-frontier` ตาม invariant ปัจจุบัน, แยก cache-ready/offline-write/read semantics และ fail-closed สำหรับ future map. งานนี้ไม่แก้ service worker, mapCache, IndexedDB, route/map registry ไม่ทำ airplane-mode/browser/device acceptance และไม่เขียน cache จริง.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `M-03` |
| Requirement | offline-first cache/integrity เล่นต่อเมื่อ network หาย |
| Owner | AI-5 |
| Branch | `ai-5/m03-offline-cache-namespace` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/offlineCacheNamespaceContract.ts`, `server/offlineCacheNamespaceContract.test.ts`, `docs/evidence/ai5-m03-offline-cache-namespace.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/offlineCacheNamespaceContract.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | cache key/eligibility/ready policy ผูกกับ `obsidian-frontier` เท่านั้น, offline read ต้องมี cache เดิม, future/unknown map ถูกปิด runtime import/player visibility/cache/offline-write แบบ fail-closed |
| Blockers/limitations | pure namespace policy เท่านั้น ไม่แก้ service worker/mapCache/IndexedDB/route ไม่เขียน cache จริง และไม่อ้าง airplane-mode/reconnect/device acceptance |
| Merge request | branch จะ push ขึ้น origin หลัง commit; ยังไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก offline namespace checkpoint โดยตรง.
