# F-06 — รายงาน Plant Seed Return และ Replant Chain Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `F-06` ใน repository `apirak272543-ship-it/A_Survival` โดยสร้าง pure dependency-graph audit สำหรับสายข้อมูล harvest → returned seed → replant ที่ตรวจ seed identity, harvest link, item category, harvest provenance, quantity cap, replantable flag และ atomic consume requirement. งานนี้ไม่แก้ runtime farm owner, ไม่แจก reward จริง และไม่อ้าง end-to-end browser acceptance

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| canonical `PLANT_CATALOG` และ `PLANT_ITEMS` | plant ID, seed definition, harvest definition และ item category | ตรวจ source 300 plant records; ทุก record resolve seed link 300/300 และ harvest link 300/300 กับ canonical item catalog; item definitions ที่อ่านได้ 300 รายการ | malformed/duplicate plant ID, seed link mismatch, missing/invalid seed item หรือ harvest link mismatch เป็น required blocker | focused F-06 suite ผ่าน 1 file / 6 tests |
| harvest → returned seed chain | returned seed ต้องเป็น seed เดิมของ plant ที่เก็บเกี่ยว | source ปัจจุบันไม่มี `returnedSeedDefinitionId` ในทั้ง 300 record; audit รายงาน `return-seed-missing = 300` แบบ fail-closed แทนการ fabricate return | returned seed mismatch หรือ missing returned seed definition เป็น blocker | canonical test ยืนยัน returned seed 0/300 และ graph invalid |
| provenance boundary | ผลผลิตที่ใช้คืนเมล็ดต้องมาจาก harvest | contract บังคับ `harvestProvenanceType: harvest`; ไม่ยอมรับ drop/craft/reward/starter ใน chain นี้ | provenance อื่นเป็น blocker และไม่ถูกแปลงให้เป็น harvest | test inject `drop` provenance แล้วพบ `provenance-invalid` |
| replant eligibility | returned seed category, quantity, replantable flag และ same-seed identity | contract บังคับ returned item เป็น category `seed`, quantity `1..64`, ต้องตรงกับ planted seed และ `replantable: true` | missing/wrong category/quantity out of range/replantable false เป็น blocker | tests ครอบคลุม valid 300-record synthetic chain และ invalid/wrong-item cases |
| consume boundary | การใช้ seed ปลูกต่อควร consume แบบ atomic | output contract ระบุ `plantingConsumeMustBeAtomic: true`; adapter เป็น audit-only และไม่เขียน inventory/DB/cache | `atomicConsumeRequired: false` เป็น blocker; actual runtime transaction caller ยังไม่ได้แก้ | test inject non-atomic record แล้วพบ `atomic-consume-required` |
| central dependency graph | deterministic source hash, required blockers และ runtime boundary | graph ใช้ `validateGeneratorDependencyGraph`, source hash เปลี่ยนเมื่อ source เปลี่ยน และ runtime policy คง `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` | blocker dependency ถูกทำให้ required แต่ไม่มีปลายทาง เพื่อให้ graph invalid แบบ fail-closed; ไม่มี future-map/offline write | tests determinism, hash sensitivity, partial bounds และ blocker dependency ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/plantSeedReturnDependencyGraph.ts` | เพิ่ม pure F-06 adapter ตรวจ 300-record seed/harvest links, returned-seed identity/category/quantity, harvest provenance, replant flag และ atomic consume contract พร้อม deterministic graph/artifact |
| `server/plantSeedReturnDependencyGraph.test.ts` | เพิ่ม regression tests 6 รายการสำหรับ canonical gap, valid synthetic chain, mismatch/category/provenance/quantity/atomic blockers, hash sensitivity และ bounds |
| `docs/AI_HANDOFF_F06_PLANT_RETURN_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `client/src/game/systems/worldFarmingSystem.ts`, `client/src/game/data/plantCatalog.ts`, `client/src/game/data/catalog.ts` หรือ `client/src/game/storage/indexedDb.ts` โดยตรง. ไม่มีการแก้ Workbench/router, map allow-list/cache/offline persistence, authority/auth/schema/migration, runtime render loop หรือ gameplay reward mutation. ไม่มีการสร้าง PNG/GLB/texture/model, ไม่มี external generation, ไม่มี secret/token และไม่มี medical claim

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `F-06` |
| Requirement | seed/plant ที่เก็บจากโลกใช้ปลูกต่อและ soil ที่เหมาะสม |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/plant-return-f06` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `845a7a9680b96c27daa6d3d26ca0ee8432d82224` (`origin/main` หลัง fetch ล่าสุด) |
| Files reserved | `server/generators/plantSeedReturnDependencyGraph.ts`, `server/plantSeedReturnDependencyGraph.test.ts`, `docs/AI_HANDOFF_F06_PLANT_RETURN_REPORT.md` |
| Implementation commit | `3e15565d26076591804c48a6941e9d9839bdc2b6` (`3e15565`) |
| Remote branch | `origin/ai-2/plant-return-f06` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Git status | clean หลัง push; `git diff --check` ผ่านก่อน commit |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused F-06 suite | ผ่าน `1` test file / `6` tests |
| Full test suite | ผ่าน `113` test files / `458` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต F-06 adapter

## Result และ blockers/limitations

สิ่งที่พิสูจน์ได้คือ canonical plant catalog มี seed และ harvest links ที่ตรวจสอบได้ครบ 300 รายการ และมี pure contract สำหรับการตรวจ harvest provenance, same-seed return, seed category/quantity, replantability และ atomic consume. อย่างไรก็ตาม source ปัจจุบันยังไม่มี returned-seed field ในทุก record และตั้งค่า replantable เป็น false ใน audit projection จึงมี blockers `return-seed-missing = 300` และ `replantable-false = 300`; graph ยังคง fail-closed และไม่มีการเพิ่มข้อมูลสมมติ

Checkpoint นี้ยังไม่ปิด F-06 ทั้งข้อเป็น `VERIFIED`. ยังไม่มีการแก้ harvest reward ให้คืน seed จริง, ไม่มีการเชื่อม seed return เข้า planting runtime, ไม่มี inventory transaction/persistence/reload proof, ไม่มี soil-world browser evidence และไม่มี device/mobile acceptance. การตรวจนี้จึงเป็น bounded data-contract evidence เท่านั้น ไม่ใช่การประกาศว่า seed return/replant chain ใช้งานจริงครบวงจร

AI-0 ควรตรวจ diff ของ commit `3e15565`, ตรวจ report และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากต้อง implement returned-seed reward หรือ runtime atomic consume ให้เปิด checkpoint และ exact reservation ใหม่ โดยไม่ขยายงานนี้ย้อนหลัง
