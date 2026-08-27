# A-Survival Procedural World Generator

## เป้าหมาย

`tools/world-generator.ts` คือเครื่องมือหลังบ้านกลางของ A_Survival สำหรับสร้างข้อมูลโลกจาก `seed + generation rules + map profile` แทนการกำหนดตำแหน่งทุกอย่างด้วยมือ เครื่องมือนี้ตั้งใจให้ agent ใช้สร้างและตรวจข้อมูล และให้ owner เรียกใช้เองผ่านคำสั่งใน repository ได้ด้วย ตัวเกมไม่มีปุ่มหรือเมนูเรียก generator และผู้เล่นไม่สามารถสร้าง map ระหว่างเล่น

ในช่วงปัจจุบัน generator เปิดใช้งานเฉพาะ `obsidian-frontier` ตามข้อกำหนด vertical slice เดียว เมื่อ Obsidian ยังไม่ผ่าน completion matrix จะไม่ปลดล็อก map อื่นด้วยการแก้ flag หรือสร้าง output หลอกเพื่อแสดงความคืบหน้า

## หลักการที่รับประกัน

| สัญญา | รายละเอียด |
|---|---|
| Deterministic | seed, config และ generator version เดิมให้ terrain/block/spawn payload และ `worldHash` เดิม |
| Block-first | ทุก terrain surface, tree trunk, leaf, rock, ore, sprout และ cactus ที่สร้างเป็น `WorldBlock` แยกรายพิกัด ไม่รวมเป็น mesh/entity ก้อนเดียว |
| Bounded | output radius จำกัด 1–500 เมตรต่อคำสั่ง และต้นไม้/หินยังใช้ template ที่มี max height/crown/max blocks |
| Replaceable | block records อ้าง `blockId/moduleId/assetId` ผ่าน definitions และ asset pack จึงเปลี่ยน art ได้โดยไม่เปลี่ยน generator contract |
| Reproducible | output มี seed, mapId, radius, version, terrain cells, blocks, spawn points, metadata และ SHA-256 world hash |
| Honest scope | cave ถูก export เป็น entrance record สำหรับ pass ปัจจุบัน และ water เป็น surface-cell flow preview; ทั้งคู่ยังไม่ถูกอ้างว่าเป็น cave network/water simulation gameplay ที่เสร็จแล้ว |
| Spatial safety | ทุก output ผ่าน `Generate → Validate → Correct → Validate again → Export`; density เป็น soft preference และไม่มีสิทธิ์ override hard bounds, surface contact, water, overlap หรือ support rules |
| Height layers | Obsidian ใช้ X/Z เป็น integer block coordinates และ Y เป็น vertical layer; prototype surface อยู่ 0–4, canopy/structure อยู่ใน bounded range และ entity center มี allowance 0.5 block ที่ขอบ map |
| Shared placement | `getSurfaceInfo` และ `canPlaceWorldObject` อยู่ใน `tools/worldSpatialConstraints.ts` เป็น query กลางสำหรับ surfaceY, surface block, biome, slope, water depth, bounds, height, allowed biome และ forbidden surface |

## วิธีใช้งาน

```bash
pnpm world:generate -- --help
pnpm world:generate -- --map=obsidian-frontier --seed=9107 --radius=32 --out=artifacts/obsidian-frontier-world.json
pnpm world:generate -- --map=obsidian-frontier --seed=827364 --radius=32 --format=module --out=artifacts/obsidian-frontier-world --preview=true
```

`--radius` ใช้สำหรับ preview/export รอบจุดศูนย์กลางและรับค่า 1–500 เมตร เครื่องมือจะปฏิเสธ map ที่ไม่ใช่ `obsidian-frontier` จนกว่า owner จะอนุมัติการเปิด map ถัดไป `--seed=RANDOM` ใช้สร้าง seed ใหม่สำหรับการทดลอง แต่ output ที่ได้ยังบันทึก seed ไว้เพื่อ regenerate ซ้ำได้ ส่วน `--format=module` แยก output เป็น `manifest.json`, `terrain.json`, `blocks.json`, `biomes.json`, `water.json`, `resources.json`, `caves.json`, `structures.json`, `spawns.json`, `metadata.json` และ `preview.json` เมื่อเปิด preview

## Spatial constraints และ height layers

Generator แยก **hard constraints** ออกจาก **soft constraints** อย่างชัดเจน ความถี่/เปอร์เซ็นต์ของต้นไม้ หิน ทรัพยากร หรือภูเขาเป็นเพียงเป้าหมายในพื้นที่ที่ผ่านกฎ ไม่ใช่คำสั่งให้ฝืนวาง หากไม่มีตำแหน่งที่ถูกต้อง ระบบจะลดจำนวนที่สร้างลงหรือยกเลิก placement แทนการ force place

