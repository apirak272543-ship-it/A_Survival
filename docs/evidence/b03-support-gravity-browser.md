# B-03 support/gravity browser smoke

วันที่ตรวจ: 2026-08-27

Browser sandbox เปิด player landing และเข้าสู่ local-first lobby ด้วย Player ID ชั่วคราว `B03SupportProof`. หน้า lobby แสดงเฉพาะ player controls เช่น บ้าน คลัง คู่มือ แต่งสไตล์ ร้านค้า และปุ่มออกสำรวจ; ไม่มี creator workbench/developer control ในเส้นทางนี้. การตรวจยังไม่อ้าง authenticated E2E หรือ device acceptance.

ขั้นตอนถัดไปคือเปิด map selector และเลือกเฉพาะ Obsidian Frontier เพื่อยืนยัน placement boundary ใน runtime ที่เล่นได้จริง.


Map selector แสดงเฉพาะ `Obsidian Frontier` พร้อมข้อความ `เล่นได้ตอนนี้` และระบุว่าแผนที่อื่นยังเป็นข้อมูลแผนงานหลังบ้าน ไม่เปิดให้เลือกหรือเตรียม cache ใน runtime. หลังเข้า map จาก cache/local slice หน้า game แสดง canvas, quick slots ที่มี Obsidian block item และ pickaxe, ปุ่มใช้ไอเท็ม, action controls และ footer ของผู้เล่น. หลักฐานนี้ยืนยันเฉพาะ route/player boundary และมี control surface สำหรับ placement; ไม่ได้อ้างว่าการทดสอบครั้งนี้ทำให้เกิด gravity solver, block placement event หรือ persistence ใหม่.

ภาพล่าสุด: `/home/ubuntu/screenshots/localhost_2026-08-27_16-01-57_1087.webp`.

Implementation checkpoint: `74affa7` (`test: cover block support gravity boundaries`).
