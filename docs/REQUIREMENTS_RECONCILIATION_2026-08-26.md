# A_Survival — Requirements Reconciliation

**วันที่ตรวจ:** 26 สิงหาคม 2026

**วัตถุประสงค์:** ตรวจเอกสารที่ผู้ใช้ส่งจากพื้นที่ไฟล์จริงทั้งหมด แล้วเทียบกับ source, tests, Git และ runtime ของ Repository โดยไม่ถือข้อความในเอกสารหรือ commit เก่าเป็นหลักฐาน implementation หากไม่มี source/test/evidence รองรับ

> **ข้อสรุปหลัก:** งานไม่ได้เสร็จทั้งหมด การตรวจรอบนี้ยืนยันว่า Repository มี vertical-slice foundations หลายส่วนแล้ว แต่ generator ecosystem, universal engines, world-instance/network, full performance controller, story/quest progression, Codex/Credits และ Thai no-code platform ยังไม่ได้ทำครบหรือยังไม่มี implementation ที่ตรวจได้

## 1. ขอบเขตเอกสารที่ตรวจ

อ่านจากต้นฉบับครบทั้ง `A_Survival_Toolkit_Master.txt` และ `pasted_content.txt` ถึง `pasted_content_16.txt` รวม 18 ไฟล์ โดยอ่านส่วนท้ายเพิ่มเติมในไฟล์ยาวที่ผลแสดงครั้งแรกถูกตัด ได้แก่ Toolkit Master, `pasted_content_11.txt` และ `pasted_content_12.txt` จึงไม่ใช้เพียง preview หรือสรุปจากแชทแทนเนื้อหาเต็ม

| กลุ่มเอกสาร | ไฟล์/ขอบเขต | ผลการตรวจ |
|---|---|---|
| Master specification | `A_Survival_Toolkit_Master.txt` | อ่านครบถึงหัวข้อ final pipeline, tool checkpoints และ master design principle; เป็น design specification ไม่ใช่ code proof |
| Core/world/performance | `pasted_content.txt`, `_2.txt`, `_3.txt`, `_4.txt`, `_8.txt`, `_9.txt` | รวม world generator, coordinate/placement rules, network/world instances, cache/chunk/culling/device tiers และ Web/WebView constraints |
| Item/content | `pasted_content_5.txt`, `_6.txt`, `_10.txt`, `_11.txt`, `_12.txt` | รวม universal item/equipment/tool, relationship, balance, discovery, compatibility, plant-object interaction และ content-generation pipeline; `_10`, `_11`, `_12` มีสาระซ้ำเชิงโครงสร้างกับ `_4`, `_5`, `_6` แต่ส่วนท้ายที่ย้ำรายละเอียดถูกตรวจแล้ว |
| Plant/ecology | `pasted_content_7.txt`, `_13.txt` | รวม universal plant/tree/ecology, 300 species, biome distribution, growth/effect/performance; `_13` เป็นชุดซ้ำของ `_7` |
| Web/WebView | `pasted_content_9.txt`, `_14.txt` | `_14` เป็นชุดซ้ำของ `_9`; ตรวจข้อจำกัด WebGL/WebView/RAM/thermal/offline และ staged scaling แล้ว |
| New generator backlog | `pasted_content_15.txt` | เพิ่ม Quest, Structure, Dungeon, Loot, Crafting, Economy/Balance, Audio, Weather, Vegetation, Crop/Farming, Simulation/Auto-play, Profiler, Migration, AI assistant, Common Generator API และ Tool Orchestrator |
| Entity/animation | `pasted_content_16.txt` | เพิ่ม Free-Scale Entity System และ Procedural Animation/Motion Generator: motion library, skeleton templates, seeded variation, wind, retargeting, LOD และ validation |

เอกสารต้นฉบับเหล่านี้ถูกบันทึกใน audit notes [1] และถูกรวมสถานะใน owner matrix [2] โดยใช้ข้อกำหนดเป็น backlog/design ไม่ใช่การอ้างว่าสิ่งใดมีอยู่ในเกมแล้ว

## 2. Repository และ Git ที่ตรวจยืนยัน

ปัจจุบัน `main` และ `origin/main` ตรงกันที่ `4c71961` (`docs: record camera settings checkpoint`) หลัง code checkpoint `e186223` (`feat: add map-local camera settings`) และ checkpoint ก่อนหน้า `0f978dd` ของ chest/storage. Working tree มีเพียงไฟล์ audit/reconciliation ที่กำลังบันทึกผลรอบนี้ ไม่มี tracked diff และ `git diff --check` ผ่าน

