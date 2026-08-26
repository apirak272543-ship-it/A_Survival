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
| B-01 | สิ่งที่เป็นบล็อกได้ต้องเป็น independent coordinate/state/action; ต้นไม้/ใบไม้เป็น block records | current scene ยังเป็น terrain/decoration mesh แบบรวมบางส่วน | PARTIAL | block records, per-block state และ group generation ที่แก้ทีละ block ได้ |
| B-02 | partial/non-solid object นับเป็น 1 cell แต่เดินผ่านได้ตามชนิด; hazard และ cactus/หนามทำ damage | current scene มี collision-less decorations และ combat damage | PARTIAL | occupancy/partial collision/hazard contract และ test |
| B-03 | support/gravity: บางบล็อกวางต่อจากเพื่อนได้ บางชนิดลอยได้ บางชนิดต้องตกเมื่อฐานหาย | ไม่มี universal support solver ใน current GitHub main | PENDING | backend validator + runtime placement rules + tests |
| B-04 | generic/wrong tool ทำลายโดยไม่คืน item; correct tool คืน placeable block item | current source มี generic resource interaction แต่ยังไม่มี block tool-aware flow ครบ | PARTIAL | block action resolver, drop provenance, correct/wrong browser proof |
| B-05 | วางบล็อกและคง state ข้าม reload/map ตามกฎ | current `OfflineMapState` ยังไม่มี block overrides | PENDING | map-local block override schema/runtime/persistence |
| B-06 | carry inventory 40 ช่อง, block stack ปกติ 64 และ item-specific caps; carry ข้าม map | current session inventory/hotbar มีฐาน แต่ไม่มี full 40-slot enforcement contract | PARTIAL | test capacity/stack/cross-map persistence |
| B-07 | chest แยกจาก carry เป็น storage map-local | current source ยังไม่มี chest runtime/UI | PENDING | chest 27 ช่อง, interaction sheet, transfer, persistence/isolation |

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
| F-01 | มี plant catalog ประมาณ 300 ชนิด กระจายตาม biome/soil และเพิ่มได้ด้วย data | current GitHub main catalog ยังต้องตรวจจำนวน/coverage | PARTIAL | ยืนยัน 300 entries และ catalog tests |
| F-02 | พืชผูกกับ soil/block/biome; ปลูก เติบโต เก็บเกี่ยวได้ | Home farming มี crop loop บางส่วน | PARTIAL | world farming แยก map-local ใน Obsidian |
| F-03 | stage ของพืชเป็น seed/sprout/young/mature และ mature-only harvest/reward | Home crop stages มีฐาน | PARTIAL | world plant stages + reload/offline elapsed time |
| F-04 | ผลกระทบ healing/buff/repel/damage เป็น fictional, capped และไม่ทำ medical claim; cactus มี thorn damage | ยังไม่มี universal effect engine ที่ตรวจได้ | PENDING | capped effect system, target filters, disclosure และ tests |
| F-05 | พืช repellent ผลักมอนสเตอร์ใกล้บ้าน/พื้นที่ ไม่ฆ่าอัตโนมัติ และมี radius/stacking/duration rules | ยังไม่มี world repellent runtime ใน current GitHub main | PENDING | Obsidian browser proof พร้อม mature plant และศัตรูใกล้เคียง |
| F-06 | seed/plant ที่เก็บจากโลกใช้ปลูกต่อและ soil ที่เหมาะสม | Home seed consumption มีฐาน | PARTIAL | world drop chain และ provenance |
| F-07 | Universal Plant/Tree/Ecology/Farm Engine ครอบคลุม environment, nutrients, fertilizer, health/stress/disease, pests, pollination, seasons/weather, lifecycle, genetics, automation, processing/trade | ไม่มี engine กลางใน current GitHub main | PENDING | deferred หลัง current vertical slice |

