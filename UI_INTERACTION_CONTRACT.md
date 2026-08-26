# A_Survival UI and Interaction Contract

## เป้าหมาย

A_Survival ใช้รูปแบบการควบคุมที่คุ้นเคยจากเกม survival sandbox และ RPG มุมมองด้านบน แต่ใช้ภาพ pixel-art/voxel และชื่อเฉพาะของเกมเอง ไม่คัดลอก branding หรือ asset ของเกมอื่น การกระทำหลักต้องทำได้ด้วยนิ้วเดียวบนมือถือแนวนอน และใช้ mapping เดียวกันระหว่าง Home กับ Expedition เท่าที่บริบทอนุญาต

## Gameplay mapping

| การกระทำ | มือถือ | คีย์บอร์ด/เดสก์ท็อป | ผลตอบสนอง |
|---|---|---|---|
| เดิน | ลาก virtual joystick ซ้าย; ลากสั้นคือเดิน ลากเต็มคือวิ่ง | WASD หรือ Arrow Keys | ตัวละครเร่งและผ่อนอย่างนุ่มนวล พร้อม gait animation |
| โจมตี | ปุ่ม ATTACK ขวาล่าง | Space หรือคลิกซ้าย | attack pulse และ damage feedback |
| Dash | ปุ่มสายฟ้าเหนือ ATTACK | Shift | burst สั้นพร้อม dash state |
| โต้ตอบ/เก็บของ | ปุ่ม Pickaxe | E หรือคลิกขวา | context-sensitive interact และ reward |
| ช่องลัด | แตะ slot 1–3 ด้านล่างกลาง | ปุ่ม 1–3 | ช่อง active สว่างชัดเจน |
| คลังไอเทม | ปุ่ม Backpack บน HUD | I หรือ Tab | เปิด Vault overlay |
| ตั้งค่า/พัก | ปุ่ม Settings | Escape | เปิด Settings sheet |
| Companion | ปุ่มอุ้งเท้าในแผง Companion | C ในแผนต่อยอด | Follow/Stay และสถานะที่แผง HUD |
| แผนที่/เควสต์ | Radar บนขวาในแผนต่อยอด | M ในแผนต่อยอด | tactical overlay |

## Movement contract

ความเร็วอ้างอิงของ runtime ใช้หน่วยโลกเดียวกับแผนที่: walk `3.35`, run `4.8`, dash `12.4` ก่อนคูณ modifier ของ encounter ความเร็วจะเร่งด้วย smoothing แทนการเปลี่ยนทันที และจะผ่อนกลับเป็นศูนย์เมื่อปล่อย joystick เพื่อไม่ให้ตัวละครลื่นหรือพุ่งเกินขนาดฉาก

ตัวละครมี state `idle`, `walk`, `run` และ `dash` โดย state ถูกกำหนดจาก input magnitude, ความเร็วจริง และ dash pulse ไม่ใช่จากการกดปุ่มเพียงอย่างเดียว Voxel model จะใช้ bob frequency, gait rotation และ amplitude ที่ต่างกันตาม state; reduced-motion จะปิด bob/gait animation

## Mobile landscape and safe area

ทุก HUD zone ต้องอยู่ในขอบ `max(.55rem, env(safe-area-inset-* ))` หรือ offset ที่เทียบเท่า ปุ่มสำคัญมีพื้นที่สัมผัสอย่างน้อยประมาณ 48 CSS pixels แม้ภาพไอคอนด้านในจะเล็กกว่า สำหรับ viewport ตัวอย่าง 812×375 ห้ามให้ joystick, hotbar, action cluster, exit หรือ settings ชิดขอบจนชนรูกล้อง/ขอบโค้ง/gesture bar

โซนที่ห้ามซ้อนกันคือ status กับ companion ด้านบนซ้าย, radar กับ Inventory/Settings ด้านบนขวา, banner ตรงกลางกับแถบสถานะ, hotbar กับ joystick/action cluster และ footer กับ gesture bar

## Asset contract

Gameplay ใช้ `arcane-frontier-voxel-pixel` เป็น pack หลักใน `client/src/game/assets/pixelPack.ts` และมี manifest แยกที่ `client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json` Game core อ้างอิง logical asset IDs ไม่สร้าง remote texture plane สำหรับตัวละคร ศัตรู resource และ landmark หาก pack หรือภาพเสริมล้มเหลว UI ต้องซ่อน broken image และใช้ pixel-safe fallback แทน

## Mobile hotbar action update — 2026-08-26

Hotbar interaction is now deliberately two-step on touch: **แตะหนึ่งครั้งเพื่อเลือก slot** และกดปุ่ม **USE** ที่ตำแหน่งคงที่ใน action cluster เพื่อใช้ item ปัจจุบัน. ระบบไม่พึ่ง double-tap เพราะ gesture ดังกล่าวไม่สม่ำเสมอบนหน้าจอสัมผัสและอาจชนกับ browser zoom/accessibility behavior. Item icon และ quantity มาจาก `ItemDefinition.iconAssetId` และ manifest-resolved pack entry; เมื่อไม่มี asset ระบบแสดง fallback icon ที่อ่านได้.

`use-item` offline action ส่งเฉพาะ `slot`, `instanceId` และ `definitionId` ที่ผ่านรูปแบบจำกัด; server sync ตรวจ actor/device token และ payload boundary ก่อนเก็บ transaction. การตรวจนี้ยังเป็น audit/integrity boundary ไม่ใช่ server-authoritative combat หรือ anti-cheat เต็มรูปแบบ.
