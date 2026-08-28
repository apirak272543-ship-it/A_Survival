# B-06 — รายงาน Inventory Capacity / Stack Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `B-06` ใน repository `apirak272543-ship-it/A_Survival` โดยสร้าง pure dependency-graph audit สำหรับ player carry 40 slots, normal block stack 64, merge/overflow behavior, non-stackable slot consumption และ cross-map carry boundary จาก canonical `inventorySystem.ts` และ item catalog จริง. Adapter ใช้ transaction preview แบบ read-only ไม่ mutate inventory/storage และไม่เขียน IndexedDB หรือ database

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| player carry | `PLAYER_INVENTORY_SLOTS` | canonical capacity เท่ากับ `40` ช่อง; preview full non-stackable ปฏิเสธ incoming ชิ้นที่ 41 และคืน remainder | ถ้า cap ไม่ใช่ 40 หรือไม่ใช่จำนวนเต็มเป็น required blocker | focused B-06 suite ผ่าน 1 file / 5 tests; full-slot preview ผ่าน |
| normal block stack | block-item definitions และ `stackLimit` | canonical normal block item count `10`; ทุก block item ใช้ stack limit `64` และ policy บังคับ exactly 64 | missing/non-block/stack limit ผิดเป็น blocker | canonical stack-cap test และ invalid definition fixture ผ่าน |
| merge | same-definition stack merge | stack `63` + incoming `1` รวมเป็น stack `64` ใน slot เดิมโดยไม่สร้าง remainder | merge behavior ที่ไม่เติม stack เดิมเป็น acceptance gap | focused preview test ตรวจผล `{ slotCount: 1, quantities: [64], addedQuantity: 1 }` |
| overflow | cap และ remainder | capacity `1`, incoming block `65` เก็บได้ `64` และคืน remainder `1`; ไม่มี silent loss | overflow ที่ไม่คืน remainder เป็น blocker | focused preview test ตรวจ `addedQuantity: 64`, `remainderQuantity: 1` |
| non-stackable | sword-like item with `stackLimit: 1` | full carry `40` slots ไม่รับ incoming เพิ่มและคืน remainder `1`; ไม่สร้าง slot เกิน cap | slot overflow/silent drop เป็น blocker | full non-stackable preview ตรวจ `slotCount: 40`, `accepted: false` |
| world storage baseline | `WORLD_STORAGE_DEFAULT_SLOTS` | canonical world storage baseline คือ `27`; audit แยกจาก player carry | cap ผิด/ไม่ใช่จำนวนเต็มเป็น blocker | canonical summary และ invalid cap fixture ผ่าน |
| cross-map carry | profile/session transfer owner | `crossMapCarryOwnerPresent: false`; adapter ไม่ fabricate ว่าการย้าย carry ข้าม map เสร็จแล้ว | cross-map carry integration ยังเป็น required blocker | canonical graph ตั้งใจ `valid: false` เพราะ `cross-map-carry-owner-missing` |
| runtime boundary | `addItemToContainer` owner | source runtime ถูกเรียกใน pure preview เพื่อตรวจผล; adapter ไม่ mutate input, storage หรือ profile | ยังไม่มี UI, reload, cross-map persistence หรือ device evidence | graph runtime policy ปิด; output เป็น audit-only |
| central dependency graph | deterministic hash, required blockers และ runtime policy | graph ใช้ `validateGeneratorDependencyGraph`; missing owner กลายเป็น required dependency blocker; policy คง `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` | audit output ไม่ใช่ inventory grant หรือ authoritative transaction | tests determinism, hash sensitivity, blockers และ bounds ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/inventoryCapacityDependencyGraph.ts` | เพิ่ม pure B-06 adapter สำหรับ exact slot/stack caps และ bounded previews |
| `server/inventoryCapacityDependencyGraph.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ canonical rules, merge/overflow, blockers, hash และ bounds |
| `docs/AI_HANDOFF_B06_INVENTORY_CAPACITY_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `client/src/game/systems/inventorySystem.ts`, `worldStorageSystem.ts`, `session.ts`, `indexedDb.ts`, `blockActionSystem.ts`, Creator Workbench/router, map/cache/offline/authority/schema หรือ registry/matrix. ไม่มี inventory/storage mutation, IndexedDB/browser side effect, DB write, asset generation, secret/token หรือ future-map write

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `B-06` |
| Requirement | 40-slot carry, 64 normal block stack, caps, overflow/merge, cross-map carry |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/inventory-capacity-b06` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `bb51a5572702e023854b1d3d70c5f730a559048c` (`origin/main` หลัง fetch ล่าสุด) |
| Files reserved | `server/generators/inventoryCapacityDependencyGraph.ts`, `server/inventoryCapacityDependencyGraph.test.ts`, `docs/AI_HANDOFF_B06_INVENTORY_CAPACITY_REPORT.md` |
| Implementation commit | `36f14422278ceedf9b375a20bf633362e54488e8` (`36f1442`) |
| Remote branch | `origin/ai-2/inventory-capacity-b06` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Git status | clean หลัง implementation push; report commit จะเป็น docs commit แยก |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused B-06 suite | ผ่าน `1` test file / `5` tests |
| Full test suite | ผ่าน `118` test files / `488` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต B-06 adapter

## Result และ blockers/limitations

สิ่งที่พิสูจน์ได้คือ player carry cap เป็น `40` slots, canonical normal block items `10` รายการใช้ stack `64`, same-definition merge จาก `63+1` เป็น `64`, overflow คืน remainder อย่างชัดเจน, non-stackable full-capacity preview ไม่สร้าง slot เกิน cap และ world-storage baseline แยกเป็น `27` slots. Invalid caps/definitions/owners ไม่ถูกกลบ แต่กลายเป็น required graph blockers

Checkpoint นี้ยังไม่ปิด B-06 ทั้งข้อเป็น `VERIFIED` เพราะ cross-map carry/profile/session integration owner ยังหายอยู่ และยังไม่ได้ทำ UI, reload, multi-map transfer, authoritative server sync หรือ device acceptance. Pure preview นี้ไม่ใช่ inventory mutation และไม่อ้างว่าการย้าย carry ข้าม map ทำงานจริงแล้ว

AI-0 ควรตรวจ diff ของ implementation `36f14422278ceedf9b375a20bf633362e54488e8`, ตรวจ report และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากจะเพิ่ม cross-map carry หรือ authoritative inventory mutation ให้เปิด checkpoint ใหม่พร้อม exact reservations และรักษา invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้
