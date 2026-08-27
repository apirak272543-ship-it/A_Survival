# A-Survival Content Generation Suite

เอกสารนี้กำหนด **เครื่องมือหลังบ้าน** สำหรับสร้างและตรวจ content ของ A_Survival โดยไม่เพิ่มปุ่ม generate, content editor หรือ API key ในตัวเกม ผู้เล่นเห็นเฉพาะ content ที่ถูก export และผูกผ่าน runtime registry/asset pack ที่ตรวจแล้วเท่านั้น ระบบนี้ต่อยอดจาก `tools/content-generator.ts` ซึ่งยังคงเป็น owner ของ procedural weapon, loot และ asset-catalog เดิม ส่วน `tools/contentRegistry.ts` เป็น central component registry สำหรับ content suite รุ่นแรก

## ขอบเขตและหลักการ

Generation Suite รองรับ schema กลางสำหรับ `Block`, `Texture`, `Model`, `Skin`, `Mob`, `Item`, `Weapon`, `Armor`, `Skill`, `Loot` และ `Variant` ระบบไม่สร้างโมเดลหรือภาพหลายร้อยชิ้นโดยอัตโนมัติเป็นข้ออ้างว่าผลิต art เสร็จแล้ว แต่สร้าง **definition, component references, semantic visual specification, preview prompt, cache key, hash และ provenance state** เพื่อให้ model/animation/template เดิมถูกใช้ซ้ำได้ และให้ภาพที่ยังไม่มีสิทธิ์หรือยังไม่ได้สร้างอยู่ในสถานะ `awaiting-asset` อย่างตรงไปตรงมา

> ลำดับความเป็นเจ้าของคือ **A-Survival Art Direction → semantic rules → AI/human concept → deterministic generator → validator → preview → registry → export**

กฎตัวเลขและ palette ที่อยู่ในโค้ดเป็น project-authored constraints ไม่ใช่คำกล่าวอ้างว่ามาจาก provider ภายนอก ระบบยอมรับ concept ที่มนุษย์ให้มา และรองรับ `conceptSource: "ai-proposed"` เมื่อมี AI ส่ง concept specification ที่ตรวจสอบได้ แต่การทำงานปัจจุบันของ CLI ใช้ input ที่อ่านได้จาก command line/spec และ **ไม่ได้เรียก AI อัตโนมัติ** จึงไม่เสีย compute โดยไม่จำเป็นและไม่อ้างว่า AI provider ทำงานอยู่

## การแยก component อย่างเคร่งครัด

| Component | หน้าที่ | สิ่งที่ห้ามฝังซ้ำ |
|---|---|---|
| `ContentDefinitionRecord` | ชื่อ, kind, description, tags, biome, rarity และ references | ห้ามฝัง geometry หรือ texture bytes |
| `ModelRecord` | model asset binding, animation set และ `reuseKey` | ห้ามฝัง stats, loot หรือสีเฉพาะ variant |
| `TextureRecord` | asset binding และ `VisualSpecification` | ห้ามสร้าง model ใหม่เพียงเพราะเปลี่ยน skin |
| `SkinRecord` | การจับคู่ model + texture และ palette key | ห้ามเป็นแหล่ง gameplay stats |
| `GameplayRecord` | role, numeric stats, skill IDs, behavior ID, loot table และ fictional effects | ห้ามเปลี่ยน visual asset โดยเงียบ ๆ |
| `VariantRecord` | variant seed และ references ไปยัง definition/model/skin/gameplay | ห้ามคัดลอก base model/animation เป็นไฟล์ใหม่ |
| `CreativeDecisionLog` | เหตุผลจาก name/material/element/biome/role/rarity/theme และ override fields | ห้ามบันทึก secret หรือ provider key |

ด้วยโครงสร้างนี้ base model/animation หนึ่งชุดสามารถถูกอ้างโดยหลาย variant ที่เปลี่ยน skin, stat, skill, behavior, biome หรือ loot ได้ โดย `ContentRegistry` จะตรวจว่า reference ทุกตัว resolve ถึง component ที่ตรงกันก่อน export

## Semantic Visual Design

Generator ไม่เลือกสีและลายด้วย random เพียงอย่างเดียว แต่ใช้ความหมายของ input รวมกัน ดังนี้

| Input | ผลต่อ appearance |
|---|---|
| Name/description/theme | concept note และ decision log ที่อธิบายสิ่งที่ผู้เล่นควรอ่านได้ |
| Material | base color, roughness, metallic, surface detail, edge detail และ material language |
| Element | secondary/accent color, pattern, marking, emission และ glow ตามลำดับ rarity |
| Biome | palette discipline และ relationship ของ secondary/accent กับโลก |
| Gameplay role | shape language เช่น readable block, silhouette-first หรือ thin-partial |
| Rarity | emission ceiling และระดับรายละเอียด; common ไม่ควร glow เด่นกว่าของ rare |
| Human override | เปลี่ยน color/material/pattern/texture/model/effect/scale/style ได้ แล้วตรวจซ้ำ |

ตัวอย่าง `Obsidian Fire Block` ใน `tools/contentRegistry.ts` จึงได้ base `dark_obsidian`, secondary `ash_slate`, accent `ember_orange`, material language `glass-like`, pattern `volcanic cracks`, shape language `readable-block` และ texture resolution 16px-first โดย emission ถูกจำกัดตาม rarity ไม่ให้ทุก item เรืองแสงเท่ากัน

