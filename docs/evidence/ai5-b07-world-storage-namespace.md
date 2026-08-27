# AI-5 B-07 World Storage Namespace Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `B-07` |
| Requirement | world storage แยกจาก player/global inventory และไม่ข้าม map โดยอัตโนมัติ |
| Owner | AI-5 |
| Branch/worktree | `ai-5/b07-world-storage-namespace` / `/home/ubuntu/A_Survival-ai5-b07` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/worldStorageNamespaceContract.ts`, `server/worldStorageNamespaceContract.test.ts`, `docs/evidence/ai5-b07-world-storage-namespace.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure contract สำหรับตรวจ namespace และ transfer boundary ของ world storage โดยบังคับ `world-map` scope, ผูก storage กับ mapId เดียว, แยกจาก player/global namespace และ deny cross-map mutation โดย default. งานนี้ไม่แก้ inventory UI ไม่ทำ migration ไม่เขียน database ไม่เพิ่ม multi-world/network logic และไม่เปลี่ยน carry limit.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `B-07` |
| Requirement | world storage แยกจาก player/global inventory และไม่ข้าม map โดยอัตโนมัติ |
| Owner | AI-5 |
| Branch | `ai-5/b07-world-storage-namespace` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/worldStorageNamespaceContract.ts`, `server/worldStorageNamespaceContract.test.ts`, `docs/evidence/ai5-b07-world-storage-namespace.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/worldStorageNamespaceContract.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | world storage key ผูกกับ mapId/storageId แบบ deterministic, scope `world-map` ถูกแยกจาก `player-global`, same-map transfer ผ่าน และ cross-map/player-global namespace ถูกปฏิเสธ |
| Blockers/limitations | contract เป็น pure boundary ยังไม่ wire เข้ากับ storage system/router ไม่ทำ migration ไม่เขียน database ไม่เพิ่ม multi-world/network logic และไม่เปลี่ยน carry limit |
| Merge request | branch จะ push ขึ้น origin หลัง commit; ยังไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก namespace checkpoint โดยตรง.
