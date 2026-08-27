# Story map cache policy browser evidence — 2026-08-27

## Scope

ตรวจเฉพาะ browser boundary ของ map-policy checkpoint บน local development server ที่ `http://localhost:3000`. หลักฐานนี้ไม่อ้าง authenticated admin E2E, live database/storage, runtime publishing/import/cache, asset generation หรือ device acceptance.

## Player landing

URL: `http://localhost:3000/`

ผลที่ตรวจพบ: หน้า landing แสดง Arcane Frontier สำหรับผู้เล่น โดยมี navigation คู่มือ เครดิต ตั้งค่า และปุ่มเข้าสู่พื้นที่รอยต่อ ไม่พบ Creator Studio, dependency graph, story map cache policy หรือ admin control ใน player landing.

Screenshot: `/home/ubuntu/screenshots/localhost_2026-08-27_09-52-15_7267.webp`

## Unauthenticated Workbench boundary

URL: `http://localhost:3000/creator-workbench`

ผลที่ตรวจพบ: แสดงข้อความ `DEVELOPER ONLY`, `เข้า Creator Studio ไม่ได้` และ `กรุณาเข้าสู่ระบบผู้ดูแลระบบก่อนใช้งานพื้นที่สร้าง asset` พร้อมลิงก์กลับหน้าผู้เล่น. ไม่ได้ตรวจหรืออ้างว่าการ login ด้วย OAuth หรือ authenticated admin Workbench ใช้งานได้ใน local environment.

Screenshot: `/home/ubuntu/screenshots/localhost_2026-08-27_09-52-24_2778.webp`

## Runtime server notes

เซิร์ฟเวอร์ local เริ่มได้ที่ port 3000 แต่ log ระบุว่า `OAUTH_SERVER_URL` ไม่ได้ตั้งค่า และมี analytics placeholder warnings/malformed placeholder request ตาม known repository limitation. ข้อความเหล่านี้ไม่ถูกใช้เป็นหลักฐานว่า OAuth หรือ analytics production พร้อมใช้งาน.
