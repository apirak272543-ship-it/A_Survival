# Runtime Profiler Preview

`runtimePerformanceProfiler.ts` เป็น analyzer แบบ pure สำหรับพื้นที่ผู้พัฒนา ไม่ใช่ runtime controller. มันรับ telemetry snapshot หนึ่ง window ที่ QA เก็บจาก Obsidian runtime แล้วคำนวณ observed FPS, target frame budget, active-mesh ratio, สถานะ `no-sample/watch/action` และคำแนะนำที่ตรวจสอบย้อนกลับได้

## ขอบเขตการใช้งาน

Profiler ถูกเปิดผ่าน `creator.profiler.preview` ซึ่งใช้ `adminProcedure` เช่นเดียวกับ creator generator routes ที่มีอยู่ใน repository. `CreatorDomainWorkbench` แสดง panel ภาษาไทยเฉพาะเมื่อผ่าน creator route/auth gate; player landing/game ไม่มี profiler panel และไม่เรียก mutation นี้เอง

Input ถูกจำกัดด้วย schema: tier ต้องเป็น `low`, `balanced` หรือ `high`; FPS, ระยะมองเห็น, window, frame counts และ mesh counts อยู่ใน bounds ที่กำหนด; frame metrics รับ `null` ได้เมื่อไม่มี sample. Analyzer normalize ค่าผิดรูปแบบโดยไม่สร้าง sample หรือ FPS ปลอม และไม่ mutate input

| ผลลัพธ์ | ความหมาย |
|---|---|
| `no-sample` | ยังไม่มี rendered frame ที่ใช้สรุป cadence ได้ |
| `watch` | มี sample แต่ควรตรวจ workload หรือมีสัญญาณเกิน budget ระดับเฝ้าระวัง |
| `action` | cadence/mesh ratio สูงพอให้ตรวจ optimization ต่อ ไม่ใช่คำสั่งเปลี่ยน tier อัตโนมัติ |

คำแนะนำของ profiler เป็นคำแนะนำเชิง policy เท่านั้น เช่น ตรวจ frame cadence, spatial visibility หรือ throttled callbacks. ไม่มีคำแนะนำที่เขียน save, เปลี่ยน performance tier ของผู้เล่น, publish asset, เปิด future map หรือส่งข้อมูลไป network

## หลักฐานและข้อจำกัด

Focused profiler tests ครอบคลุม no-sample, observed cadence, p95 frame threshold, active mesh ratio, throttled callbacks, finite normalization และ immutable claims. Browser proof วันที่ 27 สิงหาคม 2026 ยืนยันว่า player route ไม่มี profiler text/panel และ unauthenticated `/creator-workbench` ถูก gate ก่อนถึง form. Full validation ของ checkpoint นี้ต้องอ่านคู่กับผล `pnpm check`, full Vitest suite และ production build ที่บันทึกใน checkpoint matrix

> **ไม่ใช่ device benchmark:** ผลลัพธ์นี้ไม่มี CPU/GPU counter, draw-call timing, memory, battery, thermal, WebView หรือ real-device acceptance และไม่ควรใช้แทนการทดสอบบนอุปกรณ์เป้าหมาย

> **ไม่ใช่ adaptive controller:** tier และ effective target FPS มาจาก snapshot ที่ป้อนเข้ามา; profiler ไม่เปลี่ยน tier ไม่แก้ scene และไม่บันทึก snapshot ถาวร

## Provenance และ runtime boundary

Profiler วิเคราะห์ข้อมูลที่เกิดจาก runtime sampler ซึ่งเก็บใน memory ต่อ window. Creator preview อาจรับ snapshot ที่ QA ป้อนเพื่อวิเคราะห์ แต่ไม่มี generator call ใน render loop และไม่มีการสร้าง texture/model/animation จาก profiler. Obsidian ยังคงเป็น playable runtime เดียวรัศมี 500m; future map records ไม่ถูกเปิด, cache หรือเลือกผ่านเครื่องมือนี้
