# AI-5 S-02 Settings Scope Boundary Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `S-02` |
| Requirement | separate global vs in-map settings |
| Owner | AI-5 |
| Branch/worktree | `ai-5/s02-settings-scope-boundary` / `/home/ubuntu/A_Survival-ai5-s02` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/settingsScopeBoundaryContract.ts`, `server/settingsScopeBoundaryContract.test.ts`, `docs/evidence/ai5-s02-settings-scope-boundary.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure contract แยก key ของ global settings (ภาษา/เสียง/quality/touch preference) ออกจาก in-map settings (camera/view distance/target FPS) โดยใช้ canonical `GameSettings` และ `InMapSettings` จริง พร้อมตรวจ persistence scope และ focus/paused boundary แบบ read-only. งานนี้ไม่แก้ session persistence/UI ไม่แตะ Creator controls ไม่เปลี่ยน map policy และไม่อ้าง all-route/browser/device acceptance.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `S-02` |
| Requirement | separate global vs in-map settings |
| Owner | AI-5 |
| Branch | `ai-5/s02-settings-scope-boundary` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/settingsScopeBoundaryContract.ts`, `server/settingsScopeBoundaryContract.test.ts`, `docs/evidence/ai5-s02-settings-scope-boundary.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/settingsScopeBoundaryContract.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | global keys ถูกแยกจาก in-map camera/view/FPS keys, unknown key ถูก reject, per-scope update allow-list ทำงาน และ in-map apply gate ต้องอยู่บน focused paused in-map screen |
| Blockers/limitations | pure scope boundary เท่านั้น ไม่แก้ session persistence/UI ไม่เชื่อมทุก entry route ไม่เพิ่ม creator control และไม่อ้าง browser/device acceptance |
| Merge request | branch จะ push ขึ้น origin หลัง commit; ยังไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก settings checkpoint โดยตรง.
