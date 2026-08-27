# V-01 Scene Readability Coverage

## วัตถุประสงค์

เอกสารนี้บันทึก checkpoint `AI1-V01-001` สำหรับตรวจ **static visual metadata** ของฉากจาก canonical `OBSIDIAN_FRONTIER_VISUALS` โดยไม่แก้ renderer และไม่อ้างว่าได้ผ่าน visual screenshot หรือ device acceptance แล้ว

## Source of truth ที่ตรวจ

`client/src/game/data/biomeProfiles.ts` ระบุว่า Obsidian Frontier ใช้ terrain asset IDs `terrain.ash` และ `terrain.obsidian` โดย Ash เป็นฐานเดินได้ที่ออกแบบให้มองเห็น relief/readability ได้ และ Obsidian เป็น accent band ที่เข้มกว่า. โปรไฟล์ยังมี landmark decorations สองรายการคือ `art.obsidian.portal-ruin` และ `art.obsidian.ancient-monolith` พร้อมตำแหน่ง ขนาด และ emissive metadata

`client/src/game/scene.ts` เป็น runtime renderer owner. Checkpoint นี้จึงอ่านข้อมูลผ่าน contract เท่านั้น และไม่เรียกสร้าง Babylon scene, ไม่แก้ material/light, ไม่สร้าง asset bytes และไม่ import contract เข้า player route

## Contract output

`server/sceneReadabilityCoverageContract.ts` สรุป terrain layers, decoration category counts, landmark IDs, readable-base/darker-accent/relief/path/flora/resource signals, source comment signals และ deterministic SHA-256 metadata. Map ที่ไม่ใช่ canonical playable visual slice จะใช้ safe default profile และติด `MAP_FALLBACK` issue แทนการเปิด future-map rendering

Policy ใน output ถูก hard-code เป็น `auditOnly: true`, `readOnly: true`, `exportOnly: true`, `publishReady: false`, `playerVisible: false` และ `runtimeRenderApplied: false`

## หลักฐานการตรวจ

- focused contract: `4` tests ผ่าน
- focused related regressions: `3` test files / `18` tests ผ่าน
- full suite: `118` test files / `487` tests ผ่าน
- `pnpm check` และ `git diff --check` ผ่าน
- heap-limited production build ผ่าน

## สิ่งที่ยังไม่พิสูจน์

Static signal ไม่ใช่การยืนยันว่า relief, mountain, rock หรือ path อ่านได้จริงบนหน้าจอ. ยังต้องมี runtime screenshot/human visual review ใน camera modes ที่เกี่ยวข้อง, exact active manifest/SHA/provenance verification, viewport/device acceptance และ scene integration evidence. จึงห้ามเปลี่ยน checkpoint นี้เป็น V-01 DONE หรือ global completion โดย AI-1; AI-0 ต้อง review/merge และตัดสินสถานะบน `main`
