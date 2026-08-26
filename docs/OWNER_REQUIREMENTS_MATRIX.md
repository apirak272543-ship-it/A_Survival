# A_Survival — Owner Requirements Matrix

เอกสารนี้เป็น source of truth ของคำสั่งจากการสนทนาทั้งหมดที่ทบทวนถึงวันที่ 26 สิงหาคม 2026 ใช้สถานะ `VERIFIED` เฉพาะรายการที่มี source/test/evidence รองรับจริง, `PARTIAL` เมื่อมีฐานบางส่วนแต่ acceptance ยังไม่ครบ และ `PENDING` เมื่อยังไม่มี implementation ที่ตรวจสอบได้ ห้ามสรุปว่างานเสร็จทั้งหมดตราบใดที่รายการใน scope ยังเป็น `PARTIAL` หรือ `PENDING`

## กติกาการทำงานและขอบเขต

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| O-01 | ต้องทำงานต่อจากคำสั่งทั้งหมดตั้งแต่เริ่มแชท ไม่ข้ามงานเก่า | matrix นี้สร้างจากบริบทที่ทบทวนแล้ว | PARTIAL | ตรวจ matrix ทุก checkpoint และเพิ่มแถวเมื่อมีคำสั่งใหม่ |
| O-02 | เล่นได้เฉพาะ Obsidian Frontier จนกว่า vertical slice จะเสร็จและได้รับอนุมัติ | `RUNTIME_MAP_ID`, direct-route tests, browser direct URL และ selector proof | VERIFIED | รักษา allow-list ต่อไปเมื่อเพิ่มระบบใหม่ |
| O-03 | ข้อมูล future maps เก็บเป็น planned/backend data ได้ แต่ห้ามมี playable runtime entry, cache preparation หรือ generator UI | selector/cache lookup จำกัดที่ `RUNTIME_MAP_ID`; browser map selector แสดงการ์ดเดียวและ direct map-002 fallback เข้า Obsidian | VERIFIED | คง future records เป็นข้อมูลหลังบ้านเท่านั้น และเพิ่ม guard เมื่อมี cache caller ใหม่ |
| O-04 | ถ้างานใดพึ่งเครื่องมือที่เจ้าของสั่ง ให้สร้าง/ตรวจเครื่องมือนั้นก่อน; หลังเกมเสถียรให้ใช้ Engine แทนการเขียนโค้ดตรง | มีข้อกำหนดในแผนงานและฐาน generator เดิมยังไม่ครบ | PENDING | สร้าง tools ตามลำดับและ enforce dependency gate |
| O-05 | ทำทีละหน่วยที่จบ ตรวจจริง บันทึก matrix แล้ว commit/push ทันที ไม่รวมส่งทีเดียว | workflow นี้ใช้ checkpoint แยก; หน่วยแรกผ่าน test/check/build/browser แล้ว | PARTIAL | ต้องทำแบบเดียวกันกับทุกหน่วยถัดไป |

## ภาพ เกม และ mobile foundation

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| V-01 | ภาพเป็น original crisp voxel/pixel RPG มี relief, mountains, rocks, paths และอ่านวัตถุจริงได้ | generated voxel pack, rolling terrain และ Babylon scene ใน GitHub main | PARTIAL | ปรับความหนาแน่น/ความมืด/ความต่างสี และตรวจภาพจริงทุก camera mode |
| V-02 | ไม่ใช้พื้นแบน RGB/glow จนกลืน player, pet, enemy | terrain material และ scene lighting มีฐานแล้ว | PARTIAL | visual pass และ screenshot acceptance |
| V-03 | ตัวละคร สัตว์เลี้ยง มอนสเตอร์ item ฉาก ต้นไม้ และ texture แยกเป็น mod/texture pack replaceable | asset pack manifest และ loader ใน source | PARTIAL | ทุก runtime asset ต้อง resolve จาก manifest/assetId/SHA/provenance |
| V-04 | external/community asset ต้องมี license/provenance/เครดิต และ reference-only ห้ามเป็น runtime | manifest/asset code มีฐาน แต่ Credits UI ยังไม่มีใน current GitHub main | PARTIAL | สร้าง Credits/Supporters UI และ owner-contact workflow |
| M-01 | เล่นบนมือถือแนวนอนจริง ไม่ล้นจอ มี safe area, fullscreen และ touch controls | landscape CSS/meta, `.game-viewport`, touch stick และ fullscreen ใน source | PARTIAL | ตรวจ 320/390/430/768 px และอุปกรณ์จริง |
| M-02 | render/load เฉพาะพื้นที่ใกล้ผู้เล่นและปรับตามสเปกมือถือ | visible-region pool และ render-distance presets | PARTIAL | benchmark FPS/memory/draw calls บนมือถือจริง |
| M-03 | offline-first, cache, integrity และเล่นต่อเมื่อ network หาย | service worker, Cache Storage และ local profile/transaction queue | PARTIAL | airplane-mode, reconnect/resync และ map/chest/plant persistence จริง |

