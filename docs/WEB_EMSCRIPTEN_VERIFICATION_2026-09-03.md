# Web/Emscripten Verification

วันที่ตรวจ: 2026-09-03
Branch: `native-base/mcpe`

## ผลการตรวจ

| รายการ | ผล |
|---|---|
| Emscripten toolchain | PASS หลังติดตั้ง package |
| Web CMake configure | PASS |
| Native source compilation to Web | PASS |
| Web link | PASS |
| Artifact | `build-web/MinecraftPE.js` พร้อมไฟล์ประกอบตาม CMake output |
| OpenAL ใน Web | ปิดด้วย `NO_SOUND`; ไม่ถูก configure/build |
| standalone server ใน Web | ปิดเพื่อไม่ให้ server target ปนกับ browser target |
| Browser runtime smoke | ยังไม่ได้ตรวจใน browser session |

ระหว่างการตรวจพบว่า CMake เดิมใช้ `-sSHARED_MEMORY=1` ซึ่งไม่มีใน Emscripten รุ่นที่ติดตั้ง จึงปรับเป็น Web build แบบไม่ใช้ pthread/shared-memory เนื่องจาก target กำหนด `NO_NETWORK` และ `NO_SOUND` อยู่แล้ว นอกจากนี้ตัด `SoundSystemAL.cpp`, OpenAL dependency และ standalone server ออกจาก Web target เพื่อให้ browser build สอดคล้องกับ feature flags

Build รอบสุดท้ายสร้าง `MinecraftPE.js` สำเร็จที่ขั้น `[363/363] Linking CXX executable MinecraftPE.js` โดยมี warning จาก legacy code หลายรายการ แต่ไม่มี compile หรือ linker error

สิ่งที่ยังไม่ยืนยันคือการเสิร์ฟ artifact ผ่าน HTTP และการเปิด/เล่นใน browser จริง รวมถึงการทำ WebGL input smoke และการโหลด preload data จาก `/data`
