# AI-5 V-04 Asset Credit Provenance Boundary Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `V-04` |
| Requirement | external/community asset มี license/provenance/เครดิต และ unknown license ห้ามเป็น runtime asset |
| Owner | AI-5 |
| Branch/worktree | `ai-5/v04-asset-credit-boundary` / `/home/ubuntu/A_Survival-ai5-v04` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/assetCreditRuntimeBoundaryContract.ts`, `server/assetCreditRuntimeBoundaryContract.test.ts`, `docs/evidence/ai5-v04-asset-credit-boundary.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure contract สำหรับ audit `AssetCredit` records จาก registry ที่มีอยู่ โดยแยก project-original/license-verified ออกจาก reference-only/awaiting-contact ตรวจ field สำคัญ เช่น creator, attribution, source reference และ license พร้อม deny runtime distribution เมื่อ provenance ไม่ครบ. งานนี้ไม่สร้าง asset ไม่แก้ asset registry ไม่แก้ Credits UI ไม่ publish และไม่อ้าง license approval เกินข้อมูลใน source.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `V-04` |
| Requirement | external/community asset มี license/provenance/เครดิต และ unknown license ห้ามเป็น runtime asset |
| Owner | AI-5 |
| Branch | `ai-5/v04-asset-credit-boundary` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/assetCreditRuntimeBoundaryContract.ts`, `server/assetCreditRuntimeBoundaryContract.test.ts`, `docs/evidence/ai5-v04-asset-credit-boundary.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/assetCreditRuntimeBoundaryContract.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | แยก project-original/license-verified ที่มีข้อมูลครบออกจาก reference-only/awaiting-contact, ตรวจ creator/attribution/license/source reference, ป้องกัน duplicate IDs และ deny required runtime distribution เมื่อ provenance ไม่ครบ |
| Blockers/limitations | contract เป็น read-only audit ไม่แก้ asset registry ไม่สร้าง binary asset ไม่ publish ไม่รับรอง license จากภายนอก ไม่เพิ่ม Credits UI และไม่ใช่ device/runtime acceptance |
| Merge request | branch จะ push ขึ้น origin หลัง commit; ยังไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก provenance checkpoint โดยตรง.
