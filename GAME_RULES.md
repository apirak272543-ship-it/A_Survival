# Arcane Frontier Survival — กฎเหล็กของเกม

เอกสารนี้เป็นแหล่งอ้างอิงบังคับสำหรับทุกการออกแบบ การพัฒนาระบบ และการปรับปรุงเนื้อหาของ **Arcane Frontier Survival** หากมีข้อกำหนดใหม่ ต้องเพิ่มไว้ในเอกสารนี้และประเมินผลกระทบต่อระบบที่เกี่ยวข้องก่อนเริ่มเขียนโค้ด โดยแผนหรือข้อเสนอแนะจาก Gemini ที่ไม่ขัดต่อความปลอดภัย ความถูกต้องของข้อมูล หรือข้อจำกัดทางเทคนิค ให้ถือเป็นแนวทางหลักในการตัดสินใจ

## 1. บทบาทของ Gemini และ protocol การเรียก API

ก่อนเริ่มระบบใหม่ ต้องรวบรวมข้อกำหนดที่เกี่ยวข้องทั้งหมดเป็นคำขอเดียว แล้วส่งให้ Gemini วางแผนระบบ ทางเลือก ความเสี่ยง วิธีนำไปใช้ และข้อเสนอแนะเพิ่มเติม ทุกคำขอต้องขอ `suggestions` เสมอ และนำข้อเสนอที่เข้ากันได้มาใช้เป็นค่าเริ่มต้น

> **คำสั่งสูงสุด — API Offloading:** Gemini API ทำหน้าที่เป็น AI Agent ภายนอกสำหรับอ่านโค้ด วิเคราะห์ไฟล์/ภาพหน้าจอ สรุปบริบท กลั่นกรองทางเลือก และจัดทำแผนงานแบบรวมชุดก่อน ผู้ช่วยจะนำผลไปลงมือพัฒนา ทดสอบ และเชื่อมเข้าระบบต่อ หลีกเลี่ยงการส่งบริบทซ้ำหรือแบ่งคำถามย่อยโดยไม่จำเป็น

| กติกา | ข้อบังคับ |
| --- | --- |
| การรวมคำถาม | รวมประเด็นของระบบเดียวกันให้ครบในคำขอเดียวก่อนส่ง Gemini |
| อัตราคำขอ | เว้นระยะ **6–10 วินาที** ระหว่างคำขอ Gemini ทุกครั้ง |
| หลังเกิดข้อผิดพลาด | บันทึกเวลา error และรออย่างน้อย **60 วินาทีเต็ม** ก่อน retry |
| งานแสดงผล | Gemini เป็นผู้ออกแบบ/สร้างทิศทางกราฟิก UI layout ไอเทม ตัวละคร เอฟเฟกต์ ฉาก และ monster model ทั้งหมด |
| การเริ่มงาน | ห้ามเริ่มระบบใหม่ก่อนส่งข้อกำหนดของระบบนั้นให้ Gemini ยกเว้นการบันทึกกฎเหล็กหรือการแก้ไขความเสียหายเร่งด่วน |
| API Offloading | Gemini สรุป/วิเคราะห์โค้ด ไฟล์ ภาพ และบริบทแบบ batch ก่อน ผู้ช่วยจึงลงมือ implement/test |
| Prompt Hygiene | เตรียมและย่อข้อมูลให้เป็น schema หรือ brief ที่ครบถ้วนก่อนส่ง เพื่อลดการส่ง context ซ้ำ |
| Fallback Model | หากรุ่น Gemini/API หนึ่ง quota เต็มหรือ error ให้พักอย่างน้อย 60 วินาที แล้วสลับไปยังรุ่นที่รองรับในลำดับ fallback อัตโนมัติ โดยถามผู้ใช้เฉพาะเมื่อทางเลือกที่ใช้ได้หมดแล้ว |
| Game Images | ทุกภาพเริ่มจาก Gemini brief ในรูป “สร้างพร้อมสำหรับ… / จุดประสงค์ของภาพ…” จากนั้นใช้ช่องทางสร้างภาพที่ได้รับอนุมัติ เช่น built-in generation หรือ artist pipeline และบันทึก provenance/seed/model เท่าที่มี ห้ามเรียกไฟล์ starter ว่า Gemini-generated หากไม่ได้สร้างจาก Gemini Image API |

