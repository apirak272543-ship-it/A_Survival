# Gemini-Adopted Plan: MAP_011–015 (Obsidian Family Completion)

## สรุปสเปกที่นำมาใช้

| Map | Name | Biome Twist | Threat | Boss | NPC | Landmark |
|-----|------|-------------|--------|------|-----|----------|
| 011 | Cinder Caldera | Lava vents เป็นระยะ | 2 | Ignis Colossus | Forgemaster Vael | Shattered Smelter Arch |
| 012 | Obsidian Spire Shelf | Ash gales ลดระยะโจมตี 40% | 3 | Gale-Terror Zephyr | Scout Kaelen | Monolith of the North Wind |
| 013 | Brimstone Mire | Sulfur corrode stacks | 3 | Bile-Mother Vile | Alchemist Theron | Boiling Sulfur Falls |
| 014 | Magma Trench Bastion | Bridge tremor / collapse | 4 | Trench-Lord Baelrok | Warden Sonya | Ruined Citadel Gate |
| 015 | Heart of the Crucible | Escalating ambient heat | 5 | The Crucible Overlord | Avatar of the Forge | The Primal Core Anvil |

## รูปแบบ asset

ใช้ Pollinations.ai `flux` model, 768×768, `nologo=true`, seed 11011–11045 สำหรับ key art, NPC, regular, elite, boss และ resource ของแต่ละแผนที่

## ระบบที่เชื่อมต่อ

- `client/src/game/map011–015/encounter.ts` — pure deterministic resolver ตาม pattern MAP_001–010
- `client/src/game/scene.ts` — เพิ่ม asset bundle, plane (NPC/elite/landmark), state variables, และ resolver block
- `client/src/game/data/maps.ts` — ย้าย 5 แผนจาก planned → curated prototype
- `client/src/game/data/mapSceneTreatments.ts` — เพิ่ม fog/sky/light/terrain identity
- `client/src/pages/ArcaneFrontier.tsx` — ขยายการแสดงผลจาก 10 → 15 แผนที่
- `server/map011–015Encounter.test.ts` — vitest ครอบคลุม damage, shelter, elite gate, boss gate

## เกณฑ์ส่งมอบ

- [x] ผู้เล่นเข้า MAP_011–015 ได้จากหน้าเลือกแผนที่
- [x] แต่ละแผนมี random event ที่ทำ damage หรือ debuff ตาม biome twist
- [x] Elite ปรากฏเมื่อเก็บ resource ครบ 5 หรือฆ่า regular 4 ตัว
- [x] Boss gate ต้องมี 10 resource + interact ที่ landmark
- [x] Safe reset คืน health และย้ายผู้เล่นกลับ NPC camp
- [x] ไม่มี inventory mutation ใน encounter resolver
- [x] ผ่าน vitest 75/75 tests
