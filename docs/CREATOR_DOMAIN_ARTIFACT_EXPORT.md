# Approved Creator Domain Artifact Export Preview

`creator.artifact.export` เป็นขั้น **export metadata preview** สำหรับ generic creator artifact ที่ผ่าน review เป็น `approved` เท่านั้น. มันอ่าน record จาก `creatorDomainArtifacts` แล้วส่งผ่าน `buildCreatorDomainArtifactExport` ก่อนคืน bundle ที่มี manifest, summary, provenance, review evidence และ runtime policy

| Guard | ผลที่บังคับใช้ |
|---|---|
| Review status | `draft` และ `rejected` export ไม่ได้; approved ต้องมี reviewer id และ reviewed timestamp |
| Runtime policy | output ยังคง `runtimeImportAllowed: false`, `playerVisible: false`, `cacheable: false` |
| Binary payload | export นี้คืน `assets: []`; ไม่สร้าง PNG/model/animation bytes และไม่อัปโหลด object storage |
| Publish state | output ระบุ `publishReady: false`; การ export ไม่ปลดล็อก map หรือ asset เข้า player |
| Authorization | route ใช้ `adminProcedure`; player route ไม่รู้จัก export action |

Workbench แสดงปุ่ม `ส่งออก metadata preview` เฉพาะเมื่อ artifact ที่กำลัง review อยู่มีสถานะ approved. ผลลัพธ์แสดง schema version, `publish-ready: ไม่ใช่`, จำนวน assets เป็นศูนย์ และ runtime import ปิด. การทำงานนี้เป็น developer-only tool สำหรับตรวจ/ส่งต่อ metadata ไปยังขั้นอนุมัติหรือ integration ภายหลัง ไม่ใช่ production publish workflow

> **ข้อจำกัดที่ต้องไม่อ้างเกินจริง:** checkpoint นี้ไม่มี admin-authenticated DB export E2E, ไม่มีการสร้างไฟล์ดาวน์โหลด, ไม่มี object-storage upload, ไม่มี compatibility validator ของ asset bytes และไม่มี runtime import/publish. Migration `0004`, `0005` และ `0006` ยังต้อง apply ใน environment ที่มี DATABASE_URL และสิทธิ์ที่ได้รับอนุมัติ

Browser evidence วันที่ 27 สิงหาคม 2026 ยืนยันว่า player `/` ไม่มี registry/review/export/profiler text หรือ controls และ unauthenticated `/creator-workbench` ถูก gate ก่อนถึง registry form/review/export action. Automated tests ยืนยัน approved-only guard, reviewer-field guard, runtime-policy guard และ non-admin route blocking
