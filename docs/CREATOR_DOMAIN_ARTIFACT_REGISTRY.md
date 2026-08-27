# Creator Domain Artifact Registry

เอกสารนี้บันทึกการขยายทะเบียนจาก `creatorArtifacts` texture-only ไปยัง `creatorDomainArtifacts` สำหรับ metadata ของ preview จาก domain อื่นของ A_Survival. ตารางใหม่เป็น additive และไม่เปลี่ยน enum/records ของ texture registry เดิม

## Contract

`creatorDomainArtifacts` เก็บ artifact identity, domain, generator identity/version, content hash, manifest, summary, provenance และ runtime policy. ไม่มี `pngBase64`, byte payload หรือ object-storage upload ในหน่วยนี้ เพราะ domain preview จำนวนมากเป็นข้อมูล/blueprint/profile ที่ยังไม่ควร publish เข้า playable runtime

| Field | Policy |
|---|---|
| `artifactKey` | deterministic `${domain}:${artifactId}:${artifactVersion}:${contentSha256}` และ unique เพื่อให้ registration ซ้ำของ metadata เดิม idempotent |
| `contentSha256` | SHA-256 ของ canonicalized metadata รวม manifest, summary, provenance และ runtime policy |
| `manifest`/`summary` | JSON metadata ที่ถูก sort key และมี bounds; binary-like keys `base64`, `pngBase64`, `bytes`, `dataUri` ถูก reject |
| `provenance` | schema version, generator id/version, unique sorted sources และ provenance refs |
| `runtimePolicy` | บังคับ `runtimeImportAllowed: false`, `playerVisible: false`, `cacheable: false` |

`creator.artifact.preview`, `creator.artifact.register` และ `creator.artifact.list` ใช้ `adminProcedure`. Preview เป็น in-memory result; register เก็บ metadata ลง DB อย่างเดียวและคืน `previewOnly: true` กับ `runtimeImportAllowed: false`. List จำกัด 1–100 records และกรอง domain ได้

## UI boundary

`CreatorDomainWorkbench` เพิ่มการ์ดภาษาไทย `ทะเบียน artifact` พร้อมฟอร์ม structured fields สำหรับ domain, artifact id/version, generator, source และ provenance ref. ผู้พัฒนาไม่ต้องเขียน JSON หรือวาด bytes ใน flow นี้. ระบบประกอบ manifest/summary ขั้นต้น, ให้ preview ตรวจ hash ก่อน และจึงมีปุ่มบันทึก metadata เมื่อ DB พร้อม

Workbench ยังอยู่หลัง `/creator-workbench` และ `CreatorAccessGate`. Player landing/game ไม่มี route, query, text หรือ control ของ registry. งานนี้ไม่ publish artifact เข้า runtime และไม่แก้ player save/cache/map selection

## Migration and rollout

Schema owner คือ `drizzle/schema.ts`; additive migration คือ `drizzle/0004_nostalgic_domain_artifacts.sql`. ยังไม่ได้รัน `db:push` หรือ apply migration กับฐานข้อมูลจริงใน checkpoint นี้ เพราะ environment ไม่มีหลักฐาน DATABASE_URL/production admin DB rollout ที่พร้อมใช้งาน. การทดสอบปัจจุบันยืนยัน schema compile, metadata/hash contract และ admin/non-admin route behavior; DB insert/list E2E ต้องทำใน environment ที่มี database และสิทธิ์ที่อนุมัติ

> **ห้ามตีความ registry เป็น runtime loader:** การมี record ในทะเบียนไม่ได้ปลดล็อก asset, map, texture, model, animation หรือ profiler เข้าเกม. การ publish ต้องมีขั้นอนุมัติ/compatibility/provenance/runtime-scope แยกต่างหาก
