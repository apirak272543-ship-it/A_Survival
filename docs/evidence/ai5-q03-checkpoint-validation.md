# AI-5 Q-03 Checkpoint Validation Evidence Contract

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `Q-03` |
| Requirement | run test/check/build/browser evidence before report |
| Owner | AI-5 |
| Branch/worktree | `ai-5/q03-checkpoint-validation` / `/home/ubuntu/A_Survival-ai5-q03` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/checkpointValidationContract.ts`, `server/checkpointValidationContract.test.ts`, `docs/evidence/ai5-q03-checkpoint-validation.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure contract สำหรับตรวจความครบถ้วนของ validation evidence ก่อนเขียน completion report โดยแยก `git diff --check`, type check, focused/full tests, build และ browser evidence ออกจากกันอย่างชัดเจน และไม่อนุญาตให้สถานะผ่านถูกสร้างจากข้อความลอย ๆ หรือผลที่ไม่ได้ระบุคำสั่ง/exit status. Contract นี้ไม่ execute command ไม่แก้ runtime และไม่อ้าง device/authenticated acceptance เอง.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `Q-03` |
| Requirement | run test/check/build/browser evidence before report |
| Owner | AI-5 |
| Branch | `ai-5/q03-checkpoint-validation` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/checkpointValidationContract.ts`, `server/checkpointValidationContract.test.ts`, `docs/evidence/ai5-q03-checkpoint-validation.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/checkpointValidationContract.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | contract บังคับ full commit SHA และ non-main branch, รายการไฟล์/คำสั่ง/exit code/summary ที่ตรวจได้, required checks ได้แก่ diff-check/typecheck/focused-test, พร้อม fail-closed ต่อ failed/not-run/duplicate/missing evidence และ bounded inputs |
| Blockers/limitations | contract ตรวจข้อมูล evidence ที่ส่งเข้าเท่านั้น ไม่ execute command เอง ไม่สร้าง browser/device/authenticated proof และไม่เปลี่ยน runtime/player behavior |
| Merge request | branch จะ push ขึ้น origin หลัง commit; ยังไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก checkpoint นี้โดยตรง.
