
## Browser viewport evidence

เริ่มจาก player route และสร้าง screenshot ด้วย Chromium headless ที่ sandbox viewport landscape ขนาด `320x240`, `390x240`, `430x240` และ `768x240`. ภาพ game view ทั้งสี่ขนาดแสดง HUD, top actions, touch stick, action cluster, quick slots และ footer อยู่ภายในกรอบภาพโดยไม่เห็น horizontal page overflow จาก CSS checkpoint นี้. ที่ขนาด 320/390 มีข้อความและปุ่มถูกย่อ/ตัดด้วย ellipsis ตามกฎ mobile เพื่อไม่ดัน footer หรือ control ออกนอกกรอบ; ที่ 430/768 มีพื้นที่หายใจมากขึ้น. `body` และ `#root` ใช้ `overflow:hidden` และ safe-area variables ยังคงมี fallback เป็น `0px` ใน sandbox.

ไฟล์หลักฐาน:
- `m01-css-viewports/game-320x240.png`
- `m01-css-viewports/game-390x240.png`
- `m01-css-viewports/game-430x240.png`
- `m01-css-viewports/game-768x240.png`
- `m01-css-viewports/game-viewports-contact-sheet.png`

ข้อจำกัด: นี่เป็น browser viewport evidence จาก sandbox ไม่ใช่ real-device acceptance, WebView acceptance, notch/navigation-bar measurement หรือ FPS benchmark. Screenshot ใช้ direct route ใน Obsidian runtime เท่านั้น.

Implementation ที่ทดสอบ: `9c55942` (`feat: harden mobile landscape css`).
