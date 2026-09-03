
## Retest หลัง canvas focus bridge

เพิ่ม `tabindex`, `aria-label`, focus on load และ focus on pointerdown ใน `misc/web/index.html` แล้วคัดลอก wrapper ไปยัง `build-web` จากนั้น reload browser สำเร็จและยังแสดง username screen ได้ตามปกติ การกด `O` ผ่าน browser automation ยังไม่ทำให้ข้อความใน TextBox เปลี่ยน จึงยังต้องตรวจ GLFW/Emscripten keyboard event bridge เพิ่มเติมก่อนยืนยัน username entry

## Console evidence

Browser console ยืนยัน `Obsidian runtime map: obsidian-frontier`, สร้างโฟลเดอร์ IDBFS สำหรับ worlds สำเร็จ และ render loop รายงานประมาณ 40–50 FPS อย่างต่อเนื่อง โดยระบบตรวจ `IS TOUCHSCREEN? 1` ใน browser session มี warning เดิมของ legacy tile category บางรายการ (`tile.hellrock`, `tile.grass` และรายการว่าง) แต่ไม่พบ JavaScript exception ที่หยุด runtime

## Character bridge retest result

เพิ่ม C ABI `obsidianWebFeedText`, export function ใน Web target, browser `keypress` fallback และ auto-focus ใน `UsernameScreen` แล้ว rebuild Web artifact สำเร็จ `[363/363]` หลัง reload browser สามารถส่ง character `O` เข้า TextBox ได้จริง เห็นข้อความ `O` ในช่อง username และกด `Enter` ผ่านไปยัง native start menu ได้จริง

ผลล่าสุด: `web_load=PASS`, `username_input=PASS`, `username_to_start_menu=PASS`, `world_entry=UNVERIFIED`
