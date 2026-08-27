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
Dependency / Reference Validation
        ↓
Content Registry or Runtime Import
```

## Contract ที่มีจริง

`server/generators/commonGeneratorApi.ts` มี `CommonGeneratorRegistry`, `GeneratorPlugin`, `GeneratorArtifact`, `GeneratorAssetRef`, `GeneratorProvenance`, `GeneratorValidationResult` และ `GeneratorValidationError` โดยรองรับ `Generate`, `Validate`, `Preview`, `Save`, `Export`, `Version` และ version list ตามสัญญากลาง

Artifact ใช้ schema `a-survival.generator-artifact.v1` และเก็บ `generatorId`, semantic version, `kind`, normalized seed, input, output, asset references, SHA-256 content hash และ provenance ที่ระบุว่าเกิดจาก backend generator. ค่า `generatedAt` และ `savedAt` เป็น metadata จึงไม่ทำให้ content hash ของ input/seed/output เดียวกันเปลี่ยน

Asset reference ต้องระบุ logical `assetId`, domain kind และ source (`generated`, `starter-authored`, `provided` หรือ `reference-only`). หากเป็น reference-only ต้องมี `provenanceRef`; หากมี SHA-256 ต้องเป็นค่า hexadecimal 64 ตัวอักษร. ข้อมูลนี้เป็น metadata/validation boundary ไม่ใช่การอนุญาตให้นำ reference asset มาเป็น runtime asset

## Dependency graph contract

`server/generators/dependencyGraph.ts` เพิ่มสัญญา `a-survival.dependency-graph.v1` สำหรับตรวจสายพึ่งพาแบบ deterministic ก่อน registry. แต่ละ node ต้องมี `key`, `kind`, `generatorId`, `generatorVersion`, `schemaVersion`, `seed`, `rulesVersion`, `contentHash` และรายการ dependency ที่ระบุ `required`, kind, generator/version ที่คาดหวัง, compatible versions หรือ content hash ได้ตามกรณี. ระบบเรียง node และ edge ด้วย key ที่ stable และคืน `topologicalOrder` ให้ dependency มาก่อน dependent.

Validator ตรวจ node/dependency ซ้ำ, reference ที่ required หาย, kind/generator/version/hash mismatch และ cycle. Optional dependency ที่หายจะไม่ block แต่ required dependency ที่หายหรือข้อผิดพลาดอื่นทำให้ graph เป็น invalid. `creator.dependencyGraph.preview` เป็น admin-only preview ใน Workbench; ไม่บันทึก registry, ไม่สร้าง binary, ไม่ import/cache/publish และไม่เปลี่ยน Obsidian Frontier player runtime. Core graph นี้เป็นก้าวแรกของ dependency validation. `contentCatalogDependencyGraph.ts` ใช้ `content.catalog` ที่ register อยู่จริง generate artifact จาก seed เดิม แล้วแปลง category asset และ sampled definitions เป็น graph nodes พร้อม hash/reference checks; จึงไม่ใช่ static graph fixture. `questContentCatalogDependencyGraph.ts` ต่อด้วย `quest.progression` artifact จริง, planned/playable map metadata, sampled quest prerequisites และ objective/reward references ไปยัง catalog nodes; reference ที่ไม่พบถูกปล่อยให้ validator block ตาม contract และ future map nodes ยังมี runtime import/cache/player visibility เป็น false. `worldStructureDependencyGraph.ts` ต่อด้วย `world.generator` จริงบน `obsidian-frontier`, โครงสร้างจาก `structure.placement` จริง, blueprint/placement hashes และ world-bounds/placement rejection summary; adapter นี้เป็น preview ของแผนที่เดียว ไม่สร้าง future map และ graph runtime policy ยังปิดทั้งหมด. `itemContentCatalogDependencyGraph.ts` ต่อด้วย `item.universal` จริงและ `content.catalog` จริง, ตรวจ balance budget, category/resource references และส่ง missing references เป็น required graph edges เพื่อ block ก่อน registry; item preview ไม่สร้าง binary และไม่ import/cache/publish เข้า player. `worldBlockContentCatalogDependencyGraph.ts` ต่อด้วย `world.generator` จริงบน `obsidian-frontier`, ใช้ `blockModules` เป็น owner ของ block definitions/drop/block-item/asset references, sample block/resource nodes แบบ bounded และต่อเข้ากับ `content.catalog`; runtime block-item IDs และ block asset IDs ที่ catalog generator ยังไม่แทนด้วย definition ที่ตรงกันจะถูกแสดงเป็น required missing edges แทนการสร้างข้อมูลปลอม. World/block preview ไม่เขียน registry และไม่ import/cache/publish เข้า player. Generator ทุก domain ยังต้อง migrate มา emit และ validate graph ของตัวเองเป็น checkpoint แยก.

## กฎที่บังคับ

Generator version ต้องเป็น `x.y.z` และ registry จะเลือก version ล่าสุดด้วยการเปรียบเทียบตัวเลขของ semantic version ไม่ใช่การเรียงตัวอักษร. Generator ต้องถูก register ก่อนใช้; id ซ้ำกับ version เดิมถูกปฏิเสธ; unknown generator/version ถูกปฏิเสธ; output ที่ plugin validation ไม่ผ่านจะไม่กลายเป็น artifact ที่ใช้ export ได้

การ validate หลัง generate จะตรวจ schema, identity/provenance, seed, source, kind, asset references, content hash และ plugin-specific output rules. หาก artifact ถูกแก้ไขภายหลัง hash หรือ plugin validation จะไม่ผ่าน และ `save`/`export` จะโยน `GeneratorValidationError`

## ขอบเขตที่ยังไม่อ้างว่าเสร็จ

Foundation นี้มี Common Generator API และ dependency graph validator แต่ยังไม่มี orchestrator ที่ดึง artifact จริงจากทุก domain มาต่อ graph เดียวโดยอัตโนมัติ และยังไม่มี Structure/World/Quest/Dungeon/Loot/Item/Animation/Audio/Weather หรือ no-code UI generator รายด้านที่ emit dependency metadata ครบทุกตัว. ยังไม่มีการเขียนไฟล์ content ลง disk/database อัตโนมัติ และไม่มี player-facing generator route. สิ่งเหล่านี้จะเพิ่มเป็น plugin/tool checkpoint แยก โดยต้องใช้ contract นี้และผ่าน test, validation, provenance, performance review และ Git checkpoint ก่อน register เป็น content ที่ runtime ใช้ได้

Plant catalog generator เดิมยังคงอยู่เป็น tool เฉพาะ Obsidian และยังไม่ถูก rewrite ให้ผูกกับ registry นี้ใน checkpoint เดียวกัน เพื่อไม่รวมหลายระบบเกินขอบเขตและเพื่อรักษา backward compatibility ของ farming slice

## หลักฐาน

- Implementation: [`server/generators/commonGeneratorApi.ts`](../server/generators/commonGeneratorApi.ts), [`server/generators/dependencyGraph.ts`](../server/generators/dependencyGraph.ts), [`server/generators/contentCatalogDependencyGraph.ts`](../server/generators/contentCatalogDependencyGraph.ts), [`server/generators/questContentCatalogDependencyGraph.ts`](../server/generators/questContentCatalogDependencyGraph.ts), [`server/generators/worldStructureDependencyGraph.ts`](../server/generators/worldStructureDependencyGraph.ts), [`server/generators/itemContentCatalogDependencyGraph.ts`](../server/generators/itemContentCatalogDependencyGraph.ts), [`server/generators/worldBlockContentCatalogDependencyGraph.ts`](../server/generators/worldBlockContentCatalogDependencyGraph.ts)
- Tests: [`server/commonGeneratorApi.test.ts`](../server/commonGeneratorApi.test.ts), [`server/dependencyGraph.test.ts`](../server/dependencyGraph.test.ts), [`server/contentCatalogDependencyGraph.test.ts`](../server/contentCatalogDependencyGraph.test.ts), [`server/questContentCatalogDependencyGraph.test.ts`](../server/questContentCatalogDependencyGraph.test.ts), [`server/worldStructureDependencyGraph.test.ts`](../server/worldStructureDependencyGraph.test.ts), [`server/itemContentCatalogDependencyGraph.test.ts`](../server/itemContentCatalogDependencyGraph.test.ts), [`server/worldBlockContentCatalogDependencyGraph.test.ts`](../server/worldBlockContentCatalogDependencyGraph.test.ts)
- Verification baseline: Common API foundation tests remain part of the repository suite; each new dependency-graph checkpoint records its own current test/build/browser evidence in [`OWNER_REQUIREMENTS_MATRIX.md`](./OWNER_REQUIREMENTS_MATRIX.md). Build warnings about analytics placeholders and the large Babylon vendor chunk remain known non-blocking warnings.
- Owner requirements: [`OWNER_REQUIREMENTS_MATRIX.md`](./OWNER_REQUIREMENTS_MATRIX.md)
- Requirements reconciliation: [`REQUIREMENTS_RECONCILIATION_2026-08-26.md`](./REQUIREMENTS_RECONCILIATION_2026-08-26.md)
