# A_Survival Common Generator API

**สถานะ:** foundation checkpoint — backend/data tooling only

เอกสารนี้กำหนดสัญญากลางสำหรับเครื่องมือสร้าง content ของ A_Survival โดยแยกหน้าที่ของ generator ออกจาก game runtime อย่างชัดเจน Generator สร้าง artifact แบบ deterministic จาก input กับ seed; validator ตรวจ artifact; registry จัดการ id/version; preview แสดงข้อมูลสรุป; save/export อนุญาตเฉพาะ artifact ที่ผ่าน validation แล้ว เกมผู้เล่นไม่มีปุ่มหรือ route สำหรับเรียก API นี้

## Pipeline

```text
Generator Input + Seed
        ↓
Registered Generator Version
        ↓
Generate Once
        ↓
Plugin Validation
        ↓
Asset/Data Reference Validation
        ↓
Deterministic SHA-256 Content Hash
        ↓
Preview / Save / Export
        ↓
Content Registry or Runtime Import
```

## Contract ที่มีจริง

`server/generators/commonGeneratorApi.ts` มี `CommonGeneratorRegistry`, `GeneratorPlugin`, `GeneratorArtifact`, `GeneratorAssetRef`, `GeneratorProvenance`, `GeneratorValidationResult` และ `GeneratorValidationError` โดยรองรับ `Generate`, `Validate`, `Preview`, `Save`, `Export`, `Version` และ version list ตามสัญญากลาง

Artifact ใช้ schema `a-survival.generator-artifact.v1` และเก็บ `generatorId`, semantic version, `kind`, normalized seed, input, output, asset references, SHA-256 content hash และ provenance ที่ระบุว่าเกิดจาก backend generator. ค่า `generatedAt` และ `savedAt` เป็น metadata จึงไม่ทำให้ content hash ของ input/seed/output เดียวกันเปลี่ยน

Asset reference ต้องระบุ logical `assetId`, domain kind และ source (`generated`, `starter-authored`, `provided` หรือ `reference-only`). หากเป็น reference-only ต้องมี `provenanceRef`; หากมี SHA-256 ต้องเป็นค่า hexadecimal 64 ตัวอักษร. ข้อมูลนี้เป็น metadata/validation boundary ไม่ใช่การอนุญาตให้นำ reference asset มาเป็น runtime asset

## กฎที่บังคับ

Generator version ต้องเป็น `x.y.z` และ registry จะเลือก version ล่าสุดด้วยการเปรียบเทียบตัวเลขของ semantic version ไม่ใช่การเรียงตัวอักษร. Generator ต้องถูก register ก่อนใช้; id ซ้ำกับ version เดิมถูกปฏิเสธ; unknown generator/version ถูกปฏิเสธ; output ที่ plugin validation ไม่ผ่านจะไม่กลายเป็น artifact ที่ใช้ export ได้

การ validate หลัง generate จะตรวจ schema, identity/provenance, seed, source, kind, asset references, content hash และ plugin-specific output rules. หาก artifact ถูกแก้ไขภายหลัง hash หรือ plugin validation จะไม่ผ่าน และ `save`/`export` จะโยน `GeneratorValidationError`

## ขอบเขตที่ยังไม่อ้างว่าเสร็จ

Foundation นี้ยังไม่มี Structure/World/Quest/Dungeon/Loot/Item/Animation/Audio/Weather หรือ no-code UI generator รายด้าน, ไม่มีการเขียนไฟล์ content ลง disk/database อัตโนมัติ และไม่มี player-facing generator route. สิ่งเหล่านี้จะเพิ่มเป็น plugin/tool checkpoint แยก โดยต้องใช้ contract นี้และผ่าน test, validation, provenance, performance review และ Git checkpoint ก่อน register เป็น content ที่ runtime ใช้ได้

Plant catalog generator เดิมยังคงอยู่เป็น tool เฉพาะ Obsidian และยังไม่ถูก rewrite ให้ผูกกับ registry นี้ใน checkpoint เดียวกัน เพื่อไม่รวมหลายระบบเกินขอบเขตและเพื่อรักษา backward compatibility ของ farming slice

## หลักฐาน

- Implementation: [`server/generators/commonGeneratorApi.ts`](../server/generators/commonGeneratorApi.ts)
- Tests: [`server/commonGeneratorApi.test.ts`](../server/commonGeneratorApi.test.ts)
- Verification: `pnpm check`, full Vitest `41` test files / `135` tests และ `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน; build ยังมี analytics placeholder และ Babylon vendor chunk warning เดิม
- Owner requirements: [`OWNER_REQUIREMENTS_MATRIX.md`](./OWNER_REQUIREMENTS_MATRIX.md)
- Requirements reconciliation: [`REQUIREMENTS_RECONCILIATION_2026-08-26.md`](./REQUIREMENTS_RECONCILIATION_2026-08-26.md)