## Block-first และ world interaction

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| B-01 | สิ่งที่เป็นบล็อกได้ต้องเป็น independent coordinate/state/action; ต้นไม้/ใบไม้เป็น block records | Obsidian slice มี deterministic block coordinates, per-cell mesh metadata, override state และ action resolver สำหรับ slab/player block; terrain/decoration อื่นยังเป็น mesh รวมบางส่วน | PARTIAL | ขยาย block records ให้ครอบคลุม world content, tree/leaf groups และ per-block mutation ทุกชนิด |
| B-02 | partial/non-solid object นับเป็น 1 cell แต่เดินผ่านได้ตามชนิด; hazard และ cactus/หนามทำ damage | current scene มี collision-less decorations และ combat damage | PARTIAL | occupancy/partial collision/hazard contract และ test |
| B-03 | support/gravity: บางบล็อกวางต่อจากเพื่อนได้ บางชนิดลอยได้ บางชนิดต้องตกเมื่อฐานหาย | Obsidian slice มี solid-support gate, empty-cell gate และ partial/solid flags พร้อม unit tests; ยังไม่มี gravity solver หรือ rule registry ครบทุกชนิด | PARTIAL | universal support/gravity/partial occupancy validator และ runtime tests |
| B-04 | generic/wrong tool ทำลายโดยไม่คืน item; correct tool คืน placeable block item | Obsidian slab ใช้ pickaxe แล้วคืน `structure-001` พร้อม drop provenance; hand/wrong tool ทำลายโดยไม่คืน block; unit tests และ browser localStorage proof ผ่าน | PARTIAL | ขยาย tool/block registry ให้ครอบคลุม block families และ universal durability/drop rules |
| B-05 | วางบล็อกและคง state ข้าม reload/map ตามกฎ | `OfflineMapState` มี `worldBlockOverrides`, composite key `[mapId+playerId]`, runtime rehydration และ browser IndexedDB proof ของ break/place หลัง reload | PARTIAL | ทดสอบหลาย map/player เมื่อ future maps เปิดตามแผน และเชื่อม persistence กับ universal world state |
| B-06 | carry inventory 40 ช่อง, block stack ปกติ 64 และ item-specific caps; carry ข้าม map | `CARRY_SLOT_LIMIT=40` ถูกใช้เป็น transfer gate, UI แสดง carry `/40`, block stack cap 64 และ tests ปฏิเสธการ withdraw เมื่อ carry เต็ม; session inventory ยังไม่ได้ normalize เป็น 40 ช่องหรือพิสูจน์ cross-map carry | PARTIAL | enforce/test exactly 40 carry slots ทั่วทุก reward/action, overflow/stack merge และ cross-map carry |
| B-07 | chest แยกจาก carry เป็น storage map-local | `worldStorageSystem.ts` บังคับ chest 27 ช่องและ atomic transfer พร้อม provenance; `OfflineMapState.worldStorageById` อยู่ใน composite `[mapId+playerId]`; ChestSheet เปิดจาก deterministic Obsidian chest และ browser deposit/withdraw/reload proof ผ่าน | PARTIAL | หลาย chest/map isolation เมื่อ future maps เปิด, full cross-map storage contract และ integration กับ universal world state |

## Backend generation และ content registry

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| G-01 | World Generator เป็น backend-only, deterministic และ generate terrain/water/trees/structures/NPC/boss/safe zone/shop ครบตามกฎ | current GitHub main มี map data/encounter modules แต่ไม่มี complete universal generator | PARTIAL | generator tool, deterministic export, no player button |
| G-02 | hard spatial rules: bounds, surface, height layers, slope, water, overlap, clearance, support/gravity และ repair-before-export | ไม่มี universal validator ใน current GitHub main | PENDING | validator/repair tests และ exported artifact proof |
| G-03 | ไม่มี generator/content editor/player generator UI ในเกม | current UI ไม่มี generator button | VERIFIED | รักษา guard ต่อไป |
| G-04 | reusable Content Generation Suite แยก Definition/Model/Texture/Skin/Variant/Gameplay พร้อม semantic visual design, override, decision log, cache/provenance | current GitHub main ไม่มี suite ที่ตรวจได้ | PENDING | backend suite + tests + CLI/docs |
| G-05 | assets ต้อง manifest/assetId/SHA/provenance-backed; unknown-license เป็น reference-only | manifest/loader มีฐาน | PARTIAL | ตรวจทุก runtime asset และ Credits UI |
| G-06 | optional AI NPC หนึ่งตัวต่อ map, server-only/on-demand/default disabled, max one และ safe bounded action | current encounters/NPC labels มี แต่ไม่มี AI provider adapter ที่ตรวจได้ | PENDING | server-only toggle, provider fallback, no browser secret/background loop |

