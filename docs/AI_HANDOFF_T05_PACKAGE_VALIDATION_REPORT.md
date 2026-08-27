# AI-6 Handoff — T-05 Creator Package Metadata Validation

## ขอบเขต checkpoint

Checkpoint นี้เป็น bounded sub-checkpoint ของ `T-05` สำหรับตรวจ metadata ของ creator-domain artifact ก่อนเข้าสู่ review workflow โดยไม่เพิ่ม editor UI หรือทำ registration/export ไปยัง production การตรวจใช้ owner ที่มีอยู่จริงใน repository คือ `CreatorDomainArtifactMetadata` และ canonical artifact-key builder แล้วคืนผลแบบ pure/read-only

> **ขอบเขตความปลอดภัย:** ผล `reviewable` หมายถึง metadata ผ่าน validation สำหรับการ review เท่านั้น ไม่ได้หมายถึง approved, publish-ready, runtime-importable หรือพร้อมแจกจ่ายให้ player

## ไฟล์ที่เปลี่ยน

| ไฟล์ | หน้าที่ | สถานะ |
|---|---|---|
| `server/creatorPackageValidationContract.ts` | ตรวจ target map, canonical artifact key, SHA-256, identity, provenance, fixed runtime policy, binary payload และ metadata bounds | เพิ่มใหม่ |
| `server/creatorPackageValidationContract.test.ts` | ทดสอบ valid review candidate, future-map denial, identity/hash/provenance/runtime blockers, binary/bounds blockers และ deterministic reason ordering | เพิ่มใหม่ |
| `docs/AI_CLAIM_T05_PACKAGE_VALIDATION.md` | บันทึก claim, branch, base SHA, exact reservation และ dependency limitation | เพิ่มใหม่ |
| `docs/AI_HANDOFF_T05_PACKAGE_VALIDATION_REPORT.md` | รายงานผล checkpoint, test evidence และ non-claims | เพิ่มใหม่ |

## สิ่งที่ตรวจและผลลัพธ์

| Owner | สิ่งที่ตรวจ | ผล | Blocker/ข้อจำกัด |
|---|---|---|---|
| Creator artifact identity | `domain`, `artifactId`, `artifactVersion`, `generatorId`, `generatorVersion`, `artifactKey`, `contentSha256` | ตรวจว่า key สร้างตรงจาก identity และ hash เป็น lowercase SHA-256 | metadata ที่แก้ key/hash หรือ identity ว่างจะถูก block |
| Provenance | schema version, generator identity, sources และ provenance refs | ต้องมีข้อมูลครบและ generator ต้องตรงกับ artifact | ไม่มี provenance ที่ตรวจได้จะถูก block |
| Runtime policy | `runtimeImportAllowed`, `playerVisible`, `cacheable` | contract บังคับเป็น `false` ทั้งหมด | ยังไม่มี publish/import runtime workflow |
| Target map | target map ต้องเป็น `obsidian-frontier` | future map เช่น `map-002` ถูก block | ไม่เปิด future map หรือ cache/offline write |
| Metadata payload | recursive binary-key detection และ node/depth bound ที่ 512 | `base64`, `pngBase64`, `bytes`, `dataUri` และ payload ใหญ่เกิน bound ถูก block | เป็น metadata inspection เท่านั้น ไม่ตรวจ binary bytes |

## Test evidence

รัน focused command ต่อไปนี้ผ่านแล้ว:

```text
pnpm test -- --run server/creatorPackageValidationContract.test.ts
```

ผลจริงจาก Vitest รอบสุดท้ายคือ `121` test files ผ่าน และ `505` tests ผ่าน รวม test ใหม่ `5` กรณี การรัน test script ของ repository จึงครอบคลุม full suite ด้วย ไม่พบ failed test ในรอบสุดท้าย

ก่อน test รอบสุดท้ายเคยพบ assertion ของ test ที่คาดหวัง `IDENTITY_MISMATCH` จาก generator mismatch ทั้งที่ field ไม่ว่าง จากนั้นแก้ test ให้ทำให้ `artifactId` ว่างจริงและรันซ้ำจนผ่าน ไม่ได้ลด validation rule เพื่อปิด failure

## ข้อจำกัดและ non-claims

Checkpoint นี้ไม่แก้ `CreatorStudio`, `CreatorDomainWorkbench`, `creatorRouter`, database schema, migration, object storage หรือ review persistence และไม่เรียก database/network/cache/IndexedDB ไม่มี runtime import, asset generation, binary asset, publish workflow หรือ player-visible effect

`T-04` และ `G-05` ใน backlog ยังมี acceptance gap ระดับระบบ งานนี้จึงไม่อ้างว่าปิด T-05 ทั้งหมด ไม่อ้างว่ามี drag/drop editor, pixel/mobile editor, production registration/export, reviewer approval หรือ authenticated creator E2E

Implementation branch ยังไม่ merge เข้า `main`; AI-0 ต้องตรวจ diff, rerun evidence, merge และปรับ registry/matrix แยกตาม workflow

## สถานะส่งมอบ

- Owner: `AI-6`
- Task ID: `T-05` bounded metadata-validation sub-checkpoint
- Branch: `ai-6/t05-package-validation`
- Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`
- Implementation commit SHA: จะเติมหลัง commit checkpoint
- Status requested: `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ diff และหลักฐานซ้ำ
