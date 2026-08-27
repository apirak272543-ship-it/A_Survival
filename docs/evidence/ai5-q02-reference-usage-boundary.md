# AI-5 Q-02 Reference Usage Boundary Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `Q-02` |
| Requirement | reference Minecraft/other games without copying code/assets/branding |
| Owner | AI-5 |
| Branch/worktree | `ai-5/q02-reference-usage-boundary` / `/home/ubuntu/A_Survival-ai5-q02` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/referenceUsageBoundaryContract.ts`, `server/referenceUsageBoundaryContract.test.ts`, `docs/evidence/ai5-q02-reference-usage-boundary.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure contract สำหรับตรวจ metadata ของ reference usage ให้ชัดว่าใช้เพื่อ design/documentation เท่านั้น ไม่คัดลอก code/asset/branding ไม่เอา reference-only เป็น runtime asset และต้องมี source URL/label/usage note ที่ตรวจสอบย้อนกลับได้. งานนี้ไม่ดึงหรือคัดลอก asset ไม่แก้ visual/UI และไม่อ้าง license approval เกินหลักฐาน.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `Q-02` |
| Requirement | reference Minecraft/other games without copying code/assets/branding |
| Owner | AI-5 |
| Branch | `ai-5/q02-reference-usage-boundary` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/referenceUsageBoundaryContract.ts`, `server/referenceUsageBoundaryContract.test.ts`, `docs/evidence/ai5-q02-reference-usage-boundary.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/referenceUsageBoundaryContract.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | reference records ต้องมี HTTPS/source/usage/license/attribution, รองรับ design/documentation-only, เรียงผลแบบ deterministic และ fail-closed เมื่อคัดลอก code/asset/branding หรือพยายามนำ reference-only material ไปเป็น runtime asset |
| Blockers/limitations | contract ตรวจ metadata เท่านั้น ไม่ได้อนุมัติ license ไม่ได้ดึง/คัดลอก asset/code และไม่แทน legal review หรือ third-party permission |
| Merge request | branch จะ push ขึ้น origin หลัง commit; ยังไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก reference boundary checkpoint โดยตรง.
