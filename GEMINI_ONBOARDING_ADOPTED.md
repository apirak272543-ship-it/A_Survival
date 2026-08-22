# Gemini Onboarding Plan Adopted

นำ information architecture ของ Gemini มาใช้กับหัวข้อ Player ID, Lobby, map cache, HUD, Home, companion, save/sync และ integrity. UI จะใช้ microcopy สั้น ปุ่มสัมผัสอย่างน้อย 44px, แผงข้อความคอนทราสต์สูง และ reduced-motion-friendly cues.

แนวทางที่ปรับให้ปลอดภัยคือไม่บอกว่า Player ID สามารถกู้บัญชีได้เองหรือระบบสร้าง digital signature บน client. Player ID เป็น identifier ไม่ใช่ credential; การซิงก์และ provenance ใช้ transaction/event history, item instance และ server validation. Integrity alert จะแจ้งว่ารายการถูกกักไว้เพื่อตรวจ ไม่อ้างว่ากู้คืนข้อมูลอัตโนมัติเสมอ.

คำแนะนำสร้างไอคอน integrity/cache ถูกบันทึกไว้สำหรับ asset pass ถัดไป แต่ onboarding prototype ใช้ Lucide icons ที่มีอยู่เพื่อลดการบัง HUD และไม่เพิ่มภาพใหม่เกินจำเป็น.