Recovery protections ยังอยู่ครบ: branch `local-pre-forensic-e6ba` resolve ไปที่ `e6ba26c65143232cd085eaa1221d88bb15d2cd55` และ `stash@{0}` คือ `5ac3ff6` ชื่อ `forensic-preserve-map-cache-v3`. การตรวจนี้ไม่ได้ reset, revert, force checkout, delete หรือ overwrite งานเดิม

`pnpm check` ผ่าน และ `pnpm test -- --run` ผ่าน 40 test files / 130 tests. ผลนี้ยืนยันว่า checkpoint code ปัจจุบัน compile/test ได้ แต่ไม่ได้เปลี่ยนสถานะของ requirements ที่ยังไม่มี implementation

## 3. สิ่งที่มี implementation จริง

| ระบบ | หลักฐาน source/test/runtime | สถานะที่ควรใช้ |
|---|---|---|
| Obsidian-only runtime | runtime allow-list ใน `client/src/game/routing/directRoute.ts`, direct-route tests และ browser direct URL/selector proof | **VERIFIED** ตาม O-02/O-03 |
| Core item/soil/map data | `client/src/game/data/catalog.ts` มี item instance/provenance, 5 soil groups, 400 definitions ต่อ 9 categories และ catalog map data; `maps.ts` มี 100 records แต่ data record ไม่เท่ากับ playable runtime | **PARTIAL** สำหรับ universal content |
| Plant catalog tool | `client/src/game/tools/plantCatalogGenerator.ts` และ `server/plantCatalogGenerator.test.ts` สร้าง/ตรวจ 300 records แบบ deterministic แต่ hardcode playable biome เป็น Obsidian และยังไม่ใช่ universal ecology | **PARTIAL** สำหรับ F-01/T-04 |
| Block/farm/chest slices | checkpoints `576392e`, `3fe7c32`, `5e4bdff`, `afe0620`, `2824ee1`, `abb3915`, `0f978dd` พร้อม focused/full tests และ browser notes | **PARTIAL** ตาม broad requirements |
| Offline persistence | `indexedDb.ts` มี profile, transaction queue/vector clock, map state composite key `[mapId+playerId]`, farm/storage/in-map settings normalization | **PARTIAL** เพราะ sync/authority/complete carry ยังไม่ครบ |
| Global/In-map settings and camera | `cameraModes.ts`, `scene.ts`, `GameCanvas.tsx`, `ArcaneFrontier.tsx`; browser tested three views, split sheets, reload hydration | **PARTIAL** เพราะ target FPS เป็น UI/persistence-only, view distance map ผ่าน 3 legacy presets และ mobile/pause evidence ยังขาด |
| Asset pack boundary | `ASSETS.md`, manifest/hash/asset IDs, local `arcane-frontier-voxel-pixel` pack และ resolver/loader | **PARTIAL** เพราะทุก runtime asset, credits UI และ final art/provenance pass ยังไม่ครบ |
| Onboarding/integrity/vault/loading | adopted plans, help articles, integrity/quarantine flows, cache/loading tests และ browser evidence | **PARTIAL** ตาม scope ของ prototype |

## 4. สิ่งที่ยังไม่มี implementation ที่ตรวจได้

การค้น source จริงพบ game tool เดิมคือ `client/src/game/tools/plantCatalogGenerator.ts` และ server-side tools ใหม่คือ `server/generators/commonGeneratorApi.ts` กับ `server/generators/structureGenerator.ts` พร้อม tests คู่กัน; ยังไม่มี generator/tool ที่ตรวจได้สำหรับ Quest, Story, Dungeon, Loot, Crafting, Economy/Balance, Audio, Weather, Vegetation, Simulation/Auto-play, Performance Profiler, Save/World Migration หรือ Tool Orchestrator นอกจากนี้ยังไม่มี Codex/ Credits/Supporters UI, story progression engine, map unlock chain, item long-press 3–5 วินาที หรือ unified adaptive device/performance controller

