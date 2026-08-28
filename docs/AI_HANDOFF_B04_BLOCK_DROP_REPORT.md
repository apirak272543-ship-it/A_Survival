# B-04 — รายงาน Tool-aware Block Drop Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `B-04` ใน repository `apirak272543-ship-it/A_Survival` โดยสร้าง pure dependency-graph audit สำหรับ wrong-tool no-drop, correct-tool canonical block-item drop, block-item placement links, stack limit, drop quantity และ tool-tag coverage จาก source จริง. ตรวจ runtime owner แบบ read-only และเปิดเผยว่า durability owner ยังไม่ครบ โดยไม่แก้ block action/inventory runtime

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| block definitions | canonical `OBSIDIAN_BLOCKS`, IDs และจำนวนรายการ | ตรวจ `14` definitions และ `14` unique IDs; sample graph จำกัดตาม `sampleCount` สูงสุด `32` | missing/duplicate definition ID เป็น required blocker | focused B-04 suite ผ่าน 1 file / 5 tests; canonical identity/count test ผ่าน |
| block-item links | `blockItemDefinitionId` กับ `BLOCK_ITEM_DEFINITIONS.placementBlockId` | มี `12` block-item links; link ที่มีอยู่ต้องเป็น `isBlockItem` และ placement ID ต้องตรงกับ block ID | missing, non-placeable, mismatched placement link หรือ stack limit ผิดเป็น blocker | canonical link test และ malformed-link fixture ตรวจครบ |
| correct-tool drop | required tool กับ `block-item` drop | มี `10` tool-aware placeable definitions; ทั้ง `10` ผ่าน correct-tool drop ที่คืน canonical `dropDefinitionId` และ quantity | correct tool ไม่คืน canonical block item หรือ quantity ผิดเป็น blocker | focused behavior test ตรวจ `10/10` correct-tool drops |
| wrong-tool no-drop | เครื่องมือผิดประเภท | สำหรับ tool-aware definitions ทั้ง `10` ตรวจ wrong-tool results แล้วได้ `dropKind: none`, quantity `0`, และไม่ตั้ง `usedCorrectTool` | wrong tool หลุด block drop เป็น blocker; canonical source ไม่พบ leak | focused behavior test ตรวจ `10/10` wrong-tool no-drop |
| tool registry | tool tags ที่ canonical item catalog รองรับ | มี `3` tags: `pickaxe`, `axe`, `shears`; block required tags resolve ได้จาก tool definitions | required tag ที่ไม่อยู่ใน allow-list หรือไม่มี tool item รองรับเป็น blocker | canonical tool-tag test และ invalid fixture ผ่าน |
| quantity/stack | drop quantity และ block-item stack | drop quantity ต้อง positive integer และไม่เกิน item stack; block item canonical ใช้ stack `64` | invalid/zero/overflow quantity หรือ stack ที่ไม่ใช่ `64` เป็น blocker | malformed quantity/stack test ผ่าน |
| durability | tool/block durability boundary | audit ระบุ `durabilityOwnerPresent: false`; ไม่ fabricate durability, decrement หรือ repair rule | durability integration ยังขาดและต้องเปิด owner checkpoint ใหม่ | canonical result มี `durability-owner-missing: 1` เป็น required blocker |
| runtime boundary | action/inventory owner และ mutation separation | `resolveBlockBreak` เป็น runtime source ที่ถูกอ่านเพื่อตรวจ behavior; adapter ไม่ mutate block, override หรือ inventory | ยังไม่มี browser/reload/cross-map persistence evidence ใน checkpoint นี้ | runtime policy ปิด; graph เป็น audit-only |
| central dependency graph | deterministic hash, blockers และ runtime policy | graph ใช้ `validateGeneratorDependencyGraph`; invalid source สร้าง required missing dependencies; policy คง `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` | output ไม่ใช่ player drop grant หรือ persistence mutation | tests determinism, hash sensitivity, malformed blockers และ bounds ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/blockDropToolDependencyGraph.ts` | เพิ่ม pure B-04 adapter สำหรับ block-item links, tool-aware drop behavior, quantity/stack และ durability gate |
| `server/blockDropToolDependencyGraph.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ canonical counts, behavior, malformed links, hash และ bounds |
| `docs/AI_HANDOFF_B04_BLOCK_DROP_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `client/src/game/data/blockModules.ts`, `client/src/game/data/catalog.ts`, `client/src/game/systems/blockActionSystem.ts`, `server/blockInventory.ts`, `inventorySystem.ts`, AI-1 hazard files, Workbench/router, map/cache/offline/authority/schema หรือ registry/matrix. ไม่มี block mutation, inventory mutation, durability decrement, world persistence, asset generation, secret/token หรือ DB write

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `B-04` |
| Requirement | wrong-tool no drop, correct-tool placeable block drop, durability/tool-tag boundary |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/block-drop-b04` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `33778bd5e643efad402e47c60880b01c0a0718b3` (`origin/main` หลัง fetch ล่าสุด) |
| Files reserved | `server/generators/blockDropToolDependencyGraph.ts`, `server/blockDropToolDependencyGraph.test.ts`, `docs/AI_HANDOFF_B04_BLOCK_DROP_REPORT.md` |
| Implementation commit | `ed3f70892b76c054166e54b44bf47a8993045112` (`ed3f708`) |
| Remote branch | `origin/ai-2/block-drop-b04` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Git status | clean ก่อนรายงาน commit; implementation `git diff --check` ผ่าน |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused B-04 suite | ผ่าน `1` test file / `5` tests |
| Full test suite | ผ่าน `118` test files / `488` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต B-04 adapter

## Result และ blockers/limitations

สิ่งที่พิสูจน์ได้คือ canonical catalog มี block definitions `14` รายการ, block-item links `12` รายการ, tool-aware placeable drops `10` รายการ, correct-tool canonical drops ผ่าน `10/10`, wrong-tool no-drop ผ่าน `10/10`, และ tool tags ครบ `pickaxe`/`axe`/`shears`. Invalid link, quantity, stack, tool และ owner states ถูก fail-closed เป็น blockers ไม่ใช่ถูกลบเพื่อให้ graph ผ่าน

Checkpoint นี้ยังไม่ปิด B-04 ทั้งข้อเป็น `VERIFIED` เพราะ durability owner ยังไม่มี และยังไม่ได้ทำ browser placement, inventory persistence, cross-map carry, reload หรือ device acceptance. Pure audit นี้ไม่ใช่การเพิ่ม drop/mutation runtime และไม่อ้างว่า durability integration พร้อมแล้ว

AI-0 ควรตรวจ diff ของ commit `ed3f708`, ตรวจ report และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากต้องเพิ่ม durability หรือ authoritative inventory mutation ให้เปิด checkpoint ใหม่พร้อม exact reservations และรักษา invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้
