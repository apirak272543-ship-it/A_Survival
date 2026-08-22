# Companion Plan Adopted from Gemini

| ส่วน | แนวทางที่นำมาใช้ |
|---|---|
| Runtime | `resting`, `idle`, `following`, `teleporting` ใช้ frame-rate-independent smoothing และ teleport catch-up เมื่อห่างเกินเกณฑ์ |
| โบนัส | Loot radius, resource-yield multiplier และ damage mitigation มีเพดาน และคำนวณจาก `ItemInstance` ใน pet slots เท่านั้น |
| ความถูกต้อง | instance ID เดียวอยู่ได้เพียงช่องเดียว; queue บันทึกเฉพาะ follow/equip/unequip intent ไม่สร้าง loot หรือ XP |
| การเข้าถึง | reduced motion ปิด bobbing/warp flash และ HUD แสดงข้อความ/ตัวเลขที่อ่านง่าย |
| ภาพ | Gemini กำหนด Arcane Cyber Fox และ HUD icon; จะสร้างภาพจริงผ่าน Pollinations ก่อนนำมาแทน companion sphere ในฉาก |

ไม่ใช้ HMAC หรือ client secret ผูกกับ Player ID. การซิงก์จะอ้าง transaction ID, ลำดับเวลา, inventory instance ที่มีอยู่ และ validation ฝั่ง server เท่านั้น. ไม่ทำ offline catch-up loot เพราะเป็นช่องทางเพิ่มทรัพยากรที่ตรวจย้อนกลับยากใน Player ID-only prototype.
