# TASK CLAIM

Task ID: `T-05` (bounded metadata-validation sub-checkpoint)

Owner: `AI-6`

Branch/worktree: `ai-6/t05-package-validation` / `/home/ubuntu/A_Survival`

Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`

Files reserved:

- `server/creatorPackageValidationContract.ts`
- `server/creatorPackageValidationContract.test.ts`
- `docs/AI_CLAIM_T05_PACKAGE_VALIDATION.md`
- `docs/AI_HANDOFF_T05_PACKAGE_VALIDATION_REPORT.md`

Status: `AVAILABLE -> RESERVED -> IN_PROGRESS`

Forbidden scope acknowledged: `yes`

ขอบเขตนี้เป็น bounded pure/read-only sub-checkpoint ของ T-05 เท่านั้น: ตรวจ metadata package ที่สร้างจาก creator-domain artifact ให้มี identity/hash/provenance/runtime policy ที่สอดคล้องและปิด future-map/runtime import ด้วย required reason codes. จะไม่แก้ CreatorStudio/CreatorDomainWorkbench/router, ไม่เขียนฐานข้อมูลหรือ object storage, ไม่ทำ publish/import, ไม่สร้าง binary asset และไม่อ้างว่า T-05 ปิดครบทั้ง drag/drop editor, pixel/mobile editor หรือ production registration/export.

Dependency note: T-04 และ G-05 ยังมี acceptance gap ในระดับ backlog; sub-checkpoint นี้จึงตรวจเฉพาะ contract ที่ owner ปัจจุบันมีอยู่จริงและคงข้อจำกัดที่ยังไม่พร้อมเป็น blocker แทนการสมมติว่า dependency ปิดแล้ว.