## 2. แก่นของเกมและแพลตฟอร์ม

เกมเป็น open-world survival ที่ผสานแฟนตาซี เวทมนตร์ สิ่งลี้ลับ ซอมบี้ และวิทยาศาสตร์/เทคโนโลยีต่างดาว โดยมีเป้าหมายเป็นเว็บเกม mobile-first สำหรับมือถือแนวนอน ซึ่งในอนาคตต้องพร้อมห่อ URL เป็น APK เกมต้องมีความรู้สึกเป็นโลกที่กว้างและอิสระ แต่แต่ละแผนที่กำหนดขอบเขตประมาณ **500 เมตรจากจุดศูนย์กลาง** เพื่อคงประสิทธิภาพของมือถือ โดย runtime จะ render เฉพาะระยะมองเห็นประมาณ 96 เมตร และเตรียมข้อมูลล่วงหน้าใน margin ประมาณ 128 เมตร ไม่สร้างหรือ render geometry ของทั้งแผนที่พร้อมกัน

งานภาพต้องเป็น **stylized low-resolution fantasy-sci-fi** ที่มีกลิ่นอาย pixel ร่วมสมัย ไม่คมจัดเกินจำเป็น แต่ต้องไม่กลายเป็น pixel block แบบจ๋าหรือรูปทรงเรขาคณิต 3 มิติที่เรียบง่าย ตัวละครต้องมี silhouette แบบอนิเมชัน เอฟเฟกต์การเดิน โจมตี พลัง อาวุธ และการเก็บไอเทมต้องชัดเจน และผู้เล่นปรับ quality, motion, effect density, music, SFX และ touch preferences ได้

เมื่อภาพพร้อม ต้องใช้เป็น texture, background, sprite หรือ `<img>` ของเกมแทนการวาดตัวแทนแบบเรขาคณิตบน Canvas แอสเซ็ตที่ดาวน์โหลดต้องเข้าคิวแคชสำหรับการเล่นออฟไลน์ และต้องเก็บ prompt/seed/model ไว้กับ metadata เพื่อสร้างซ้ำได้อย่างสอดคล้อง หากยังไม่มีภาพที่เหมาะสมให้ใช้ fallback แบบ pack-resolved ชั่วคราวและบันทึกเป็นงานค้าง ไม่ถือว่าเป็นภาพ final

## 3. การเข้าเกม การเล่นออฟไลน์ และการซิงก์

ผู้เล่นเข้าสู่เกมด้วย **ชื่อหรือ Player ID** ที่เลือกเองเท่านั้น ไม่มีรหัสผ่าน Gmail อีเมล OAuth ขั้นตอนสมัคร หรือการล็อกอินบังคับ หน้า Player ID ทำหน้าที่เลือกหรือสร้างเซฟในอุปกรณ์ทันที เมื่อออฟไลน์ให้เล่นต่อได้จาก local save และ cache ของเบราว์เซอร์โดยไม่ขัดขวางการเล่น เมื่อออนไลน์จึงค่อยดึงหรือซิงก์ profile คลังไอเทม และสถานะเกมแบบเบื้องหลัง

ทุกการเปลี่ยนหน้าและเปลี่ยนฉากต้องมี loading transition แม้ปลายทางอยู่ใน cache แล้ว หน้าจอนี้ต้องใช้ UI, motion, สี, ambience และคำแนะนำที่สอดคล้องกับ biome ปลายทาง Map module ที่ผู้เล่นเลือกดาวน์โหลดต้องเก็บใน Chrome Cache API เพื่อเล่นซ้ำแบบออฟไลน์ได้

