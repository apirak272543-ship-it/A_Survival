# Story offline map-state browser evidence — 2026-08-27

## Scope

หลักฐานนี้ตรวจเฉพาะ boundary ของ player landing และ unauthenticated Creator Workbench หลังเพิ่ม `storyOfflineMapStatePreview`. ไม่ใช่หลักฐาน authenticated admin E2E, live database/storage, IndexedDB write, Cache Storage write, runtime map import หรือ device acceptance.

## Player landing

URL: `http://localhost:3000/`

ผลที่เห็นจากหน้าเว็บจริง: แสดงเฉพาะแบรนด์ ARCANE FRONTIER, คู่มือ, เครดิต, ตั้งค่า, ปุ่มเข้าสู่พื้นที่รอยต่อ และเนื้อหาเกมสำหรับผู้เล่น. ไม่พบข้อความ `Creator`, `dependency graph`, `offline map-state`, `map cache`, หรือปุ่มเครื่องมือผู้พัฒนาในหน้า landing.

## Unauthenticated Creator Workbench

URL: `http://localhost:3000/creator-workbench`

ผลที่เห็นจากหน้าเว็บจริง: แสดง `DEVELOPER ONLY`, หัวข้อ `เข้า Creator Studio ไม่ได้`, ข้อความให้เข้าสู่ระบบผู้ดูแลระบบก่อนใช้งานพื้นที่สร้าง asset และลิงก์กลับหน้าผู้เล่น. ไม่แสดง source selector, offline-state preview, map/cache controls หรือข้อมูล generator ให้ผู้ใช้ที่ยังไม่ยืนยันตัวตน.

## Runtime cleanup

การทดสอบใช้ local development server ชั่วคราวที่ port 3000. ต้องตรวจ process table และส่ง `SIGTERM` เฉพาะ PID ที่ยืนยันว่าเป็น process ของ server หลังจบ smoke test. Known local warnings เรื่อง OAuth/analytics ที่ยังไม่ได้ตั้งค่าไม่ใช่ผลยืนยัน OAuth หรือ analytics production.