`VisualSpecification` รองรับ base/secondary/accent color, material, roughness, metallic, emission, pattern, surface detail, edge detail, cracks, glow, symbols, markings, texture resolution, palette discipline, shape language, lighting style และ material language การระบุชื่อสีเป็น semantic palette token เพื่อให้ pack owner เปลี่ยน hex/texture ได้โดยไม่แก้ gameplay definition

## Validator และ human override

`validateVisualSpecification` ตรวจค่าช่วง 0..1 ของ roughness/metallic/emission, resolution ที่อนุญาต, emission ceiling ตาม rarity, ความสอดคล้องระหว่าง glow กับ emission และ palette discipline ส่วน `validateContentSuiteBundle` ตรวจ reference ระหว่าง definition/model/texture/skin/gameplay/variant และป้องกัน bundle ที่ component drift ก่อน register

Human override ทำงานในชั้น `humanOverride` ของ input ไม่แก้ template กลางโดยตรง ทุก field ที่ถูก override ถูกบันทึกใน `decisionLog.overrideApplied` และต้องผ่าน validator หลัง merge อีกครั้ง การ override จึงเป็น **owner-controlled freedom** ไม่ใช่ AI lock และไม่เป็นช่องให้ content หลุดจาก shape/palette/lighting/texture constraints โดยเงียบ ๆ

## Deterministic cache, preview และ provenance

ทุก input ถูก normalize และสร้าง `cacheKey` จาก suite version กับ stable serialization ของ semantic input การ generate ซ้ำใน process จะคืน bundle จาก memory cache ส่วน CLI เก็บ bundle ที่ export แล้วลง cache file และแสดงจำนวน `reused` ในผลลัพธ์ การ cache นี้ไม่ใช่การรับรองว่า external image generation สำเร็จ แต่ลดการคำนวณ definition/preview ซ้ำและช่วยให้ review/regenerate เฉพาะ key ที่เปลี่ยน

การ bind asset ใช้ `bindPixelAsset` จาก content generator เดิม ซึ่งอ่าน manifest ID, version, path และ SHA-256 เมื่อพบ entry จะเป็น `bound` และระบุ provenance จาก manifest เมื่อไม่พบจะเป็น `awaiting-asset`/`reference-only` พร้อม note ที่บอกว่าห้ามใช้เป็น final distributable art จนกว่าจะมี authored หรือ license-verified entry

## CLI usage

สร้าง bundle เดี่ยวสำหรับ review:

```bash
pnpm content:suite -- \
  --kind=block \
  --name='Obsidian Fire Block' \
  --material=obsidian \
  --element=fire \
  --biome=obsidian-frontier \
  --role=building-block \
  --rarity=rare \
  --seed=829173 \
  --out=artifacts/content-suite.json
```

สร้าง batch จาก JSON spec ได้โดยใช้ `--spec=path/to/spec.json` โดยไฟล์อาจเป็น object เดียว, array ของ objects หรือ object ที่มี `records` array ตัวอย่างที่ไม่ใช้ AI provider:

```json
[
  {
    "kind": "block",
    "name": "Obsidian Fire Block",
    "material": "obsidian",
    "element": "fire",
    "biome": "obsidian-frontier",
    "gameplayRole": "building-block",
    "rarity": "rare",
    "seed": 829173
  },
  {
    "kind": "mob",
    "name": "Glass Stalker Variant",
    "material": "crystal",
    "element": "shadow",
    "biome": "obsidian-frontier",
    "gameplayRole": "mob",
    "baseModelId": "model.template.mob",
    "animationSetId": "animation.humanoid.template",
    "seed": 829174
  }
]
```

CLI จะเขียน export, cache และ preview JSON โดยค่า `contentGenerationUi` เป็น `false` เสมอ การ export ไม่ได้แก้ runtime catalog หรือ inject content เข้าเกมโดยอัตโนมัติ การเชื่อม gameplay/Codex/economy ต้องมี integration ที่ผ่าน acceptance tests แยกต่างหาก

## Files and verification

| ไฟล์ | Owner responsibility |
|---|---|
| `tools/content-generator.ts` | weapon/loot/asset catalog เดิม และ shared manifest binding |
| `tools/contentRegistry.ts` | component schema, semantic visual design, validator, cache และ registry |
| `tools/content-suite-generator.ts` | backend CLI, spec input, cache-file reuse, preview/export |
| `server/contentRegistry.test.ts` | determinism, semantic appearance, reuse, override, registry และ drift rejection |
| `server/contentGenerator.test.ts` | procedural weapon/loot/asset catalog regression |
| `docs/PROCEDURAL_CONTENT_GENERATOR.md` | procedural content รุ่นเดิมและ caveats |
| `docs/OWNER_REQUIREMENTS_MATRIX.md` | acceptance source-of-truth; CG-01 ถึง CG-09 ยังไม่เปลี่ยนเป็น VERIFIED จนกว่าจะมี runtime integration/evidence ครบ |

ตรวจล่าสุดของ slice นี้: `pnpm check` ผ่านก่อน/ระหว่างการเพิ่ม suite, registry test 6 tests ผ่าน, เดิม content generator test 5 tests ผ่าน และ CLI smoke สร้าง 1 record โดยรันซ้ำพบ `reused: 1` ผลลัพธ์นี้ยืนยันเฉพาะ backend schema/validation/cache/preview binding เท่านั้น **ยังไม่ใช่หลักฐานว่า generated texture/model art ใหม่ครบทุก asset หรือเชื่อม runtime catalog/Codex/economy แล้ว**