## Plants, farming และ ecology

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| F-01 | มี plant catalog ประมาณ 300 ชนิด กระจายตาม biome/soil และเพิ่มได้ด้วย data | deterministic Plant Catalog Generator สร้าง/validate 300 profiles พร้อม soil/biome links และ tests; runtime catalog coverage ยังไม่ครบ | PARTIAL | เชื่อม generated artifact เข้ากับ runtime catalog และตรวจ distribution ครบ |
| F-02 | พืชผูกกับ soil/block/biome; ปลูก เติบโต เก็บเกี่ยวได้ | Obsidian world farm มี plot/soil/biome gate, planting, growth state และ harvest plan พร้อม tests/browser proof | PARTIAL | ขยาย soil/block/biome coverage และ world distribution ให้ครบทุก plant family |
| F-03 | stage ของพืชเป็น seed/sprout/young/mature และ mature-only harvest/reward | world farm stages, elapsed-time rehydration, mature-only harvest, reward provenance และ cleared plot ผ่าน focused tests กับ browser proof | PARTIAL | เพิ่ม stage/profile coverage และตรวจ unloaded-chunk abstraction ระยะยาว |
| F-04 | ผลกระทบ healing/buff/repel/damage เป็น fictional, capped และไม่ทำ medical claim; cactus มี thorn damage | world farm reward effect เป็น fictional/capped และมี tests; cactus thorn และ universal effect engine ยังไม่มี | PARTIAL | เพิ่ม cactus/plant hazard และ universal target/effect disclosure |
| F-05 | พืช repellent ผลักมอนสเตอร์ใกล้บ้าน/พื้นที่ ไม่ฆ่าอัตโนมัติ และมี radius/stacking/duration rules | world farm update loop มี mature-only non-lethal repel radius/cap logic และ focused farm tests; browser proof กับศัตรูยังไม่ครบ | PARTIAL | ยืนยัน browser behavior พร้อม enemy ใกล้เคียง และเพิ่ม stacking/duration coverage |
| F-06 | seed/plant ที่เก็บจากโลกใช้ปลูกต่อและ soil ที่เหมาะสม | planting consume เป็น atomic และ harvest reward มี map provenance; seed-return/replant chain ยังไม่ครบ | PARTIAL | เพิ่ม seed/plant drop chain และปลูกต่อครบวงจร |
| F-07 | Universal Plant/Tree/Ecology/Farm Engine ครอบคลุม environment, nutrients, fertilizer, health/stress/disease, pests, pollination, seasons/weather, lifecycle, genetics, automation, processing/trade | ไม่มี engine กลางใน current GitHub main | PENDING | deferred หลัง current vertical slice |

## Camera, settings และ performance

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| S-01 | ผู้เล่นเลือก first-person/build-farm, overhead/action หรือ side/over-shoulder เองใน In-map Settings | `InMapSettingsSheet` มีตัวเลือกบุคคลที่ 1/มุมสูง/มุมด้านข้าง; scene ใช้ UniversalCamera + ArcRotate camera; browser proof เปลี่ยน first-person, side และ overhead จริง; ค่า hydrate หลัง reload | PARTIAL | ตรวจ touch/collision และ device sizes เพิ่ม; เก็บภาพ acceptance ให้ครบตามอุปกรณ์เป้าหมาย |
| S-02 | แยก Outside/Global Settings จาก In-map Settings; global language/graphics/audio/defaults, in-map view/control/pause | Global sheet ระบุ `Global settings · App-wide` และเก็บภาพ/เสียง/การควบคุม; In-map sheet อยู่เฉพาะ `screen === game` และบันทึก camera/view/FPS ด้วย `[mapId+playerId]`; offline normalization tests + browser reload proof | PARTIAL | เพิ่ม global/in-map acceptance ทุก entry route และตรวจ pause/focus behavior ให้ครบ |
| S-03 | view distance steps 5,10,...50 blocks และ target FPS 5..60 + 120 แบบไม่รับประกัน | `cameraModes.ts` บังคับตัวเลือก 5–50 ทีละ 5 และ target FPS `[5,15,30,45,60,120]`; UI ระบุ target ไม่รับประกัน; view เปลี่ยน streaming preset แบบ near/balanced/far และ browser เลือก 50 ได้; target FPS ยัง persistence/UI-only | PARTIAL | ทำ runtime frame-target mechanism หรือคงเป็น target-only contract พร้อม performance/device evidence; ขยาย view-distance streaming ให้ละเอียดกว่า 3 legacy presets หากจำเป็น |
| S-04 | adaptive performance: device tiers, WebGL capability, LOD, culling, pooling, hysteresis, sleep/wake, distance-based updates | ไม่มี unified controller | PENDING | deferred runtime tool phase |