| Layer/contract | Obsidian Frontier rule |
|---|---|
| World bounds | X/Z อยู่ใน `-radius..+radius`; export CLI รับ radius 1–500; block Y อยู่ใน validator bounds -16..12 และ surfaceY อยู่ 0..4 ใน prototype |
| Surface | ทุก X/Z ที่อยู่ใน preview มี `surfaceY`, `surfaceBlockId`, biome, slope, moisture และ temperature จาก surface query เดียว |
| Terrain | terrain block อยู่ตรง `floor(surfaceY)` หนึ่ง cell ต่อหนึ่ง X/Z; ห้าม terrain key ซ้ำหรืออยู่นอก bounds |
| Ground contact | tree, sprout/grass, cactus, rock, ore, structure, NPC, animal, monster และ boss ต้องเริ่มเหนือ surface ตาม rule ของชนิดนั้น; กลุ่มต้องมี base block แตะ surface และไม่ฝัง/ลอยเกิน tolerance |
| Height | tree 3–8 block, sapling/grass 1, cactus 1–3, rock 1–4, structure 1–12, NPC/animal/monster 1–2 และ boss 2–4; group validator ตรวจความสูงจากฐาน ไม่ใช้ random Y อิสระ |
| Slope/water | แต่ละ subject มี max normalized slope และ max water depth; tree/cactus/rock/structure ไม่วางใน water, animal อนุญาต water depth จำกัด, water อยู่หนึ่ง layer เหนือ surface |
| Overlap/clearance | structure footprints ห้ามทับกันหรือทับ clearance ของ landmark; priority สูงกว่าได้รับการรักษาก่อน และ objects ที่ชนกันจะถูก reject/repair ไม่เขียนทับแบบเงียบ ๆ |
| Support/gravity | บล็อกที่ metadata ระบุ `requiresSupport + gravityAffected` ต้องมี block รองรับตรงด้านล่าง; static tree/rock groups ใช้ group base contract แยกจาก falling sand semantics |

ลำดับ validation ได้รับแรงบันดาลใจเชิงโครงสร้างจากการทบทวนกับ Gemini แต่ค่าบังคับในตารางเป็นกฎที่เขียนและทดสอบโดยโครงการเอง: world bounds → base/terrain → caves/water → slope/surface → safe/shop → structures → resources/vegetation → NPC/creatures → overlap/clearance → support/falling

## Output schema โดยย่อ

`GeneratedWorld` ประกอบด้วย `terrain[]` ที่เก็บ `surfaceY`, elevation, slope, moisture, temperature และ biome classification; `blocks[]` ที่เก็บ `WorldBlock` อิสระ; `spawnPoints[]` ที่ผ่าน safe-radius/slope rule; และ metadata ที่ระบุ systems กับข้อจำกัดของ cave/water ใน pass ปัจจุบัน

การสร้าง vegetation ตรวจ biome, slope และ density rule ก่อนเรียก module เดิม `generateTreeBlocks`, `generateRockBlocks`, `generateBlockGroup` ดังนั้นการสุ่มเป็นกลุ่มเชิงกฎ แต่ผลลัพธ์ในโลกยังเป็นบล็อกอิสระทุกก้อน ตำแหน่งซ้ำถูกตัดด้วย key เดียวกันก่อน export ส่วน water, resources, caves, structures และ spawn points ถูกสร้างตามลำดับ dependency หลัง terrain/biome โดย safe zone, shop, NPC camp, ruins และ boss room ใช้ candidate ranking จาก seed เดียวกันและตรวจ footprint overlap ก่อนวาง

ก่อน export ระบบเรียก `repairGeneratedWorld` เพื่อตัด record ที่อยู่นอก bounds/นิยามไม่รู้จัก/ซ้ำ, ตัด structure ที่ clearance ชนกัน, ตัด water ที่ทับ solid block และตัด resource/spawn ที่อ้างโครงสร้างซึ่งถูก reject จากนั้นเรียก `validateGeneratedWorld` อีกครั้ง หากยังมี issue เหลือ generator จะ throw และไม่ export ไฟล์ที่ไม่ผ่าน โดย report มี issue code, subject ID, severity, rules version และ repaired count

`getSurfaceInfo(world, x, z)` เป็นคำถามกลางสำหรับทุก content generator ส่วน `canPlaceWorldObject(world, config, request)` คืน `VALID` หรือ `INVALID + reason` จาก bounds, surface, height, slope, biome, water และ forbidden surface. ผู้เรียกในอนาคตควรใช้ search-nearby deterministic candidates แล้ว validate ใหม่ตาม retry limit แทนการวางทับตำแหน่งเดิม

## Backend-only boundary

`world:generate` เป็น CLI/tooling หลังบ้านเท่านั้น ไม่มีปุ่มสร้างโลกหรือ content editor ใน gameplay UI. ตัวเกมรับเฉพาะ map module ที่ผ่าน generator/export/integrity pipeline แล้ว และไม่มีการเรียก Gemini ระหว่างการ generate runtime; Gemini ใช้เป็น design assistance นอก runtime เท่านั้น ดู [GEMINI_HEIGHT_LAYER_REVIEW.md](./GEMINI_HEIGHT_LAYER_REVIEW.md)

## ขอบเขตที่ยังไม่ใช่ข้ออ้างว่าเสร็จ

Generator pass นี้สร้างและ export records สำหรับ water cells, cave entrances, ore nodes, structures, NPCs, animals, regular monsters และ boss ตาม seed แล้ว แต่ยังไม่ใช่การประกาศว่า water flow เต็มรูปแบบ, cave network ที่เดินสำรวจได้, full resource tiers, runtime structure interiors หรือ spawn ecology ทุกชนิดของ Obsidian เสร็จสมบูรณ์ ตัวระบบเก็บ extension points และ metadata ไว้เพื่อเติมต่อหลัง core block interaction/terrain validation ผ่านแล้ว โดยไม่สร้าง map ใหม่ล่วงหน้า

## Provenance และ IP

เครื่องมือนี้ใช้กฎและโค้ด original ของ A_Survival ไม่ bundling Minecraft/Terraria asset, code, branding หรือ module ที่ไม่ทราบสิทธิ์ ไฟล์ asset ที่ runtime ใช้ต้องอยู่ใน manifest/hash ของ pack และสถานะ provenance ต้องผ่าน registry ของโครงการก่อนนำมาใช้