## 4. ลำดับหน้าจอและ UI

ลำดับหลักคือ Landing → Player ID → Lobby → Home หรือ Map Select → Loading Transition → Gameplay Landing เป็นหน้าสื่อสารโลกของเกมและปุ่มเริ่มเล่น Lobby ต้องเป็น cinematic character hub มีแถบเมนูแนวตั้งซ้าย แถบทรัพยากร/การแจ้งเตือนบน ตัวละครและอุปกรณ์เด่นกลางฉาก ปุ่มโหมด/เลือกแผนที่ด้านล่าง และแผง event/ทางลัดด้านข้าง พร้อมหมายเลขเวอร์ชันแบบไม่เด่น

เกมเพลย์ใช้กล้อง **top-down 3/4 แบบ MOBA** ที่ติดตามผู้เล่น มองเห็นเส้นทาง ศัตรู วัตถุโต้ตอบ และเอฟเฟกต์รอบตัวได้ชัดเจน HUD สำหรับจอแนวนอนประกอบด้วย joystick ซ้าย ปุ่มโจมตี/สกิล/โต้ตอบขวา quickslot กลางล่าง สถานะชีวิตซ้ายบน minimap ขวาบน และ safe zone ที่ไม่บดบังพื้นที่ต่อสู้

## 5. โลก แผนที่ และเนื้อหา

ระบบต้องรองรับอย่างน้อย **100 map modules** ที่แยกส่งมอบและ commit ได้ทีละแผนที่ แต่ละแผนที่มี biome ที่สอดคล้องทั้งฉาก NPC, landmark, ทรัพยากร, regular monster, elite, surprise encounter และ event boss เฉพาะถิ่น การพัฒนาต้องทำแบบ **ทีละ 1 แผนที่**: ทำ visual/เกมเพลย์/asset pack/streaming/tests ของแผนที่ปัจจุบันให้เรียบร้อยและตรวจผ่านก่อน จึงเริ่มแผนที่ถัดไป ชุด biome เริ่มต้นครอบคลุม Obsidian Frontier, Ashen Hellscape, Mars Expanse, Saharan Glass, Congo Verdant, Stonecrest Range, Wildpine Highlands และ Astral Drift โดยต้องขยายเป็นครอบครัวของแผนที่ที่หลากหลาย

ทุก biome มีวงจรกลางวัน 15 นาทีและกลางคืน 15 นาที ยกเว้น biome ที่มีเหตุผลด้านเนื้อหาให้เป็น eternal night, void หรือสภาพเฉพาะ แสง สี เงา soundscape และ motion effect เปลี่ยนตามเวลาและ biome NPC มอนสเตอร์ เหตุการณ์ไม่คาดฝัน และ boss event ในต้นแบบสามารถทำงานจาก client-side game state แต่ต้องมีข้อมูลและสถานะที่ตรวจสอบได้

## 6. Survival, Home และ Farming

ผู้เล่นเดินสำรวจ เก็บทรัพยากร ต่อสู้มอนสเตอร์ จัดการพลังชีวิต คราฟต์ และเอาชีวิตรอด โดยมี home world ส่วนตัวแยกจากแผนที่สำรวจ Home ต้องรองรับการวาง หมุน ประกอบ ย้าย และเก็บคืนชิ้นส่วนก่อสร้างแบบ modular การตกแต่งบ้าน อุปกรณ์ใช้ในบ้าน สวน และสัตว์เลี้ยงที่สวมอุปกรณ์ได้

ระบบปลูกพืชต้องมีเมล็ดหลายชนิดที่ผูกกับกลุ่มดิน/สภาพแวดล้อมเพียงจำนวนเล็กน้อยที่จำง่าย เช่น Terra Loam, Ashen Volcanic, Red Dune, Verdant Humus และ Aether Crystal UI ต้องแสดงความเข้ากันได้ของเมล็ดและดินก่อนปลูก รวมถึงระยะเติบโตและการเก็บเกี่ยว

