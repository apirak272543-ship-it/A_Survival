# Generator Tool Inventory และ Dependency Gate

**Task:** `AI1-O04-001`  
**สถานะ:** pure inventory/policy checkpoint; ไม่ใช่การอนุมัติให้รันหรือ publish generator output

เอกสารนี้สรุปเครื่องมือ generator ที่ตรวจพบจาก `package.json`, CLI source และ Common Generator API ของ repository `A_Survival` โดยแยก **สิ่งที่ตรวจพบจาก source จริง** ออกจาก **สิ่งที่ยังไม่มีหลักฐานการรัน**. เครื่องมือทั้งหมดเป็น backend/CLI tooling และไม่มี player-facing generator route ตามขอบเขตที่ตรวจใน checkpoint นี้

## เครื่องมือที่ตรวจพบ

| Tool ID | Command | Source path | Output ที่คาดจาก source | เขียนไฟล์ local | Network/secret | Player UI | สถานะ checkpoint |
|---|---|---|---|---:|---|---:|---|
| `world.generate` | `pnpm world:generate` | `tools/world-generator.ts` | world export JSON, preview summary และ world hash | ใช่ | ไม่ใช้ network/secret ตาม source ที่ตรวจ | ไม่ | inventory พบ; ยังไม่รัน generator |
| `content.generate` | `pnpm content:generate` | `tools/content-generator.ts` | content/asset/catalog JSON ตาม kind ที่เลือก | ใช่ | ไม่ใช้ network/secret ตาม source ที่ตรวจ | ไม่ | inventory พบ; ยังไม่รัน generator |
| `content.suite` | `pnpm content:suite` | `tools/content-suite-generator.ts` | content-suite bundle/preview/cache JSON | ใช่ | ไม่ใช้ network/secret ตาม source ที่ตรวจ | ไม่ | inventory พบ; ยังไม่รัน generator |
| `animation.generate` | `pnpm animation:generate` | `tools/animation-profile-generator.ts` | animation profile artifact/preview JSON | ใช่ | ไม่ใช้ network/secret ตาม source ที่ตรวจ | ไม่ | inventory พบ; ยังไม่รัน generator |
| `story.generate` | `pnpm story:generate` | `tools/quest-progression-generator.ts` | quest progression artifact/preview JSON | ใช่ | ไม่ใช้ network/secret ตาม source ที่ตรวจ | ไม่ | inventory พบ; ยังไม่รัน generator |

`package.json` ยังมีคำสั่ง `pnpm check`, `pnpm test -- --run` และ `pnpm build` สำหรับ preflight verification แต่คำสั่งเหล่านี้เป็น validation commands ไม่ใช่ content generators. คำสั่ง `pnpm db:push` ไม่อยู่ใน generator allow-list และอยู่นอก checkpoint นี้ เพราะเป็น database migration/write operation ที่ต้องมี scope แยกและ approval แยก

## Gate ก่อนใช้ generator

1. เลือก `toolId` จาก inventory นี้เท่านั้น และต้องมี source path/command ที่ตรวจพบแล้ว
2. รัน preflight ที่เกี่ยวข้อง ได้แก่ `pnpm check`, `pnpm test -- --run` และ `pnpm build`; ผลตรวจต้องบันทึกด้วยคำสั่งและจำนวนจริง ไม่ใช้ข้อความอ้างแทนหลักฐาน
3. ระบุ `writeTarget` ที่อยู่นอก source tree และมีเจ้าของ/ขอบเขตชัดเจนก่อนเรียกเครื่องมือที่เขียนไฟล์ local; ห้ามให้ generator เขียนทับ source, registry, cache ของผู้เล่น หรือ database โดยตรง
4. ตรวจ artifact ด้วย Common Generator API, plugin validation, dependency graph, deterministic SHA-256 และ provenance/asset reference ก่อนพิจารณา save/export
5. การ export หรือ runtime import เป็น checkpoint แยก; inventory นี้ไม่อนุมัติ registry write, runtime import, player visibility, cache write หรือ publish

## Policy ที่บังคับใช้ใน contract

`server/generatorToolDependencyPolicy.ts` คืนรายงานแบบ deterministic พร้อม `auditOnly: true`, `readOnly: true`, `exportOnly: true` และ `publishReady: false`. Runtime invocation, player UI, network access, secret requirement, background execution, database write, registry write และ source-tree write ถูกปิดไว้ใน policy projection

การเลือก tool ที่ไม่รู้จัก, completed check ที่ไม่อยู่ใน allow-list, ไม่มี output target หรือ preflight ไม่ครบจะถูกเก็บเป็น issue และทำให้รายงานไม่ valid. การมี `preflightReady: true` ใน projection หมายถึง policy input ให้ข้อมูลครบเท่านั้น ไม่ใช่หลักฐานว่า generator ถูกเรียกหรือ output ผ่าน acceptance แล้ว

## หลักฐาน source ที่ใช้

- `package.json` scripts: `world:generate`, `content:generate`, `content:suite`, `animation:generate`, `story:generate`, `check`, `test`, `build`
- `server/generators/commonGeneratorApi.ts`: generator registry, artifact validation, preview/save/export boundary และ stable hash
- `server/generators/dependencyGraph.ts`: deterministic dependency validation และ runtime-denied policy
- `tools/world-generator.ts`, `tools/content-generator.ts`, `tools/content-suite-generator.ts`, `tools/animation-profile-generator.ts`, `tools/quest-progression-generator.ts`: CLI entrypoints ที่ตรวจพบ

## ข้อจำกัดและ non-claims

Checkpoint นี้ **ไม่ได้รัน generator CLI**, ไม่สร้าง JSON/PNG/GLB ใหม่, ไม่ตรวจ output artifact จริง, ไม่เขียน content registry/cache/database, ไม่เรียก network/provider, ไม่อ่าน secret และไม่เปิด player generator UI. จึงยังไม่ claim ว่า generator output ใด production-ready, provenance-complete, runtime-importable หรือผ่าน visual/device acceptance

หากจะเพิ่ม tool หรือเปลี่ยน dependency ต้องลงทะเบียนไฟล์และ acceptance ใหม่ ไม่ควรแก้ inventory ให้สะท้อนเครื่องมือที่ยังไม่มี source หรือผลตรวจจริง
