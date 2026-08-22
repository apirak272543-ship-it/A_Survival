# Gemini MAP_002–MAP_010 Scene Identity Plan — Adopted Scope

นำ treatment data ของ Gemini มาใช้กับ MAP_002–MAP_010 เท่านั้น: palette, EXP2 fog ที่ scale สำหรับ Babylon mobile, sky/key light, terrain veil, key-art landmark และ ambient hazard phrasing. ไม่มีการสร้าง MAP_011+ และไม่มีการอ้างว่า NPC/monster/boss ได้ action set เฉพาะ map แล้ว.

| ข้อเสนอ Gemini | การนำไปใช้ |
|---|---|
| Fog/light แยก biome | `MAP_SCENE_TREATMENTS` กำหนด fog, sky, light และ terrain ต่อ map |
| Landmark silhouette | ใช้ Pollinations key art ที่มีอยู่เป็น landmark plane ของ map นั้น |
| Hazard event signal/HUD | สลับ ambient event กับ Thai hazard phrasing ใน HUD warning ของ scene |
| Mobile constraint | Dynamic light หลักเพียง 1 ดวง, ใช้ fog/ground veil/lightweight planes แทน shadow หรือ shader ใหม่ |
| Performance suggestion | ตรวจภาพ representative maps; profiling 30 FPS บนอุปกรณ์จริงยังเป็นงานถัดไป |

ค่าหมอกที่ Gemini เสนอถูก scale ลงสำหรับ `FOGMODE_EXP2`; ไม่เช่นนั้น Ashen Plains จะทึบจนอ่านพื้นที่เล่นไม่ได้บนกล้อง MOBA ของต้นแบบ.
