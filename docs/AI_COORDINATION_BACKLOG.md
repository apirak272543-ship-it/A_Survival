# A_Survival Full AI Coordination Backlog

เอกสารนี้เป็น **รายการงานกลางครบ 52 ข้อ** ที่ถอดจาก [`OWNER_REQUIREMENTS_MATRIX.md`](./OWNER_REQUIREMENTS_MATRIX.md) เพื่อให้ AI-0, AI-1 และ AI-2 เลือกงานร่วมกันโดยไม่ทำซ้ำ. Matrix เป็น source of truth ของสถานะ requirement ส่วนเอกสารนี้เป็น source of truth ของการจองงานและการแบ่ง owner.

> **วิธีอ่าน:** `Requirement status` บอกความคืบหน้าของข้อกำหนด (`VERIFIED`, `PARTIAL`, `PENDING`); `Claim state` บอกว่ามีคนกำลังถือไฟล์หรือไม่ (`DONE`, `RESERVED`, `IN_PROGRESS`, `AVAILABLE`, `BLOCKED`, `WAITING_EVIDENCE`). สองสถานะนี้ห้ามนำมาปนกัน. `PARTIAL` ไม่ได้แปลว่างานกำลังถูกทำอยู่ และ `AVAILABLE` ไม่ได้แปลว่าเริ่มแก้ได้ทันที ต้องอ่าน dependency/file reservation ก่อน.

## สรุปปัจจุบัน

| Requirement status | จำนวน | ความหมาย |
|---|---:|---|
| `VERIFIED` | 4 | ปิดตามหลักฐานปัจจุบันแล้ว; ห้ามเปิดทำซ้ำ เว้นแต่มี acceptance ใหม่หรือ regression |
| `PARTIAL` | 41 | มี implementation หรือหลักฐานบางส่วน แต่ยังมี acceptance gap |
| `PENDING` | 7 | ยังไม่มี implementation/evidence ที่ปิดได้ใน main |
| **รวม** | **52** | ห้ามประกาศ global/master-spec complete ขณะยังมี PARTIAL/PENDING |

