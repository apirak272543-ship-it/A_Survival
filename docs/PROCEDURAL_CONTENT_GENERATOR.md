# A-Survival Procedural Content Generator

> รุ่นเดิมของ weapon/loot/asset catalog อยู่ในเอกสารนี้ ส่วน central reusable suite สำหรับ Block/Texture/Model/Skin/Mob/Item/Weapon/Armor/Skill/Loot/Variant และ semantic visual design อยู่ที่ [CONTENT_GENERATION_SUITE.md](./CONTENT_GENERATION_SUITE.md)

## ขอบเขต

`tools/content-generator.ts` เป็นเครื่องมือหลังบ้านใน repository สำหรับสร้าง content จำนวนมากโดยไม่ต้องเขียน item ทีละชิ้น เครื่องมือนี้ใช้ร่วมกับ world generator ผ่านแนวคิด `definition + modifiers + seed + rules` และไม่มี editor, button หรือเมนูสร้าง content ในตัวเกม

ปัจจุบันมี implementation สำหรับ **weapon generator** และ **loot generator** ก่อน โดยวาง extension point ให้ armor, generic item, creature, NPC, quest และ loot table เพิ่มภายหลังได้ เมื่อ Obsidian Frontier ยังอยู่ใน vertical slice จะไม่เปิด content generator ให้ผู้เล่นเรียกระหว่างเล่น

## Composition และ balance

| ส่วนประกอบ | ตัวอย่าง |
|---|---|
| Base type | sword, dagger, axe, spear, hammer, mace, bow, crossbow, throwing, staff, wand, spell-weapon |
| Material | wood, stone, iron, steel, obsidian, crystal, aether |
| Element | fire, ice, lightning, poison, shadow, holy, arcane |
| Rarity | common, uncommon, rare, epic, legendary, mythic |
| Affix | ember-burst, slow-on-hit, chain-spark, critical-edge, swift-grip และอื่น ๆ |
| Stats | power, damage, elemental power, durability, attack speed, range, critical chance, mana cost |
| Asset binding | asset ID จาก pack manifest, path, SHA-256, status และ provenance |

Rarity ใช้ bounded ranges และ affinity rules ไม่ใช่ random แบบไร้ขอบเขต ตัวอย่างเช่น Common อยู่ใน power range 1–20, Legendary 70–120 และ Mythic 100–180 โดย item ที่สร้างได้จะถูก clamp ให้อยู่ใน range ของ rarity นั้น และ item ที่ stack ไม่ได้มี `stackLimit: 1`

## Deterministic identity

`generateProceduralWeapon` ใช้ `generatorVersion + definitionKey + item seed` สร้าง item ID และคำนวณ stats จาก component rules กับ seeded variation ดังนั้น seed, generator version และ definition เดิมให้ item เดิม ทำให้ save/load เก็บ definition/modifier/seed ได้โดยไม่ต้องทำฐานข้อมูล item เต็มซ้ำทุกชิ้น

`generateProceduralWeapons` รับจำนวนสูงสุด 30,000 ชิ้นสำหรับการเตรียม content หลังบ้าน และ `generateLootDrop` รับ monster, biome, boss flag และจำนวน drop โดย boss จะสุ่มเฉพาะ Epic/Legendary/Mythic ตาม seed และยังใช้ stats ที่คำนวณจาก rarity จริง ไม่ใช่เปลี่ยนชื่อ rarity หลังสร้าง

## Pixel texture binding

เครื่องมือรับ `manifest.json` ของ asset pack และ bind base type ไปยัง asset ID ที่มีอยู่ เช่น melee ใช้ `items.blade` และ ranged/magic ใช้ `items.energy` ใน pass ปัจจุบัน icon อาจถูกใช้เป็น starter art ร่วมกัน แต่ definition ของ item ยังแยกจาก art และเปลี่ยน asset ได้ภายหลังโดยแก้ manifest/pack ไม่ต้องเปลี่ยน generator algorithm

ถ้าไม่พบ manifest หรือ asset ID จะคืนสถานะ `awaiting-asset` และ `reference-only` ห้ามนำ output นั้นไป bundle เป็น runtime art จนกว่าจะมี asset ที่มีสิทธิ์ใช้และมี hash ตรวจสอบได้ ส่วน manifest ปัจจุบันระบุ `starter-authored-from-gemini-brief` จึงถูกบันทึกเป็น project-original ใน binding ไม่ถูกอ้างว่าเป็น Gemini Image API output

## วิธีใช้งาน

```bash
pnpm content:generate -- --help
pnpm content:generate -- --kind=weapons --count=300 --category=melee --seed=829173 --out=artifacts/generated-weapons.json
pnpm content:generate -- --kind=loot --monster=void-reaper --boss=true --count=2 --seed=829173 --out=artifacts/generated-boss-loot.json
```

ผลลัพธ์เป็น JSON สำหรับตรวจสอบ/นำเข้า backend pipeline ไม่ได้ถูกโหลดโดยผู้เล่นโดยตรง ตัว generator จะเขียน seed, generator version, definition composition, stats, asset binding และ provenance ในผลลัพธ์เพื่อให้ regenerate และ audit ได้

## สถานะงานที่ยังไม่ควรอ้างว่าเสร็จ

Weapon/loot generation และ manifest binding ผ่าน unit tests และ CLI smoke แล้ว แต่ยังไม่ได้เชื่อม generated item เข้า catalog/runtime drop ของ Obsidian, Codex detail, economy balancing ระยะยาว หรือ live boss loot flow การมี generator output จึงไม่เท่ากับการประกาศว่า item gameplay ทั้งหมดเสร็จ
