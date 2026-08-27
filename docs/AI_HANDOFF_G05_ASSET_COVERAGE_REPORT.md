# AI-6 Handoff — G-05 Asset Provenance Coverage

## ขอบเขต checkpoint

Checkpoint นี้ทำงานในสาย `G-05` โดยเพิ่ม pure, deterministic และ read-only coverage contract สำหรับตรวจความสัมพันธ์ระหว่าง item/plant catalog กับ active asset-pack manifest และ provenance credits จากข้อมูล canonical ใน repository เท่านั้น การตรวจครอบคลุม asset reference ที่ใช้จริงทั้ง catalog ไม่ได้สร้างหรือแก้ binary asset ใด ๆ

> **หลักการ fail-closed:** metadata ที่มี `assetId` ไม่ถือว่าเป็น graphical asset ที่พร้อมใช้งาน จนกว่าจะมี manifest entry ที่ kind ตรง มี SHA-256 และมี credit ที่สถานะ distributable

## ไฟล์ที่เปลี่ยน

| ไฟล์ | หน้าที่ | สถานะ |
|---|---|---|
| `server/generators/assetProvenanceCoverageContract.ts` | สร้าง coverage artifact, deterministic `coverageHash`, summary, per-asset results และ required blocker issues | เพิ่มใหม่ |
| `server/assetProvenanceCoverageContract.test.ts` | ทดสอบ full-catalog audit, determinism, hash sensitivity, missing manifest/SHA, kind mismatch, non-distributable credit, active-pack/seed/bound guards | เพิ่มใหม่ |
| `docs/AI_CLAIM_G05_ASSET_COVERAGE.md` | บันทึก task claim, branch, base SHA, exact reservation และ forbidden scope | เพิ่มใหม่ |
| `docs/AI_HANDOFF_G05_ASSET_COVERAGE_REPORT.md` | รายงาน checkpoint และข้อจำกัดสำหรับ AI-0 | เพิ่มใหม่ |

## สิ่งที่เชื่อมและสิ่งที่ตรวจ

| Owner | สิ่งที่ตรวจ | ผล | Blocker ที่รายงาน |
|---|---|---|---|
| `ALL_ITEMS` | `iconAssetId` และ `modelAssetId` ของ item ทุกตัว | เก็บเป็น reference ที่เรียงลำดับ deterministic และรวมเป็น unique asset set | ขาด manifest, kind ไม่ตรง, ขาด SHA หรือขาด/ไม่สามารถแจกจ่ายได้ credit |
| `PLANT_CATALOG` | `assetId` และ seed icon `items.seed` ของพืชทุกตัว | ตรวจ plant references และ seed icon โดยไม่สร้าง asset | ใช้ blocker เดียวกับ item reference |
| active manifest | entry, `kind`, `sha256`, pack id | รับเฉพาะ `arcane-frontier-voxel-pixel` และตรวจ shape ก่อน audit | pack อื่นถูกปฏิเสธ ไม่เปิด future-pack |
| `ASSET_CREDITS` | matching `assetId` และ `canDistributeAsset` | แยก `MISSING_CREDIT` กับ `NON_DISTRIBUTABLE_CREDIT` | `reference-only` และ `awaiting-contact` ไม่ผ่าน distributable boundary |
| runtime policy | preview output | คงที่ `{ runtimeImportAllowed:false, playerVisible:false, cacheable:false }` | ไม่มี runtime import, cache write หรือ player effect |

## Contract behavior

ผลลัพธ์มี `artifact` ที่ประกอบด้วย manifest identity/hash และ `coverageHash` ที่เปลี่ยนเมื่อ manifest, credits หรือ references เปลี่ยน มี `summary` สำหรับจำนวน reference, unique asset, manifest match, kind match, SHA-256, credit และ issue รวมทั้ง `assets` ราย asset และ `issues` ที่เรียง deterministic ตาม asset/code/source key

การตรวจใช้ bound ที่ `4096` entries ต่อ catalog เพื่อป้องกัน runaway input แต่รองรับ canonical catalog ปัจจุบันของ repository ที่มี item มากกว่า 1024 รายการ ผลลัพธ์ไม่เรียก network, browser cache, IndexedDB, database, generator runtime หรือ persistence caller

## Test evidence

การรัน focused command ต่อไปนี้ผ่านแล้ว:

```text
pnpm test -- --run server/assetProvenanceCoverageContract.test.ts
```

ผลจริงจาก Vitest คือ `121` test files ผ่าน และ `505` tests ผ่าน รวม test ใหม่ `5` กรณี ไม่มี failed test ในรอบสุดท้าย การรันมี warning ของ pnpm เรื่อง `pnpm` field ใน `package.json` ที่ถูก ignore และ warning ว่า build scripts ของ `@tailwindcss/oxide` กับ `esbuild` ถูก ignore; ไม่มีการเปลี่ยน dependency หรือ lockfile โดย checkpoint นี้

## ข้อจำกัดและ non-claims

งานนี้ยังไม่เพิ่ม credit records ให้กับ runtime asset ที่ปัจจุบันไม่มีหลักฐาน provenance ที่ยืนยันได้ ดังนั้น full-catalog audit บน `ASSET_CREDITS` ปัจจุบันยังคืน `valid: false` และ `MISSING_CREDIT` เป็น required blocker ตามนโยบาย ไม่ได้แก้ blocker ด้วยการเติม metadata หรือสมมติ license

งานนี้ไม่อ้างว่า asset bytes ถูกสร้าง, asset ได้รับ license approval, runtime import/publish ผ่าน, player UI แสดง asset ได้, cache/offline behavior ผ่าน, authenticated creator flow ผ่าน, mobile/device acceptance ผ่าน หรือมี gameplay caller/persistence

Implementation branch ยังไม่ merge เข้า `main`; AI-0 ต้องตรวจ diff, rerun evidence, merge และอัปเดต registry/matrix แยกตาม workflow

## สถานะส่งมอบ

- Owner: `AI-6`
- Task ID: `G-05`
- Branch: `ai-6/g05-asset-coverage`
- Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`
- Commit SHA: `6eed6200cc289adb66837e3a45f635565484f070`
- Status requested: `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ diff และหลักฐานซ้ำ
