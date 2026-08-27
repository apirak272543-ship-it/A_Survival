# C-02 Item detail UI boundary browser evidence

วันที่ตรวจ: 2026-08-27 (sandbox browser)

เปิด `http://localhost:3000/` ใน player route, ใช้ Player ID ชั่วคราว `DetailProof` และยืนยันเข้า lobby local-first. Lobby แสดงปุ่ม `คลัง` และ item `Aether Blade 001`; การตรวจนี้เป็น browser sandbox evidence เท่านั้น ไม่ใช่ authenticated E2E, real-device/mobile acceptance หรือ production evidence.

การทดสอบ long-press และ detail facts จะบันทึกต่อหลังเปิดคลัง.

Implementation ที่ทดสอบ: `bb51a55` (`feat: show category item detail facts`).

## Long-press result

เปิด `คลัง` แล้วจำลองการกดค้างบน `Aether Blade 001` เป็นเวลา 3.6 วินาทีผ่าน browser sandbox. `ItemDetailSheet` เปิดและแสดง `Item detail · long press 3.5s`, หมวด `sword`, ระดับ, enhancement, item ID, provenance, `การใช้งาน`, `จำนวนซ้อนสูงสุด` และ `พลังโจมตี: ยังไม่มีข้อมูล`.

หน้าจอแสดงข้อจำกัดตรงตาม owner ที่มีจริง: `ItemDefinition ปัจจุบันยังไม่มี field เจ้าของค่าความเสียหาย จึงไม่คำนวณหรือสร้างตัวเลขแทน`. จึงไม่มีการ fabricate attack damage. หลักฐานนี้ยืนยัน long-press UI boundary และการแสดง unavailable fact ใน browser sandbox เท่านั้น.

Screenshot จากการตรวจ: `/home/ubuntu/screenshots/localhost_2026-08-27_15-11-36_9037.webp`.
