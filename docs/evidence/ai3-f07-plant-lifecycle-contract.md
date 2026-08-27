# AI-3 F-07 Plant Lifecycle Contract

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `F-07` |
| Requirement | universal plant/tree/ecology/farm engine |
| Owner | AI-3 |
| Branch/worktree | `ai3/f07-plant-lifecycle-contract` / `/home/ubuntu/A_Survival-f07` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/plantLifecycleContract.ts`, `server/plantLifecycleContract.test.ts`, `docs/evidence/ai3-f07-plant-lifecycle-contract.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

เพิ่ม pure, deterministic และ bounded plant lifecycle contract สำหรับ stage `seed → sprout → young → mature`. Contract กำหนด threshold ที่ตรวจซ้ำได้ (`0.25`, `0.55`, `1.0`), จำกัด growth duration ไว้ `30,000..1,800,000 ms`, normalize elapsed time ที่ติดลบ/ไม่ finite และกำหนดให้ reward กับ repellent output พร้อมใช้งานเฉพาะเมื่อ mature.

Checkpoint นี้เป็น **bounded F-07 sub-checkpoint** สำหรับ lifecycle policy เท่านั้น. ไม่ได้อ้างว่าเป็น universal tree/ecology/farm engine ทั้งระบบ เพราะยังไม่มี nutrients, pests, seasons, tree caller, world generator integration, persistence migration หรือ gameplay event integration. ไม่แก้ `worldFarmingSystem.ts`, player UI, Workbench/router, map policy หรือ asset binary.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `pnpm exec vitest run server/plantLifecycleContract.test.ts --reporter=verbose` | ผ่าน `1` test file / `3` tests |
| `pnpm check` | ผ่าน |
| Full test command | `pnpm test -- --run` ผ่าน; `121` test files / `503` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| `git diff --check` | ผ่านหลัง validation และต้องรันซ้ำก่อน commit |
| Stage boundary | seed, sprout, young และ mature ถูกตรวจที่ threshold จริง |
| Mature-only output | reward/repellent เป็น false ก่อน mature และ true เมื่อ mature |
| Malformed input | empty ID, duration นอกขอบเขต และ output policy ที่ไม่ mature-only ถูก reject |
| Runtime side effects | ไม่มี network/cache/IndexedDB/database write และไม่มี render-loop integration |
| Asset/device acceptance | ไม่ได้สร้าง asset และไม่ได้อ้าง device acceptance |

## Limitations and blockers

F-07 ตาม backlog ยังขึ้นกับ F-01–F-06 และ G-01. รายงานนี้ไม่เปลี่ยนสถานะ requirement เป็น `VERIFIED`; เป็นเพียง lifecycle contract slice ที่ AI-0 อาจ merge หรือรอ integration ตาม dependency. การตรวจต้นไม้, ecology factors, world distribution, harvest caller, persistent elapsed-time rehydration และ browser evidence ต้องแยก checkpoint ใหม่.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `F-07` |
| Requirement | `F-07` bounded lifecycle sub-checkpoint |
| Owner | AI-3 |
| Branch | `ai3/f07-plant-lifecycle-contract` |
| Commit SHA | `692473d8ef86ebc479c7220731cc61cb9efa4273` |
| Files changed | `server/plantLifecycleContract.ts`, `server/plantLifecycleContract.test.ts`, `docs/evidence/ai3-f07-plant-lifecycle-contract.md` |
| Checks | focused `1/3`, `pnpm check`, full `121` files / `503` tests, `git diff --check` และ heap-limited build ผ่าน |
| Result | deterministic lifecycle stage and mature-only output contract |
| Blockers/limitations | ไม่ใช่ universal engine; ยังไม่มี tree/ecology/runtime/persistence integration; ต้อง AI-0 review |
| Merge request | PR จะใช้ชื่อ `[AI-3][F-07]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff และ build |