| Claim state ที่สงวนอยู่ | Owner | Task ID | ขอบเขต |
|---|---|---|---|
| `AVAILABLE` | AI-1/AI-2/AI-0 | `AI1-PERF-001` | T-01 และ S-04: performance profile → visibility/telemetry/profiler; เป็นงานที่ worker ใดก็เลือกได้เมื่อ exact files ไม่ชน |
| `AVAILABLE` | AI-1/AI-2/AI-0 | `AI2-CONTENT-001` | F-01–F-06, T-03 และ T-04 ในสาย content/provenance; เป็นงานที่ worker ใดก็เลือกได้เมื่อ exact files ไม่ชน; ห้ามสร้าง binary asset หรือแก้ Workbench/router |
| `DONE` | AI-0 | `MAIN-REWARD-INVENTORY-001` | T-07 sub-checkpoint: quest reward → inventory capacity dry-run, implementation `f9bd3db20d3c7a7044ae147fbb1d24f19ee65e15` |
| `DONE` | AI-0 | `NEXT-QUEST-REWARD-PERSISTENCE-INTEGRATION-001` | T-07 sub-checkpoint: fail-closed client queue serialization and server sync allow-list for the already-created quest-reward pending action; implementation `f55b154`; full validation `109` files / `431` tests; no gameplay caller or reward grant |
| `DONE` | AI-0 | `NEXT-PERF-CAPABILITY-001` | T-01/S-04 sub-checkpoint: pure one-time WebGL/WebGPU/CPU/RAM/touch/storage capability normalization and advisory tier contract; implementation `937441a`; full validation `110` files / `439` tests; no render-loop coupling or device benchmark claim |
| `DONE` | AI-0 | `NEXT-ASSET-PROVENANCE-001` | T-04/F-01 sub-checkpoint: pure item/plant asset provenance dependency graph against active manifest/credits; implementation `83bd23e`; full validation `111` files / `444` tests; no binary asset generation, Workbench edit or runtime publish |
| `DONE` | AI-0 | `NEXT-ANIMATION-MOTION-001` | T-02 sub-checkpoint: pure distance/visibility/reduced-motion animation policy and bounded motion profile metadata; implementation `e8d4a9d`; full validation `112` files / `452` tests; no binary asset generation, GameCanvas caller edit, skeleton/retarget/device benchmark or player UI |
| `DONE` | AI-0 | `NEXT-ITEM-DETAIL-001` | C-02 sub-checkpoint: pure category-specific item detail facts from canonical ItemDefinition/ItemInstance; implementation `ea08e4a`; full validation `112` files / `455` tests; unavailable combat fields remain explicit blockers; no ArcaneFrontier UI, persistence caller or runtime mutation |
| `DONE` | AI-0 | `NEXT-WORLD-SPATIAL-001` | G-02 sub-checkpoint: pure bounded spatial dependency graph from world generator/constraints; implementation `50f17a1`; full validation `113` files / `460` tests; no player generator UI, runtime map selection or world persistence |
| `DONE` | AI-0 | `NEXT-PLANT-ECOLOGY-001` | F-07 sub-checkpoint: pure data-driven plant ecology policy from the 300-entry catalog covering soil/biome/lifecycle and bounded fictional nutrient/pest/season factors; implementation `9720ee0`; full validation `114` files / `466` tests; no real ecology simulation, gameplay mutation, `worldFarmSystem.ts` edit or player UI |
| `DONE` | AI-0 | `NEXT-CODEX-DISCOVERY-001` | C-01 sub-checkpoint: pure discovered-only Codex normalization/transition from `CODEX_ENTRIES`; implementation `3decb18`; full validation `115` files / `472` tests; no UI or persistence side effect in this round |
| `DONE` | AI-0 | `NEXT-CREDITS-PROVENANCE-001` | C-03 sub-checkpoint: pure runtime/reference-only credits presentation contract from `ASSET_CREDITS`; implementation `c3a859d`; full validation `116` files / `477` tests; no CreditsSheet/player UI edit or asset publish in this round |

ณ การตรวจล่าสุดยังไม่พบ remote branch/PR ของ AI-1 หรือ AI-2 ใน `origin`; reservation แบบจำกัดสายงานเดิมจึงถูก **ปล่อยกลับเป็น AVAILABLE**. ตั้งแต่นี้ AI-1 และ AI-2 ใช้ autonomous worker instructions เลือกงานจาก backlog ทั้งหมดได้ ไม่ต้องรอข้อความมอบหมายราย Task แต่ต้อง claim exact files ก่อนเริ่ม. AI-0 จะเปลี่ยนเป็น `DONE` ก็ต่อเมื่อมี branch/PR, commit SHA, diff และ test evidence ที่ตรวจได้.

## กติกาเลือกและจองงาน

1. AI ทุกตัวต้องเลือกจากแถวที่ `Claim state = AVAILABLE` เท่านั้น. ถ้าเป็น `VERIFIED/DONE` ให้ไม่เปิดงานซ้ำ; ถ้าเป็น `RESERVED/IN_PROGRESS` ให้หยุดและเลือกแถวอื่น; ถ้าเป็น `BLOCKED` ให้รายงาน blocker ไม่แก้ด้วยการเดา.
2. ก่อนแก้ต้องประกาศ `Task ID`, owner, branch/worktree, base SHA และ **exact file reservation** ใน [`AI_COORDINATION_REGISTRY.md`](./AI_COORDINATION_REGISTRY.md) หรือ PR/issue comment ที่อ้างถึง registry. การประกาศจะเปลี่ยน `AVAILABLE → RESERVED → IN_PROGRESS`.
3. File reservation เป็น exclusive lock. ถ้างานสองข้อแตะ owner เดียวกัน เช่น `CreatorDomainWorkbench.tsx`, `creatorRouter.ts`, `OWNER_REQUIREMENTS_MATRIX.md`, `maps.ts`, `directRoute.ts`, `mapCache.ts` หรือ `indexedDb.ts` ต้องแบ่ง sub-scope หรือรอ owner เดิม; ห้ามแก้ไฟล์เดียวกันพร้อมกัน.
4. เมื่อเสร็จต้องส่ง `commit SHA`, files changed, `git diff --check`, `pnpm check`, focused tests และ full tests/build ตาม scope. จากนั้น AI-0 ตรวจ source/diff/conflict แล้วเปลี่ยนเป็น `DONE` หรือ `BLOCKED`; ห้ามใช้สีเขียวจากคำบอกเล่าอย่างเดียว.
5. Matrix status และ claim state อัปเดตแยกกัน. การแก้ SHA ใน matrix ต้องเป็น docs commit แยกจาก implementation checkpoint. งานทุกตัวต้องคง invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้.

