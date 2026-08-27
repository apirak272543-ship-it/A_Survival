# Uploaded documents audit — 2026-08-26

เอกสารนี้เป็นบันทึกการตรวจไฟล์ต้นฉบับจาก `/home/ubuntu/upload` ไม่ใช่ source code และไม่ใช่หลักฐานว่า implementation มีอยู่แล้ว เป้าหมายคืออ่านไฟล์ทั้งหมดก่อน reconcile กับ `docs/OWNER_REQUIREMENTS_MATRIX.md` และ Repository จริง

## Inventory ที่ยืนยันจาก workspace

พบ Toolkit Master 1 ไฟล์, pasted content 17 ไฟล์ (`pasted_content.txt` และ `_2` ถึง `_16`) และ screenshot 9 ไฟล์ใน `/home/ubuntu/upload` จากรายการที่ตรวจด้วย filesystem โดยชื่อและขนาดของ text requirements มีดังนี้:

| File | Size |
|---|---:|
| `A_Survival_Toolkit_Master.txt` | 31,809 bytes |
| `pasted_content.txt` | 20,042 bytes |
| `pasted_content_2.txt` | 8,759 bytes |
| `pasted_content_3.txt` | 9,933 bytes |
| `pasted_content_4.txt` | 7,003 bytes |
| `pasted_content_5.txt` | 32,465 bytes |
| `pasted_content_6.txt` | 24,633 bytes |
| `pasted_content_7.txt` | 17,050 bytes |
| `pasted_content_8.txt` | 23,493 bytes |
| `pasted_content_9.txt` | 8,487 bytes |
| `pasted_content_10.txt` | 7,003 bytes |
| `pasted_content_11.txt` | 32,465 bytes |
| `pasted_content_12.txt` | 32,256 bytes |
| `pasted_content_13.txt` | 17,050 bytes |
| `pasted_content_14.txt` | 8,487 bytes |
| `pasted_content_15.txt` | 12,075 bytes |
| `pasted_content_16.txt` | 14,900 bytes |

The screenshots include `Screenshot_20260826-231812.jpg` and `Screenshot_20260826-231816.jpg`, which show the Manus file list containing the uploaded requirements and generated/checkpoint artifacts. The screenshots are treated as file-location evidence only; they are not used as requirement text.

## Read and summarized so far

`A_Survival_Toolkit_Master.txt` was read through the displayed main sections, including the 50-tool registry and the later pipeline/runtime sections. It defines the central rule **Generate Once → Validate → Store → Reuse**, separates Engine/Data/Asset/Validator responsibilities, and lists tools for world/terrain/biome/chunk/rule validation, blocks, plants, mobs, animation, items, assets, LOD, registry, compatibility, relationship graphs, balance/content/performance validation, seed/save/cache/pooling/culling/distance simulation, background generation, preview, import/export, batch generation/validation, migrations, dependency scanning, and a content dashboard. It also specifies the universal generation pipeline, item relationship/combination control, god-tier limits, communication/discovery tooling, runtime budget rules, network/world-instance tools, permissions, local/LAN/online providers, and the requirement to use existing tools rather than duplicate them. The end of the file (lines 1501–1623) still needs a separate read pass.

`pasted_content.txt` is the Structure/Building Generator specification. It requires Asset/Blueprint metadata, placement rules, generation rules, world-seed → terrain/climate/biome/resources/settlement/building/mob relationships, placement scoring and hard rejection, five structure levels (object, building, compound, settlement, landmark), blueprint-based village composition, interior variation, NPC/mob linkage, reusable libraries across 100 maps, and backend-only generation/validation before runtime. The current repo has no implementation matching this complete scope.

`pasted_content_2.txt` is the Shared World/World Instance specification. It requires Local, LAN and Online Friend Session providers; Map is distinct from World Instance; sync occurs only inside the same instance; friend permissions must separately govern see/join/build/destroy/fight/invite; and server-side access control must not rely only on guessable URLs. This is not the same as merely having local IndexedDB persistence.

`pasted_content_3.txt` is the runtime performance architecture rule. It requires generated data/assets outside the render loop, precomputed definitions, chunk/streaming/LOD/culling/spatial partition/object pooling/sleep-wake/distance-based simulation, and no per-frame world/texture/model/animation/definition generation or distant AI. It also requires runtime quality reductions and background generation without blocking the main render loop.

