# TASK CLAIM

Task ID: `G-02`

Requirement: `G-02` — hard spatial bounds/surface/height/slope/water/overlap/clearance/support repair

Owner: `AI-4`

Branch/worktree: `ai-4/g02-world-spatial` — `/home/ubuntu/A_Survival-ai4-g02`

Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`

Files reserved:

- `server/worldSpatialCoverageContract.ts` (new pure audit adapter)
- `server/worldSpatialCoverageContract.test.ts` (new focused tests)
- `docs/evidence/ai4-g02-world-spatial-claim.md`

Read-only dependencies inspected: `server/generators/worldSpatialDependencyGraph.ts`, `server/worldSpatialDependencyGraph.test.ts`, `tools/world-generator.ts`, and `tools/worldSpatialConstraints.ts`.

Status: `AVAILABLE -> RESERVED -> IN_PROGRESS`

Forbidden scope acknowledged: `yes`

Planned bounded checkpoint: เพิ่ม pure deterministic audit ที่ตรวจ artifact/validation/placement assessments จาก real `buildWorldSpatialDependencyGraph` ให้ครอบคลุม bounded placement subjects สูงสุด 12 รายการ ตรวจ node/dependency/policy/hash และรายงาน required blocker เมื่อ generated world หรือ placement proof ไม่ผ่าน โดยไม่เปิด player generator UI, ไม่แก้ map allow-list/future-map policy, ไม่เขียน persistence/cache, ไม่ทำ migration, ไม่เพิ่ม runtime world generation caller และไม่อ้าง universal/device acceptance เกินหลักฐาน.
