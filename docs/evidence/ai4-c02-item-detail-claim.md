# TASK CLAIM

Task ID: `C-02`

Requirement: `C-02` — category-specific item detail damage/plant/stack/usage

Owner: `AI-4`

Branch/worktree: `ai-4/c02-item-detail` — `/home/ubuntu/A_Survival-ai4-c02`

Base SHA: `6ef111c47cc6184c34a5030a4d419a4078a02c2f`

Files reserved:

- `server/itemDetailCoverageContract.ts` (new pure audit adapter)
- `server/itemDetailCoverageContract.test.ts` (new focused tests)
- `docs/evidence/ai4-c02-item-detail-claim.md`

Read-only dependencies inspected: `client/src/game/data/catalog.ts`, `client/src/game/systems/itemDetailSystem.ts`, and `server/itemDetailSystem.test.ts`.

Status: `AVAILABLE -> RESERVED -> IN_PROGRESS`

Forbidden scope acknowledged: `yes`

Planned bounded checkpoint: เพิ่ม pure deterministic audit ที่ตรวจว่า item detail ใช้ข้อมูลจาก canonical definitions จริง มี usage/stack facts และ category-specific facts ตาม field ที่ source มีอยู่ พร้อมรายงาน unavailable combat/plant/tool/block fields เป็น explicit blockers โดยไม่สร้างตัวเลข ไม่แก้ player UI, persistence, runtime mutation, map policy, authority, asset, database หรือ migration.
