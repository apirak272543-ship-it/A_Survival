# Archive comparative audit — 2026-08-28

## ขอบเขตและวิธีตรวจ

เอกสารนี้บันทึกผลจาก archive ที่ผู้ใช้ส่งมา 2 ชุด ได้แก่ `Source_Code.zip` และ `Minecraft-Clone.zip` การตรวจเป็นแบบ passive: ตรวจ SHA-256, ZIP integrity, รายชื่อไฟล์, metadata และอ่านข้อความที่เลือกเท่านั้น ไม่รัน executable, DLL, shader, asset loader หรือ build script จาก archive และไม่คัดลอกไฟล์จาก archive เข้า runtime ของ A_Survival โดยตรง

## ผลตรวจ archive

| Archive | ผลตรวจ | ขอบเขตที่พบ | ความเสี่ยง/ข้อจำกัด |
|---|---|---|---|
| `Source_Code.zip` | ZIP valid; SHA-256 `b83729e3d0db2da9c6775cc456a002000f14de1818852bdf437bbdeee32696f6`; 1,331 entries | C++/HPP/H source, Visual Studio solution, GLEW/SFML/libnoise dependencies, shaders, PNG/OGG/OTF และ binaries | ไม่พบ project-level license/readme ที่ยืนยันสิทธิ์รวมของเกม; มี executable/DLL และ assets ที่ provenance ไม่ยืนยัน จึงห้ามนำเข้า runtime |
| `Minecraft-Clone.zip` | ZIP valid; SHA-256 `a44d36850243742ecd0d754c08e5d57b1af8607114c541f42f671b457906c166`; 300 entries | Release build, `Minecraft_Clone.exe`, DLL, `.block` definitions, shaders, PNG, OGG, Minecraft font และ config/control files | เป็น binary/release package และมีชื่อ/เสียง/ฟอนต์/asset ที่สื่อถึง Minecraft; ไม่มี license declaration ที่ตรวจพบใน release package จึงใช้ได้เพียงเป็น reference หลังตรวจ ไม่ใช่ source asset |

## สิ่งที่นำมาใช้เป็น reference architecture ได้

Source code แสดงแนวคิดที่มีประโยชน์ต่อ A_Survival ได้แก่การแบ่งโลกเป็น chunks/sections, การทำ mesh เฉพาะเมื่อ chunk เปลี่ยน, การเก็บ highest opaque block เพื่อช่วย lighting, การส่งต่อ block ที่อยู่นอก chunk เป็น pending/unloaded update, การแยก world position ออกจาก local chunk position, การทำ texture atlas, การมี render settings และ tick manager แยกจาก rendering และการทำ dropped-item/hand/flora/water renderer แยกส่วน แนวคิดเหล่านี้สอดคล้องกับกฎ `Generate Once → Store → Cache → Reuse` ของ Obsidian Frontier เมื่อแปลงเป็น Babylon.js/TypeScript data contracts ของเราเอง

ไฟล์ `Res/info.txt` รายงานฟีเจอร์ของต้นฉบับ เช่น procedural generation, biomes, caves, collision, break/place, tool durability, dropped items, inventory, crafting, lighting, hunger/breathing, swimming, sneaking, post-processing, day/night, weather และ fog ขณะเดียวกันก็ระบุว่ายังขาด saves, main menu, water physics และ enemies ข้อมูลนี้ใช้เป็น checklist เปรียบเทียบเชิงระบบเท่านั้น ไม่ใช่หลักฐานว่า A_Survival ผ่านฟีเจอร์ใดแล้ว

## สิ่งที่ห้ามนำเข้าโดยตรง

ห้ามนำ executable, DLL, PDB, compiled libraries, shaders ที่ไม่ทราบ provenance, PNG/OGG/OTF, ชื่อ Minecraft, Minecraft font, เพลง/เสียงที่ระบุหรือเลียนแบบ Minecraft, `.block` definitions ที่คัดลอก identifier/ข้อมูลของต้นฉบับ, หรือ C++ source ไปวางใน A_Survival โดยตรง การนำแนวคิดมาใช้ต้อง re-implement เป็น TypeScript/Babylon.js ภายใต้ canonical owners และต้องผูก asset กับ `assetProvenance` ของ A_Survival ก่อนใช้งานจริง

