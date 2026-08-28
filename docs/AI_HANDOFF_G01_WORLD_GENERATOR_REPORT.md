# G-01 — รายงาน Deterministic World Generator Coverage Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded สำหรับข้อกำหนด `G-01` ใน repository `apirak272543-ship-it/A_Survival` โดยเพิ่ม pure dependency-graph audit ที่เรียก canonical `generateWorld` แบบ in-memory บน `obsidian-frontier` และตรวจผลลัพธ์จริงด้าน terrain, water, tree/vegetation, resources, caves, structures, spawn roles, deterministic hash, spatial validation และ module-export preview

> งานนี้เป็น **backend-only audit/evidence checkpoint** ไม่ใช่การเปิด player generator และยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดต registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| deterministic generator | `tools/world-generator.ts` และ version/config | canonical generator version `0.1.0`, map `obsidian-frontier`, default seed `9107`, radius `32`, metadata ระบุ `deterministic:true` และ `playerFacingWorldGenerationUi:false` | universal/world-wide acceptance ยังไม่ปิดใน matrix | focused G-01 suite ผ่าน 1 file / 5 tests; default artifact ถูกสร้างจริง |
| terrain/water | generated cells และ surface flow preview | default artifact มี terrain cells และ water cells; output count ถูกนับจาก world ที่ generate จริง | water rule ยังเป็น `surface-cell-flow-preview` ตาม source | focused coverage test ตรวจ `terrain:true`, `water:true` และ metadata systems |
| tree/vegetation | block kinds จาก canonical block catalog | audit ตรวจ `log`/`leaf` เป็น tree blocks และ `plant` รวมใน vegetation; default artifact มี tree และ vegetation coverage | ยังไม่อ้าง biome-wide visual quality หรือ asset completeness | focused coverage test ตรวจ `tree:true`, `vegetation:true` และ block count |
| resources/caves | generated resources และ cave records | default artifact มี resource nodes และ cave records พร้อมจำนวนจริง | cave source metadata ยังระบุ `reserved-for-next-obisidian-pass` จึงไม่ปิด cave depth/quality ทั้งระบบ | focused coverage test ตรวจ `resources:true`, `caves:true` และ output counts |
| structures | safe-zone, shop, npc-camp, ruin, boss-room | default output มีครบ 5 structure kinds; shop link กับ safe-zone เป็นพฤติกรรมของ canonical generator | ยังไม่มี world-wide placement acceptance นอก bounded generator output | focused coverage test ตรวจ exact sorted structure kinds |
| spawn points | regular, animal, NPC และ boss roles | default output มีครบ 4 spawn roles; peaceful mode ปิด regular/boss ตาม source โดยไม่ fabricate | ยังไม่มี live NPC/boss runtime AI หรือ player combat acceptance | focused tests ตรวจครบ role coverage และ peaceful behavior |
| spatial validation | `validateGeneratedWorld` owner | graph เรียก validator จริงและ default validation เป็น valid โดย `errorCount:0`; world generator เองมี repair ก่อนคืน output | universal coverage/exported artifact acceptance ยังเป็น gap ของ requirement | focused test ตรวจ `validation.valid:true`; existing world spatial tests ยังอยู่ใน full suite |
| export boundary | `writeWorldExport` contract | audit สร้าง manifest/module file list และ content hash เป็น preview; `writesPerformed:false`; ไม่เขียนไฟล์ | ยังไม่ได้พิสูจน์ persisted/exported artifact บน disk ใน checkpoint นี้ | focused no-write preview test ตรวจ `writesPerformed:false`, module files และ hash |
| map policy | generator map allow-list | input map ที่ไม่ใช่ `obsidian-frontier` throw fail-closed; ไม่มี future-map generation path | future maps ยัง planned/backend data ได้ แต่ไม่ playable/cache/offline-write | focused guard test ตรวจ future-map rejection และ runtime policy ปิด |
| runtime boundary | player/UI/cache/offline boundary | graph ระบุ `backendOnly:true`, `playerFacingWorldGenerationUi:false`, `runtimeImportAllowed:false`, `playerVisible:false`, `cacheable:false` | artifact นี้ไม่ใช่ player generator control หรือ cache artifact | `git diff --check`, `pnpm check`, focused/full/build ผ่าน |

