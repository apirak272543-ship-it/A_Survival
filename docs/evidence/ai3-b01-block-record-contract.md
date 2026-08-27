# AI-3 B-01 Block Record Contract

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `B-01` |
| Requirement | block independent coordinate/state/action รวม tree/leaf records |
| Owner | AI-3 |
| Branch/worktree | `ai3/b01-block-record-contract` / `/home/ubuntu/A_Survival-b01` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/generators/blockRecordContract.ts`, `server/generators/blockRecordContract.test.ts`, `docs/evidence/ai3-b01-block-record-contract.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

เพิ่ม pure, deterministic และ bounded `validateBlockRecords` สำหรับตรวจชุด `WorldBlock` records ก่อนนำไปใช้เป็น artifact หรือ contract ระดับ generator. ตัวตรวจยืนยัน coordinate เป็น finite integer, `key` ตรงกับ coordinate, ไม่มี duplicate coordinate, block definition มีอยู่จริง, module/state/seed ถูกต้อง, hit points อยู่ในขอบเขต hardness ของ definition, ค่า `solid` ตรงกับ canonical definition และ `groupId` ของ tree/leaf records ไม่ว่างและไม่ผสม module ID ภายในกลุ่มเดียวกัน.

ผลลัพธ์คืน normalized records ที่เรียงตาม key, issue codes ที่ตรวจซ้ำได้ และ summary ของจำนวน block/group/state/action/kind. มี upper bound `MAX_BLOCK_RECORDS = 4096` และคืน required blocker ทันทีเมื่อเกินขอบเขต จึงไม่เปิดทางให้ input ขนาดไม่จำกัดหรือ silently accept record ที่ malformed.

Checkpoint นี้ไม่เปลี่ยน runtime map allow-list, ไม่แตะ map/cache/offline/authority, ไม่สร้าง graphical asset และไม่เพิ่ม player generator UI. เป็น pure contract slice สำหรับ B-01; การเชื่อมเข้ากับ world generator หรือ mutation caller ต้องเป็น checkpoint แยกหลังตรวจ dependency และ owner ที่เกี่ยวข้อง.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `pnpm exec vitest run server/generators/blockRecordContract.test.ts --reporter=verbose` | ผ่าน `1` test file / `3` tests |
| `pnpm check` | ผ่าน |
| `git diff --check` | ผ่านหลัง validation และก่อน commit |
| Full test command | `pnpm test -- --run` ผ่าน; `121` test files / `503` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| Tree/leaf coverage | ยืนยัน mature tree records ที่มี trunk และ leaf ใช้ group identity เดียวกัน |
| Malformed coverage | key/coordinate mismatch, duplicate coordinate, unknown definition, invalid state, hit-point overflow, solidity mismatch และ invalid group ถูก reject |
| Bound coverage | batch ที่เกิน `4096` records ถูก reject ก่อน processing |
| Runtime side effects | ไม่มี network/cache/IndexedDB/database write และไม่มี generator call ใน render loop |
| Binary assets | ไม่ได้สร้าง แก้ไข หรือนำเข้า |
| Device/mobile acceptance | ไม่ได้อ้างและไม่ได้ทดสอบ |

## Limitations

ตัวตรวจนี้เป็น contract แบบ pure และยังไม่ได้ถูกเรียกจาก world generator หรือ runtime mutation path. จึงพิสูจน์ schema/invariant ของ records ที่ส่งเข้า validator เท่านั้น ไม่ได้อ้างว่า B-01 ครบทั้งระบบหรือว่า world export ทุก artifact ผ่านแล้ว. Dependency ที่ backlog ระบุสำหรับ B-01 คือ `G-01` และ `B-04`; ทั้งสองสายยังมี acceptance gap/open review work จึงต้องให้ AI-0 พิจารณาว่า checkpoint นี้ควร merge เป็น bounded sub-checkpoint หรือรอ dependency เพิ่มเติม.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `B-01` |
| Requirement | `B-01` |
| Owner | AI-3 |
| Branch | `ai3/b01-block-record-contract` |
| Commit SHA | `e3ed5711329c4e16ab6eeb1818a75164e5255ecb` |
| Files changed | `server/generators/blockRecordContract.ts`, `server/generators/blockRecordContract.test.ts`, `docs/evidence/ai3-b01-block-record-contract.md` |
| Checks | focused test `1/3`, `pnpm check`, full `121` files / `503` tests, `git diff --check` และ heap-limited build ผ่าน |
| Result | bounded deterministic contract สำหรับ independent coordinate/state/action และ tree/leaf group records |
| Blockers/limitations | ยังไม่มี world generator caller, full B-01 integration, world export proof หรือ mobile/device acceptance |
| Merge request | PR จะใช้ชื่อ `[AI-3][B-01]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff, tests และ build |