## Mapping ที่เสนอสำหรับ A_Survival

| Pattern จาก archive | Canonical adaptation ใน A_Survival | สถานะการนำเข้า |
|---|---|---|
| Chunk/section storage และ dirty mesh | world generator/cache/visible-region contracts พร้อม Obsidian-only map gate | ใช้แนวคิดได้; ต้องไม่ย้าย C++ หรือ renderer ตรง ๆ |
| Local-to-world coordinate conversion | `blockKey`, coordinate normalization และ finite-coordinate guards | มี implementation และ tests บางส่วนแล้ว; broad world integration ยัง PARTIAL |
| Deferred out-of-chunk block updates | offline map overrides/persistence queue ที่ validate map, player และ block definition | ใช้เป็น design input; ต้องพิสูจน์ reload/reconnect/device |
| Texture atlas / 2D-to-3D item idea | texture-pack builder และ asset registry ของเราเอง | ยังไม่ควรนำ asset archive มาใช้; ต้องตรวจ provenance/licence แยก |
| Tick manager / render settings | distance-based AI/animation/physics/performance capability contracts | ใช้เป็น architecture reference; ห้ามทำ generation ใน render loop |
| Tool, break/place, inventory, crafting | existing item/block/action owners พร้อม 40-slot/64-stack rules | ใช้เป็น behavior reference; canonical A_Survival data และ tests เท่านั้น |

## ข้อสรุปเพื่อเร่ง playable scope

Archive ช่วยลดเวลาคิด architecture ได้จริง โดยเฉพาะ chunk lifecycle, dirty mesh, coordinate conversion, texture atlas, tick separation และ configuration-driven rendering แต่ไม่ใช่ drop-in source สำหรับเว็บเกม A_Survival เพราะเป็น C++/OpenGL desktop project ที่มี binary/native dependencies และ asset provenance ไม่ชัดเจน การนำไปใช้ที่ปลอดภัยที่สุดคือ re-implement เฉพาะ algorithm pattern ที่จำเป็นใน owner files เดิมของ A_Survival และปิดด้วย regression tests ทีละ checkpoint

ผลตรวจนี้ไม่เปลี่ยนสถานะ global requirement ใน matrix และไม่ถือเป็นหลักฐานว่าเกมพร้อมเล่นทั้งหมด การใช้ archive จะต้องผ่าน comparative audit นี้, Obsidian runtime gate, asset provenance gate และ implementation/test/build evidence ทุกครั้ง

## ข้อค้นพบจาก WorldGeneration.cpp ที่ต้อง adapt ไม่ใช่คัดลอก

การโหลดโลกของ archive มี `loadChunks` ที่วนตามระยะจาก camera, เรียก terrain generation ต่อ chunk, รวม unloaded block updates แล้วค่อยคำนวณ sunlight/AO และสร้าง mesh ก่อนปล่อย chunk busy state. แนวคิดเรื่อง dirty chunk, deferred updates และแยก generation/light/mesh เป็นขั้นตอนมีประโยชน์กับ A_Survival แต่ implementation นี้เป็น C++ desktop และมีข้อจำกัดที่ไม่ควรยกมาใช้ตรง ๆ ได้แก่การใช้ mutex/thread state แบบเฉพาะ engine, การขยาย load distance แบบวนกลับ, การทำ lighting/mesh ในลำดับที่อาจบล็อก worker loop, การรองรับพิกัดที่ clamp ฝั่ง non-negative และการเรียก generation จาก loop เดียวกับการโหลดตาม camera.

การ adapt ที่ถูกต้องสำหรับ A_Survival คือให้ generator สร้าง deterministic chunk artifact นอก render loop, เก็บใน cache/visible-region owner, ใช้ finite integer coordinate validation, schedule งาน background แบบ bounded, publish เฉพาะ artifact ที่เสร็จแล้ว และให้ Babylon render เฉพาะ visible objects ในระยะที่กำหนด การค้นพบนี้ยังไม่ใช่การเปลี่ยนโค้ด runtime และไม่ยกระดับสถานะ M-02/G-01 เป็น VERIFIED.
