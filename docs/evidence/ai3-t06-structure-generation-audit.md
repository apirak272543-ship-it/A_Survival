# AI-3 T-06 Structure Generation Audit

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `T-06` |
| Requirement | structure/building generator placement/asset/biome/road/interior/mob rules |
| Owner | AI-3 |
| Branch/worktree | `ai3/t06-structure-placement-contract` / `/home/ubuntu/A_Survival-t06` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `docs/evidence/ai3-t06-structure-generation-audit.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Source audit findings

ตรวจ `server/generators/structureGenerator.ts` จาก source จริงและไม่สร้าง validator ซ้ำ เนื่องจาก owner เดิมมี `validateStructureBlueprints`, `evaluateStructurePlacement`, `generateStructurePlacements` และ `validateStructureGenerationOutput` อยู่แล้ว.

| Coverage | หลักฐานที่ตรวจได้ | สถานะ |
|---|---|---|
| Structure levels | library มี `object`, `building`, `compound`, `settlement`, `landmark` | มี coverage ใน blueprint library |
| Biome/terrain/climate | placement rules มี allowed biomes, terrains และ climates | มี rule-level coverage |
| Spatial placement | footprint, world bounds repair, slope, water depth, free-space width/length, overlap, support ratio และ accessible entry ถูกประเมิน | มี bounded placement evaluation |
| Road/settlement | requiresRoad/maxRoadDistance และ requiresSettlement/maxSettlementDistance/minPopulation ถูกตรวจ | มี gating rules; ยังไม่ใช่ proof ว่า road/settlement artifact ถูกสร้างจริงครบ |
| Interior | `generateInterior` บังคับให้มี `interiorRooms` อย่างน้อยหนึ่งรายการ | มี config guard; ยังไม่มี interior geometry artifact ใน output |
| Children/assets | required/optional children และ unique asset refs ถูกจัดการ; reference-only asset ต้องมี provenanceRef | มี output validation; blueprint child graph completeness ยังต้อง review |
| NPC/mob | npc/mob spawn ranges ถูก validate และ count ถูก bounded/deterministic ด้วย seed | มี rule/output coverage |
| Output schema | `a-survival.structure-generation.v1`, map match, unique instance IDs, integer coordinates, score `0..100`, child/spawn count checks | มี output contract |
| Player boundary | generator plugin/server-side source ไม่มี player generator route/button ใน scope นี้ | ไม่เปิด player generator UI |

## Determinism and safety boundary

`generateStructurePlacements` sort blueprint/candidate อย่าง deterministic, ซ่อม coordinate ให้เข้าขอบเขตโลก, ป้องกัน overlap กับ placement ที่สร้างแล้ว และจำกัด blueprint/candidate/placement counts. Output asset refs มาจาก blueprint และยังต้องผูกกับ manifest/provenance gate ของ G-05/V-03/V-04 ก่อนนำไปใช้เป็น runtime asset claim.

Checkpoint นี้ไม่แก้ `structureGenerator.ts`, world generator, player route, Workbench, binary assets หรือ asset provenance. จึงไม่เปลี่ยน behavior และไม่เปิดทางให้ผู้เล่นสร้าง generator ได้.

## Validation evidence

| Gate | Result |
|---|---|
| Source-of-truth | ตรวจ source จาก `origin/main` SHA `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Structure source | อ่าน `server/generators/structureGenerator.ts` รวม blueprint library และ output validator |
| Existing tests | ตรวจว่ามี `server/structureGenerator.test.ts` เป็น owner test suite; ไม่แก้ test ใน checkpoint นี้ |
| Runtime changes | ไม่มี code/runtime/UI/cache/network/persistence change |
| Binary assets | ไม่ได้สร้างหรือแก้ไข |
| `git diff --check` | ต้องรันก่อน commit |
| `pnpm check` | ต้องรันก่อน commit; docs-only checkpoint |

## Limitations and blockers

T-06 ตาม backlog ยังขึ้นกับ G-01, G-02 และ T-04. Source มี rule/config สำหรับ road, interior, assets และ mob/NPC แต่ audit นี้ไม่อ้างว่า road/interior geometry, asset SHA/provenance, biome-wide distribution หรือ world instance artifact ผ่านแล้ว. AI-0 ต้องตัดสินใจว่าควร merge audit นี้เป็น evidence slice หรือรอ dependency integration.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `T-06` |
| Requirement | `T-06` source audit sub-checkpoint |
| Owner | AI-3 |
| Branch | `ai3/t06-structure-placement-contract` |
| Commit SHA | `cde35e84a27e7188cbcda5a3bd9cd56d58e464d1` |
| Files changed | `docs/evidence/ai3-t06-structure-generation-audit.md` |
| Checks | `git diff --check` และ `pnpm check` ผ่าน; docs-only ไม่เพิ่ม runtime bundle |
| Result | structure generator coverage audit พร้อม deterministic/spatial/asset/runtime boundary |
| Blockers/limitations | ไม่แก้ implementation และไม่ปิด T-06 เต็มรูปแบบ; G-01/G-02/T-04 และ artifact evidence ยังต้อง review |
| Merge request | PR จะใช้ชื่อ `[AI-3][T-06]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ audit scope และ source findings |
