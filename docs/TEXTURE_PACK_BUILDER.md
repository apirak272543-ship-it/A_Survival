# Texture / Asset Pack Builder และ Creator Studio

เอกสารนี้บันทึก checkpoint ของระบบสร้างกราฟิกสำหรับ A_Survival ตามกฎว่า texture, icon, tile, skin และ atlas ต้องผ่านระบบสร้างของ Repository เองก่อนจึงจะนำไปผูกกับเกมได้ ระบบนี้เป็น **developer-only surface** ไม่ใช่เมนูของผู้เล่น และไม่เปิด generator control ใน `ArcaneFrontier`.

## ขอบเขตที่ตรวจยืนยันแล้ว

| ส่วน | Source | สถานะใน checkpoint นี้ | หลักฐาน |
|---|---|---|---|
| Common texture pack contract | `server/generators/texturePackBuilder.ts` | มี backend foundation | focused Vitest 4 tests และ `pnpm check` ผ่าน |
| Pixel layers | `TextureLayer` และ deterministic RGBA-to-PNG composition | มี | PNG signature/dimensions และ manifest tests |
| Asset kinds | `icon`, `tile`, `skin`, `atlas` | มี | input/output type และ path mapping |
| Skin layout | part geometry, duplicate IDs, bounds และ overlap policy | มี | validation/overlap tests และ skin UI mapping |
| Manifest | logical ID, relative path, MIME, SHA-256, source, provenanceRef, pack hash | มีใน builder | manifest/tamper tests |
| Common Generator integration | plugin `texture.pack` และ registry lifecycle | มี | deterministic generate/validate/preview/tamper test |
| Thai no-code UI | `client/src/pages/CreatorStudio.tsx` | มีเป็น draft workspace | browser route evidence |
| Developer route boundary | `/creator-studio` ใน `client/src/App.tsx` | มีใน development หรือเมื่อ `VITE_CREATOR_STUDIO_ENABLED=true` | root player route ตรวจไม่พบ creator controls |
| Creator tRPC/API boundary | `server/creatorRouter.ts` ลงทะเบียน `creator.texture.validateInput`, `build`, `generate`, `preview` ด้วย `adminProcedure` | มี server-side foundation | `creatorRouter.test.ts` และ full suite ผ่าน; ยังไม่มี durable register persistence |

## Builder contract

`TexturePackInput` รับข้อมูล pack, namespace, semantic version, ชื่อชุดภาพ, sampling mode และรายการ asset แต่ละรายการมีชนิด asset, ขนาด canvas, pixel layers, source และ provenance reference. Builder ตรวจ identifier, dimensions สูงสุด 2048×2048, จำนวน layer สูงสุด 128, geometry ของแต่ละ layer, RGBA channel, duplicate IDs, source ที่รองรับ และ provenance ก่อนสร้างผลลัพธ์.

เมื่อ validation ผ่าน ระบบจะประกอบ layer ตามลำดับ input เป็น RGBA canvas, encode เป็น PNG แบบ deterministic, คำนวณ SHA-256 ต่อไฟล์ และสร้าง manifest ที่ map logical asset ID ไปยัง path, MIME, digest, source และ provenance. `packSha256` คำนวณจาก manifest ที่ตัดค่า hash ของตัวเองออก จึงตรวจ tamper ได้โดยไม่พึ่งเวลาสร้าง. การลงทะเบียนกับ `CommonGeneratorRegistry` จะได้ artifact content hash ที่ไม่รวม timestamp และสามารถเรียก generate, validate, preview, save และ export ตาม common lifecycle.

> `reference-only` เป็น provenance state ที่ระบบรู้จักเพื่อการตรวจสอบและการอ้างอิง แต่ยังไม่ใช่หลักฐานว่า asset นั้นอนุญาตให้เป็น runtime asset. การนำไปใช้จริงต้องผ่าน asset governance, license/provenance และ runtime registry ต่อไป.

## Skin composition และ no-code model abstraction

สกินใช้ `SkinLayout` และ `SkinLayoutPart` เพื่อระบุส่วนประกอบที่วางบน canvas เช่น head, face, torso, แขน และขา. UI ให้มนุษย์เลือกส่วนประกอบและลงสี pixel เท่านั้น ระบบเป็นผู้ประกอบภาพตาม layout และแสดง composition preview. ไม่มีขั้นตอนให้มนุษย์วาด triangle mesh หรือส่ง geometry สามเหลี่ยมเอง ซึ่งตรงกับกฎของเจ้าของที่ต้องการเครื่องมือแบบ template/LEGO สำหรับผู้ใช้ไม่เขียนโค้ด.

ส่วน preview ใน checkpoint นี้เป็น composition visualization ของ workspace และยังไม่ใช่ Babylon model attachment ที่เชื่อม runtime. การเชื่อม skin face mapping ไปยัง model/atlas registry จะทำใน checkpoint integration ถัดไปโดยไม่ย้าย generator controls เข้า player UI.

## Creator Studio ที่ใช้งานได้ในรอบนี้

หน้า `/creator-studio` มี template สำหรับพืช/ใบไม้, อาวุธ, ไอเทม, พื้น/บล็อก, สกินตัวละคร และ atlas. ผู้ใช้สามารถเลือก palette หรือสี custom, วาด/ลบ pixel, เปิด symmetry, เพิ่ม layer, ปรับ opacity, เปลี่ยน zoom, เลือก skin parts, ดูภาพประกอบ และกรอก metadata/provenance เป็นภาษาที่เข้าใจได้. ชื่อ asset ที่ผู้ใช้กรอกจะสร้าง logical ID แบบ lowercase อัตโนมัติ เพื่อไม่บังคับให้รู้กฎ identifier ของ backend.

