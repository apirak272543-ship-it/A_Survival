# AI-5 L-01 Thai-first Copy Policy Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `L-01` |
| Requirement | Thai default colloquial copy, no over-formal wording |
| Owner | AI-5 |
| Branch/worktree | `ai-5/l01-thai-copy-policy` / `/home/ubuntu/A_Survival-ai5-l01` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/thaiCopyPolicyContract.ts`, `server/thaiCopyPolicyContract.test.ts`, `docs/evidence/ai5-l01-thai-copy-policy.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure contract สำหรับตรวจ copy record ว่ามีข้อความไทยเป็น default, มี fallback ที่ไม่ว่าง, ไม่ใช้ถ้อยคำราชการ/แข็งเกินจำเป็นตามรายการต้องห้าม และแยก developer/admin copy ออกจาก player copy. งานนี้ไม่แก้ UI ไม่อ้างว่าเป็น screen-by-screen language audit และไม่แตะ Creator Workbench/router.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `L-01` |
| Requirement | Thai default colloquial copy, no over-formal wording |
| Owner | AI-5 |
| Branch | `ai-5/l01-thai-copy-policy` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/thaiCopyPolicyContract.ts`, `server/thaiCopyPolicyContract.test.ts`, `docs/evidence/ai5-l01-thai-copy-policy.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/thaiCopyPolicyContract.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | policy ตรวจ Thai default/fallback, surface player/creator/developer/admin, duplicate/invalid IDs, bounded copy list และบล็อก formal phrase ใน player/creator copy แบบ deterministic |
| Blockers/limitations | pure policy contract ไม่ได้ทำ screen-by-screen UI audit ไม่แก้ข้อความใน UI ไม่ยืนยันทุกหน้าจอ/creator tool และไม่อ้าง locale/device acceptance |
| Merge request | branch จะ push ขึ้น origin หลัง commit; ยังไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก Thai copy checkpoint โดยตรง.
