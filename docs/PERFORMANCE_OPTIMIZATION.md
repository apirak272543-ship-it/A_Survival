# Obsidian Runtime Visibility Optimization

เอกสารนี้บันทึกการปรับปรุง spatial mesh activation ของ Obsidian Frontier vertical slice เมื่อวันที่ 27 สิงหาคม 2026. เป้าหมายคือไม่ให้ world/farm/storage mesh ที่อยู่นอก `performanceTier` view budget ถูกเปิดใช้งานและส่งเข้า active scene โดยไม่เปลี่ยน world state, interaction resolver, persistence หรือ Obsidian-only route

## สิ่งที่เปลี่ยน

`runtimeVisibilitySystem.ts` เป็น pure policy ที่รับ player position, view-distance budget และ mesh metadata แล้วคืนว่า object ควร enabled หรือไม่. มันอ่าน `x/z` โดยตรงหรือจาก `coordinate.x/z`, cull วัตถุที่อยู่นอกรัศมีแบบ Euclidean, ปิด object ที่มี `state: broken` และ **preserve malformed/ไม่มีพิกัดเป็น enabled** เพื่อไม่ซ่อน object ที่ policy ระบุพิกัดไม่ได้โดยการเดา

`scene.ts` ใช้ policy นี้กับ registries ของ generated Obsidian blocks, dynamic placed blocks, world plants, farm soil/crops และ storage/chest meshes เมื่อ terrain visibility budget update. Terrain chunk streaming เดิมยังคงเป็น owner ของ terrain chunks; future map branches ไม่ได้ถูกเปิดหรือเปลี่ยนพฤติกรรม

การ cull เป็น visual activation policy เท่านั้น. Block/farm/storage action resolver ยังคงอ่าน world state และ interaction reach จาก canonical systems เดิม ไม่ได้ใช้ `mesh.isEnabled()` เป็น authority ของ gameplay state. การวางหรือแก้ world object ยังสร้าง/แก้ state ผ่าน callbacks เดิม และการ cull รอบถัดไปจะคำนวณจาก metadata เดิม

## หลักฐาน

Focused tests ของ visibility policy, telemetry, performance profile, render distance, visible region และ offline map state ผ่าน `6` files / `27` tests. Full suite ผ่าน `67` files / `263` tests. `pnpm check`, `git diff --check` และ production build ผ่าน โดย warning ที่เหลือเป็น analytics placeholders และ Babylon vendor chunk ขนาดใหญ่เดิม

Browser smoke ผ่าน player landing → identity → lobby → map selector → Obsidian game. Selector ยังแสดงเฉพาะ Obsidian Frontier รัศมี 500m และข้อความ future maps เป็น planned/backend-only. หลัง scene settle อ่าน telemetry ได้ `tier: balanced`, effective target `60`, requested view `20`, total meshes `1342`, active meshes `418`, rendered frames `9`, average cadence `120.89ms`, p95/worst `131.7ms`; canvas จริงและไม่มี Creator Studio/Workbench text. Baseline ก่อน cullingใน telemetry checkpoint อยู่ที่ active meshes `610–630` และ rendered frames `7` ต่อประมาณหนึ่งวินาทีใน sandbox run

การเปรียบเทียบนี้เป็นคนละ browser run และไม่ใช่ controlled benchmark. จึงใช้เป็น **directional local observation/regression clue** เท่านั้น ไม่ใช่หลักฐานว่า FPS ดีขึ้นตามสัดส่วน, ไม่ใช่ข้อพิสูจน์สาเหตุเดียว และไม่ใช่ mobile FPS/memory/thermal/device acceptance

## ขอบเขตที่ยังไม่อ้าง

งานนี้ยังไม่มี frustum/occlusion culling ที่พิสูจน์ครบทุก object, object pooling, full LOD controller, GPU draw-call timing, WebGL/WebGPU capability detection, auto-adaptive tiering, hysteresis, device benchmark, WebView acceptance, real-device battery/thermal evidence หรือ generic profiler UI. `totalMeshes` ยังคงเป็น scene mesh count และ `activeMeshes` เป็น Babylon active-mesh metadata ไม่ใช่ GPU draw-call count

โค้ดไม่เปิด future maps, ไม่สร้าง cache ของ future maps และไม่เพิ่ม creator controls ใน player UI. Creator tools ยังคงอยู่ใน admin/developer boundary แยกจาก runtime