## Backlog ครบ 52 รายการ

| Task ID | Requirement | Requirement status | Claim state | Suggested owner | Exact scope / file reservation | Depends on | Acceptance gate |
|---|---|---|---|---|---|---|---|
| `O-01` | ทำงานต่อจากคำสั่งทั้งหมด ไม่ข้ามงานเก่า | `PARTIAL` | `AVAILABLE` | AI-0 | `OWNER_REQUIREMENTS_MATRIX.md`, checkpoint reports; ห้าม rewrite history | matrix audit | ทุก checkpoint มี source/diff/test/evidence และมีแถวบันทึก |
| `O-02` | เล่นได้เฉพาะ Obsidian Frontier | `VERIFIED` | `DONE` | AI-0 | `directRoute.ts`, `maps.ts`, map allow-list tests; แก้เฉพาะ regression | O-03 | direct route/selector/cache proof ยังปิด future map |
| `O-03` | Future maps เป็น planned/backend data แต่ไม่ playable/cache/generator UI | `VERIFIED` | `DONE` | AI-0 | `directRoute.ts`, `mapCache.ts`, `indexedDb.ts`, map selector tests; lock future-map policy | O-02 | future route fallback และ no cache/offline write |
| `O-04` | สร้าง/ตรวจเครื่องมือก่อนใช้ และใช้ engine หลัง runtime เสถียร | `PENDING` | `AVAILABLE` | AI-0 | tool inventory, generator dependency policy, docs; ห้ามเปิด player generator UI | O-01 | tool registry/dependency gate พร้อมหลักฐานแต่ละ tool |
| `O-05` | ทำทีละหน่วย ตรวจจริง matrix แล้ว commit/push ทันที | `PARTIAL` | `AVAILABLE` | AI-0 | checkpoint workflow/docs; ห้ามรวมหลายระบบก่อน test | O-01 | ทุกหน่วยมี isolated commit และ evidence |
| `V-01` | original crisp voxel/pixel RPG อ่าน relief/mountain/rock/path ได้ | `PARTIAL` | `AVAILABLE` | AI-0 | asset manifest/scene visual owner; ห้ามใช้ Minecraft/RoV assets | G-05 | visual pass/screenshot acceptance ทุก camera mode |
| `V-02` | ไม่ใช้พื้นแบนหรือ glow กลืน player/pet/enemy | `PARTIAL` | `AVAILABLE` | AI-0 | scene material/lighting owner; ห้ามแตะ player controls โดยไม่จำเป็น | V-01 | visual contrast proof บน runtime |
| `V-03` | runtime asset แยกเป็น replaceable mod/texture pack | `PARTIAL` | `AVAILABLE` | AI-0 | asset pack manifest/loader/registry; binary assets ต้องมี provenance | G-05 | ทุก runtime asset resolve manifest/assetId/SHA/provenance |
| `V-04` | external/community asset มี license/provenance/เครดิต | `PARTIAL` | `AVAILABLE` | AI-2 | `assetProvenance.ts`, Credits/Supporters owner และ docs; ห้ามใช้ unknown license เป็น runtime | G-05 | Credits UI/contact workflow และ reference-only boundary |
| `M-01` | landscape mobile, safe area, fullscreen, touch controls | `PARTIAL` | `AVAILABLE` | AI-0 | responsive CSS/meta, viewport, touch/fullscreen owner; no device claim without evidence | S-02 | 320/390/430/768 plus device evidence |
| `M-02` | render/load ใกล้ player และปรับตามสเปก | `PARTIAL` | `AVAILABLE` | AI-1 | visibility/streaming/performance owner; ห้ามเปิด GPU/mobile claim | T-01,S-04 | controlled benchmark/telemetry และ visibility policy |
| `M-03` | offline-first cache/integrity เล่นต่อเมื่อ network หาย | `PARTIAL` | `AVAILABLE` | AI-0 | service worker, Cache Storage, local profile/queue; ห้ามเปิด future-map writes | O-03 | airplane-mode/reconnect/resync/map-storage proof |
| `B-01` | block independent coordinate/state/action รวม tree/leaf records | `PARTIAL` | `AVAILABLE` | AI-0 | block modules/world generator/tree-leaf owner; ห้ามเปลี่ยน map allow-list | G-01,B-04 | per-block records/mutation/action tests |
| `B-02` | partial/non-solid occupancy, hazard/thorn damage | `PARTIAL` | `AVAILABLE` | AI-0 | block collision/hazard registry and tests | B-01 | occupancy/partial/hazard contract |
| `B-03` | support/gravity/float rule registry | `PARTIAL` | `AVAILABLE` | AI-0 | block support/gravity validator/runtime tests | B-01,B-02 | universal support/gravity/partial validator |
| `B-04` | wrong tool no drop, correct tool placeable block drop | `PARTIAL` | `AVAILABLE` | AI-0 | tool/block drop registry and durability owner; preserve Obsidian proof | B-01,B-03 | tool-aware drop/no-drop across block families |
| `B-05` | placement/state persists across reload/map | `PARTIAL` | `AVAILABLE` | AI-0 | offline world state/persistence; no future-map write before acceptance | B-01,O-03 | multi-map/player state and reload tests |
| `B-06` | 40-slot carry, 64 normal block stack, caps and cross-map carry | `PARTIAL` | `AVAILABLE` | AI-0 | `inventorySystem.ts`, carry/session transfer; current reward inventory checkpoint is read-only and DONE | B-04,B-05 | exact 40-slot/overflow/merge/cross-map tests |
| `B-07` | chest separate from carry and map-local | `PARTIAL` | `AVAILABLE` | AI-0 | `worldStorageSystem.ts`, chest persistence/transfer; preserve map+player namespace | B-05,B-06 | chest/map isolation and universal storage integration |
| `G-01` | backend-only deterministic world generatorครบ terrain/water/tree/structure/NPC/boss/safe/shop | `PARTIAL` | `AVAILABLE` | AI-0 | `worldGenerator.ts`, generator CLI/export tests; no player button | G-02,G-05 | deterministic exported artifact and bounded world rules |
| `G-02` | hard spatial bounds/surface/height/slope/water/overlap/clearance/support repair | `PENDING` | `AVAILABLE` | AI-0 | spatial validator/repair owner and tests; no destructive DDL | G-01 | reject-before-export and repair evidence |
| `G-03` | no generator/editor/player generator UI | `VERIFIED` | `DONE` | AI-0 | route/UI guard tests; do not reopen without regression | G-04 | player route has no generator control |
| `G-04` | reusable Content Generation Suite definition/model/texture/skin/variant/gameplay | `PARTIAL` | `AVAILABLE` | AI-0 | `commonGeneratorApi.ts`, plugins, registry/orchestrator; no player route | G-01,G-05,T-04 | durable orchestrator and per-domain contracts |
| `G-05` | manifest/assetId/SHA/provenance-backed assets and reference-only unknown license | `PARTIAL` | `AVAILABLE` | AI-2/AI-1/AI-0 | `assetProvenance.ts`, content/asset manifest/provenance tests; no PNG/GLB generation | V-03,V-04 | every runtime asset has exact manifest/provenance |
| `G-06` | optional one AI NPC/map, server-only/on-demand/default disabled | `PENDING` | `AVAILABLE` | AI-0 | server NPC provider adapter/toggle/fallback; no browser secret/background loop | G-01,G-05 | max-one bounded server action with disabled default |
| `F-01` | plant catalog ~300 by biome/soil and data-extensible | `PARTIAL` | `AVAILABLE` | AI-2/AI-1/AI-0 | `plantCatalog.ts`, plant generator/content graph/tests; no graphical asset generation | G-05 | distribution and asset coverage evidence |
| `F-02` | plant soil/block/biome planting/growth/harvest | `PARTIAL` | `AVAILABLE` | AI-2/AI-1/AI-0 | `worldFarmSystem.ts`, plant/content graph tests; do not touch Workbench/router | F-01,B-01 | family coverage and world distribution |
| `F-03` | seed/sprout/young/mature and mature-only reward | `PARTIAL` | `AVAILABLE` | AI-2/AI-1/AI-0 | farm stage/runtime tests and elapsed-time rehydration owner | F-02 | full stage/profile coverage |
| `F-04` | capped fictional healing/buff/repel/damage; cactus thorn | `PARTIAL` | `AVAILABLE` | AI-2/AI-1/AI-0 | plant effect/hazard owner and disclosure tests; no medical claim | F-02,F-03 | universal effect/cactus hazard proof |
| `F-05` | non-lethal repel radius/stacking/duration | `PARTIAL` | `AVAILABLE` | AI-2/AI-1/AI-0 | farm repel owner/tests/browser evidence; no auto-kill | F-04 | enemy-near-farm behavior and stacking/duration |
| `F-06` | seed/plant collected from world can replant | `PARTIAL` | `AVAILABLE` | AI-2/AI-1/AI-0 | harvest reward/planting chain owner/tests; preserve atomic consume | F-02,F-03 | end-to-end seed return/replant chain |
| `F-07` | universal plant/tree/ecology/farm engine | `PENDING` | `AVAILABLE` | AI-0 | deferred engine design/generator; new files must be reserved first | F-01–F-06,G-01 | environment/nutrients/pests/seasons/lifecycle contract |
| `S-01` | first-person/overhead/side camera choice in-map | `PARTIAL` | `AVAILABLE` | AI-0 | `cameraModes.ts`, in-map settings, camera bridge; no player map policy change | M-01 | touch/collision/device-size acceptance |
| `S-02` | separate global vs in-map settings | `PARTIAL` | `AVAILABLE` | AI-0 | global/in-map settings UI and persistence; no creator controls | S-01,M-01 | all entry routes and pause/focus behavior |
| `S-03` | view distance 5–50 step 5 and target FPS 5..60+120 disclaimer | `PARTIAL` | `AVAILABLE` | AI-1 | camera/performance profile owner; no benchmark claim | S-01,T-01 | all values persist and streaming policy is explicit |
| `S-04` | adaptive performance tiers/WebGL/LOD/culling/pooling/hysteresis/sleep-wake | `PARTIAL` | `AVAILABLE` | AI-1/AI-2/AI-0 | performance profile/visibility/telemetry/profiler owner; no Workbench/shared route edits | S-03,T-01 | capability detection/controller/real-device benchmark |
| `C-01` | discovered-only Codex with categories/detail | `PENDING` | `AVAILABLE` | AI-0 | Vault/Codex UI and discovery persistence; player UI allowed, no creator tools | B-06,B-07 | discovered-only/empty/duplicate tests |
| `C-02` | category-specific item detail damage/plant/stack/usage | `PARTIAL` | `AVAILABLE` | AI-0 | Vault/item detail owner; no claim beyond real catalog | C-01,B-06 | category detail and long-press boundary |
| `C-03` | hidden Credits/Supporters with runtime/reference-only split | `PENDING` | `AVAILABLE` | AI-2/AI-1/AI-0 | `assetProvenance.ts`, Credits UI/provenance docs; no unknown-license runtime | V-04,G-05 | credits navigation and provenance display |
| `L-01` | Thai default colloquial copy, no over-formal wording | `PARTIAL` | `AVAILABLE` | AI-0 | copy/content files and UI review; Creator tools remain Thai | all UI owners | screen-by-screen language audit |
| `L-02` | adult rating/policy, colloquial dialogue/voice with safety copy | `PENDING` | `AVAILABLE` | AI-0 | rating/policy/voice provenance docs; no voice generation without scope | L-01,Q-01 | policy labels and reviewed provenance |
| `T-01` | performance tool generate-once/cache/chunk/culling/LOD/pooling | `PARTIAL` | `AVAILABLE` | AI-1/AI-2/AI-0 | performance profile/telemetry/profiler owner; no player profiler UI | S-04,M-02 | controlled capture/export and registry/cache contract |
| `T-02` | procedural animation/motion generator | `PARTIAL` | `AVAILABLE` | AI-0 | `animationProfileGenerator.ts`, motion/skeleton profile tests; no asset generation claim | G-04,T-04 | skeleton/variation/wind/retarget/LOD contract |
| `T-03` | universal item/equipment/combat/crafting/assembly logic | `PARTIAL` | `AVAILABLE` | AI-2/AI-1/AI-0 | item/content/provenance owner; no Workbench/router or gameplay mutation without new scope | B-04,B-06,G-04 | crafting/equipment/combat transactions and tool-aware runtime |
| `T-04` | Common Generator API / Game Creation Engine all domains | `PARTIAL` | `AVAILABLE` | AI-2/AI-1/AI-0 | generator/asset provenance adapter scope; no matrix edit on AI branch | G-04,G-05,T-01 | plugin/orchestrator/registry/export/runtime publish contract |
| `T-05` | Thai no-code drag/drop/pixel/mob editor with validation/register/export | `PARTIAL` | `AVAILABLE` | AI-0 | `CreatorStudio`, `CreatorDomainWorkbench`, creator registry; shared UI lock | T-04,G-05 | durable atlas/model/package/publish approval |
| `T-06` | structure/building generator placement/asset/biome/road/interior/mob rules | `PARTIAL` | `AVAILABLE` | AI-0 | `structureGenerator.ts`, blueprints/placement tests; no player generator UI | G-01,G-02,T-04 | reusable assets, road/interior and world instance |
| `T-07` | story/quest/map 1–100, 20 quests/map, rewards/items/abilities, item detail | `PARTIAL` | `AVAILABLE` | AI-0 | `questProgressionGenerator.ts`, `storyProgressionSystem.ts`, event/reward/inventory contracts; existing read-only checkpoints และ bounded quest-reward pending-action contract เป็น DONE ใน scope ย่อย, แต่ runtime persistence/reward integration ต้องเปิด reservation ใหม่ | O-02,O-03,B-06,C-02,G-04 | canonical event owners, authoritative reward/ability transaction, map unlock persistence, UX dialogue/cutscene |
| `Q-01` | ใช้ Google/Gemini เมื่อไม่รู้และบันทึก source | `PARTIAL` | `AVAILABLE` | AI-0 | research/audit notes; do not claim failed calls | O-01 | source/audit file per research checkpoint |
| `Q-02` | reference Minecraft/other games without copying code/assets/branding | `PARTIAL` | `AVAILABLE` | AI-0 | reference/provenance docs; no copied assets/code | V-01,V-04 | documented inspiration and license boundary |
| `Q-03` | run test/check/build/browser evidence before report | `PARTIAL` | `AVAILABLE` | AI-0 | validation scripts/docs; no invented counts | O-05 | every implementation report has actual evidence |
| `Q-04` | state limitations honestly and never call global done with gaps | `VERIFIED` | `DONE` | AI-0 | reporting policy/matrix; regression-only | O-01,O-05 | all reports separate verified/partial/pending |