`pasted_content_4.txt` and `pasted_content_10.txt` are content/data/asset separation specifications. Their materially relevant rules are Engine + Data + Assets + Generator + Validator, block face/texture-atlas support, multiple model forms for mobs/plants/items, registry-driven loading, asset deduplication/streaming, and avoiding embedding the full content pack in HTML. `pasted_content_10.txt` was read and matches `pasted_content_4.txt` in the displayed content.

`pasted_content_5.txt` and `pasted_content_11.txt` are the Universal Item/Equipment/Combat/Economy specification. It requires item relationships to world/resources/materials/crafting/builds/combat/progression, weapon families and distinct roles, weaknesses/counters/trade-offs, elements/damage/status effects with stacking limits, armor/weight/durability/repair, upgrade/enchant/infusion/modification/socket systems, resource/economy loops, compatibility and relationship matrices, power budgets, redundancy checks, build archetypes, discovery/identification, player communication details, and anti-power-creep constraints. `pasted_content_11.txt` was read and matches `pasted_content_5.txt` in the displayed content; the second file still requires final-tail comparison if exact completeness is needed.

`pasted_content_6.txt` and `pasted_content_12.txt` are the Universal Plant/Tree/Ecology specification. They require one universal engine for 300+ data-driven species, environment/soil/water/light/temperature/humidity/altitude/season/weather factors, growth/health/stress/disease/fertilizer, time-based and unloaded-chunk simulation, distribution/density/space/collision validation, ecology/effects/aura/target filters, seed genetics and tree component growth, procedural wind/motion, LOD and simulation limits, harvest/food/crafting/resource links, content registry/versioning, performance/balance validation, and plant interactions with player/mob/NPC/item/block/structure/machine. `pasted_content_12.txt` matches the displayed main body of `pasted_content_6.txt`; the tail of `_12` still requires a final read pass.

`pasted_content_7.txt` and `pasted_content_13.txt` are the shorter Plant Growth/Distribution specification. `pasted_content_7.txt` requires one growth engine plus 300 profiles, time-based elapsed growth, environment factors, fertilizer, distribution rules, genetics, tree procedural growth, LOD, limits, and validation. `_13` is expected to match this file by size but still needs direct read confirmation.

`pasted_content_8.txt` is the detailed Performance & Device Limit specification. It adds capability detection (CPU/GPU/RAM/screen/DPR/WebGL/WebGPU/storage/browser/touch), short benchmark, ULTRA LOW through ULTRA tiers, target/emergency FPS distinction, dynamic quality with hysteresis, chunk categories, chunk-based render distance, LOD/frustum/occlusion culling, greedy/face culling and batching, generation budgets/queues, mob AI tick and distance tiers, animation/environment/particle/physics/vegetation limits, texture/asset/memory/audio/network/server budgets, thermal/battery/background protection, hard generator limits, performance validation/profiling/autoplay scenes, regression tests, automatic scaling, player overrides with safety limits, and developer monitoring. The current repo matrix must not reduce this to only Low/Medium/High settings.

`pasted_content_9.txt` and `pasted_content_14.txt` cover Web/HTML/WebView constraints. Their materially relevant rules are chunk/mesh visibility optimization, asset streaming/cache/unload, Web Workers/server authority/interest management, offline shell/static-data support, capability detection, no client secrets, WebView variability, server-side important logic, and staged scale-up from prototype to chunks/performance/multiplayer. `_14` is expected to match `_9` by size but still needs direct read confirmation.

## Not yet directly read in this audit pass

`pasted_content_13.txt`, `pasted_content_14.txt`, `pasted_content_15.txt`, and `pasted_content_16.txt` still need direct reading. The earlier session summary indicates `_15` adds Quest, Structure, Dungeon, Loot, Crafting, Economy/Balance, Audio/Sound, Weather/Environment, Vegetation/Crop, Game Simulation/Auto Play Tester, Performance Profiler, Save/World Migration, AI Game Design Assistant, Common Generator API and orchestrator requirements. The summary also indicates `_16` adds fractional entity scale inside a voxel world plus a detailed Procedural Animation/Motion Generator with motion library, skeleton templates, procedural composition/variation, environment/wind motion, retargeting, performance modes and validation. These summary points must be verified against the original files before being treated as audited.

