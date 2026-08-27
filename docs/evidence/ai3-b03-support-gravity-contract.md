# AI-3 B-03 Support and Gravity Contract

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `B-03` |
| Requirement | support/gravity/float rule registry |
| Owner | AI-3 |
| Branch/worktree | `ai3/b03-support-gravity-contract` / `/home/ubuntu/A_Survival-b03` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/supportGravityAcceptanceContract.ts`, `server/supportGravityAcceptanceContract.test.ts`, `docs/evidence/ai3-b03-support-gravity-contract.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

เพิ่ม pure support/gravity acceptance contract ที่ห่อ `hasAdjacentSupport` และ `getUnsupportedGravityBlocks` ของ owner เดิม. `evaluateSupportGravity` ตรวจ canonical block definition, integer coordinates, `canFloat` semantics และคืน reason ที่ deterministic สำหรับ `supported`, `floating-allowed`, `requires-support` หรือ `unknown-block`. `summarizeSupportGravity` และ `validateSupportGravitySummary` ตรวจจำนวน block ที่ต้องการ support, gravity-affected block, unsupported block และ safe flag ให้ตรงกับ world จริง.

Checkpoint นี้ไม่แก้ `blockPhysicsSystem.ts`, block registry, map allow-list, player UI หรือ persistence. จึงเป็น bounded acceptance slice สำหรับ B-03 ไม่ใช่การประกาศว่า support/gravity ใช้ได้กับทุก world หรือทุก block family แล้ว. การเชื่อม validator เข้ากับ placement/runtime mutation และการตรวจทุก exported artifact ต้องเปิด scope แยก.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `pnpm exec vitest run server/supportGravityAcceptanceContract.test.ts --reporter=verbose` | ผ่าน `1` test file / `4` tests |
| `pnpm check` | ผ่าน |
| Full test command | `pnpm test -- --run` ผ่าน; `121` test files / `504` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| `git diff --check` | ผ่านหลัง validation และต้องรันซ้ำก่อน commit |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| Support behavior | supported block accepted; unsupported floating placement rejected |
| Float behavior | canonical `leaves.obsidian` accepted without adjacent support when `canFloat=true` |
| Malformed behavior | unknown block and non-integer coordinate fail closed |
| Summary integrity | deterministic counts and tampered summary rejection ผ่าน |
| Runtime side effects | ไม่มี network/cache/IndexedDB/database write และไม่มี UI/render-loop integration |

## Limitations and blockers

B-03 ตาม backlog ยังขึ้นกับ B-01 และ B-02. Report นี้ไม่ได้ตรวจ device physics, world-wide block coverage, gravity simulation tick, player movement collision, persistence caller หรือ browser acceptance. AI-0 ต้องตรวจ dependency, exact file scope และความสอดคล้องกับ B-01/B-02 open work ก่อน merge.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `B-03` |
| Requirement | `B-03` bounded support/gravity sub-checkpoint |
| Owner | AI-3 |
| Branch | `ai3/b03-support-gravity-contract` |
| Commit SHA | `2b643616a375c2c6c0f3083416cfcb18c1cd55b3` |
| Files changed | `server/supportGravityAcceptanceContract.ts`, `server/supportGravityAcceptanceContract.test.ts`, `docs/evidence/ai3-b03-support-gravity-contract.md` |
| Checks | focused `1/4`, `pnpm check`, full `121` files / `504` tests, `git diff --check` และ heap-limited build ผ่าน |
| Result | deterministic support/float/gravity acceptance contract และ summary integrity gate |
| Blockers/limitations | ไม่ใช่ full B-03 runtime/world integration; B-01/B-02 dependency และ browser/device acceptance ยังต้อง review |
| Merge request | PR จะใช้ชื่อ `[AI-3][B-03]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff และ build |
