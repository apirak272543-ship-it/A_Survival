# S-03 target FPS disclosure browser evidence

วันที่ตรวจ: 2026-08-27 (sandbox browser)

เปิด `http://localhost:3000/` ใน player route และกด `เข้าสู่พื้นที่รอยต่อ`. ระบบพาไปหน้าตั้งชื่อผู้เล่นแบบ local-first ซึ่งเป็นเส้นทาง player ปกติ ไม่ใช่ creator route. ใช้ Player ID ชั่วคราวสำหรับการตรวจต่อ; หลักฐานนี้ไม่ใช่ authenticated E2E, real-device/mobile acceptance หรือ FPS benchmark.

จะบันทึกผลเมื่อเปิด in-map settings และเห็นข้อความ high-refresh advisory.

Implementation ที่ทดสอบ: `7dd5c46` (`feat: clarify high refresh fps target`).

เข้าสู่ lobby ด้วย Player ID ชั่วคราว `FPSProof`; lobby แสดงเส้นทาง player ปกติและปุ่ม `ออกสำรวจ เลือกแผนที่`. จะเปิดแผนที่ต่อเพื่อเข้าถึง in-map settings. การเข้าสู่นี้ไม่ใช่ authenticated E2E หรือ device acceptance.

เลือก `Obsidian Frontier` จาก map selector และเข้าเล่นจาก cache. Player HUD แสดงเฉพาะ Obsidian slice, มีปุ่ม `เปิด In-map Settings` และแสดงค่า view distance 20 บล็อก; ไม่มี future-map control ในเส้นทางนี้. หลักฐานนี้ยังเป็น sandbox browser evidence ไม่ใช่ real-device benchmark หรือ authenticated acceptance.

เปิด `In-map Settings` ใน Obsidian Frontier และเลือกค่า `120 FPS`. Browser แสดง option `120 FPS · high-refresh advisory · ไม่รับประกัน` และ note ว่า FPS เป็นค่าเป้าหมาย ไม่ใช่ผลทดสอบประสิทธิภาพของเครื่อง; อุปกรณ์จริงอาจทำได้ต่ำกว่านี้. นี่เป็นหลักฐานข้อความ UI ใน browser sandbox เท่านั้น ไม่ใช่การวัด FPS, device acceptance, WebView acceptance หรือ production deployment.

Screenshot จากการตรวจ: `/home/ubuntu/screenshots/localhost_2026-08-27_15-20-13_6958.webp`.
