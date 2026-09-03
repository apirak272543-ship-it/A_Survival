
## Retest หลัง canvas focus bridge

เพิ่ม `tabindex`, `aria-label`, focus on load และ focus on pointerdown ใน `misc/web/index.html` แล้วคัดลอก wrapper ไปยัง `build-web` จากนั้น reload browser สำเร็จและยังแสดง username screen ได้ตามปกติ การกด `O` ผ่าน browser automation ยังไม่ทำให้ข้อความใน TextBox เปลี่ยน จึงยังต้องตรวจ GLFW/Emscripten keyboard event bridge เพิ่มเติมก่อนยืนยัน username entry
