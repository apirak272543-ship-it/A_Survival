# M-02 Runtime Visibility Dependency Graph

## วัตถุประสงค์

เอกสารนี้บันทึก checkpoint `AI1-M02-001` สำหรับตรวจความสัมพันธ์ของ **performance budget → chunk streaming → object visibility → telemetry preview** จาก source ที่มีอยู่จริง โดยทำเป็น pure/read-only dependency graph และไม่แก้ runtime caller

## Source owner ที่ตรวจ

`client/src/game/systems/performanceProfile.ts` เป็นเจ้าของ tier budget ซึ่งจำกัด `viewDistanceBlocks`, `targetFps`, simulation radius, animation radius, physics radius, particle budget, shadow quality และ LOD policy. `client/src/game/systems/renderDistance.ts` คำนวณ visible/prefetch radius จาก block distance และ map radius

`client/src/game/systems/visibleRegionSystem.ts` เป็นเจ้าของการคำนวณ chunk keys โดยจำกัด chunk ตาม visible radius และ map radius. `client/src/game/assets/pixelPack.ts` เป็นเจ้าของ terrain stream metadata, chunk assignment และ `inMap`/enabled flag. `client/src/game/systems/runtimeVisibilitySystem.ts` เป็นเจ้าของการตัดสินใจเปิด mesh ตาม coordinate, view distance, bounded safety padding และ `state: "broken"`

`client/src/game/systems/runtimePerformanceTelemetry.ts` เป็น sampler ที่อ่าน callback/frame และจำนวน mesh ส่วน `server/generators/runtimePerformanceProfiler.ts` ทำ observation-only analysis จาก snapshot เช่น observed FPS, frame cadence และ active-mesh ratio. `client/src/components/GameCanvas.tsx` และ `client/src/game/scene.ts` เป็น runtime integration owners ที่ checkpoint นี้อ่านเพื่อยืนยัน caller แต่ห้ามแก้

## สิ่งที่ contract ตรวจได้

`server/generators/runtimeVisibilityDependencyGraph.ts` สร้าง node แบบ deterministic สี่ชั้น ได้แก่ performance budget, chunk stream, object visibility และ telemetry preview. Input ถูก normalize ให้เป็น bounded numeric policy; budget tier จำกัดค่า view distance/FPS ก่อนคำนวณ visible/prefetch windows. Unknown map จะถูกแปลงเป็นการรายงาน `MAP_NOT_PLAYABLE` โดยยังคงใช้ `obsidian-frontier` เป็น graph map และไม่เปิด future-map rendering

Object visibility ใช้ตัวอย่างขอบเขตแบบ static เพื่อยืนยันว่า object ในระยะและใน safety padding ถูกเปิด, object นอกระยะถูกตัด, และ object ที่มี `state: "broken"` ไม่ถูกเปิด. Telemetry ที่ให้เข้ามาถูกส่งต่อเป็น preview เท่านั้น; graph ไม่วัด CPU/GPU และไม่เปลี่ยน tier อัตโนมัติ

ทุก output คง policy `runtimeImportAllowed: false`, `playerVisible: false`, `cacheable: false` และ claims ระบุ `runtimeRenderApplied: false`, `adaptiveTiering: false`, `deviceBenchmark: false`, `playerRuntimeMutation: false`, `networkPersistence: false`, `visualAcceptance: false`

## หลักฐานที่ตรวจ

Focused M-02 contract test มี `5` tests ผ่าน. การตรวจนี้ครอบคลุม graph validity, deterministic hash, canonical Obsidian map, tier clamping, visible/prefetch derivation, broken-object behavior, telemetry preview, future-map fail-closed และ malformed/bounded input

## สิ่งที่ยังไม่พิสูจน์

Graph นี้ไม่ใช่การ benchmark และไม่ใช่หลักฐานว่า FPS, CPU, GPU, memory, thermal behavior หรือ mobile/WebView performance ผ่านจริง. ยังไม่มี real-device measurement, controlled benchmark, visual screenshot/human review, production deployment evidence หรือการพิสูจน์ว่า asset/scene ทุกชิ้นถูก cull/LOD/pool อย่างครบถ้วนบน runtime จริง. ไม่แก้ `GameCanvas.tsx`, `scene.ts`, player settings, Workbench, router, map/cache/offline policy และไม่สร้าง asset bytes

AI-0 ต้อง review/merge PR และตัดสิน requirement/claim state บน `main`; AI-1 ไม่ mark งานนี้เป็น global DONE
