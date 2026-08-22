# Companion Prototype Milestone

Arcane Cyber Fox (NOVA-7) ทำงานเป็น companion ใน Babylon scene แล้ว โดยอ่าน follow flag และ equipment instances จาก `LocalGameSession.home`

| ส่วน | สถานะต้นแบบ |
|---|---|
| Visual | ใช้ asset Arcane Cyber Fox และ HUD icon ที่ Gemini brief → Pollinations → managed storage |
| Follow | มี `resting`, `idle`, `following`, `teleporting`; smoothing แบบ frame-rate-independent และ teleport catch-up เมื่อห่างเกิน 15 world units |
| Equipment | Collar + Core ยังย้ายเป็น item instance แบบ atomic; instance เดียวไม่ซ้ำหลาย slot |
| Gameplay bonus | loot radius capped ที่ 6, yield multiplier capped ที่ 2.5 และ mitigation capped ที่ 35%; prototype equipment ปัจจุบันให้ 4m, +10%, 5% |
| Offline safety | follow/equip/unequip เป็น intent ใน pending action; ไม่คิว generate loot, XP หรือ upgrade |

> งานคงเหลือ: interaction เชิงรุกของ companion, drop/reward multiplier ที่ server replay ได้ครบ, alpha-safe sprite, path-avoidance raycast และ UI cap feedback. จึงยังไม่ถือเป็น companion system ระดับ production
