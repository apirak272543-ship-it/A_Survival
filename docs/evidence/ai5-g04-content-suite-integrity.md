# AI-5 G-04 Content Suite Integrity Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `G-04` |
| Requirement | Reusable Content Generation Suite definition/model/texture/skin/variant/gameplay |
| Owner | AI-5 |
| Branch/worktree | `ai-5/g04-content-suite-integrity` / `/home/ubuntu/A_Survival-ai5-g04` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `tools/contentRegistry.ts`, `server/contentRegistry.test.ts`, `docs/evidence/ai5-g04-content-suite-integrity.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

เสริมการตรวจ integrity แบบ deterministic และ fail-closed ให้ `ContentSuiteBundle` ก่อน registration โดยตรวจ content hash, preview status และการลงทะเบียน definition ID ซ้ำ งานนี้ไม่สร้าง binary asset ไม่แก้ player UI ไม่เรียก generator ใน render loop ไม่เขียน cache/IndexedDB/database และไม่เปิด runtime publish หรือ future map.

การเปลี่ยนแปลงต้องยืนยันว่า bundle ที่ผ่าน registry ยังอ้างอิง component ภายในชุดเดียวกัน, hash สอดคล้องกับ payload ที่ตรวจได้, preview ไม่ประกาศ `bound` เมื่อ asset ยังไม่ bound และ registry ไม่เขียนทับ definition ID เดิมโดยเงียบ.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `G-04` |
| Requirement | Reusable Content Generation Suite definition/model/texture/skin/variant/gameplay |
| Owner | AI-5 |
| Branch | `ai-5/g04-content-suite-integrity` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `tools/contentRegistry.ts`, `server/contentRegistry.test.ts`, `docs/evidence/ai5-g04-content-suite-integrity.md` |
| Checks | `git diff --check` ผ่าน; `pnpm check` ผ่าน; focused `pnpm exec vitest run server/contentRegistry.test.ts`: 1 file / 8 tests ผ่าน; full `pnpm exec vitest run`: 120 files / 502 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | เพิ่มการตรวจ suite version และรูปแบบ SHA-256, ตรวจ content hash จาก payload จริง, ตรวจ preview ให้สอดคล้องกับ visual specification และสถานะ texture asset, รวมทั้งป้องกันการ register definition ID ซ้ำโดยเงียบ |
| Blockers/limitations | `cacheKey` ตรวจได้เฉพาะรูปแบบ SHA-256 เพราะ bundle ปัจจุบันไม่ได้เก็บ input canonical ไว้สำหรับ recompute; งานนี้ไม่เพิ่ม asset bytes, runtime caller, player UI, persistence, database/cache write, future-map behavior หรือ device acceptance |
| Merge request | ยังไม่ได้เปิดจาก sandbox นี้ |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence; implementation ยังไม่ merge เข้า `main` |

## Validation warnings

Production build ผ่าน แต่ยังมี warning เดิมจาก environment/configuration ได้แก่ตัวแปร `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก checkpoint นี้โดยตรง.