## Codex, credits, language และ rating

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| C-01 | Codex รวม item ทุกประเภทแต่แสดงเฉพาะสิ่งที่เคยเก็บ/ค้นพบแล้ว มีหมวดและ detail | current Vault มี item list แต่ไม่มี discovered-only Codex | PENDING | Codex sheet, discovery persistence และ empty/duplicate tests |
| C-02 | item detail แสดงคุณสมบัติ damage/plant/stack/usage แบบไม่รก | Vault detail มี effect/provenance บางส่วน | PARTIAL | category-specific detail |
| C-03 | Credits/Supporters ซ่อนไว้ใน UI แรก กดเข้าไปดูได้ แยก runtime/reference-only | current landing/lobby ไม่มี Credits sheet | PENDING | provenance-first credits UI |
| L-01 | ภาษาไทยเป็นค่าเริ่มต้น ใช้ภาษาชีวิตประจำวัน ไม่ราชาศัพท์/ไม่สวยหรูเกินไป | current UI ผสมไทย/อังกฤษ | PARTIAL | copy pass ทุก screen และ resource จริงก่อนเปิด English |
| L-02 | เกมไม่ทำสำหรับเด็ก; colloquial/profane dialogue/voice ได้ตามบริบท แต่ system/safety copy ต้องชัด | ยังไม่มี policy/rating/voice source ใน current GitHub main | PENDING | policy, labels, voice provenance และ review |

## เครื่องมือ deferred และปลายทาง no-code

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| T-01 | Runtime rendering/performance tool ใช้ generate once → pre-generated data → registry/cache → chunk/culling/LOD/pooling | ยังไม่มีเครื่องมือกลาง | PENDING | ทำหลัง current slice และส่ง checkpoint แยก |
| T-02 | Procedural Animation/Motion Generator มี library, skeleton, profiles, seeded variation, wind, retargeting, animation LOD | ยังไม่มีเครื่องมือกลาง | PENDING | ทำหลัง performance tool |
| T-03 | Universal Item/Equipment/Combat/Crafting/Assembly Logic มี relationship, weapon/tool families, damage/status/elements, synergy, durability, progression, economy | current catalog/combat เป็นฐานบางส่วน | PARTIAL | universal backend generator และ tool-aware runtime |
| T-04 | Common Generator API / Game Creation Engine ครอบคลุม world/quest/structure/dungeon/crafting/economy/audio/weather/vegetation/farming/test/profiling/migration | ไม่มี common engine กลาง | PENDING | ทำหลัง current slice ตาม priority |
| T-05 | งานสุดท้ายเป็น no-code ภาษาไทยแบบลากวาง/ถูวาง/ประกอบเหมือน LEGO และ pixel/mob editor เลือกสัดส่วน สี เฉด และสไตล์ แล้ว validate/register/export เข้าเกม | ยังไม่มี no-code UI | PENDING | สร้างเป็น platform แยกจากตัวเกม และหลัง engine foundations ครบ |
| T-06 | Structure/Building Generator: Generate Once → Asset/Blueprint → Placement Rules → Generation Rules → Validator/Registry; รองรับ object/building/compound/settlement/landmark, biome/terrain/climate/road/space/overlap rules, interiors, decorations และ mob/NPC linkage | อ่าน `pasted_content.txt` ครบ 567 บรรทัด; เป็น supplemental design specification เท่านั้น ยังไม่มี Structure Generator implementation | PENDING | สร้าง backend/data tool, deterministic seeded placement score, reject/repair ก่อน export, reusable library/blueprints และไม่มี player generator UI |
| T-07 | Story/Quest/Map Progression เชื่อม map 1–100, map 1–10 เปิดเล่นได้, map 11+ gated ด้วย quest chain, อย่างน้อย 20 quests ต่อ map, rewards/abilities/items/weapons สัมพันธ์กับโลก; item detail กดค้าง 3–5 วินาทีและ short detail เมื่อสลับของ | เป็น owner requirement ล่าสุดที่บันทึกในแผน; ยังไม่มี story/quest engine หรือ item-detail UX ที่ตรวจได้ | PENDING | ออกแบบ content schema, quest validator/progression persistence, map unlock tests และ detail UX หลัง current/tool foundations |

