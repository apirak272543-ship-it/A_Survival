# AI-3 G-02 World Spatial Acceptance Contract

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `G-02` |
| Requirement | hard spatial bounds/surface/height/slope/water/overlap/clearance/support repair |
| Owner | AI-3 |
| Branch/worktree | `ai3/g02-spatial-acceptance-contract` / `/home/ubuntu/A_Survival-g02` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/spatialAcceptanceContract.ts`, `server/spatialAcceptanceContract.test.ts`, `docs/evidence/ai3-g02-spatial-acceptance-contract.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

เพิ่ม pure `validateWorldSpatialAcceptance` เป็น acceptance gate สำหรับ output จาก `buildWorldSpatialDependencyGraph`. Contract ตรวจ artifact identity ของ Obsidian, seed/radius และ content hash, summary counts ที่ต้องสอดคล้องกับ placement assessments, bounded sample count, unique placement subjects, finite surface values, rejection reasons และ validation counts ที่ internally consistent.

Gate นี้บังคับ invariant สำคัญของ spatial artifact ว่า `runtimeImportAllowed`, `playerVisible` และ `cacheable` ต้องเป็น `false`. ดังนั้น world spatial graph ที่ส่งต่อเป็น evidence จะไม่ถูกตีความเป็น player map selection, runtime import หรือ cacheable future-world artifact โดยปริยาย. Malformed summary และ policy violation ถูก reject แบบ fail-closed.

Checkpoint นี้ไม่แก้ `worldGenerator.ts`, `worldSpatialConstraints`, player generator UI, route, map/cache/offline policy หรือ persistence caller. เป็น output acceptance slice ที่ห่อ dependency graph เดิม; exported artifact proof, universal/world-wide coverage และ full G-01/G-02 acceptance ยังไม่ถูกอ้างว่าเสร็จ.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `pnpm exec vitest run server/spatialAcceptanceContract.test.ts --reporter=verbose` | ผ่าน `1` test file / `3` tests |
| `pnpm check` | ผ่าน |
| Full test command | `pnpm test -- --run` ผ่าน; `121` test files / `503` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| `git diff --check` | ผ่านหลัง validation และต้องรันซ้ำก่อน commit |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| Determinism | seed และ bounded subjects เดิมให้ content hash และ acceptance result เดิม |
| Policy boundary | runtime import/player visible/cacheable ที่เป็น true ถูก reject |
| Runtime side effects | contract เป็น read-only; ไม่มี network/cache/IndexedDB/database write หรือ player UI mutation |

## Limitations and blockers

G-02 ตาม backlog ยังขึ้นกับ G-01 และ acceptance ของ exported artifact/world-wide coverage. Contract นี้ไม่ทำให้ graph เดิมกลายเป็น universal generator, ไม่ทดสอบทุก biome/device และไม่แทน screenshot/browser/production evidence. AI-0 ต้องตรวจว่า output acceptance slice นี้สอดคล้องกับงาน G-01/G-05 และ open PR อื่นก่อน merge.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `G-02` |
| Requirement | `G-02` bounded spatial acceptance sub-checkpoint |
| Owner | AI-3 |
| Branch | `ai3/g02-spatial-acceptance-contract` |
| Commit SHA | `43188d1806f2170e2d042a5ee6fb0b13cdfb978c` |
| Files changed | `server/spatialAcceptanceContract.ts`, `server/spatialAcceptanceContract.test.ts`, `docs/evidence/ai3-g02-spatial-acceptance-contract.md` |
| Checks | focused `1/3`, `pnpm check`, full `121` files / `503` tests, `git diff --check` และ heap-limited build ผ่าน |
| Result | bounded spatial output acceptance gate พร้อม non-runtime policy invariant |
| Blockers/limitations | ไม่ใช่ full G-02/G-01 completion; ยังไม่มี universal exported artifact/device/player acceptance; ต้อง AI-0 review |
| Merge request | PR จะใช้ชื่อ `[AI-3][G-02]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff และ build |
