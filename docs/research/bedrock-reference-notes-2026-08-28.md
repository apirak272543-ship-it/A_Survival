# Minecraft Bedrock/PE reference notes — 2026-08-28

เอกสารนี้ใช้เป็น reference architecture/counting baseline เท่านั้น ไม่ใช่ source สำหรับคัดลอก code, texture, model, asset, branding หรือชื่อเฉพาะเข้า A_Survival

## Sources opened

1. Microsoft Learn — Default Minecraft Item Listings (Bedrock stable): https://learn.microsoft.com/en-us/minecraft/creator/reference/content/vanillalistingsreference/items?view=minecraft-bedrock-stable
2. Minecraft Wiki — Item: https://minecraft.wiki/w/Item

## Findings

Microsoft Learn อธิบายรายการ vanilla items ที่ใช้ใน Minecraft: Bedrock Edition และให้หน้าอ้างอิง item identifier listings; หน้าเดียวกันมีรายการ item IDs จำนวนมากที่เหมาะสำหรับตรวจ category/ID coverage แต่ไม่ได้ให้ตัวเลขรวมที่ควรนำไปอ้างโดยไม่กำหนดวิธีนับ

Minecraft Wiki อธิบายว่า item เป็น object ที่อยู่ใน inventory ของ player/mob/armor stand หรือ container และ item บางชนิดเมื่อใช้จะกลายเป็น block หรือ entity ในโลก ตัวอย่างนี้ยืนยันหลักการออกแบบที่ A_Survival ใช้ได้: inventory item state ต้องแยกจาก placed block/world state แม้จะมีความสัมพันธ์กัน และไอเทมบางชนิดไม่ควรถูกนับซ้ำเป็น block definition โดยอัตโนมัติ

Wiki แยกหัวข้อ item เป็นของที่สร้าง block/fluid/entity, ใช้ในโลก, ใช้ทางอ้อม, spawn eggs, education/unimplemented/removed และ blocks; จึงต้องกำหนด counting policy ก่อนเทียบจำนวน ไม่เช่นนั้นตัวเลข item/block จะปนกันหรือรวม variant ซ้ำ

## Design rule for A_Survival

จะใช้ category/relationship patterns เช่น item-to-placeable-block, tool-to-action, stackable inventory object, world block record และ container transfer เป็น baseline แต่จะใช้ IDs, names, definitions, visuals, sounds, mechanics details และ provenance ของ A_Survival เอง โดย runtime ยังอนุญาตเฉพาะ `obsidian-frontier` และ generator ต้อง generate once → store → cache → reuse.

## Counting caution

ยังไม่สรุป total item/block count จาก snippets หรือจากหน้าเดียว เพราะ Bedrock stable listing, Java wiki, creative inventory และ survival-obtainable lists เป็นคนละ universe. ขั้นถัดไปคือตรวจ official Bedrock block identifier listing และนับ catalog ปัจจุบันของ A_Survival ด้วย script แบบ deterministic ก่อนทำ baseline table.

## Additional source opened

3. Microsoft Learn — Default Minecraft Block Listings (Bedrock stable): https://learn.microsoft.com/en-us/minecraft/creator/reference/content/vanillalistingsreference/blocks?view=minecraft-bedrock-stable

หน้านี้ระบุชัดว่ารายการเป็น blocks สำหรับ Minecraft: Bedrock Edition และตารางมีทั้ง `Name` กับ `States` เช่น button, door, slab, stairs, leaves, crops และ container blocks. ข้อสังเกตสำคัญคือ state variants ถูกเก็บเป็น states ของ block เดียว ไม่ควรนับทุก orientation/open/upper/lit state เป็นคนละ content definition ใน baseline ของ A_Survival.

Official listing จึงเหมาะสำหรับกำหนดนโยบายของเราเป็น: นับ canonical block definitions แยกจาก runtime states, นับ item definitions แยกจาก placeable block records, และใช้ category/relationship เป็น reference architecture ไม่ใช่การนำ `minecraft:` IDs มาใช้ในเกม.

หมายเหตุ: เนื่องจากหน้า listing ยาวมากและ extraction ถูกตัดบางส่วน จึงยังไม่อ้างตัวเลขรวมจากหน้านี้จนกว่าจะทำ deterministic parse ของ source ที่ดาวน์โหลดได้ครบหรือกำหนดชุดข้อมูลที่นับได้อย่างโปร่งใส.

## Deterministic A_Survival catalog baseline

จาก source ปัจจุบันและกฎการนับที่แยก canonical definitions ออกจาก runtime states: `BOTANICAL_REFERENCES` มี 30 รายการ และ `ORIGINAL_VARIANTS` มี 10 แบบ จึงสร้าง `PLANT_CATALOG` ได้ 300 plant definitions และ `PLANT_ITEMS` ได้ 300 seed item definitions. `ITEM_CATALOG` มี 9 หมวด หมวดละ 400 รายการ รวม 3,600 generated item definitions; `BLOCK_ITEM_DEFINITIONS` มี 10 placeable block-item definitions. ดังนั้น `ALL_ITEMS` ปัจจุบันมี 3,910 definitions (3,600 + 10 + 300) ก่อนนับ runtime instances.

`OBSIDIAN_BLOCKS` มี 14 canonical world block definitions ใน source ปัจจุบัน ได้แก่ terrain, liquid, rock, ore, log, leaf, plant, obstacle, storage และ player-placed records ตามที่ประกาศจริง ส่วน tree templates 2 รายการและ rock templates 3 รายการเป็น placement templates ไม่ใช่ block definitions เพิ่มเติม และ block states/coordinates ที่เกิดใน runtime ไม่ควรถูกนับเป็น definitions ใหม่.

Baseline นี้ชี้ว่าความต้องการเดิม “300 ต่อหมวด” ถูกสร้างเกิน Minecraft-like playable slice ในบางหมวดแล้ว จึงควร **หยุดการเพิ่ม content แบบกว้าง** และใช้หมวด/ความสัมพันธ์/stack rules แบบ reference architecture ก่อน จากนั้นค่อยลดหรือจัดกลุ่ม content ที่ผู้เล่นเข้าถึงจริงใน Obsidian slice โดยไม่ทำลาย data extensibility และไม่คัดลอก Minecraft assets/code/IDs.

วิธีนับนี้เป็น deterministic source audit ของ A_Survival ไม่ใช่ตัวเลขรวมของ Minecraft Bedrock/PE เพราะ official Bedrock listings รวม identifiers และ state variants คนละ universe กับ creative inventory, survival-obtainable items และ wiki categories; จึงไม่ควรอ้างตัวเลข Minecraft เดียวโดยไม่กำหนด counting policy.
