# Arcane Frontier Survival — Map Modules 001–010

เอกสารนี้เป็น map bible ของชุดเปิดตัว 10 แผนที่แรก โดยนำ content brief แบบรวมจาก Gemini มาใช้กับโครงสร้าง `MapDefinition` และสร้าง key art ของแต่ละแผนที่ผ่าน Pollinations.ai ตาม prompt, seed และ model ที่บันทึกไว้ใน `ASSETS.md` และ manifest ภายนอกโปรเจกต์ ทุกแผนที่มีขนาดรัศมี **1,000–1,500 เมตร** จากจุดเกิด มี NPC, ทรัพยากร, มอนสเตอร์ปกติ, elite, surprise event และ event boss ครบใน data module

> **สถานะต้นแบบ:** MAP_001 มี art texture สำหรับตัวละคร ทรัพยากร มอนสเตอร์ และบอสในฉากแล้ว ส่วน MAP_002–MAP_010 เป็น expedition module ที่เลือกเล่นได้ มี key art, ขนาดโลก, accent, lighting mode, roster และ boss HUD เฉพาะแผนที่ แต่ยังใช้กรอบ Babylon encounter ร่วมกันจนกว่าจะสร้าง asset/action set ราย monster ครบ

| ID | ชื่อแผนที่ | รัศมี | NPC | มอนสเตอร์ / Elite | Event boss | เหตุการณ์เซอร์ไพรส์ |
| --- | --- | ---: | --- | --- | --- | --- |
| MAP_001 | Obsidian Frontier | 1,000 m | Commander Koral | Glass Stalker / Obsidian Golem | Void Reaper | Distress pod trap |
| MAP_002 | Ashen Obsidian Plains | 1,000 m | Scavenger Jax | Ash Crawler / Obsidian Shell Golem | Pyroclastic Behemoth | Ash storm เพิ่มโอกาสดรอป |
| MAP_003 | Bioluminescent Caverns | 1,200 m | Researcher Lyra | Glow Spore Beetle / Luminous Stalker | Mycelium Empress | Spore bloom ฟื้นพลังแต่ทำศัตรูคลั่ง |
| MAP_004 | Crystalline Spires | 1,100 m | Cartographer Zephyr | Shard Gnat / Prism Golem | Resonance Archon | Reflection laser field |
| MAP_005 | Corrosive Acid Swamps | 1,300 m | Alchemist Vane | Acid Slime / Mire Lurker | Toxic Hydra | Acid rain บังคับหาที่กำบัง |
| MAP_006 | Magnetic Dunes | 1,400 m | Engineer Rusty | Magnetic Hover-Ray / Ironclad Golem | Lodestone Colossus | Magnetic storm รบกวนอุปกรณ์โลหะ |
| MAP_007 | Frozen Obsidian Crevasses | 1,250 m | Scout Frost | Frostbite Weaver / Cryo-Beast | Glacial Terror | Blizzard บังคับหา steam vent |
| MAP_008 | Ancient Obsidian Ruins | 1,350 m | Historian Kael | Sentinel Drone / Ruin Guardian | Matrix Overlord | Defense system laser sweep |
| MAP_009 | Overgrown Obsidian Jungle | 1,500 m | Herbalist Flora | Thorn Spitter / Jungle Stalker | Carnivorous Titan | Pollen rain สลับการควบคุมชั่วคราว |
| MAP_010 | Void-Infused Rift | 1,500 m | Void Wanderer | Void Larva / Rift Horror | Void Singularity | Gravity tide เปลี่ยนเส้นทางปลอดภัย |

## กติกาการแคช

เมื่อกด **Prepare expedition** เกมจะสร้าง record ของ map module ลง Cache Storage และพยายามเก็บ key art ของโมดูลพร้อมกัน จากนั้นจึงใช้ localStorage เป็นเพียง compatibility marker เท่านั้น หน้าเลือกแผนที่อ่าน Cache Storage ก่อน เพื่อให้ป้าย “Enter cached sector” สะท้อนข้อมูลที่เก็บไว้จริงและยังทำงานเมื่อ localStorage ใช้ไม่ได้

## เกณฑ์ก่อนแยก commit รายแผนที่

การทำแผนที่ให้สมบูรณ์ในอนาคตต้องมี asset/action set ของ NPC, มอนสเตอร์, elite และ boss เฉพาะแผนที่, objective/event ที่รันจาก client state, การทดสอบความสัมพันธ์ของ drop/provenance, การทดสอบ cache-transition และการตรวจภาพบนจอแนวนอนก่อน commit แยกตามชื่อแผนที่
