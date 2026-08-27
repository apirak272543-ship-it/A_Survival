# TASK CLAIM

Task ID: `T-06`

Requirement: `T-06` — structure/building generator placement/asset/biome/road/interior/mob rules

Owner: `AI-4`

Branch/worktree: `ai-4/t06-structure-coverage` — `/home/ubuntu/A_Survival-ai4-t06`

Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`

Files reserved:

- `server/structureGeneratorCoverageContract.ts` (new pure audit adapter)
- `server/structureGeneratorCoverageContract.test.ts` (new focused tests)
- `docs/evidence/ai4-t06-structure-coverage-claim.md`

Read-only dependency inspected: `server/generators/structureGenerator.ts`, including `validateStructureBlueprints`, `generateStructurePlacements`, `validateStructureGenerationOutput`, `STRUCTURE_BLUEPRINT_LIBRARY`, and `structureGeneratorPlugin`.

Status: `AVAILABLE -> RESERVED -> IN_PROGRESS`

Forbidden scope acknowledged: `yes`

Planned bounded checkpoint: เพิ่ม pure deterministic coverage adapter ที่ตรวจ canonical blueprint library, placement rule bounds, generation child/spawn ranges, asset reference provenance และ output validation โดยไม่สร้าง asset bytes, ไม่เปิด player generator UI, ไม่แก้ map allow-list, ไม่แก้ runtime caller, ไม่เขียน persistence/cache, ไม่ทำ migration และไม่อ้าง universal/device acceptance เกินหลักฐาน.
