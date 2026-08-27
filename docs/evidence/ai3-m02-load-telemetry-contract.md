# AI-3 M-02 Runtime Load Telemetry Contract

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `M-02` |
| Requirement | render/load ใกล้ player และปรับตามสเปก |
| Owner | AI-3 |
| Branch/worktree | `ai3/m02-load-telemetry-contract` / `/home/ubuntu/A_Survival-m02` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/loadTelemetryContract.ts`, `server/loadTelemetryContract.test.ts`, `docs/evidence/ai3-m02-load-telemetry-contract.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

เพิ่ม pure `validateLoadTelemetry` สำหรับตรวจ snapshot จาก runtime performance sampler โดยไม่เปลี่ยน render loop. Contract ตรวจ target FPS `5..120`, sample window `0..60,000 ms`, bounded rendered/throttled frame counts, non-negative frame metrics, ความสัมพันธ์ `p95 <= worst`, และ invariant `activeMeshes <= totalMeshes`. ผลลัพธ์คำนวณ `frameBudgetMs` และ `activeMeshRatio` เพื่อให้ downstream visibility/performance owner ใช้เป็น telemetry evidence ได้โดยไม่สร้าง benchmark claim.

Checkpoint นี้ไม่ปรับ GPU, LOD, culling, streaming, pooling, device tier, mobile/WebView หรือ render-loop behavior. เป็น telemetry integrity sub-checkpoint ของ M-02; controlled benchmark และ visibility policy ต้องแยกตรวจโดย owner ของ T-01/S-04.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `pnpm exec vitest run server/loadTelemetryContract.test.ts --reporter=verbose` | ผ่าน `1` test file / `3` tests |
| `pnpm check` | ผ่าน |
| Full test command | `pnpm test -- --run` ผ่าน; `121` test files / `503` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| `git diff --check` | ผ่านหลัง validation และต้องรันซ้ำก่อน commit |
| Valid snapshot | frame budget และ active mesh ratio ถูกคำนวณ deterministic |
| Empty intervals | null frame metrics ถูกยอมรับเมื่อ sampler ยังไม่มี interval |
| Malformed snapshot | target/count/window/metric/mesh violations ถูก reject |
| Runtime side effects | ไม่มี network/cache/IndexedDB/database write และไม่มี render-loop integration |
| Benchmark/device acceptance | ไม่ได้อ้างและไม่ได้ทดสอบ |

## Limitations

Contract นี้ตรวจความสมบูรณ์ของ telemetry snapshot ไม่ใช่การวัดว่า render/load อยู่ใกล้ player จริงหรือปรับตาม hardware ได้จริง. ยังไม่มี controlled benchmark, device matrix, WebGL/WebGPU measurement, visibility caller, chunk streaming หรือ browser evidence. M-02 ยังคง `PARTIAL` จนกว่า dependency T-01/S-04 และ acceptance ที่ backlog ระบุจะผ่าน.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `M-02` |
| Requirement | `M-02` bounded telemetry sub-checkpoint |
| Owner | AI-3 |
| Branch | `ai3/m02-load-telemetry-contract` |
| Commit SHA | `a517016d9769b666d23269b65b6fe5f87adbe593` |
| Files changed | `server/loadTelemetryContract.ts`, `server/loadTelemetryContract.test.ts`, `docs/evidence/ai3-m02-load-telemetry-contract.md` |
| Checks | focused `1/3`, `pnpm check`, full `121` files / `503` tests, `git diff --check` และ heap-limited build ผ่าน |
| Result | bounded telemetry integrity contract พร้อม frame-budget/active-mesh derived signals |
| Blockers/limitations | ไม่ใช่ benchmark/visibility/streaming completion; ต้อง AI-0 review |
| Merge request | PR จะใช้ชื่อ `[AI-3][M-02]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff และ build |
