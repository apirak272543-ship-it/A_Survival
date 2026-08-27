# Runtime profiler browser evidence — 2026-08-27

## Player boundary

หน้า `http://localhost:3000/` render player landing `ARCANE FRONTIER` จริง. DOM inspection ได้ `path: /`, `hasGameScreen: false`, `hasProfilerPanel: false` และ `hasCreatorText: false`; ไม่พบข้อความ `CREATOR WORKBENCH`, `Creator Studio` หรือ `ตรวจ performance runtime` บน player landing.

Profiler ถูกออกแบบเป็น developer-only creator preview และไม่ควรปรากฏใน player UI. การตรวจนี้เป็น route-boundary smoke ไม่ใช่ authorization proof แทน backend `adminProcedure`.

## Creator route gate

เปิด `http://localhost:3000/creator-workbench` โดย browser session ที่ไม่มี admin authentication แล้ว runtime แสดง `DEVELOPER ONLY` และ `เข้า Creator Studio ไม่ได้`. DOM inspection ได้ `path: /creator-workbench`, `gated: true`, `hasProfilerForm: false`, `hasWorkbenchHeading: false`, `hasPlayerLink: true`. จึงยืนยันว่า unauthenticated route ถูก gate ก่อนถึง Workbench/profiler form; การใช้งานจริงยังต้องผ่าน backend `adminProcedure` และยังไม่มีหลักฐานการเรียก profiler mutation ในรอบนี้.
