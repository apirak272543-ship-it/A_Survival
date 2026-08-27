# Thai Creator Composition Tool

`creator.composition.preview` เป็น developer-only no-code tool สำหรับประกอบ pixel/template metadata จากช่องที่คนใช้งานเข้าใจได้. ผู้สร้างเลือกประเภทสิ่งที่จะประกอบ, รหัส template, ขนาด canvas, สีพื้น/เส้นขอบ และสัดส่วนของส่วนหลัก. ระบบจะประกอบ layer `base`/`outline`, part `body` และ palette ที่มี semantic ให้เป็น composition manifest โดยไม่ให้ผู้ใช้เขียน JSON หรือกำหนด triangle mesh

| ส่วน | สิ่งที่ระบบตรวจ |
|---|---|
| Template | รหัสปลอดภัยและ versioned composition schema |
| Canvas | กว้าง/สูง 1–128 pixels และคำนวณ pixel budget |
| Layers | id ไม่ซ้ำ, role, z-index, visible และ opacity 0–1 |
| Parts | slot, ขนาด/พิกัดต้องอยู่ใน canvas และอ้างอิง layer ที่มีอยู่ |
| Palette | id ไม่ซ้ำ, hex สีถูกต้อง และ semantic ของสี |
| Safety | reject binary/geometry keys เช่น base64, bytes, mesh, vertices, indices, glb, obj |
| Registry | สร้าง metadata hash/provenance ด้วย `creator.composition@1.0.0` และ runtime policy ปิด |

ผลลัพธ์มี `previewOnly: true`, `meshRequired: false`, `runtimeImportAllowed: false`, `playerVisible: false` และ `cacheable: false`. `registryMetadata` ต่อเข้ากับ generic creator artifact registry ได้ภายหลัง แต่ checkpoint นี้ยังไม่ register, export bytes, upload storage หรือ publish เข้าเกมโดยอัตโนมัติ

Workbench ใช้ route `/creator-workbench` หลัง `CreatorAccessGate` และการ preview ใช้ `adminProcedure`. Player landing/game ไม่มี composition domain, form หรือผลลัพธ์ของ creator tool. Composition สำหรับสกิน/แอนิเมชันใน checkpoint นี้หมายถึง manifest ของส่วนประกอบและสัดส่วน ไม่ใช่ skeleton, clip หรือ model asset ที่เสร็จสมบูรณ์

> **ข้อจำกัด:** ยังไม่มี pixel canvas แบบวาดทุกเซลล์, texture atlas export, skeleton/rig, actual model assembly, object-storage upload, DB register E2E หรือ runtime import. สิ่งเหล่านี้ต้องแยก checkpoint พร้อม asset provenance และ visual evidence ต่อไป
