# MAP_010 — Void Pulse / Pylon Shielding gameplay slice

`client/src/game/map010/encounter.ts` เป็น pure deterministic resolver ที่มี state `idle`, `pulse-warning`, `pulse-active`, `cooldown`, `elite-active`, `boss-telegraph`, `boss-active` และ `defeated`. ขณะ Void Pulse ทำงาน ผู้เล่นนอก Stable Rift Pylon ได้รับ void decay 6 ต่อวินาที; ใน safe zone หรือเมื่อ resolver ได้ `menuOpen: true` damage เป็นศูนย์. Safe reset ย้ายผู้เล่นกลับ Pylon และคืน health.

| Event | Scene/HUD outcome | Inventory effect |
|---|---|---|
| Void Pulse | warning อ่านได้และ void decay นอก Pylon | ไม่มี |
| Void Essence harvest | reward callback `material-010` พร้อม event ID `map010-void-essence-*` | ผ่าน provenance callback เท่านั้น |
| Elite gate | เปิด Rift Horror presentation | ไม่มี |
| 10 Essence + Singularity Gate | telegraph 2.6 วินาที แล้วเปิด Void Singularity presentation | ไม่มี |

Vitest `server/map010Encounter.test.ts` ครอบคลุม Pylon shielding, menu-safe resolver, no-inventory-mutation และ boss gate 10 essence. TypeScript และ full regression suite ผ่าน 23 files / 65 tests. ตรวจภาพที่ `/?route=game&map=map-010-void-infused-rift` บน 812×375 พบ Void Pulse warning, biome tint, Void Wanderer/Void Larva labels และ resource/scene billboards ใน canonical route.

> Scope นี้เป็น client-side encounter presentation ไม่ใช่ระบบ boss AI, action combat, spatial audio, drop table หรือ anti-cheat แบบ server-authoritative.
