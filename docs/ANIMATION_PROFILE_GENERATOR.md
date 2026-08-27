# Animation Profile Generator

## ขอบเขต

`animation.profile` เป็น generator สำหรับสร้างข้อมูลโปรไฟล์การเคลื่อนไหวของตัวละครหรือม็อบ โดยรวม state `idle`, `walk`, `run`, `dash`, `attack`, `hurt` และ `dead` ไว้ใน artifact เดียว ไม่สร้าง triangle mesh และไม่ generate clip ใหม่ใน render loop

โปรไฟล์เก็บ asset ID, source, provenance, fps, state parameters และ playback policy ที่บังคับให้ reuse asset, หยุดพักเมื่ออยู่นอกระยะ และไม่ generate ตอนโหลดฉาก ระบบนี้จึงเป็นชั้นข้อมูลระหว่าง Creator Workbench/CLI กับ runtime asset registry; การ publish เข้าเกมยังต้องผ่านขั้นตรวจ asset จริงและ compatibility แยกต่างหาก

## Validation

| กฎ | Contract |
|---|---|
| Profile/asset ID | lowercase identifier ยาว 3–64 ตัวอักษร |
| FPS | 1–60 และค่าเริ่มต้น 12 |
| Bob amplitude | 0–0.2 |
| Cycle rate | 0–12 cycles/sec |
| One-shot states | `dash`, `attack`, `hurt`, `dead` ต้องไม่ loop |
| Dead state | ต้องซ่อนและไม่ loop |
| Provenance | ต้องมี `assetSource` และ `provenanceRef`; reference-only ห้ามไม่มีที่มา |

ระบบใช้ Common Generator Registry เพื่อสร้าง deterministic `contentHash`, artifact provenance และ preview asset reference จาก input/seed เดิม ผลลัพธ์นี้ไม่ใช่หลักฐานว่า GLB clip หรือ sprite sheet ครบทุก state แล้ว เพราะ starter metadata ปัจจุบันยังมี `glbClip: null` ในหลาย state

## จุดใช้งาน

| จุดใช้งาน | หน้าที่ |
|---|---|
| `server/generators/animationProfileGenerator.ts` | schema, defaults, validator และ common plugin |
| `tools/animation-profile-generator.ts` | CLI export สำหรับ developer |
| `server/creatorRouter.ts` | admin-only preview route |
| `client/src/pages/CreatorDomainWorkbench.tsx` | แบบฟอร์มภาษาไทยและ preview summary แยกจาก player UI |
| `client/public/assets/.../metadata/animations.json` | starter animation metadata ที่ runtime อ้างอิงอยู่เดิม |

หลักฐานของ checkpoint นี้คือ `server/animationProfileGenerator.test.ts`, creator route tests, `pnpm check`, CLI smoke ที่สร้าง artifact 7 states และ production build การทดสอบ browser ที่ยืนยันได้ใน session ปัจจุบันเป็น deny boundary ของ developer route เท่านั้น ยังไม่มี admin session สำหรับยืนยันปุ่ม preview ใน browser และยังไม่อ้าง real-device FPS/thermal/memory acceptance
