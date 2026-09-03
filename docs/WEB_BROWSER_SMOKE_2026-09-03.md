# Web Browser Smoke

วันที่ตรวจ: 2026-09-03
URL: `http://localhost:4173/`

Web artifact จาก `build-web` โหลดใน Chromium ได้จริงและแสดง native canvas ที่หน้า username screen พร้อม texture background, username field และปุ่ม Done ขนาด viewport 893×893

การส่ง keyboard events จาก browser console เข้า canvas/body ยังไม่ทำให้ข้อความปรากฏในช่อง username เนื่องจากระบบ input ของ legacy canvas ใช้ event/focus path เฉพาะ จึงยืนยันได้เพียง `browser_load=PASS` และ `username_screen=PASS`; `username_entry=UNVERIFIED` และ `world_entry=UNVERIFIED`
