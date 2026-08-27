# AI-6 Handoff — G-04 Content Generation Suite Contract

## ขอบเขต checkpoint

Checkpoint นี้เป็น bounded sub-checkpoint ของ `G-04` สำหรับตรวจ declaration ของ Content Generation Suite ในรูปแบบ pure/read-only metadata contract โดยกำหนด capability ที่ suite ต้องประกาศให้ครบ ได้แก่ `definition`, `model`, `texture`, `skin`, `variant` และ `gameplay` พร้อมตรวจ plugin identity, semantic version, provenance และ runtime-denial policy

> **ความหมายของผลตรวจ:** `valid: true` หมายถึง declaration ผ่าน contract สำหรับ review เท่านั้น ไม่ได้หมายถึง generator ถูกนำไปใช้งานจริง, asset ถูกสร้างแล้ว, หรือ suite พร้อม publish/import เข้า player runtime

## ไฟล์ที่เปลี่ยน

| ไฟล์ | หน้าที่ | สถานะ |
|---|---|---|
| `server/generators/contentGenerationSuiteContract.ts` | ตรวจ suite id/version, plugin bounds, unique plugin IDs, capability coverage, provenance, runtime policy และ deterministic declaration hash | เพิ่มใหม่ |
| `server/contentGenerationSuiteContract.test.ts` | ทดสอบ suite ครบ capability, partial coverage blocker, malformed/duplicate/unknown/plugin policy blocker, determinism และ bounded plugin list | เพิ่มใหม่ |
| `docs/AI_CLAIM_G04_SUITE_CONTRACT.md` | บันทึก claim, branch, base SHA, exact reservation และ dependency limitation | เพิ่มใหม่ |
| `docs/AI_HANDOFF_G04_SUITE_CONTRACT_REPORT.md` | รายงานผล checkpoint และ non-claims | เพิ่มใหม่ |

## สิ่งที่ตรวจและผลลัพธ์

| Owner | สิ่งที่ตรวจ | ผล | Blocker/ข้อจำกัด |
|---|---|---|---|
| Suite declaration | `suiteId`, `suiteVersion`, rules version | บังคับ lowercase identifier และ semver | declaration ที่ malformed ถูก block |
| Plugin registry declaration | plugin id/version/kind และ duplicate IDs | ตรวจ identifier, semver และ duplicate | ไม่ได้แก้ `CommonGeneratorRegistry` หรือสร้าง runtime registration |
| Domain capabilities | definition/model/texture/skin/variant/gameplay | partial suite ไม่ผ่าน และ missing capability ถูกระบุรายตัว | ยังไม่มี claim ว่า plugin implementation ครบทั้ง domain |
| Provenance | source ต้องเป็น `backend-generator` และมี provenance ref | plugin ที่ external/reference-only หรือไม่มี ref ถูก block | ไม่เติม source/reference เพื่อทำให้ผ่าน |
| Runtime boundary | import/player visibility/cache | contract บังคับ false ทั้งหมด | ไม่เปิด player generator UI และไม่ publish/import |
| Determinism/bounds | declaration hash, max 64 plugins, max 8 capabilities/plugin | input ซ้ำได้ hash เดิมและรายการเกิน bound ถูก block | เป็น contract validation ไม่ใช่ performance benchmark |

## Test evidence

รัน focused command ต่อไปนี้ผ่านแล้ว:

```text
pnpm test -- --run server/contentGenerationSuiteContract.test.ts
```

ผลจริงจาก Vitest รอบสุดท้ายคือ `121` test files ผ่าน และ `505` tests ผ่าน รวม test ใหม่ `5` กรณี การรัน test script ของ repository ครอบคลุม full suite ด้วย ไม่พบ failed test ในรอบสุดท้าย

## ข้อจำกัดและ non-claims

Checkpoint นี้ไม่แก้ `commonGeneratorApi.ts`, CreatorStudio, CreatorDomainWorkbench หรือ creatorRouter ไม่เรียก LLM/image generation ไม่สร้าง PNG/GLB/texture/skin ไม่เขียน database/object storage/cache/IndexedDB และไม่มี player-visible effect หรือ runtime render-loop call

`G-01` และ `G-05` ยังมี acceptance gap ระดับ backlog งานนี้จึงไม่อ้างว่าปิด G-04 ทั้งหมด ไม่อ้างว่ามี plugin implementation ที่ครบทุก capability, durable orchestrator, asset export, publish approval, runtime import หรือ authenticated creator E2E

Implementation branch ยังไม่ merge เข้า `main`; AI-0 ต้องตรวจ diff, rerun evidence, merge และปรับ registry/matrix แยกตาม workflow

## สถานะส่งมอบ

- Owner: `AI-6`
- Task ID: `G-04` bounded Content Generation Suite contract sub-checkpoint
- Branch: `ai-6/g04-suite-contract`
- Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`
- Implementation commit SHA: จะเติมหลัง commit checkpoint
- Status requested: `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ diff และหลักฐานซ้ำ
