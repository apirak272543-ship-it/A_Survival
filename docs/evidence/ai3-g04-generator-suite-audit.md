# AI-3 G-04 Content Generation Suite Audit

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `G-04` |
| Requirement | reusable Content Generation Suite definition/model/texture/skin/variant/gameplay |
| Owner | AI-3 |
| Branch/worktree | `ai3/g04-generator-suite-audit` / `/home/ubuntu/A_Survival-g04` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `docs/evidence/ai3-g04-generator-suite-audit.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Source audit findings

ตรวจ `server/generators/commonGeneratorApi.ts` จาก source จริง โดยไม่แก้ registry, CreatorStudio, CreatorDomainWorkbench, generator plugin หรือ player route. Audit นี้แยก reusable suite infrastructure ออกจาก per-domain generator coverage ซึ่งยังต้องตรวจโดย G-01/G-05/T-04 และ domain owners.

| Capability | หลักฐานที่ตรวจได้ | สถานะ |
|---|---|---|
| Common schema | `COMMON_GENERATOR_SCHEMA_VERSION = a-survival.generator-artifact.v1` และ typed `GeneratorArtifact`/`SavedGeneratorArtifact` | มี shared artifact envelope |
| Generator kinds | รองรับ world, biome, structure, item, plant, mob, animation, texture, quest, dungeon, loot, crafting, economy, audio, weather, vegetation, simulation, migration และ other | มี extensible kind taxonomy |
| Plugin contract | `GeneratorPlugin` มี id/version/kind/generate/validate และ optional preview | มี reusable plugin interface |
| Registry/versioning | `CommonGeneratorRegistry` register, resolve, latest version, versions, generate และ validate | มี versioned registry flow |
| Deterministic hash | `stableStringify`, `hashStableJson` และ `calculateGeneratorContentHash` ผูก schema/id/version/kind/seed/input/output/assetRefs | มี content integrity primitive |
| Provenance | artifact มี generator identity/version/seed/source=`backend-generator`/generatedAt; validate ตรวจ identity, seed, source | มี backend provenance gate |
| Asset refs | asset ref มี kind/source/path/SHA/license/provenanceRef; reference-only ต้องมี provenanceRef และ malformed SHA ถูก reject | มี asset boundary; G-05 ยังต้องผูก runtime manifest |
| Preview | preview สรุป generator metadata, output type, record count, IDs และ asset refs | มี bounded inspection surface |
| Failure mode | `GeneratorValidationError` เก็บ issues; generate จะ validate ก่อนคืน artifact; validate รวม artifact/plugin issues | fail-closed validation path |
| Domain breadth | shared API รองรับชนิดกว้าง แต่ audit นี้ไม่พิสูจน์ว่า model/texture/skin/variant/gameplay plugin ทุกชนิดลงทะเบียนและทำงานครบ | ต้อง domain evidence เพิ่ม |

## Safety and scope boundary

Common suite เป็น backend/generator infrastructure. ห้าม expose generator/editor/player generator UI จาก audit นี้. Asset ที่ `reference-only` ต้องมี provenanceRef และไม่ควรเป็น runtime asset ก่อนผ่าน G-05/V-03/V-04. `generatedAt` เป็น metadata ไม่ใช่ deterministic input; content hash ไม่ควรใช้แทน legal/license clearance.

## Validation evidence

| Gate | Result |
|---|---|
| Source-of-truth | ตรวจจาก `origin/main` SHA `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Source reviewed | `server/generators/commonGeneratorApi.ts` shared types, hash, provenance, registry และ validate flow |
| Existing suite boundary | ไม่แก้ common API หรือ T-04 open audit files |
| Runtime changes | ไม่มี code/runtime/UI/cache/network/persistence change |
| Binary assets | ไม่ได้สร้างหรือแก้ไข |
| `git diff --check` | ต้องรันก่อน commit |
| `pnpm check` | ต้องรันก่อน commit; docs-only checkpoint |

## Limitations and blockers

G-04 ตาม backlog ขึ้นกับ G-01, G-05 และ T-04. Audit นี้ยืนยัน shared infrastructure coverage เท่านั้น ไม่ปิด per-domain generators, creator publish approval, runtime asset manifest binding, license/provenance review, durable storage หรือ browser evidence. AI-0 ต้องตรวจการซ้อนกับ T-04 PR และตัดสินใจว่า audit นี้เป็น evidence slice ที่ merge ได้หรือไม่.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `G-04` |
| Requirement | `G-04` source audit sub-checkpoint |
| Owner | AI-3 |
| Branch | `ai3/g04-generator-suite-audit` |
| Commit SHA | `f4bace753ec155a911d344f4e8f364b28b8c39b4` |
| Files changed | `docs/evidence/ai3-g04-generator-suite-audit.md` |
| Checks | `git diff --check` และ `pnpm check` ผ่าน; docs-only ไม่เพิ่ม runtime bundle |
| Result | common generator schema/registry/hash/provenance/asset-ref audit พร้อม domain boundary |
| Blockers/limitations | ไม่ปิด G-04 เต็มรูปแบบ; G-01/G-05/T-04 และ creator/runtime integration ยังต้อง review |
| Merge request | PR จะใช้ชื่อ `[AI-3][G-04]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ audit scope และ source findings |