## Reconciliation rule

The uploaded documents are owner design requirements. Repository files, tests, runtime behavior, and Git checkpoints are implementation evidence. A document requirement must remain `PENDING` or `PARTIAL` in the matrix unless matching code, tests, and runtime evidence are found. Duplicate attachments should be recorded as duplicate source copies, but they must not be silently ignored before their content has been confirmed.


## Completion update for uploaded attachments

ตรวจต้นฉบับครบทั้ง `pasted_content.txt` ถึง `pasted_content_16.txt` รวม 17 ไฟล์แล้ว โดยอ่านส่วนท้ายของไฟล์ที่ยาวเกินผลแสดงครั้งแรกเพิ่มเติม และอ่าน Toolkit Master จนถึงบรรทัด 1623 ครบแล้ว

`pasted_content_13.txt` ยืนยันว่าเป็น duplicate ของ `_7` โดยไม่มีข้อกำหนด materially ใหม่ในเนื้อหาที่อ่าน ส่วน `_14` ยืนยันว่าเป็น duplicate ของ `_9` เช่นเดียวกัน `_10` duplicate ของ `_4`, `_11` duplicate ของ `_5`, และ `_12` duplicate ของ `_6` แต่ `_12` มีส่วนท้ายที่ย้ำ plant-object interaction, biome ecology, weighted diversity และ performance-safe abstract simulation; จึงต้องรวมไว้ใน reconciliation แม้เป็นชุดซ้ำเชิงโครงสร้าง

`pasted_content_15.txt` เพิ่ม backlog ที่ต้องบันทึกแยกจาก Toolkit เดิม ได้แก่ Quest Generator, Structure Generator, Dungeon Generator, Loot Generator, Crafting Generator, Economy/Balance Generator, Audio/Sound Generator, Weather & Environment Generator, Vegetation Generator, Crop/Farming Generator, Game Simulation/Auto Play Tester, Performance Profiler, Save/World Migration Tool, AI Game Design Assistant, Tool Orchestrator และ Common Generator API/Common Asset Schema ที่มี interface แนว `Generate`, `Validate`, `Preview`, `Save`, `Version`, `Export`, `Register`.

`pasted_content_16.txt` เพิ่มกฎสำคัญว่าโลกยังเป็น voxel/block แต่ entity ใช้ขนาดเศษส่วนได้อย่างอิสระ (`Voxel World + Free-Scale Entity System`) และเพิ่ม Procedural Animation & Motion Generator แบบใช้ Motion Library, Skeleton Templates, parameterized motion, animation composition, seeded variation, environmental/wind motion, retargeting, per-entity Motion Profile, quality/LOD modes และ validation เรื่อง bone/rotation/stretch/collision/loop/reference/performance.

เอกสารที่มีชื่อและขนาดเดียวกันระหว่างชุดหลักกับ duplicate ถูกนับเป็นแหล่งอ้างอิงซ้ำ ไม่ใช่ implementation เพิ่มเติม การตรวจถัดไปต้องอ่าน repo-side planning/docs และ source/test evidence เพื่อระบุว่าข้อกำหนดเหล่านี้มีโค้ดจริงหรือยัง.


## Repository-side evidence read in this audit

อ่าน `PLAN.md`, `STRUCTURE.md`, `GAME_RULES.md`, `ASSETS.md`, `MAPS.md`, `MAP_001_010_BRIEF.md`, `UI_INTERACTION_CONTRACT.md`, `VISUAL_DIRECTION.md`, `MEMORY.md`, `todo.md`, `GEMINI_ADOPTED_PLAN.md`, `docs/A_SURVIVAL_ARCHITECTURE_BLUEPRINT.mmd`, `docs/MINECRAFT_PE_CASE_STUDY.md` และ `docs/MINECRAFT_PE_RESEARCH_SOURCES.md` แล้ว รวมถึง adopted milestone docs สำหรับ companion, direct route, integrity alert, loading variants, MAP_001–MAP_010, MAP_011–015, map scene identity, offline sync, onboarding และ vault quarantine ตามไฟล์ที่มีอยู่จริง