## Current next pick

`NEXT-QUEST-REWARD-DISPATCH-001` อยู่สถานะ **DONE** ใน implementation `333078e3f78e3647ba6643f98b76493dc982b726`; pure item-only atomic transition และ read-only preview ผ่านแล้ว แต่ persistence caller, gameplay event emitter, reputation owner และ ability runtime owner ยังเป็น blockers. งานต่อยอด `NEXT-QUEST-REWARD-PERSISTENCE-001` ของ AI-0 ถูกปิดแล้วใน bounded scope บน base `4542ce9`; reservation ใหม่ `NEXT-QUEST-REWARD-PERSISTENCE-INTEGRATION-001` ปิดแล้วด้วย implementation `f55b154`; เพิ่มเฉพาะ queue serialization gate และ server sync allow-list โดยยังไม่เพิ่ม gameplay caller, reward grant หรือ quest completion. งานถัดไปที่ AI-0 จองคือ `NEXT-PERF-CAPABILITY-001` ปิดแล้วด้วย implementation `937441a` บน base `5dc54e1`; เป็น pure capability contract เท่านั้นและไม่ใช่ device benchmark. งานปัจจุบัน `NEXT-ASSET-PROVENANCE-001` ปิดแล้วด้วย implementation `83bd23e` บน base `4ac30ff`; เป็น pure item/plant asset provenance graph เท่านั้น ไม่มี binary asset หรือ runtime publish. งานถัดไปที่ AI-0 จองคือ `NEXT-ANIMATION-MOTION-001` ปิดแล้วด้วย implementation `e8d4a9d` บน base `ff29617`; เป็น pure motion policy เท่านั้นและไม่มี runtime caller หรือ binary asset. งานปัจจุบัน `NEXT-ITEM-DETAIL-001` ปิดแล้วด้วย implementation `ea08e4a` บน base `845a7a9`; เป็น pure category-specific item detail facts เท่านั้น โดย unavailable combat fields ยังคงเป็น blocker และไม่มี UI caller. งานถัดไปที่ AI-0 จองคือ `NEXT-WORLD-SPATIAL-001` ปิดแล้วด้วย implementation `50f17a1` บน base `c311b98`; เป็น pure bounded spatial dependency graph เท่านั้น ไม่มี player generator UI, runtime map selection หรือ world persistence. งานปัจจุบัน `NEXT-PLANT-ECOLOGY-001` ปิดแล้วด้วย implementation `9720ee0` บน base `7e3a3dd`; เป็น pure data-driven plant ecology policy เท่านั้น โดย missing nutrient/pest/season runtime owners ยังคงเป็น blocker และไม่มี gameplay caller. งานถัดไปที่ AI-0 จองคือ `NEXT-CODEX-DISCOVERY-001` ปิดแล้วด้วย implementation `3decb18` บน base `9720ee0`; เป็น pure discovered-only Codex contract เท่านั้น โดย UI/discovery persistence integration ยังเป็น blocker. งานปัจจุบัน `NEXT-CREDITS-PROVENANCE-001` ปิดแล้วด้วย implementation `c3a859d` บน base `c5eaeb9`; เป็น pure runtime/reference-only credits presentation contract เท่านั้น โดย CreditsSheet/player UI integration และ asset publish ยังคงเป็น blocker. ตั้งแต่นี้ AI-1 และ AI-2 ไม่ถูกจำกัดให้อยู่ในสายงานเดิม แต่เลือก `AVAILABLE` task ใดก็ได้ตาม autonomous worker instructions, dependency และ exclusive file lock. หากไม่มีงานที่ปลอดภัยให้รับ ให้ส่ง blocker/evidence แทนการสร้างงานสมมติ.

## Claim template

```text
TASK CLAIM
Task ID: <exact ID>
Requirement: <O-01 ... Q-04>
Owner: AI-0 / AI-1 / AI-2
Branch/worktree: <real branch/worktree>
Base SHA: <full SHA>
Files reserved: <exact paths>
Forbidden scope acknowledged: yes
Status: AVAILABLE -> RESERVED -> IN_PROGRESS
```

## Completion template

```text
TASK COMPLETE
Task ID: <exact ID>
Requirement: <exact matrix ID>
Owner: <AI-0/AI-1/AI-2>
Branch: <real branch>
Commit SHA: <full SHA>
Files changed: <exact paths>
Checks: git diff --check; pnpm check; focused tests; full tests/build as applicable
Result: <verified result>
Blockers/limitations: <truthful blockers>
Merge request: <PR URL or none>
Status requested: DONE / BLOCKED / WAITING_EVIDENCE
```
