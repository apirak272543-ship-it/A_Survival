# TASK CLAIM

Task ID: `G-04` (bounded content-generation-suite contract sub-checkpoint)

Owner: `AI-6`

Branch/worktree: `ai-6/g04-suite-contract` / `/home/ubuntu/A_Survival`

Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`

Files reserved:

- `server/generators/contentGenerationSuiteContract.ts`
- `server/contentGenerationSuiteContract.test.ts`
- `docs/AI_CLAIM_G04_SUITE_CONTRACT.md`
- `docs/AI_HANDOFF_G04_SUITE_CONTRACT_REPORT.md`

Status: `AVAILABLE -> RESERVED -> IN_PROGRESS`

Forbidden scope acknowledged: `yes`

ขอบเขตนี้เป็น bounded pure/read-only contract สำหรับตรวจ declaration ของ Content Generation Suite ให้ครอบคลุม domain capability ที่ backlog ระบุ ได้แก่ definition, model, texture, skin, variant และ gameplay พร้อม generator identity, version, provenance และ fixed runtime-denial policy จะไม่เพิ่ม player generator UI, ไม่แก้ CreatorDomainWorkbench/router, ไม่สร้าง binary asset, ไม่เรียก LLM/image generation, ไม่เขียน database/storage/cache และไม่อ้างว่าเป็น runtime orchestrator หรือปิด G-04 ทั้งหมด.

Dependency note: G-01 และ G-05 ยังมี acceptance gap ในระดับ backlog และมี worker PR อยู่ระหว่าง review; checkpoint นี้ตรวจเฉพาะ suite declaration contract แบบ bounded และรายงานข้อจำกัดแทนการสมมติว่า dependency ปิดแล้ว.