แบบร่างบันทึกใน localStorage ของ browser และส่งออกเป็น `.creator-draft.json` เพื่อช่วยรักษางานระหว่าง checkpoint. เมื่อผู้ใช้กด `ส่งเข้า Builder / Registry` UI จะสร้าง `TexturePackInput` จาก state แล้วเรียก `creator.texture.build` ฝั่ง server; server เป็นผู้ประกอบ PNG และตรวจ manifest/hash/provenance. ผล PNG และ digest จะถูกนำมาแสดงใน preview ของ UI. การ build นี้ยังไม่ใช่ durable register และไม่มีสิทธิ์เรียกใช้ใน playable runtime โดยอัตโนมัติ.

## Boundary และ performance rule

Generator ถูกวางไว้นอก `client/src/game/` และไม่ถูกเรียกจาก render loop. หน้า Creator Studio เป็น route แยกที่ไม่ถูกลิงก์จากหน้าผู้เล่น. Root route `/?route=landing` ยังคงแสดง landing screen ของเกมและไม่มี canvas/palette/generator controls. Builder สร้าง PNG และ manifest ในขั้นเตรียม asset; playable runtime ยังไม่ import starter pack หรือสร้าง texture ทุก frame.

## สิ่งที่ยังไม่เสร็จ

| งานถัดไป | เหตุผลที่ยังนับเป็น PARTIAL/PENDING |
|---|---|
| durable creator persistence/registry | มี creator tRPC/API ที่เรียก Builder จริง แต่ยังไม่บันทึก artifact ลง durable registry หรือ storage |
| server-side authorization | context มีเพียง user/admin และยังไม่มี creator-specific role/permission contract |
| save/export/register จาก UI | UI เรียก build เพื่อสร้าง PNG/hash ได้แล้ว แต่ durable save/register ยังไม่ทำ และยังต้องมี role/permission contract เฉพาะ creator |
| real PNG preview จาก builder output | UI แสดง `pngBase64` จาก server หลัง `creator.texture.build` สำเร็จ; ยังไม่มีการเก็บ artifact ถาวร |
| migration ของ procedural starter pack | starter pack เดิมยังสร้างจาก script เดิมและยังไม่ผ่าน Builder contract แบบ end-to-end |
| model attachment/runtime asset registry | skin composition preview ยังไม่ผูกกับ model/atlas ใน Babylon runtime |
| large-batch asset coverage | starter pack 16 PNG ไม่ใช่ coverage ของ catalog 3,000 definitions |
| device acceptance | ยังไม่มี real-device FPS, memory, thermal หรือ touch acceptance |

## Verification record

Focused test `pnpm exec vitest run server/texturePackBuilder.test.ts` ผ่าน `1` test file และ `4` tests. Creator API focused tests `pnpm exec vitest run server/creatorRouter.test.ts server/texturePackBuilder.test.ts` ผ่าน `2` files / `8` tests. Full regression ผ่าน `48` test files / `167` tests, `pnpm check` และ production build ด้วย memory cap. Browser smoke test เปิด `/creator-studio`, เปลี่ยนจาก plant template เป็น skin template, ลงสีพิกเซล, เรียก validation ด้วย DOM click และเห็นสถานะ `ผ่าน`; root `/?route=landing` ยังคงเป็น player landing โดยไม่พบ creator controls. ใน development browser ยังไม่มี authenticated admin session จึงยังไม่ได้อ้างว่า browser build mutation ผ่าน; admin boundary ถูกยืนยันด้วย router contract tests. รายละเอียด browser ถูกบันทึกไว้ใน `docs/creator-studio-browser-evidence-2026-08-27.md`.

การตรวจนี้ยังไม่ใช่หลักฐานว่า creator platform เสร็จทั้งหมด. ต้องเพิ่ม backend contract, authorization, server-side Builder call, manifest persistence และ end-to-end export/register ก่อนยกระดับสถานะของข้อกำหนด no-code platform.


## Starter pack migration ผ่าน Builder

`server/generators/migrateStarterTexturePack.ts` อ่าน manifest ของ `a-survival-content-library-v0-1`, decode non-interlaced 8-bit RGB/RGBA PNG เป็น pixel array และส่ง asset ทั้ง 16 รายการเข้า `texture.pack@1.0.0`. ผลลัพธ์ถูกเขียนแยกไปยัง `client/public/assets/packs/a-survival-content-library-builder-v0-1/` พร้อม Builder manifest และ provenance record. Source pack เดิมแบ่งเป็น tile 4 รายการกับ icon 12 รายการ; Builder output ใช้ชนิด `tile` และ `icon` ตามนั้น.

ชื่อสถานะเดิม `procedural-starter-authored` เป็น provenance vocabulary ของ starter pack จึงถูกเก็บไว้ใน `provenance.json`; ใน `TextureAssetInput.source` แปลงเป็น `starter-authored` ซึ่งเป็น enum ของ Common Generator API. การแปลงนี้เป็น schema mapping ไม่ใช่การเปลี่ยนเจ้าของงานหรือการกล่าวอ้างว่าเป็น AI-generated.

Migration command คืนผล 16 entries และ pack hash `f8abe22704a1d99290c770bcc028088d1c34b4a82c1a510bbcda6195efb0d4bb`. Focused migration tests ผ่าน `2` tests และ full regression หลังเพิ่ม migration ผ่าน `49` test files / `169` tests. Output pack ยังคง future-only และยังไม่ถูกนำเข้า playable Obsidian runtime.
