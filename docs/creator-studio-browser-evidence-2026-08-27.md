# Creator Studio Browser Evidence — 2026-08-27

## Verified

- เปิด `http://localhost:3000/creator-studio` ใน development preview แล้วแสดงหน้า `A_SURVIVAL CREATOR STUDIO` พร้อมป้าย `DEVELOPER ONLY` และข้อความว่าแยกจากหน้าผู้เล่น
- หน้าแสดง template selector สำหรับพืช/ใบไม้, อาวุธ, ไอเทม, พื้น/บล็อก, สกินตัวละคร และ Atlas/ชุดภาพ
- หน้าแสดง pixel canvas, วาด/ลบ, symmetry, ล้างกระดาน, zoom, palette/สี custom, layer และ opacity
- เปลี่ยน template จาก `พืช / ใบไม้` เป็น `สกินตัวละคร` แล้ว canvas เปลี่ยนเป็น `64 × 64 px`, เปิดส่วน `การแมปส่วนประกอบสกิน` และ `COMPOSITION PREVIEW`
- หน้าแสดง metadata inspector ภาษาไทยสำหรับ pack name, asset name, logical ID แบบอัตโนมัติ, sampling, canvas size และ provenance reference
- หน้าแสดง validation status, save draft/export draft และปุ่มส่งเข้า Builder ที่ยัง disabled พร้อมข้อความระบุว่ายังรอ backend contract, PNG hash, manifest และ provenance validation
- ไม่พบ player HUD, map selector หรือ generator control ใน `ArcaneFrontier` จากหน้า creator route

## Known limitation observed

- Browser smoke test ยืนยันการ render และ template switching แล้ว แต่ยังไม่ได้ยืนยันการคลิกพิกเซล/บันทึก draft/export download แบบ end-to-end และยังไม่มี backend creator tRPC contract จึงยังไม่นับ UI เป็น creator pipeline ที่เสร็จสมบูรณ์
- Development log มี warning เดิมเรื่อง `OAUTH_SERVER_URL` และ analytics placeholders; ไม่เกี่ยวกับ creator page compile/render

## Screenshots

- `/home/ubuntu/screenshots/localhost_2026-08-26_17-53-45_5404.webp` — initial plant template
- `/home/ubuntu/screenshots/localhost_2026-08-26_17-53-58_8458.webp` — skin template and composition preview

## Interaction pass 2

- คลิก grid cell บนหน้า skin template แล้วข้อความสถานะเปลี่ยนเป็น `ลงสีพิกเซลแล้ว` ยืนยันว่า interaction วาดพิกเซลทำงานจริง
- การคลิกพิกัดสำหรับปุ่ม `ตรวจงานตอนนี้` ใน viewport นี้ยังไม่ยืนยันผลสำเร็จ จึงไม่ถือว่า validation action ผ่านจาก browser รอบนี้ และจะใช้ DOM/selector ที่ชัดเจนในรอบตรวจถัดไป

## Interaction pass 3

- ใช้ DOM ค้นหาปุ่ม `ตรวจงานตอนนี้` แล้วพบปุ่มจริงและสั่ง click ได้ (`found: true`)
- ผลทันทีหลัง click ยังอ่าน `ตรวจเบื้องต้นผ่านแล้ว` ไม่พบ (`status: false`) จึงบันทึกตามจริงว่า action นี้ยังไม่ผ่านการยืนยันจาก browser และต้องตรวจต่อว่าเกิดจาก state update/asynchronous render หรือ page overlay/viewport state

## Boundary pass

- หลัง browser view พบ validation state เป็น `ผ่าน` และสถานะพื้นที่ทำงานเป็น `ตรวจเบื้องต้นผ่านแล้ว` เมื่อเรียกปุ่มด้วย DOM click
- เปิด `http://localhost:3000/?route=landing` แล้วพบเฉพาะ `ARCANE FRONTIER`, `Audio`, `Enter the frontier` และคำอธิบายเกมผู้เล่น ไม่พบ `Creator Studio`, pixel canvas, palette หรือ generator controls
- ข้อสรุปจาก browser หลักฐานรอบนี้: developer creator route แยกจาก root player route ได้จริงใน development preview และไม่เพิ่มเมนู creator ให้ผู้เล่น

## Builder API browser pass

- เปิด Creator Studio หลัง API integration แล้วพบปุ่ม `ส่งเข้า Builder / Registry` เปิดใช้งานและมี source selector เพิ่มขึ้น
- การเรียก DOM click รอบแรกเขียน JavaScript cast แบบ TypeScript (`as HTMLButtonElement`) จึงเกิด browser syntax error; ไม่ใช่ข้อผิดพลาดของแอปและไม่ได้ถือเป็นผลผ่าน
- เรียกซ้ำด้วย JavaScript browser syntax ปกติพบปุ่มจริง (`found: true`) และปุ่มยังไม่ disabled หลัง click (`disabledAfterClick: false`); ต้องตรวจ async mutation response ต่อ

## Permission boundary result

- Browser เรียก `ส่งเข้า Builder / Registry` จาก Creator Studio ได้จริง แต่ development session ไม่มี admin authentication จึงแสดงสถานะ `ส่งให้ Builder ไม่สำเร็จ: You do not have required permission (10002)`
- ผลนี้ยืนยันว่า creator write ไม่เปิดให้ unauthenticated player/browser และ UI แสดง error ที่อ่านได้แทนการทำเหมือน build สำเร็จ
- Server contract test ยืนยัน admin path แยกต่างหาก ส่วน browser รอบนี้ยังไม่อ้าง admin build success เพราะไม่มี credential/session สำหรับ role นั้น
