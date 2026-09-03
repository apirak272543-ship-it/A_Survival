# Native Vertical Slice Smoke Evidence

วันที่ทดสอบ: 2026-09-03
Branch: `native-base/mcpe`
Executable: `build-native/MinecraftPE`

## ผลการตรวจ

| รายการ | ผล |
|---|---|
| CMake configure ด้วย Ninja | ผ่าน |
| C++ compile/link | ผ่าน |
| Obsidian runtime source ถูก link เข้า executable | ผ่านหลังเพิ่ม source ใน `CLIENT_SOURCES` |
| Native executable เปิด process ภายใต้ virtual X display | ผ่าน; process อยู่ครบ 12 วินาทีจน timeout ตามที่กำหนด |
| Runtime log error ระหว่าง smoke | ไม่พบข้อความ error ใน log ที่เก็บได้ |
| ยืนยันว่าเข้า world และเล่น input ครบ | ยังไม่ยืนยัน |

## คำสั่งที่ใช้

```sh
cmake -S . -B build-native -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build build-native -j2
XDG_RUNTIME_DIR=/tmp xvfb-run -a timeout 12s ./build-native/MinecraftPE
```

รหัส `124` จากคำสั่งสุดท้ายหมายถึง `timeout` หยุด process หลังจากปล่อยให้ทำงานครบ 12 วินาที ไม่ใช่ crash ที่ตรวจพบใน smoke นี้ การทดสอบนี้ยืนยันเพียงว่า executable สามารถเริ่มและคงอยู่ใน render loop ภายใต้ virtual display ได้ ยังไม่ใช่หลักฐานว่า world loading, keyboard/mouse input หรือการสร้าง expedition ผ่านครบทุกขั้น

## การเปลี่ยนแปลงที่อยู่ใน checkpoint

ฐาน native มี runtime identity คงที่ `obsidian-frontier`, ปฏิเสธ empty level id ก่อน allocate level, บันทึก namespace ของ level ที่กำลังเปิด และปรับหน้า start/create world ให้ใช้ข้อความบริบท Obsidian Frontier โดยคง screen/widget/navigation owner ของ native base

## งานตรวจถัดไป

ต้องทดสอบ input event และ world creation แบบอัตโนมัติหรือ interactive ภายใต้ display ที่ควบคุมได้ แล้วตรวจ log ว่า `selectLevel` และ `ProgressScreen` ทำงานครบ ก่อนประกาศ vertical slice ว่า playable จริง
