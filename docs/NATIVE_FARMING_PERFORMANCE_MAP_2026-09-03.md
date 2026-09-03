# Native Farming and Performance Mapping

วันที่สำรวจ: 2026-09-03
Branch: `native-base/mcpe`

## ข้อค้นพบ

ฐาน native มี crop/tile lifecycle อยู่แล้วใน `src/world/level/tile/CropTile.cpp`, `StemTile.cpp`, `MelonTile.cpp`, `Mushroom.cpp` และ tile อื่นที่เกี่ยวข้อง ส่วนการตั้งค่าผู้เล่นอยู่ใน `src/client/Options.h` และ `Options.cpp` โดยมี `OPTIONS_VIEW_DISTANCE`, `OPTIONS_FANCY_GRAPHICS`, `OPTIONS_AMBIENT_OCCLUSION`, `OPTIONS_LIMIT_FRAMERATE`, `OPTIONS_FOG_TYPE` และ camera/input options อยู่แล้ว

ดังนั้นการ port farming ระยะถัดไปควรเพิ่ม data registry และ mapping เข้ากับ tile lifecycle เดิม ไม่ควรสร้าง world generator หรือ plant generator ใน render loop การกำหนดชนิดพืช, growth stage, biome restriction และ effect ให้โหลดครั้งเดียวจาก data แล้ว cache ไว้ ส่วน tick ของพืชควรตรวจเฉพาะตำแหน่งที่มีการเปลี่ยนแปลงหรือ scheduled update ตามกลไก level เดิม

## Mapping ที่ใช้ต่อ

| A_Survival requirement | Native owner เดิม | แนวทางต่อยอด |
|---|---|---|
| พืชหลายชนิด | `CropTile`, `StemTile`, `MelonTile`, mushroom/tile lifecycle | เพิ่ม data definitions ก่อนเพิ่มชนิด ไม่ generate ใน frame |
| growth stage | tile data/level update | จำกัด update ที่ scheduled block และ validate stage bounds |
| biome-specific growth | biome source + tile placement/update | lookup จาก cached plant definition |
| plant effect | item/tile interaction หรือ effect service | apply เฉพาะเมื่อ event เกิด ไม่คำนวณซ้ำทุก frame |
| render distance | `OPTIONS_VIEW_DISTANCE` และ level renderer | ใช้ option เดิมเป็น source แล้วค่อยเพิ่ม profile mapping |
| low-end mode | fancy graphics, ambient occlusion, framerate/fog | รวมเป็น preset data ภายหลัง โดยไม่เปลี่ยน renderer owner |

## ข้อกำหนดความปลอดภัย

Plant definitions ที่ id ผิด, stage ติดลบ, stage เกินจำนวนที่ประกาศ หรือ effect parameter ไม่ถูกต้องต้องถูกปฏิเสธก่อนลง world state การแก้ไขนี้ต้องอยู่ที่ data boundary ไม่ใช่เชื่อ input จาก UI โดยตรง

## สถานะ

เอกสารนี้เป็น mapping checkpoint ยังไม่อ้างว่าพืช 300 ชนิดหรือ effect suite ถูก port ครบแล้ว งาน implementation ถัดไปคือสร้าง registry ขนาดเล็กที่มี schema ชัดเจน, cache immutable หลังโหลด และ test invalid input ก่อนเชื่อมกับ tile lifecycle เดิม
