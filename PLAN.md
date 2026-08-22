# Game Plan: Arcane Frontier Survival

## Product slice

ต้นแบบนี้เป็นเกมเอาชีวิตรอดแบบ open-world สำหรับมือถือแนวนอน โดยผู้เล่นเริ่มจากกรอก **Player ID** เพียงครั้งเดียว เข้าสู่ Lobby เพื่อจัดอุปกรณ์ เลือกบ้านส่วนตัวหรือแผนที่สำรวจ แล้วต่อสู้ เก็บทรัพยากร คราฟต์ ปลูกพืช และนำของกลับมาใช้ต่อได้ ระบบฉากถูกออกแบบเป็น biome ขนาดเชิงออกแบบราว 1–1.5 กิโลเมตรจากจุดเกิด และโหลดเฉพาะฉากที่ผู้เล่นเลือก ตัวละครและ visual effect ใช้ภาษาภาพการ์ตูนอนิเมชันแฟนตาซีไซไฟ โดยมีเมนูปรับคุณภาพกราฟิกและเสียงอยู่ภายในเกม

## Risk Tasks

### 1. กล้อง isometric และคอนโทรลแบบ MOBA บนจอแนวนอน

- **Why isolated:** การแปลงตำแหน่ง joystick บนจอเป็นทิศการเดินในโลก 3D ต้องสัมพันธ์กับมุมกล้อง จึงมักทำให้ทิศการเดินผิดหรือ HUD บังพื้นที่เล่นได้
- **Approach:** ใช้กล้อง top-down เอียง 45 องศา มีมุมมอง 50 องศา พร้อม left virtual stick และ right action cluster ใน safe zone ของจอ 16:9
- **Verify:** ลาก joystick ทั้งแปดทิศแล้วตัวละครเคลื่อนในทิศที่สอดคล้องกับจอ, โจมตีและ dash ไม่ซ้อนกับแถบไอเทม, HUD ไม่ชน notch/ขอบ gesture

### 2. การเปลี่ยนฉากและโหลดข้อมูลตามต้องการ

- **Why isolated:** เกมต้องไม่โหลดทุก biome ตั้งแต่เริ่ม และสถานะผู้เล่นต้องผ่านจาก Lobby หรือบ้านส่วนตัวไปยังฉากสำรวจโดยไม่สูญหาย
- **Approach:** แยก catalog แผนที่และ scene factory เป็นโมดูลแบบ dynamic import, แสดง progress transition ตาม biome, โหลดเฉพาะ data/texture/scene ที่เลือก และเก็บโมดูลล่าสุดไว้ในแคช PWA เมื่อพร้อม
- **Verify:** เลือก biome จาก Lobby แล้วเห็น progress จาก 0–100%, ผู้เล่นเข้าสู่ฉากที่ถูกต้องพร้อมคลังและอาวุธเดิม, การกลับ Lobby คงสถานะล่าสุด

### 3. การเซฟ offline-first และ provenance ของไอเทม

- **Why isolated:** ผู้เล่นต้องเล่นต่อแบบออฟไลน์ได้ แต่ไอเทมทุกชิ้นสำคัญต้องมีต้นทางที่ตรวจสอบได้เมื่อกลับมาออนไลน์
- **Approach:** เก็บ save snapshot และ action log ใน browser; action ของ drop, craft, harvest และ reward สร้าง provenance record แบบ chained hash; เมื่อออนไลน์ tRPC ส่ง delta เพื่อให้ server ตรวจ source, ลำดับเหตุการณ์ และการเปลี่ยนจำนวนไอเทม
- **Verify:** ปิดการเชื่อมต่อแล้วเก็บ/คราฟต์/ปลูกและเปิดเกมต่อได้, กลับมาออนไลน์แล้วส่งเฉพาะ action ที่ค้าง, action ที่ไม่มี source ที่ถูกต้องถูกปฏิเสธ

## Main Build

ต้นแบบจะมีหน้า Landing, หน้า Player ID, Lobby, home world และหน้าเลือกแผนที่ พร้อมฉากสำรวจตัวอย่าง **Obsidian Frontier** ซึ่งเป็นพื้นที่ร้างแฟนตาซีไซไฟ มีทรัพยากร ซอมบี้ สิ่งก่อสร้าง แปลงปลูกพืช และสัตว์เลี้ยง อาวุธไม่มีการล็อกอาชีพ แต่แต่ละชนิดมีความเสี่ยง/ข้อแลกเปลี่ยนต่างกัน เช่น ดาบหนักชาร์จนาน, ปืนร้อนเกิน, คฑาส่งพิษ, และปืนพลังงานทำให้เดินช้าระหว่างยิง ภาพตัวละคร ไอเทม และ effect จะใช้ silhouette แบบอนิเมชันที่ชัดเจน แทนการใช้รูปทรงเรขาคณิต 3 มิติแบบเรียบง่าย

แผนที่ที่จะลงทะเบียนใน catalog คือ Ashen Hellscape, Mars Expanse, Saharan Glass, Congo Verdant, Stonecrest Range, Wildpine Highlands และ Astral Drift โดยต้นแบบจะทำให้ **Obsidian Frontier** เล่นได้จริงและมีข้อมูลพร้อมขยายสำหรับ biome ที่เหลือ บ้านส่วนตัวจะแยกหน้าที่สำหรับสร้าง ตกแต่ง ปลูกพืช และดูแลสัตว์เลี้ยงจากฉากสำรวจที่เน้นต่อสู้/ทรัพยากร

- **Assets needed:** ภาพอ้างอิงบรรยากาศ bioluminescent fantasy-sci-fi, texture หิน obsidian/พืชเรืองแสง, texture terrain, portrait/ไอคอนสัตว์เลี้ยง และ UI ornament แบบ arcane-cyber
- **Verify:** Landing มีทางเข้าเกมชัดเจน, Player ID สร้างหรือดึง profile ได้, Lobby แสดง loadout, หน้าเลือกฉากแสดง biome/ภัยคุกคาม/ผลตอบแทน, ตัวละครเดิน โจมตี เก็บของ สร้าง และปลูกได้, หน้า HUD อ่านง่ายบนมือถือแนวนอน, ไม่มี placeholder แบนราบหรือ error ใน console

## Acceptance criteria

| พื้นที่ | เกณฑ์ที่ตรวจสอบได้ |
| --- | --- |
| การเล่นบนมือถือแนวนอน | มี touch joystick ทางซ้าย, action cluster ทางขวา, HUD อยู่ใน safe zone และทดลองที่ 812×375 ได้ |
| วงจร survival | เดินสำรวจ, ฆ่าศัตรู, เก็บของ, ใช้อาวุธ, วางสิ่งปลูกสร้าง และปลูก/เก็บเกี่ยวได้ใน flow เดียว |
| Flow ผู้เล่น | Player ID → Lobby → บ้านส่วนตัวหรือเลือกแผนที่ → โหลดฉาก → กลับ Lobby ทำงานได้ |
| ระบบข้อมูล | มี profile, inventory, save และ provenance log; offline save จัดคิวซิงก์เมื่อเชื่อมต่อ |
| การขยายแผนที่ | catalog ระบุ map config, biome, radius, danger และ bundle key โดยไม่ผูกกับฉากเดียว |
| PWA | มี manifest, service worker และ cache shell เพื่อเตรียมห่อเป็น APK URL wrapper |
