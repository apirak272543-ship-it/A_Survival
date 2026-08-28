# B-05 — รายงาน Block Placement / State Persistence Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `B-05` ใน repository `apirak272543-ship-it/A_Survival` โดยสร้าง pure dependency-graph audit สำหรับ world-block override persistence, reload hydration, tombstone/replacement semantics, map-player namespace และ runtime-map write gate จาก source จริง. Adapter นี้ไม่เปิด IndexedDB, ไม่ทำ DB write, ไม่แก้ persistence owner และไม่อ้าง browser/reload acceptance แทนหลักฐานที่รันจริง

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| override key | coordinate key ที่เก็บใน `worldBlockOverrides` | รับเฉพาะ key รูปแบบ integer `x:y:z`; normalize เรียงลำดับเพื่อ deterministic output | รูปแบบ key ผิดเป็น required blocker ใน policy source | focused B-05 suite ผ่าน 1 file / 6 tests; normalization/hydration test ผ่าน |
| tombstone | ค่า `null` สำหรับลบ generated block ระหว่าง hydrate | `null` ลบ block ตาม key ที่มีอยู่ | tombstone semantics ที่เปลี่ยนหรือหายเป็น blocker; ไม่มี mesh serialization | test ลบ `1:0:0` จาก generated blocks และยืนยันผลลัพธ์จริง |
| replacement/addition | ค่า module ID ใน persisted overrides | string module ID replace block เดิมหรือเพิ่ม block ใหม่ที่ key ใหม่ | replacement semantics ที่ไม่ใช่ module ID เป็น blocker; adapter ไม่ resolve asset/mesh | test replace `terrain.obsidian` เป็น `terrain.ash` และ add `player.placed` ผ่าน |
| namespace | identity ของ offline map state | contract เป็น composite `[mapId+playerId]`; map เดียวคนละ player และ player เดียวคนละ map ได้คนละ key | namespace อื่นหรือ map/player หายเป็น blocker | identity test ตรวจ key ต่างกันทั้งสองกรณี |
| runtime map gate | map ที่อนุญาตให้เขียน world state | canonical `RUNTIME_MAP_ID` คือ `obsidian-frontier`; allow-list มีเพียง map เดียว; canonical write allowed และ future-map write blocked | runtime map ID/allow-list ผิดเป็น blocker; ไม่เพิ่ม future-map write | canonical summary และ gate test ผ่าน |
| persisted payload | ฟิลด์ที่ต้องอยู่ใน persisted map state | `mapId`, `playerId`, `worldBlockOverrides`, `updatedAt`; generated meshes ไม่ persist | mesh persistence risk และ owner missing เป็น blockers | canonical policy test ผ่าน; invalid fixture สร้าง required blockers |
| runtime/storage owners | boundary ระหว่าง runtime hydration กับ storage | source owner ถูกระบุเป็น read-only; graph ไม่ import IndexedDB และไม่ mutate world/inventory | browser IndexedDB, reload, reconnect, cross-device และ production storage acceptance ยังไม่ตรวจใน checkpoint นี้ | graph runtime policy ปิด และ test ยืนยัน audit-only |
| central dependency graph | deterministic hash, required blockers และ runtime policy | graph ใช้ `validateGeneratorDependencyGraph`; unsafe sources สร้าง missing required dependencies; policy คง `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` | output ไม่ใช่ state write และไม่ควรนำไปเป็น player control | tests determinism, hash sensitivity, blockers และ bounds ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/blockPersistenceDependencyGraph.ts` | เพิ่ม pure B-05 adapter สำหรับ coordinate overrides, tombstone/replacement hydration, namespace และ runtime map policy |
| `server/blockPersistenceDependencyGraph.test.ts` | เพิ่ม regression tests 6 รายการสำหรับ canonical policy, hydrate, identity, blockers, hash และ bounds |
| `docs/AI_HANDOFF_B05_BLOCK_PERSISTENCE_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `client/src/game/storage/indexedDb.ts`, `client/src/game/storage/obsidianWorldModule.ts`, `client/src/game/systems/blockActionSystem.ts`, `client/src/game/systems/blockWorldSystem.ts`, `client/src/game/data/maps.ts`, `client/src/game/routing/directRoute.ts`, `mapCache.ts`, service worker, Workbench/router หรือ registry/matrix. ไม่มี IndexedDB/browser side effect, DB write, future-map write, asset generation, secret/token หรือ migration

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `B-05` |
| Requirement | placement/state persists across reload/map ด้วย map+player namespace |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/block-persistence-b05` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `f3eea8c80ee86f72ecf2f726ea8aaff5623c9a55` (`origin/main` หลัง fetch ล่าสุด) |
| Files reserved | `server/generators/blockPersistenceDependencyGraph.ts`, `server/blockPersistenceDependencyGraph.test.ts`, `docs/AI_HANDOFF_B05_BLOCK_PERSISTENCE_REPORT.md` |
| Implementation commit | `fc5ff2f` / `fc5ff2f3dce451486d7b36c2bcfb13bb26ba2c7c` |
| Remote branch | `origin/ai-2/block-persistence-b05` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Report commit | `ddc87771863c9f21eeb8f48ef314c2af09b86a88`; final docs SHA amendment is reported in the PR completion comment |
| Git status | clean before this final report SHA amendment; implementation `git diff --check` ผ่าน |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused B-05 suite | ผ่าน `1` test file / `6` tests |
| Full test suite | ผ่าน `118` test files / `489` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต B-05 adapter

## Result และ blockers/limitations

สิ่งที่พิสูจน์ได้คือ canonical route allow-list ให้เขียน world state ได้เฉพาะ `obsidian-frontier`, persisted state ใช้ map+player identity, coordinate override มี deterministic normalization, `null` เป็น tombstone สำหรับลบ generated block, module ID เป็น replacement/addition และ generated mesh ไม่ควรถูก persist. Unsafe source states ไม่ถูกกลบ แต่กลายเป็น required graph blockers

Checkpoint นี้ยังไม่ปิด B-05 ทั้งข้อเป็น `VERIFIED` เพราะยังไม่ได้แก้/ทดสอบ owner runtime แบบ end-to-end, browser IndexedDB reload, cross-map reconnect, multi-device conflict หรือ production persistence. การเพิ่ม authoritative write, queue/reconciliation หรือ service-worker behavior ต้องเปิด checkpoint ใหม่พร้อม exact reservations และรักษา invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้

AI-0 ควรตรวจ diff ของ implementation `fc5ff2f3dce451486d7b36c2bcfb13bb26ba2c7c` และ report commit `ddc87771863c9f21eeb8f48ef314c2af09b86a88` รวมถึง final docs SHA amendment ที่ระบุใน PR completion comment, ตรวจ report และเปลี่ยนสถานะ task ตามหลักฐานจริง. Implementation และ report เป็นคนละ isolated commits บน branch เดียวกัน
