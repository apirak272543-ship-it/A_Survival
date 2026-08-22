# Gemini Loading Variants Plan — Adopted Scope

LoadingGate ถูกแยกเป็น Lobby relay, Home safe zone, Map Observatory และ biome expedition โดยใช้ key art ที่มีอยู่แล้วเท่านั้น. แต่ละรูปแบบมี accent, telemetry, texture, microcopy และ cached/offline label ของตนเอง พร้อม `data-destination-type`, `data-loading-state`, `data-connection-mode` และ `data-reduced-motion` สำหรับการทดสอบ/ปรับแต่ง.

| ข้อเสนอ Gemini | การนำไปใช้ |
|---|---|
| Lobby holographic relay | cyan grid, relay-link telemetry และ base-camp key art ที่ blur |
| Home warm safe zone | gold shield metric, grounded layout และ base-camp art ที่ warm-tint |
| Maps tactical scan | violet coordinate texture, sector scan และ offline state ชัดเจน |
| Biome full art | key art ของแผนที่ปลายทาง, threat metric และ gradient overlay |
| Reduced motion | หยุด orbit/stars animation เมื่อเปิด setting reduced motion |
| ARIA progressbar | progressbar มี min/max/current value และ label ภาษาไทย |

คำแนะนำ Web Worker, haptic และ art mipmap pre-pooling ถูกบันทึกเป็นงาน optimization อนาคต เพราะยังเกินขอบเขต React/Babylon prototype ปัจจุบัน.
