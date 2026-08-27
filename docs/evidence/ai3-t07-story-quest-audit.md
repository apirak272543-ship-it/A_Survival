# AI-3 T-07 Story and Quest Audit

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `T-07` |
| Requirement | story/quest/map 1–100, 20 quests/map, rewards/items/abilities, item detail |
| Owner | AI-3 |
| Branch/worktree | `ai3/t07-story-quest-audit` / `/home/ubuntu/A_Survival-t07` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `docs/evidence/ai3-t07-story-quest-audit.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Source audit findings

ตรวจ `client/src/game/systems/storyProgressionSystem.ts` และ `server/generators/questGameplayEventDependencyGraph.ts` จาก source จริง โดยไม่แก้ runtime caller, reward persistence หรือ map route. จุดประสงค์คือบันทึกว่าปัจจุบันมี contract ใดพิสูจน์ได้ และจุดใดต้องรอ canonical event/reward owner.

| Area | หลักฐานที่ตรวจได้ | สถานะ |
|---|---|---|
| Playable map boundary | `STORY_PLAYABLE_MAP_ID = obsidian-frontier`, index `1`; `getStoryMapRuntimeStatus` คืน `planned` สำหรับ map อื่น และ `getRuntimeStoryMapId` คืน null | Obsidian-only runtime boundary ชัดเจน |
| Quest count/order | `STORY_QUESTS_PER_MAP = 20`; quest IDs มี map/order; progression รับเฉพาะ contiguous completed IDs ของ playable map | มี sequential progress contract |
| Future maps | future quest/map IDs ถูก reject และ state normalize ทิ้ง IDs ที่ไม่ใช่ playable map | ไม่เปิด future map runtime โดยปริยาย |
| Completion | `completeStoryQuest` คำนวณ completedMapIndex และ nextMapReadyIndex; เมื่อครบ 20 แสดงว่าบทถัดไปรอเปิดใช้ runtime | มี progression signal; ยังไม่ใช่ map unlock/persistence acceptance |
| Gameplay event sample | graph samples quests และ map event contracts ไปยัง visit/collect/mine/harvest/place-block/talk/craft/defeat | มี dependency/evidence graph |
| Event support | current `EVENT_CONTRACTS` ระบุ objectives เป็น unsupported หากไม่มี canonical runtime event หรือ target binding ครบ | known limitations ถูกเปิดเผย ไม่ปิด claim เกินจริง |
| Reward/items/abilities | quest graph ระบุ event payload gaps; source ที่ตรวจนี้ยังไม่พิสูจน์ authoritative reward transaction หรือ ability unlock | ต้อง owner integration เพิ่ม |
| Item detail | item detail เป็น dependency/related checkpoint แยก; audit นี้ไม่แก้หรืออ้าง item UI completion | ไม่ชน C-02/open owner |

## Safety and runtime boundary

Quest gameplay graph ระบุ `runtimeImportAllowed=false`, `playerVisible=false` และ `cacheable=false`; นี่เป็น generator/evidence artifact ไม่ใช่ player route. Story progression ปัจจุบันอนุญาตเฉพาะ Obsidian Frontier และไม่ทำให้ future maps playable. รายงานนี้ไม่เพิ่ม quest UI, map selector, cache write, reward inventory write, ability grant หรือ creator publish path.

## Validation evidence

| Gate | Result |
|---|---|
| Source-of-truth | ตรวจจาก `origin/main` SHA `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Story source | อ่าน `storyProgressionSystem.ts` และ progression normalization/completion functions |
| Quest source | อ่าน `questGameplayEventDependencyGraph.ts` และ event contract table |
| Runtime changes | ไม่มี code/runtime/UI/cache/network/persistence change |
| Binary assets | ไม่ได้สร้างหรือแก้ไข |
| `git diff --check` | ต้องรันก่อน commit |
| `pnpm check` | ต้องรันก่อน commit; docs-only checkpoint |

## Limitations and blockers

T-07 ตาม backlog ยังขึ้นกับ O-02/O-03, B-06, C-02 และ G-04. ปัจจุบัน event graph ระบุ missing runtime event owner/target binding สำหรับ objective หลายชนิด จึงห้ามประกาศ quest gameplay end-to-end verified. ต้องมี canonical event payload, authoritative reward/ability transaction, map unlock persistence, dialogue/cutscene UX และ browser evidence ก่อนปิด requirement เต็ม.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `T-07` |
| Requirement | `T-07` source audit sub-checkpoint |
| Owner | AI-3 |
| Branch | `ai3/t07-story-quest-audit` |
| Commit SHA | `42da16ca741c48c953bf0afa64ebc46e3b11b358` |
| Files changed | `docs/evidence/ai3-t07-story-quest-audit.md` |
| Checks | `git diff --check` และ `pnpm check` ผ่าน; docs-only ไม่เพิ่ม runtime bundle |
| Result | story/quest playable boundary, 20-quest progression และ event-binding gaps ถูกบันทึกตามจริง |
| Blockers/limitations | ไม่มี end-to-end event/reward/persistence/UI integration; ต้อง AI-0 review |
| Merge request | PR จะใช้ชื่อ `[AI-3][T-07]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ audit scope และ source findings |