## Camera, settings และ performance

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| S-01 | ผู้เล่นเลือก first-person/build-farm, overhead/action หรือ side/over-shoulder เองใน In-map Settings | current source มี ArcRotate overhead เท่านั้น | PENDING | เพิ่ม 3 cameras, map-local persistence และ mobile input/collision proof |
| S-02 | แยก Outside/Global Settings จาก In-map Settings; global language/graphics/audio/defaults, in-map view/control/pause | current source มี settings sheet เดียว | PENDING | split UI/scope/persistence |
| S-03 | view distance steps 5,10,...50 blocks และ target FPS 5..60 + 120 แบบไม่รับประกัน | current source มี near/balanced/far | PENDING | block-step/FPS model and honest labels |
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

## Validation และ reporting rules

| ID | ข้อกำหนดของเจ้าของ | หลักฐานปัจจุบัน | สถานะ | สิ่งที่ยังต้องผ่าน |
|---|---|---|---|---|
| Q-01 | ใช้ Google/Gemini เมื่อไม่รู้ โดยบันทึก source และไม่อ้าง call ที่ล้มเหลว | research notes อยู่ในบริบทเดิม แต่ไม่อยู่ใน current repo อย่างครบ | PARTIAL | เก็บ research/audit files ต่อ checkpoint |
| Q-02 | ศึกษา Minecraft/เกมอื่นเป็น reference แต่ห้าม copy code/assets/branding | current GitHub main มีบาง docs | PARTIAL | source/reference note และ asset provenance |
| Q-03 | ต้องรัน test/check/build/browser evidence ก่อน report | current baseline มี tests/build ได้ แต่ current repair ยังไม่ครบ | PARTIAL | ทำ validation ทุกหน่วย |
| Q-04 | ต้องระบุข้อจำกัดจริงและห้ามใช้คำว่าเสร็จเมื่อยังมี PARTIAL/PENDING ใน current scope | กฎนี้เป็น reporting contract | VERIFIED | รักษาในทุกรายงาน |

## Checkpoint log

| วันที่ | หน่วยงาน | ผลตรวจ | Commit/GitHub | หมายเหตุ |
|---|---|---|---|---|
| 2026-08-26 | forensic reconciliation | พบ local branch `e6ba26c` ไม่ใช่ GitHub main; GitHub main ปัจจุบัน `0a9586f` ไม่มี later farming/chest/camera/matrix source ที่เคยอ้างใน checkpoint ก่อนหน้า | ยังไม่ push งาน repair | สร้าง local backup ref `local-pre-forensic-e6ba` และ stash `forensic-preserve-map-cache-v3`; ห้ามถือ audit เก่าเป็น source code |
| 2026-08-26 | Obsidian-only runtime guard | VERIFIED locally | รอ commit/push หลัง validation ผ่าน | `server/directRoute.test.ts` 2 tests, full suite baseline 34 files/97 tests, `pnpm check`, production build และ browser direct/selector proof ผ่าน; build มี analytics env/chunk-size warnings เดิม |

### Checkpoint 2026-08-26 — Obsidian-only runtime guard

Browser ตรวจ `?route=game&map=map-002-ashen-obsidian-plains` แล้วเข้าสู่ runtime ของ Obsidian Frontier จริง โดย HUD แสดง Commander Koral / Crashed Leyline Monolith / Glass Stalker และไม่แสดงเนื้อหา map-002. Browser ตรวจ `?route=maps&map=map-002-ashen-obsidian-plains` แล้ว map selector แสดงเพียงการ์ด `01 Obsidian Frontier`; footnote ระบุว่า future maps เป็น planned data และไม่เปิดให้เลือกหรือเตรียม cache. `server/directRoute.test.ts` ผ่าน 2 tests และ `pnpm check` ผ่านหลังเพิ่ม `RUNTIME_MAP_ID`/runtime allow-list และแก้ direct `route=game` transition. หน่วยนี้ผ่าน diff-check, targeted/full validation และ browser proof แล้ว เหลือ commit/push checkpoint ในขั้นตอนถัดไป.
