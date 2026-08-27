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

`creator.artifact.preview`, `creator.artifact.register`, `creator.artifact.list`, `creator.artifact.review` และ `creator.artifact.audit` ใช้ `adminProcedure`. Preview เป็น in-memory result; register เก็บ metadata ลง DB อย่างเดียวและคืน `previewOnly: true` กับ `runtimeImportAllowed: false`. List และ audit history จำกัด 1–100 records และ list กรอง domain/review status ได้

## Review state machine

ทุก record ใหม่เริ่มเป็น `draft`. ผู้ดูแลสามารถ `approve` หรือ `reject` จาก draft; การ reject ต้องมี review note. Record ที่ rejected เปิดกลับเป็น draft ได้ด้วย `reopen` และต้องมี note. Record ที่ approved จะไม่ถูก reject/reopen ด้วย transition ปกติ เพื่อไม่ให้สถานะอนุมัติถูกเปลี่ยนเงียบ ๆ. DB เก็บ `reviewedByUserId`, `reviewedAt` และ `reviewNote` เพื่อให้รู้ว่าใครตรวจและตรวจเมื่อใด และเขียน immutable event ลง `creatorDomainArtifactReviewEvents` ใน transaction เดียวกับ status update

สถานะ approved เป็นเพียง metadata review state ไม่ใช่สิทธิ์ publish. `runtimePolicy` ยังคงบังคับ `runtimeImportAllowed: false`, `playerVisible: false` และ `cacheable: false` ทุกสถานะจนกว่าจะมี publish workflow แยกที่ตรวจ compatibility, manifest, provenance และ map scope

## UI boundary

`CreatorDomainWorkbench` เพิ่มการ์ดภาษาไทย `ทะเบียน artifact` พร้อมฟอร์ม structured fields สำหรับ domain, artifact id/version, generator, source และ provenance ref. ผู้พัฒนาไม่ต้องเขียน JSON หรือวาด bytes ใน flow นี้. ระบบประกอบ manifest/summary ขั้นต้น, ให้ preview ตรวจ hash ก่อน และจึงมีปุ่มบันทึก metadata เมื่อ DB พร้อม. หลัง preview/register สามารถดู history และสั่ง approve/reject/reopen ตาม state policy ได้; history เป็นข้อมูล developer-only ไม่แสดงใน player

Workbench ยังอยู่หลัง `/creator-workbench` และ `CreatorAccessGate`. Player landing/game ไม่มี route, query, text หรือ control ของ registry. งานนี้ไม่ publish artifact เข้า runtime และไม่แก้ player save/cache/map selection

## Migration and rollout

Schema owner คือ `drizzle/schema.ts`; additive migrations คือ `drizzle/0004_nostalgic_domain_artifacts.sql`, `drizzle/0005_careful_artifact_review.sql` และ `drizzle/0006_immutable_artifact_review_events.sql`. ยังไม่ได้รัน `db:push` หรือ apply migration กับฐานข้อมูลจริงใน checkpoint นี้ เพราะ environment ไม่มีหลักฐาน DATABASE_URL/production admin DB rollout ที่พร้อมใช้งาน. การทดสอบปัจจุบันยืนยัน schema compile, metadata/hash contract, review transition policy, transactional code typing และ admin/non-admin route behavior; DB insert/list/review/audit E2E ต้องทำใน environment ที่มี database และสิทธิ์ที่อนุมัติ

> **ห้ามตีความ registry เป็น runtime loader:** การมี record ในทะเบียนไม่ได้ปลดล็อก asset, map, texture, model, animation หรือ profiler เข้าเกม. การ publish ต้องมีขั้นอนุมัติ/compatibility/provenance/runtime-scope แยกต่างหาก
