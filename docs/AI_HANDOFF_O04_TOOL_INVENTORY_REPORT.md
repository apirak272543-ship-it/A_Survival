# O-04 — รายงาน Tool Inventory และ Generator Dependency Gate Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `O-04` ใน repository `apirak272543-ship-it/A_Survival` โดยสร้าง pure dependency-graph audit สำหรับ inventory ของ backend generator tools และ runtime data helper ที่ตรวจพบใน source จริง. ตรวจ registry registration, generate/validate/preview hooks, generate-once policy, preview read-only boundary, runtime import/player visibility, cache/DB/binary/publish writes และ caller boundary โดยไม่แก้ shared API, generator owner files หรือเปิด player generator UI

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| Common Generator registry | backend generator inventory และ registration | ตรวจ backend generators `6` ตัว ได้แก่ animation profile, content catalog, quest progression, structure placement, texture pack และ universal item; registered `6/6`; generate/validate/preview hooks ครบ `6/6` | tool ID invalid, registry missing/mismatch หรือ hook missing เป็น required blocker | focused O-04 suite ผ่าน 1 file / 6 tests |
| generate-once / preview boundary | deterministic generation และ read-only preview contract | ทุก backend generator ถูกระบุ `generatedOnce: true`, `previewReadOnly: true`; inventory เป็น audit-only และ hash จาก descriptor deterministic | `generatedOnce: false` หรือ `previewReadOnly: false` เป็น blocker; adapter ไม่เรียก generation ขนาดใหญ่และไม่เขียน output | test inject non-deterministic/preview-unsafe tool แล้ว graph invalid |
| runtime usage boundary | caller, player visibility และ import policy | backend generator inventory ไม่มี runtime caller; `runtimeCallerCount = 0`, `playerVisibleCount = 0`, `backendOnlyCount = 6`; runtime data helper แยกเป็น `plant-catalog-runtime-data` | runtime caller, player-visible หรือ runtime import allowed เป็น blocker; ไม่อ้างว่าไม่มี runtime coupling ใน source อื่นนอก inventory ที่ตรวจ | test ยืนยัน canonical helper callers และ inject unsafe runtime caller |
| write/publish boundary | cache, database, binary และ runtime publish | canonical inventory ปิด `cacheWriteCount`, `databaseWriteCount`, `binaryWriteCount` และ `runtimePublishCount` ทั้งหมดเป็น `0`; ไม่มี asset generation/publish ใน checkpoint | write/publish flag ใด ๆ เป็น blocker; ไม่เปิด future map/offline writes | test inject ทุก write flag แล้วพบ required blockers |
| runtime data helper | generator tool กับ data helper แยกประเภท | `client/src/game/tools/plantCatalogGenerator.ts` ถูกบันทึกเป็น `canonical-runtime-data-helper`, มี callers ที่ตรวจจริง `worldFarmSystem.ts` และ `scene.ts`, metadata-only flags ปิดทั้งหมด | helper ไม่มี caller หรือมี player/write/publish boundary violation เป็น blocker; ไม่อ้างว่า helper เป็น backend generator | test ยืนยัน helper path/classification/callers และ invalid helper boundary |
| central dependency graph | required blockers, sampling และ runtime policy | graph ใช้ `validateGeneratorDependencyGraph`; sample จำกัดไม่เกิน `64`; full inventory count แยกจาก sampled node count; runtime graph policy คง `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` | invalid source descriptor สร้าง required missing dependency ทำให้ fail-closed; ไม่มีการลบ blocker เพื่อให้ผ่าน | tests determinism, source hash sensitivity, duplicate ID, invalid bounds และ missing dependency ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/toolInventoryDependencyGraph.ts` | เพิ่ม pure O-04 adapter สำหรับ inventory/backend registration, runtime helper classification, generate-once/preview/write/publish gate, deterministic hash และ fail-closed graph |
| `server/toolInventoryDependencyGraph.test.ts` | เพิ่ม regression tests 6 รายการสำหรับ canonical inventory, helper boundary, unsafe flags, duplicates, hash sensitivity และ bounds |
| `docs/AI_HANDOFF_O04_TOOL_INVENTORY_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `server/generators/commonGeneratorApi.ts`, `client/src/game/tools/plantCatalogGenerator.ts`, generator/plugin owner files, Workbench/router, player route/UI, asset manifest/binary, map allow-list/cache/offline persistence, authority/auth/schema/migration หรือ runtime render loop. ไม่มีการสร้าง PNG/GLB/texture/model, ไม่มี external generation, ไม่มี secret/token และไม่มีการเปิด generator control ให้ผู้เล่น

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `O-04` |
| Requirement | tool inventory, generator dependency policy, backend-only engine boundary |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/tool-inventory-o04` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `9720ee09c80c6e41d2993ac75aa1ddfef8e00a0c` (`origin/main` หลัง fetch ล่าสุด) |
| Files reserved | `server/generators/toolInventoryDependencyGraph.ts`, `server/toolInventoryDependencyGraph.test.ts`, `docs/AI_HANDOFF_O04_TOOL_INVENTORY_REPORT.md` |
| Implementation commit | `0b109a01dfd91afbc8002720d43a6c2aaa7dc55f` (`0b109a0`) |
| Remote branch | `origin/ai-2/tool-inventory-o04` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Git status | clean ก่อนรายงาน commit; implementation `git diff --check` ผ่าน |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused O-04 suite | ผ่าน `1` test file / `6` tests |
| Full test suite | ผ่าน `115` test files / `472` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต O-04 adapter

## Result และ blockers/limitations

สิ่งที่พิสูจน์ได้คือ source inventory ปัจจุบันมี backend generator plugins 6 ตัวที่ลงทะเบียนและมี hooks ครบ พร้อม runtime data helper 1 ตัวที่ถูกแยกจาก backend generator อย่างชัดเจน. Dependency policy ปิด player visibility, runtime import, cache/DB/binary writes และ runtime publish ใน output audit และใช้ required missing dependencies เมื่อพบ descriptor ที่ไม่ปลอดภัย

Checkpoint นี้ยังไม่ปิด O-04 ทั้งข้อเป็น `VERIFIED`. ยังไม่ได้สร้าง durable tool registry ใหม่, ยังไม่ได้เรียก payload เต็มของทุก generator เพื่อพิสูจน์ generate/validate/export end-to-end, ยังไม่ได้ตรวจทุก shell/CLI นอก inventory ที่กำหนด, และยังไม่มี production/browser/device acceptance. การตรวจนี้จึงเป็น inventory/dependency-gate evidence เท่านั้น ไม่ใช่การประกาศว่า engine ทุกตัวพร้อมใช้งานหรือ publish ได้จริง

AI-0 ควรตรวจ diff ของ commit `0b109a0`, ตรวจ report และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากต้องเพิ่ม durable registry, CLI/tool approval หรือ full generator export ให้เปิด checkpoint และ exact reservation ใหม่ โดยไม่ขยายงานนี้ย้อนหลัง