## Validation และ reporting rules

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| Q-01 | ใช้ Google/Gemini เมื่อไม่รู้ โดยบันทึก source และไม่อ้าง call ที่ล้มเหลว | research notes อยู่ในบริบทเดิม แต่ไม่อยู่ใน current repo อย่างครบ | PARTIAL | เก็บ research/audit files ต่อ checkpoint |
| Q-02 | ศึกษา Minecraft/เกมอื่นเป็น reference แต่ห้าม copy code/assets/branding | current GitHub main มีบาง docs | PARTIAL | source/reference note และ asset provenance |
| Q-03 | ต้องรัน test/check/build/browser evidence ก่อน report | Phase 6 camera checkpoint รัน `40 files / 130 tests`, `pnpm check`, production build และ browser evidence ใน `docs/phase6-browser-notes.md`; direct future-map URL ยัง fallback เข้า Obsidian | PARTIAL | ทำ validation แบบเดียวกันทุกหน่วยถัดไป และเติม mobile/device evidence เมื่อทำได้ |
| Q-04 | ต้องระบุข้อจำกัดจริงและห้ามใช้คำว่าเสร็จเมื่อยังมี PARTIAL/PENDING ใน current scope | กฎนี้เป็น reporting contract | VERIFIED | รักษาในทุกรายงาน |

## Checkpoint log

| วันที่ | หน่วยงาน | ผลตรวจ | Commit/GitHub | หมายเหตุ |
|---|---|---|---|---|
| 2026-08-26 | forensic reconciliation | พบ local branch `e6ba26c` ไม่ใช่ GitHub main; GitHub main ปัจจุบัน `0a9586f` ไม่มี later farming/chest/camera/matrix source ที่เคยอ้างใน checkpoint ก่อนหน้า | ยังไม่ push งาน repair | สร้าง local backup ref `local-pre-forensic-e6ba` และ stash `forensic-preserve-map-cache-v3`; ห้ามถือ audit เก่าเป็น source code |
| 2026-08-26 | Obsidian-only runtime guard | VERIFIED | `b9b15dc` pushed to `origin/main` | `server/directRoute.test.ts` 2 tests, full suite baseline 34 files/97 tests, `pnpm check`, production build และ browser direct/selector proof ผ่าน; build มี analytics env/chunk-size warnings เดิม |

### Checkpoint 2026-08-26 — Obsidian-only runtime guard

Browser ตรวจ `?route=game&map=map-002-ashen-obsidian-plains` แล้วเข้าสู่ runtime ของ Obsidian Frontier จริง โดย HUD แสดง Commander Koral / Crashed Leyline Monolith / Glass Stalker และไม่แสดงเนื้อหา map-002. Browser ตรวจ `?route=maps&map=map-002-ashen-obsidian-plains` แล้ว map selector แสดงเพียงการ์ด `01 Obsidian Frontier`; footnote ระบุว่า future maps เป็น planned data และไม่เปิดให้เลือกหรือเตรียม cache. `server/directRoute.test.ts` ผ่าน 2 tests และ `pnpm check` ผ่านหลังเพิ่ม `RUNTIME_MAP_ID`/runtime allow-list และแก้ direct `route=game` transition. หน่วยนี้ผ่าน diff-check, targeted/full validation และ browser proof แล้ว; checkpoint ถูก commit/push เป็น `b9b15dc` บน `origin/main`.

