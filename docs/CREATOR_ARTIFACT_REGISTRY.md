# Creator Artifact Registry

## ขอบเขต

`creatorArtifacts` เป็นทะเบียนสำหรับผลลัพธ์ที่ผ่าน A_Survival Builder จากพื้นที่ผู้พัฒนาเท่านั้น ไม่ใช่ทะเบียนไอเทมของผู้เล่นและไม่ใช่ runtime content loader ของแผนที่ Obsidian ระบบยังคงแยกเส้นทาง `creator` ออกจาก `game` และทุก route ใช้ `adminProcedure` จนกว่าจะมี role ผู้สร้างเฉพาะใน user model

> หลักการของหน่วยนี้คือ **Generate Once → Store → Cache → Reuse**: Builder สร้าง PNG และ manifest ครั้งเดียว, object storage เก็บ bytes, ส่วน DB เก็บ metadata ที่ตรวจ hash/provenance ได้ และ runtime จะไม่สร้างหรือ import asset โดยอัตโนมัติ

## สิ่งที่บันทึก

ตาราง `creatorArtifacts` เก็บ `artifactKey`, pack identity/version/hash, manifest, asset storage references, provenance และผู้ดูแลที่สร้างรายการ ตารางไม่ได้เก็บ `pngBase64`; bytes ต้องอยู่ใน object storage ผ่าน `storagePut` และ metadata จะเก็บ `storageKey`/URL ต่อ asset หลัง upload

`artifactKey` เป็น deterministic key รูปแบบ `texture-pack:{packId}:{packVersion}:{packSha256}` ดังนั้นการ register ผลลัพธ์เดิมซ้ำจะคืนรายการเดิมแทนการสร้าง record ซ้ำ การหา record เดิมทำก่อน upload เพื่อให้การ reuse ไม่เรียก storage ซ้ำ

## API ที่เพิ่ม

| Route | สิทธิ์ | หน้าที่ | ผลลัพธ์/ข้อจำกัด |
|---|---|---|---|
| `creator.texture.register` | admin เท่านั้น | build + validate + upload + register | คืน artifact metadata ที่ไม่มี PNG base64 |
| `creator.texture.list` | admin เท่านั้น | อ่านทะเบียนล่าสุด | จำกัด 1–100 รายการ และต้องมี DB |

`creator.texture.build`, `generate` และ `preview` ยังคงทำงานแบบ in-memory สำหรับตรวจผลลัพธ์และ preview โดยไม่เขียนเข้า player state

## Files และหลักฐาน

| ส่วน | เจ้าของ |
|---|---|
| Schema/migration | `drizzle/schema.ts`, `drizzle/0003_sparkling_spencer_smythe.sql` |
| Registry service | `server/creatorArtifactRegistry.ts` |
| Protected router | `server/creatorRouter.ts` |
| Metadata tests | `server/creatorArtifactRegistry.test.ts` |
| Authorization regression | `server/creatorRouter.test.ts` |

## ข้อจำกัดที่ยังไม่อ้างว่าเสร็จ

การ register แบบ end-to-end ต้องมี `DATABASE_URL`, Forge object-storage configuration และ admin session ที่ใช้งานได้จริงใน environment นั้น ๆ การทดสอบใน local checkpoint นี้ยืนยัน deterministic metadata, no-base64 persistence shape, typecheck, full test suite และ production build แต่ยังไม่ได้อ้างว่าการ upload หรือ DB migration ถูก apply กับ production database แล้ว

ทะเบียนนี้ยังไม่มี delete/rollback/publish-to-runtime workflow และยังไม่มี UI history ที่อ่านรายการจาก `creator.texture.list`; Creator Studio ปัจจุบันยังส่งงานเข้า Builder/validation เป็นหลัก การนำ asset เข้า playable runtime ต้องมีขั้น publish ที่ตรวจ manifest, compatibility และ map scope แยกต่างหากใน checkpoint ต่อไป