| กลุ่มที่ยังไม่มี | ข้อกำหนดจากเอกสาร | สถานะหลักฐาน |
|---|---|---|
| Structure/Building Generator | Object → Building → Compound → Settlement → Landmark, blueprint/asset metadata, placement/generation rules, overlap/slope/support/road/space validation, repair-before-export, registry | **PARTIAL**; `server/generators/structureGenerator.ts` มี blueprint 5 levels, deterministic placement/score, repair/reject/fallback, overlap/boundary checks, child/NPC/mob/interior rules และ assetRefs; ยังไม่มี actual asset pack, terrain/road/interior solver หรือ runtime integration |
| World/Content Generation Suite | Generate → Validate → Balance → Performance Check → Register → Preview → Test → Commit/Deploy และ cache/provenance | **PARTIAL foundation**; Common Generator API มี artifact schema, registry, deterministic SHA-256, validation, preview, save/export และ provenance แต่ balance/performance check, durable storage, orchestrator และ generator รายด้านยังไม่มี |
| Procedural Animation | reusable motion/skeleton/profile/seeded variation/wind/retarget/LOD/validation; entity scale แยกจาก voxel scale | **PENDING** |
| Universal item engine | relationship กับ world/material/crafting/build/combat/progression, tags/compatibility, power budget, counter, durability, economy | **PARTIAL/PENDING**; current catalog/provenance เป็นฐานข้อมูล ไม่ใช่ engine เต็ม |
| Universal plant/ecology | nutrients, fertilizer, health/stress/disease, pests, pollination, seasons/weather, genetics, processing/trade, abstract simulation | **PENDING**; current farm เป็น minimal Obsidian slice |
| World instance/network | Local/LAN/online provider, instance identity, permission see/join/build/destroy/fight/invite และ interest management | **PENDING**; `STRUCTURE.md` มีเพียง future transport boundary |
| Adaptive performance | device tiers, WebGL capability, hysteresis, chunk/culling/LOD/pooling/sleep-wake, distance-based AI/animation/physics และ profiler | **PENDING**; `renderDistance.ts` มีแค่ near/balanced/far และ generator foundation ยังไม่ทำ performance check |
| Story/Quest/Map 1–100 | map 1–10 open, map 11+ chained unlock, 20+ quests/map, linked reward/ability/lore | **PENDING** |
| Codex/Credits/detail UX | discovered-only Codex, category detail, provenance credits/supporters, long-press item detail และ short switch detail | **PENDING/PARTIAL** ตาม C-01/C-02/C-03/T-07 |
| Thai no-code platform | drag/drop/LEGO-like composition, pixel/mob editor, validate/register/export to game | **PENDING** และเป็นงานปลายทาง |

## 5. เอกสารที่ขัดกันหรือเก่า

`MAP_001_010_BRIEF.md` ระบุรัศมี 1,000–1,500 เมตร และกล่าวว่า MAP_002–MAP_010 selectable/cached expedition modules ขณะที่ current matrix, `MAPS.md` และ `catalog.ts` ใช้รัศมี 500 เมตร และ runtime guard อนุญาตให้เล่นเฉพาะ Obsidian. ดังนั้นข้อความใน brief เป็น planning history ไม่ใช่ runtime truth

`GEMINI_ADOPTED_PLAN.md` ยังระบุแนวทาง 1–1.5km และ map-family plan ที่กว้างกว่า runtime scope. `todo.md` ยังมีรายการเก่าที่เป็น unchecked แม้บางรายการมี checkpoint แล้ว และยังไม่มีแถวสำหรับ generator backlog ใหม่จาก `pasted_content_15.txt`/`_16.txt`. ส่วน `maps.ts` มี 15 records ที่ status เป็น `prototype` และอีก 85 records ที่ `planned`; status ใน registry ไม่ได้ override Obsidian-only runtime allow-list และห้ามนำไปอ้างว่า 15 map เล่นได้สมบูรณ์

เอกสาร `GEMINI_MAP011_015_ADOPTED.md` มี checklist `[x]` สำหรับการเข้าเล่น MAP_011–015 แต่หลักฐาน runtime ปัจจุบันบังคับ Obsidian-only และจึงต้องถือ checklist นั้นเป็น adopted design/record เก่า ไม่ใช่หลักฐาน playable acceptance. ข้อจำกัดนี้สอดคล้องกับ `directRoute.ts` และ O-02/O-03 ใน matrix

## 6. รายการที่ถูกข้ามและต้องไม่ถูกลืม

งานที่ผู้ใช้ส่งแต่ยังไม่ได้ทำครบ ได้แก่ การขยาย Structure/Building asset pack, terrain/road/interior solver และ runtime integration; Quest/Dungeon/Loot/Crafting/Economy/Balance/Audio/Weather/Vegetation/Crop generators, Simulation/Auto-play Tester, Performance Profiler, Save/World Migration, Tool Orchestrator, Procedural Animation/Motion Generator, Free-Scale Entity System, universal ecology engine, world-instance/LAN/online abstraction, full 40-slot carry enforcement/cross-map carry, full block/gravity/tree/leaf registry, seed-return chain, cactus/universal effect engine, Codex, Credits/Supporters, Thai language/rating/voice policy, item long-press details, 1–100 story/quest progression, final Minecraft reference/art provenance pass และ Thai no-code engine