| 2026-08-26 | Obsidian block-first interaction slice | PARTIAL by broad-scope rules; scoped slab/place/persistence behavior verified | `576392e` pushed to `origin/main` | Added coordinate/state/action block modules, correct-vs-wrong tool resolver, 64-cap `structure-001`, solid-support/empty-cell gates, atomic accepted-placement consumption, map+player IndexedDB overrides, offline action validation, four-slot fresh-profile browser proof, and reload proof. `35` test files / `106` tests passed, `pnpm check`, diff-check, and production build passed; existing analytics env and Babylon chunk warnings remain. Broad tree/leaf, gravity, 40-slot carry, and universal block registry remain partial. |
| 2026-08-26 | Obsidian world farming slice | PARTIAL by broad-scope rules; scoped generator/farm/plant/harvest behavior verified | `afe0620` pushed to `origin/main` | Added map-local Obsidian farm plots, soil/biome gate, non-frame elapsed-time growth, seed consumption only after accepted planting, mature-only harvest, map-scoped reward provenance, capped fictional effect/repel rules, runtime crop records, offline farming action validation and React/Babylon bridge. `37` test files / `116` tests passed, `pnpm check`, diff-check and production build passed. Browser verified planting, rehydration, mature elapsed state, keyboard harvest, reward provenance and cleared plot; overlay-intercepted pointer attempt is not counted as harvest proof. Universal ecology, seed-return chain, cactus hazard and full repellent browser proof remain partial. |
| 2026-08-26 | Obsidian chest/storage slice | PARTIAL by broad-scope rules; scoped 27-slot map-local chest transfer verified | `abb3915` pushed to `origin/main` | Added `CARRY_SLOT_LIMIT=40` transfer gate, `CHEST_SLOT_LIMIT=27`, atomic deposit/withdraw with unchanged item instance/provenance, legacy normalization, `[mapId+playerId]` IndexedDB storage, deterministic Obsidian chest mesh/open bridge, responsive ChestSheet, and bounded server sync validators. `39` test files / `127` tests passed, `pnpm check`, diff-check and production build passed. Browser verified open, deposit to `1/27` with carry `8/40`, withdraw back to `0/27` and `9/40`, and deposit/reload/reopen persistence with `Aether Pickaxe` remaining in chest slot 1. Full 40-slot carry normalization, stack merge/overflow across every reward/action, multiple chest/map runtime isolation, and universal world-storage integration remain partial. |
| 2026-08-26 | Obsidian camera/settings slice | PARTIAL by broad-scope rules; scoped three-camera selection, split settings, and map+player persistence verified | pending checkpoint | Added `cameraModes.ts` with first-person/overhead/side, view-distance options 5–50 in steps of 5, and target FPS options 5/15/30/45/60/120; split Global and In-map settings UI; wired UniversalCamera + ArcRotate camera through dynamic `arcane-control` events; hid hero mesh in first-person; added backward-compatible `OfflineMapState.inMapSettings` and persistence. `40` test files / `130` tests passed, `pnpm check`, `git diff --check`, production build passed. Browser verified future-map direct URL fallback, all three camera views, 50-block selection, and reload hydration of overhead/50/60. Target FPS remains UI/persistence-only and view distance maps to three legacy streaming presets; mobile/device and pause/focus evidence remain outstanding. |

### Checkpoint 2026-08-26 — Obsidian block-first interaction slice

The focused block tests verify independent coordinate keys, deterministic Obsidian floor reads, correct pickaxe drops, wrong/hand no-drop destruction, solid support, occupied-cell rejection, 64-cap placement and one-item atomic stack consumption, legacy override normalization, and map+player state identity. Server sync tests verify that block actions are accepted only for bounded Obsidian payloads and reject future-map, invalid-module, and out-of-range inputs. Browser proof with fresh local Player ID `BlockProof` showed four quick slots including `Aether Pickaxe`, correct tool selection, a correct-tool drop recorded in localStorage, wrong-tool destruction without a second drop, a successful placement with a `block-place` action, and IndexedDB overrides surviving direct-route reload. The existing local dev environment has no authenticated session cookie, so sync-attention messaging appeared during browser proof; it does not change the local block rule or persistence evidence. This checkpoint does not claim completion of the broader B-01/B-03/B-04/B-05/B-06 requirements.

### Checkpoint 2026-08-26 — Obsidian camera/settings slice

The camera/settings slice separates app-wide controls from map-local controls. Global settings retain quality, effect, audio, touch, and reduced-motion values; the in-map sheet contains camera mode, block view distance, and target FPS. The Babylon scene creates one `UniversalCamera` for first-person and one `ArcRotateCamera` for overhead/side, updates them through `arcane-control` events, and keeps the React canvas mounted while settings change. First-person hides the hero mesh and follows player position/rotation; overhead and side restore the hero mesh and use distinct framing. The in-map settings record is normalized for legacy state and persisted with the existing `[mapId+playerId]` IndexedDB key.

Focused camera and offline-state tests cover defaults, all allowed option lists, malformed legacy fallback, valid custom settings, and namespace identity. Full validation passed with `40` test files and `130` tests, `pnpm check`, `git diff --check`, and production build. Browser evidence in `docs/phase6-browser-notes.md` verified direct future-map fallback to Obsidian, selection and visual change for first-person, side, and overhead, the 50-block bound, and reload hydration of `overhead / 50 / 60`. This checkpoint does not claim FPS limiting, fine-grained 5–50 streaming, mobile/device acceptance, pause/focus semantics, or completion of S-01/S-02/S-03/S-04.

### Checkpoint 2026-08-26 — Obsidian chest/storage slice

