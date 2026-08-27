# TASK CLAIM

Task ID: `V-02`

Requirement: `V-02` — ไม่ใช้พื้นแบนหรือ glow กลืน player/pet/enemy

Owner: `AI-4`

Branch/worktree: `ai-4/v02-scene-contrast` — `/home/ubuntu/A_Survival-ai4-v02`

Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`

Files reserved:

- `server/sceneContrastCoverageContract.ts` (new pure audit adapter)
- `server/sceneContrastCoverageContract.test.ts` (new focused tests)
- `docs/evidence/ai4-v02-scene-contrast-claim.md`

Read-only dependencies inspected: `client/src/game/data/mapSceneTreatments.ts`, `client/src/game/scene.ts`, and the existing scene readability audit contract in open PR #36.

Status: `AVAILABLE -> RESERVED -> IN_PROGRESS`

Forbidden scope acknowledged: `yes`

Planned bounded checkpoint: เพิ่ม pure deterministic audit ที่อ่านสี terrain/sky/fog/light จาก `MAP_SCENE_TREATMENTS` ตรวจรูปแบบสี, luminance contrast และ light-intensity bounds พร้อมรายงาน blocker เมื่อข้อมูลฉากตรวจไม่ได้ โดยไม่แก้ Babylon runtime, player/pet/enemy assets, player controls, UI, map policy, persistence, authority, asset bytes, database หรือ migration. ผลนี้เป็น source-level audit ไม่ใช่ screenshot หรือ real-device acceptance.