รายการเหล่านี้ไม่ควรทำรวมเป็นก้อนเดียว และไม่ควรเริ่มสร้าง player-facing generator UI. เมื่อเริ่มพัฒนาต่อ ต้องทำ tool/data foundation ก่อน engine/runtime integration ตาม dependency, ใช้ Generate Once → Validate → Store/Registry → Reuse, เขียน tests ก่อน checkpoint และ commit/push แยกแต่ละ coherent unit

## 7. ลำดับงานต่อที่แนะนำ

ลำดับที่ปลอดภัยหลัง audit คือ (1) ปิด residual acceptance ของ Obsidian vertical slice ที่จำเป็นจริง เช่น full carry semantics, block/gravity scope, seed-return และ pause/touch evidence โดยไม่เปิด future maps, (2) ขยาย Common Generator API ด้วย durable content storage/orchestrator และทำ Structure asset/road/interior integration แบบ backend-only, (3) เพิ่ม world/content generators ตาม dependency, (4) สร้าง universal item/ecology/animation foundations, (5) สร้าง story/quest schema และ progression validator, (6) ทำ Codex/Credits/item detail, (7) ทำ performance/device tooling และ benchmark, (8) ทำ visual/reference/art pass, และ (9) ทำ Thai no-code platform เป็นงานปลายทาง

ลำดับนี้เป็น roadmap ไม่ใช่หลักฐานว่าแต่ละขั้นทำแล้ว. การเปลี่ยนลำดับต้องบันทึกเหตุผลและผลกระทบใน matrix ก่อนเริ่มระบบใหม่

## References

[1]: ./uploaded-docs-audit-notes-2026-08-26.md "Uploaded documents audit notes"
[2]: ./OWNER_REQUIREMENTS_MATRIX.md "Owner Requirements Matrix"
[3]: ../GAME_RULES.md "Repository game rules"
[4]: ../STRUCTURE.md "Repository structure blueprint"
[5]: ../MAP_001_010_BRIEF.md "Historical MAP_001–010 brief"
[6]: ../client/src/game/data/catalog.ts "Runtime catalog source"
[7]: ../client/src/game/data/maps.ts "Runtime map registry source"
[8]: ../client/src/game/tools/plantCatalogGenerator.ts "Implemented plant generator source"
[9]: ../client/src/game/systems/renderDistance.ts "Current render-distance contract"
[10]: ../client/src/game/storage/indexedDb.ts "Offline persistence source"
[11]: ../client/src/game/help/helpContent.ts "Current help/onboarding source"
[12]: ./MINECRAFT_PE_CASE_STUDY.md "Reference-only Minecraft case study"


## 8. Decision policy เมื่อเอกสารขัดกัน

เพื่อไม่ให้การทำงานต่อพลาดจุดสำคัญ ใช้ลำดับน้ำหนักต่อไปนี้: ข้อกำหนดล่าสุดของเจ้าของที่ผ่านการคำนวณและไม่ทำลาย performance/ความปลอดภัยมาก่อน, ตามด้วย runtime source และ automated/browser/device evidence, จากนั้น `GAME_RULES.md` และ architecture contracts, ต่อด้วย Toolkit Master/uploaded specifications ในฐานะ design requirements และสุดท้ายคือ prototype/planning documents เก่าในฐานะประวัติ

ดังนั้นขนาดแผนที่ที่ใช้งานในปัจจุบันคือ **รัศมี 500m** ไม่ใช้ค่าประวัติ 1,000–1,500m; runtime เปิดเฉพาะ **Obsidian Frontier** ไม่ใช้สถานะ prototype ใน registry เป็นสิทธิ์ playable; และ global `near/balanced/far` ยังคงเป็น compatibility presets แยกจาก in-map view-distance model 5–50 blocks จนกว่าจะมี implementation/benchmark ที่ละเอียดกว่า การตัดสินใจนี้ลดความเสี่ยงด้าน memory, loading และ runtime scope แต่ยังไม่ใช่ผล benchmark บนอุปกรณ์จริง

เอกสาร planning ที่มี checklist `[x]` เช่น MAP_011–015 จึงยังไม่ยกระดับเป็น runtime completion หากไม่มี source, tests และ browser/device evidence ที่ผ่าน allow-list ปัจจุบัน การเปลี่ยน decision ภายหลังต้องเพิ่ม impact review และ decision record ใหม่ก่อนแก้ contract