The scoped Obsidian chest slice uses a deterministic `storage.obsidian.chest` world record at the start area. The pure storage engine keeps a fixed 27-slot chest, validates a 40-slot carry limit for withdrawal, moves full `ItemInstance` objects without stack splitting, preserves provenance, and emits validated `storage-deposit`/`storage-withdraw` offline actions. Legacy `OfflineMapState` values are normalized with `worldStorageById`, and Dexie continues to use its composite `[mapId+playerId]` key. The Babylon scene opens the chest before generic block/resource interaction; React keeps the scene alive through latest-prop callbacks and persists the newest block/farm/storage state together.

Focused tests cover chest capacity, carry-full rejection, atomic no-mutation failures, provenance preservation, malformed/duplicate normalization, map-scoped action payloads, legacy map-state defaults, and sync rejection for future maps or invalid chest/slot/quantity identifiers. Browser evidence in `docs/phase5-browser-proof-notes.md` verified the 27/40 UI, deposit, withdraw, reload round trip, and a second deposit/reload/reopen showing the pickaxe still in chest slot 1. The unauthenticated development environment still displays its existing integrity/sync attention overlay; this does not change the local transfer result. This checkpoint does not claim the broader B-06/B-07 requirements complete.

### Checkpoint 2026-08-26 — Obsidian world farming slice

The deterministic Plant Catalog Generator checkpoint `5e4bdff` provides 300 validated data profiles with deterministic soil/biome links and capped fictional effects. The farming code checkpoint `afe0620` adds a map-local Obsidian plot state keyed through the existing `[mapId + playerId]` IndexedDB identity, planting and harvesting plans, stage-aware elapsed-time evaluation, accepted-action inventory semantics, provenance-backed reward instances, and validated offline sync payloads. The runtime uses crop block records and refreshes visuals without restarting Babylon for each interaction.

Focused tests cover generator count/link validation, soil and biome rejection, atomic planting, elapsed growth, mature-only harvest, reward provenance, capped repel/effect behavior, state normalization, and farming sync boundaries. Full validation passed with `37` test files and `116` tests, `pnpm check`, `git diff --check`, and production build. Browser evidence from the fresh `BlockProof` profile confirmed seed planting, IndexedDB plot persistence, elapsed-time maturity after reload, and a keyboard `E` harvest producing `material-001` with `world-harvest-obsidian-frontier-farm-plot-01-1787755986238` provenance while clearing the plot. A first pointer attempt was intercepted by the integrity relay and hit a nearby block; it is explicitly excluded from the harvest claim. This checkpoint does not claim the broader F-01/F-02/F-04/F-05/F-06/F-07 requirements complete.


## Supplemental owner material read 2026-08-26

เจ้าของส่งไฟล์ `pasted_content.txt` ถึง `pasted_content_16.txt` เพื่อใช้เป็นแนวทางเสริม และอ่านครบแล้ว ไฟล์บางชุดเป็นสำเนาเนื้อหาเดียวกัน จึงสรุปเป็นข้อกำหนดรวมโดยไม่ถือว่าเป็น source code หรือหลักฐานว่างานมีอยู่จริง

