# Native Interactive Harness Evidence

วันที่ทดสอบ: 2026-09-03
Branch: `native-base/mcpe`

## ผลการทดสอบ

Native executable เปิดภายใต้ `Xvfb :99` ด้วย geometry 854×480 และค้นพบ window ชื่อ `Minecraft PE 0.6.1` ได้จริง มีการส่ง mouse click เข้า window ผ่าน X11 input tool แล้ว process ยังคงทำงานต่อจนจบช่วง timeout

การทดสอบนี้ยืนยันว่า process สร้าง native window และรับ input injection เบื้องต้นได้ แต่ sandbox ไม่มี screenshot utility และไม่มี automation hook ที่ตรวจ screen title/state ภายในเกมหลัง click ดังนั้นยังไม่ยืนยันว่า click เดินทางจาก start menu ไป world selection หรือสร้าง expedition สำเร็จ

## คำสั่งหลัก

```sh
Xvfb :99 -screen 0 1024x768x24
DISPLAY=:99 XDG_RUNTIME_DIR=/tmp timeout 25s ./build-native/MinecraftPE
DISPLAY=:99 xdotool search --onlyvisible --name 'Minecraft PE 0.6.1'
DISPLAY=:99 xdotool mousemove --window <window-id> 420 360 click 1
```

## สถานะ

`window_startup=PASS`, `input_injection=PASS`, `screen_transition_assertion=UNAVAILABLE`, `world_creation_assertion=UNAVAILABLE` การทดสอบ interactive เต็มเส้นทางควรทำบน environment ที่มี screenshot/accessibility hook หรือทำ integration test ภายใน screen/navigation owner โดยตรง