หลักฐาน implementation ที่พบจาก source คือ `client/src/game/data/catalog.ts` มี data-driven item/soil/provenance scaffolding, catalog 400 definitions ต่อ 9 category และ map catalog ขนาดเล็ก; `client/src/game/data/maps.ts` มี registry 100 records โดย 15 records ถูกระบุเป็น prototype ใน data แต่ runtime guard แยกต่างหากบังคับ playable map เดียวคือ Obsidian; `client/src/game/tools/plantCatalogGenerator.ts` เป็น generator/validator จริงเพียงตัวที่แคบและ scoped Obsidian พร้อม 300 records; `client/src/game/storage/indexedDb.ts` มี profile/transaction/map state composite key และ in-map settings; `renderDistance.ts` มีเพียง preset near/balanced/far 64/96, 96/128, 128/160 เมตร; help content มี 6 บทความ onboarding/integrity แต่ไม่มี Codex, Credits, Story/Quest หรือ long-press item detail

Evidence ที่ยังเป็น design/planning ไม่ใช่ proof ได้แก่ `PLAN.md`, `STRUCTURE.md`, `GAME_RULES.md`, `MAPS.md`, `GEMINI_*_ADOPTED.md`, map briefs, asset records และ architecture diagram. เอกสารเหล่านี้ย้ำว่า full map delivery, complete monster action sets, universal generators, multiplayer/world-instance providers, full performance controller, full plant ecology, Codex/Credits/quest UI และ no-code platform ยังไม่ควรถูกตีความว่าเสร็จเพียงเพราะมี data หรือแผนงาน

พบข้อขัดแย้งของเอกสารเก่าที่ต้องระบุใน reconciliation: `MAP_001_010_BRIEF.md` ยังบอก radius 1,000–1,500m และ MAP_002–010 selectable/cached expedition modules ขณะที่ current runtime/matrix ใช้ 500m records และ Obsidian-only runtime allow-list; `GEMINI_ADOPTED_PLAN.md` ยังบันทึก 1–1.5km/on-demand maps และแผนการขยายที่กว้างกว่าขอบเขต runtime ปัจจุบัน; `todo.md` มีรายการเก่าหลายข้อเป็น unchecked แม้งานบางส่วนจะมี checkpoint แล้ว และไม่มี backlog ใหม่จาก `_15`/`_16`. จึงต้องใช้ current source/tests/runtime และ matrix status เป็นหลัก ไม่ใช้ข้อความ `[x]` หรือแผนเก่าเป็นหลักฐาน completion

ระบบเกมปัจจุบันที่ยืนยันได้จริงประกอบด้วย browser-first/PWA shell, Player ID/local-first session, loading/cache gates, Babylon runtime, Obsidian-only direct route guard, local block/farm/chest slices, plant catalog foundation, global/in-map settings และ camera slice. ยังไม่มี source file ที่เป็น Structure/Quest/Dungeon/Loot/Crafting/Economy/Audio/Weather/Auto-play/Profiler/Migration/Orchestrator/Common Generator API, ไม่มี unified adaptive performance controller, ไม่มี Codex/Credits UI และไม่มี story progression engine ตามที่เอกสารอัปโหลดกำหนด


## Current repository and validation evidence

ณ รอบ audit นี้ `main` และ `origin/main` อยู่ที่ `4c71961` (`docs: record camera settings checkpoint`) และ working tree มีเพียง untracked audit file นี้; ไม่มี tracked diff. Recovery branch `local-pre-forensic-e6ba` ยัง resolve ไปที่ `e6ba26c65143232cd085eaa1221d88bb15d2cd55` และ `stash@{0}` ยังเป็น `5ac3ff6` ชื่อ `forensic-preserve-map-cache-v3`

`pnpm check` ผ่าน และ `pnpm test -- --run` ผ่าน `40` test files / `130` tests รวม camera, offlineMapState, block, farming, chest, map encounter, cache, manifest, integrity, sync, vault, vector clock และ visible region. ผลนี้ยืนยันว่า checkpoint code ปัจจุบัน compile/test ได้ แต่ไม่เปลี่ยนสถานะของ requirements ที่ยังไม่มี implementation เช่น structure/quest/toolchain/performance controller/Codex/Credits