## สิ่งที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/worldGeneratorCoverageDependencyGraph.ts` | เพิ่ม pure G-01 adapter สำหรับ bounded in-memory world generation, output coverage, deterministic hash, validation และ no-write export preview |
| `server/worldGeneratorCoverageDependencyGraph.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ required domains, deterministic seed/hash, difficulty boundary, map/radius/seed guards และ export preview |
| `docs/AI_HANDOFF_G01_WORLD_GENERATOR_REPORT.md` | รายงานภาษาไทยฉบับนี้; ไม่แก้ registry หรือ owner matrix |

ไม่ได้แก้ `tools/world-generator.ts`, `tools/worldSpatialConstraints.ts`, generator CLI, `client/src/game/scene.ts`, map selector/direct route, cache/offline/authority/schema, player generator UI, Workbench/router หรือ binary asset. ไม่มี export write, filesystem mutation, network/DB write, migration/db push, secret/token หรือ future-map enablement

## Branch, claim และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `G-01` |
| Requirement | backend-only deterministic world generator ครบ terrain/water/tree/structure/NPC/boss/safe/shop |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/world-generator-g01` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จาก origin/main | `a20419dff7fdedb72edb5ad6f3323842ecb42a2c` |
| Exact reservations | `server/generators/worldGeneratorCoverageDependencyGraph.ts`, `server/worldGeneratorCoverageDependencyGraph.test.ts`, `docs/AI_HANDOFF_G01_WORLD_GENERATOR_REPORT.md` |
| Implementation commit | `f1b54183f4055b56e209354a5c3463b183f1084c` (`f1b5418`) |
| Registry/matrix | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` หรือ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น final owner |
| Git safety | ไม่ใช้ reset/revert/force checkout/force push; ไม่ลบ recovery ref และไม่แก้ stash/worktree ของ owner อื่น |

## Validation evidence ที่รันจริง

| Check | ผล |
|---|---|
| `git diff --check` | ผ่าน |
| `pnpm check` | ผ่าน TypeScript `tsc --noEmit` |
| Focused | `pnpm exec vitest run server/worldGeneratorCoverageDependencyGraph.test.ts` ผ่าน `1` file / `5` tests |
| Full | `pnpm test -- --run` ผ่าน `118` files / `488` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่านทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน G-01 ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาด `3,553.16 kB` และเกิน 1 MB หลัง minification, และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. Warning เหล่านี้อยู่นอก exact G-01 scope

## Result, blocker และ limitations

สิ่งที่พิสูจน์ได้คือ canonical Obsidian generator สร้าง world artifact ใน memory แบบ deterministic และผ่าน spatial validation หลัง repair; default output มี terrain, water, tree/vegetation, resources, caves, safe-zone, shop, npc-camp, boss-room และ regular/animal/NPC/boss spawn roles. Generator metadata ยืนยัน backend-only และผู้เล่นไม่มี generator UI; export contract ถูกตรวจเป็น no-write preview เท่านั้น

Checkpoint นี้ยังไม่ปิด G-01 ทั้งข้อเป็น `VERIFIED` เพราะยังไม่ได้พิสูจน์ universal/world-wide output acceptance, persisted module export บน disk, asset-manifest binding/publish, live NPC/boss behavior, player-facing generator prohibition ผ่าน browser ในรอบนี้, หรือ production runtime loading. ไม่ได้สร้าง binary asset และไม่เปิด future map, cache หรือ offline write

AI-0 ควรตรวจ implementation SHA `f1b54183f4055b56e209354a5c3463b183f1084c`, report และ evidence ก่อน merge. หากจะเพิ่ม persisted export หรือ runtime integration ให้เปิด checkpoint ใหม่พร้อม exact reservations และคง invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้