## 7. Item, Combat และ Economy

catalog ข้อมูลต้องรองรับสูงสุด 400 รายการต่อหมวดหลัก เช่น ดาบ ธนู อาวุธระยะไกล เมล็ดพืช วัตถุดิบ เฟอร์นิเจอร์ ของตกแต่ง และชิ้นส่วนก่อสร้าง อาวุธเป็นระบบไร้คลาส ผู้เล่นหยิบใช้ได้ทุกสาย แต่ต้องมี trade-off และ debuff ตามอุปกรณ์

ไอเทมมี tier: common, uncommon, rare, epic, legendary และ mythic พร้อมอัตราดรอปที่ควบคุม scarcity ได้จริง ระบบตีบวกมีต้นทุน ความเสี่ยง และเพดานตาม rarity อาวุธและอุปกรณ์สวมใส่เป็น item instance แยกกัน quantity ใน slot เดียวได้เพียง 1 ชิ้น แต่ผู้เล่นอาจมีหลาย instance ของ definition เดียวกันได้ จึงห้ามแจ้งโกงจากการมีหลายชิ้นเพียงอย่างเดียว

ทุก item instance ต้องมี provenance จาก `drop`, `craft`, `harvest`, `reward` หรือ `starter` พร้อม source ref และ integrity metadata การตรวจสอบต้องเกิดตอนเข้า Lobby เข้าแผนที่ และก่อน/หลัง sync โดยระงับเฉพาะข้อมูลผิดกติกา พร้อมแจ้งเตือนและบันทึก integrity log

## 8. เวอร์ชัน เหตุการณ์ และการส่งมอบ

Lobby แสดงเวอร์ชันเริ่มต้น `100.1.1.1` แบบไม่เด่น กติกาเป็น `major.maps-systems.patch.events`: ชุดแรกสำหรับอัปเดตใหญ่ ชุดที่สองสำหรับแผนที่หรือระบบเกม ชุดที่สามสำหรับ patch/balance/fix และชุดที่สี่สำหรับ event Weekly event แสดงใน Lobby พร้อมเวลา เป้าหมาย และรางวัล

เมื่อแผนที่หนึ่งเสร็จตามเกณฑ์ ต้อง commit และ push ไปยัง repository `apirak272543-ship-it/A_Survival` พร้อมข้อความ commit ระบุชื่อแผนที่ ต้องทดสอบ relationship/invariant ระหว่าง Player ID/profile/inventory/provenance, soil/seed/harvest, pet/equipment, transition/cache และ offline sync ก่อนเผยแพร่

## Historical mobile voxel reference boundary (2026-08-26)

The repository may use clean historical mobile voxel APKs and official public documentation as engineering case studies only. Static analysis can inform separation of app shell, platform adapter, game runtime, resource pack, atlas/metadata, HUD bindings, offline content and render budgets. It must never import, reproduce or adapt source code, package identifiers, branding, exact UI artwork, textures, models, UUIDs or proprietary algorithms from another game.

All A_Survival visible content remains Gemini-first for art direction and UX. The current local pack is marked `starter-authored-from-gemini-brief` because the image-generation endpoint was quota-blocked during the latest attempt; it must not be described as Gemini-generated imagery. Replacements from Gemini or an artist must keep logical asset IDs and manifest contracts stable, pass hash/cache validation, and remain replaceable without gameplay-core edits.

The current architecture blueprint is documented in `docs/MINECRAFT_PE_CASE_STUDY.md`, `docs/MINECRAFT_PE_RESEARCH_SOURCES.md` and `docs/A_SURVIVAL_ARCHITECTURE_BLUEPRINT.mmd`. These files contain no APK binaries.
