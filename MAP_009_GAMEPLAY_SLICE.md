# MAP_009 — Toxic Downpour / Canopy Haven gameplay slice

## การทำงานที่ตรวจได้

`client/src/game/map009/encounter.ts` เป็น pure deterministic resolver ของ MAP_009. วงจร Toxic Downpour มี period 300,000 ms, duration 75,000 ms และ offset คงที่เพื่อให้ test สามารถตรวจผลซ้ำได้. เมื่อตัวละครอยู่นอก Canopy Haven ระหว่างหน้าต่างดังกล่าว scene จะลด health ตาม `toxinDamagePerSecond`; เมื่ออยู่ในรัศมี shelter จะมี `canopyProtectionActive` และ damage เป็นศูนย์.

| Trigger | ผลลัพธ์ scene/HUD | การเปลี่ยน inventory |
|---|---|---|
| Toxic Downpour นอก canopy | damage 5 ต่อวินาที, warning และ Vine Stalker reinforcement | ไม่มี |
| Toxic Downpour ใน canopy | immunity ชั่วคราวและ shelter warning | ไม่มี |
| Alien Bloom harvest | reward provenance event `map009-alien-bloom-*` เป็น `material-009` | เพิ่มผ่าน reward callback เท่านั้น |
| 3 blooms หรือ 4 stalkers | เปิด Thornback Behemoth presentation | ไม่มี |
| Interact ที่ Hive Root นอก downpour | boss telegraph 2.6 วินาที แล้วเปิด Verdant Hive Mind presentation | ไม่มี |

## การยืนยัน

Vitest `server/map009Encounter.test.ts` ครอบคลุม downpour damage เทียบกับ canopy immunity และ elite-to-boss telegraph. การตรวจ TypeScript และ full suite ผ่าน 22 files / 63 tests ใน milestone นี้. ตรวจภาพที่ `/?route=game&map=map-009-overgrown-obsidian-jungle` บน 812×375 แล้วพบ biome terrain, NPC/regular labels และ MAP_009 visual billboards แสดงใน route จริง.

## ข้อจำกัดโดยเจตนา

ระบบนี้ยังไม่ใช่ combat, animation, audio, boss AI, cooldown UI, save/replay หรือ drop loop ที่สมบูรณ์ และ client-side damage/provenance callback ไม่ใช่ anti-cheat แบบ production. ระบบ authoritative action replay, server validation และ persistence จะยังคงเป็นงานแยกต่างหาก.