| กลุ่มเนื้อหา | ข้อกำหนดที่ต้องเก็บไว้ใช้ | ลำดับ/สถานะ |
|---|---|---|
| Product direction | A_Survival ควรมีโลก Block/Voxel ที่ความสัมพันธ์ระหว่าง biome, environment, plants, resources, mobs, items และ gameplay เป็นจุดต่าง; ระบบซับซ้อนได้แต่ onboarding ต้องง่าย | เก็บเป็น design direction; ยังไม่ใช่ acceptance claim |
| World instance/network | แยก Map ออกจาก World Instance; รองรับ Local, LAN และ Online Friend Session ผ่าน network abstraction/provider ในอนาคต; sync เฉพาะ instance เดียวกันและ permissions ต้องแยก see/join/build/destroy/fight/invite | deferred หลัง current offline Obsidian slice; ยังไม่มี multiplayer implementation |
| Runtime performance rule | สิ่งที่คำนวณล่วงหน้าได้ต้อง pre-generate/store/cache/reuse; ห้าม generate world/texture/model/animation หรือ recalculate definitions ทุก frame; runtime ทำเฉพาะ input → state → necessary simulation → visible objects → rendering | ผูกกับ T-01/S-04 และ phase 9; ยังไม่ implement unified performance tool |
| Runtime architecture | ต้องใช้ asset registry, chunk streaming, frustum/distance culling, occlusion เมื่อเหมาะสม, LOD, pooling, spatial partitioning, sleep/wake และ distance-based AI/animation/physics; generator ต้องทำ background/pre-generation และไม่บล็อก render loop | deferred; current source มี foundation บางส่วนเท่านั้น |
| Device/performance limits | ตรวจ capability จริงของ CPU/GPU/WebGL/WebGPU/storage/touch/browser และใช้ short benchmark; มี ULTRA LOW ถึง ULTRA tiers, hysteresis และลด render/mob/animation/physics/chunk/shadow/particle/texture/LOD/effect ตาม runtime | ผูกกับ S-03/S-04/T-01; ยังไม่ implement/benchmark จริงบนอุปกรณ์ |
| Voxel/data/asset separation | แยก Engine/Data/Assets; block ใช้ definition/ID และ texture atlas/face mapping; mob/plant/item รองรับ model/texture หลายรูปแบบ; asset ต้องโหลดเฉพาะที่จำเป็นและ deduplicate/compress/stream ไม่ฝังทุกอย่างใน HTML | ผูกกับ V-03/G-04/T-01; current manifest/loader เป็นเพียงฐานบางส่วน |
| Universal item system | Item ต้องสัมพันธ์กับ world/resource/material/crafting/build/combat/progression; รองรับ weapon families, role/trade-off, power budget, counters, elements, damage/status, capped stacking, synergy, set, durability และ economy | ผูกกับ T-03; current catalog/combat เป็นฐานบางส่วน ไม่เริ่มก่อนคิว |
| Universal plant/ecology | Plant/Tree Engine กลางรองรับอย่างน้อย 300 species แบบ data-driven พร้อม biome/soil/terrain/environment rules, staged growth, offline elapsed-time simulation, fertilizer/nutrients/health/stress/disease/pests/pollination/season/weather/genetics/processing/trade ในระยะยาว | current phase 4 มีเฉพาะ minimal Obsidian world farm และ deterministic catalog foundation; universal engine ยัง PENDING |
| Generator ecosystem | เพิ่ม Quest, Structure, Dungeon, Loot, Crafting, Economy/Balance, Audio/Sound, Weather/Environment, Vegetation, Crop/Farming, Simulation/Auto-play Tester, Performance Profiler, Save/World Migration และ AI Game Design Assistant โดยใช้ Common Generator API/Asset Schema เดียวกัน | ผูกกับ T-04/T-06/T-07 และ phase 8–14; backend/build pipeline only, no player generator UI |
| Structure/Building material | Structure มีหลายระดับ Object → Building → Compound → Settlement → Landmark; building asset ต้องมี metadata, biome/terrain/climate/settlement/mob rules, footprint/height/space/road constraints, interior blueprints, decoration and NPC/mob linkage; placement ต้อง score แล้ว reject/repair หากน้ำ/ลาดชัน/ชน/จม/ลอย/ทางเข้าไม่ผ่าน และใช้ library/rotation/mirror/variation แทนการสร้าง asset ซ้ำเป็นพันชิ้น | อ่าน `pasted_content.txt` ครบ 567 บรรทัด; เป็น design specification ที่ผูกกับ T-06 และยังไม่มี implementation | deferred; backend/data tool only, no player generator UI |
| Procedural animation/entity scale | เพิ่ม Motion Library, skeleton templates, seeded procedural variation, animation composition/LOD, environmental wind motion และแยก world scale/entity scale/model scale/texture resolution; entity ไม่จำเป็นต้องมีขนาด 1 block | ผูกกับ T-02 และ phase 10; ยังไม่ implement |
| Web/WebView constraints | ต้องคำนึงถึง JS/WebGL/WebView/RAM/thermal/network/offline limits, server authority และ interest management ในอนาคต; ลำดับที่เสนอคือ prototype → small world → chunk → mobs → multiplayer → benchmark → scale | เป็น architecture guidance; ห้ามอ้าง mobile FPS/thermal/real-device success โดยไม่มีหลักฐาน |

ไฟล์ที่มีสาระซ้ำกัน ได้แก่ `pasted_content_4.txt`/`pasted_content_10.txt`, `pasted_content_5.txt`/`pasted_content_11.txt`, `pasted_content_6.txt`/`pasted_content_12.txt`, `pasted_content_7.txt`/`pasted_content_13.txt` และ `pasted_content_9.txt`/`pasted_content_14.txt`; การซ้ำไม่เพิ่มสถานะ implementation

การอ่านชุดนี้ **ไม่เปลี่ยนลำดับปัจจุบัน**: ตรวจและปิดงาน Obsidian farming ให้ผ่านก่อน จากนั้นจึงทำ chest/camera/settings/current-slice acceptance และค่อยเริ่ม toolkit/performance/animation/universal engines ตาม dependency gates โดยทุกหน่วยต้องมี test, check, evidence, matrix update และ commit/push แยกกัน
