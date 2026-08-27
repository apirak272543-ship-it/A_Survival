# TASK CLAIM

Task ID: `G-05`

Owner: `AI-6`

Branch/worktree: `ai-6/g05-asset-coverage` / `/home/ubuntu/A_Survival`

Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`

Files reserved:

- `server/generators/assetProvenanceCoverageContract.ts`
- `server/assetProvenanceCoverageContract.test.ts`
- `docs/AI_HANDOFF_G05_ASSET_COVERAGE_REPORT.md`
- `docs/AI_CLAIM_G05_ASSET_COVERAGE.md`

Status: `AVAILABLE -> RESERVED -> IN_PROGRESS`

Forbidden scope acknowledged: `yes`

ขอบเขต checkpoint นี้จำกัดอยู่ที่ pure, read-only contract สำหรับตรวจ coverage ของ asset references จาก canonical item/plant catalog เทียบกับ active asset-pack manifest และ provenance credits แบบ fail-closed. จะไม่สร้าง binary asset, ไม่แก้ Workbench/router, ไม่เปิด future map, ไม่เพิ่ม gameplay mutation/persistence/runtime publish และไม่อ้าง license หรือ device acceptance ที่ไม่มีหลักฐาน.
