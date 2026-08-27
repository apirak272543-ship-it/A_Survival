# TASK CLAIM

Task ID: `B-03`

Requirement: `B-03` — support/gravity/float rule registry

Owner: `AI-4`

Branch/worktree: `ai-4/b03-block-support` — `/home/ubuntu/A_Survival-ai4-b03`

Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`

Files reserved:

- `server/blockSupportGravityCoverageContract.ts` (new pure audit adapter)
- `server/blockSupportGravityCoverageContract.test.ts` (new focused tests)
- `docs/evidence/ai4-b03-block-support-claim.md`

Read-only dependency inspected: `server/generators/blockSupportGravityDependencyGraph.ts` and its canonical `readActiveBlockSupportGravitySources()` / `buildBlockSupportGravityDependencyGraph()` owner.

Status: `AVAILABLE -> RESERVED -> IN_PROGRESS`

Forbidden scope acknowledged: `yes`

Planned bounded checkpoint: เพิ่ม pure deterministic coverage adapter ที่อ่าน summary/artifact/graph ของ B-03 owner จริง ตรวจ definitions, support/gravity/float counts, expected issue state, source hash และ read-only policy โดยไม่เปลี่ยน physics/runtime caller, block placement, persistence/cache, map scope, authority, asset, database หรือ migration.
