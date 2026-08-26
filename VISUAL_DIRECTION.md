# Visual Direction — Arcane Frontier Survival

เอกสารนี้เป็น source of truth สำหรับงานภาพของเกมรุ่นถัดไป โดยยึด visual target ของ Obsidian Frontier ที่สร้างจาก Gemini brief และหลักการ UX ของเกม survival RPG มือถือที่ศึกษามาแล้ว ทุก asset เป็นงานต้นฉบับของ A_Survival และห้ามนำ branding, texture, model, code หรือ UI artwork ของเกมอื่นมาใช้โดยตรง

## Visual pillars

| Pillar | การนำไปใช้ในเกม |
|---|---|
| High-contrast silhouette | ตัวละคร สัตว์เลี้ยง ศัตรู และ resource node ต้องอ่านรูปร่างได้ที่ logical render ประมาณ 480×270 แม้ลดรายละเอียดลง |
| Obsidian–aether contrast | พื้นหินดำ/ม่วงเข้มเป็นฐาน ตัดด้วย cyan ley-line, violet crystal และ orange heat warning เพื่อสร้างจุดนำสายตา |
| Tactile arcane materials | ทุกชิ้นมีวัสดุที่แยกได้ด้วย pixel ramps: หินแตก, โลหะเก่า, ผลึกเรืองแสง, เถ้าภูเขาไฟ และพลังงานเวท |
| Layered depth | ใช้ระดับพื้น, เสาหิน, หมอก, particle และ landmark เพื่อให้ top-down scene มีระยะลึกโดยไม่บังทางเดิน |
| Ergonomic restraint | HUD มีลำดับชัดเจนและปล่อยพื้นที่กลางจอสำหรับการเล่น ปุ่มสำคัญอยู่ใน safe zone และหลีกเลี่ยงการเพิ่มปุ่มถาวรเกินจำเป็น |

## Obsidian Frontier palette

| Role | Color |
|---|---|
| Deep abyss | `#0D0B1E` |
| Obsidian violet | `#2C1B4D` |
| Arcane purple | `#5A2A82` |
| Magma ember | `#FF7700` |
| Aether cyan | `#00F0FF` |
| Weathered stone | `#8CA0B3` |

## Pack contract

Asset ID ต้อง namespaced ตาม biome และ domain เพื่อให้เปลี่ยนภาพได้โดยไม่แก้ gameplay logic เช่น `biome.obsidian.terrain.ash-floor`, `biome.obsidian.flora.crystal-fern`, `biome.obsidian.resource.aether-ore`, `biome.obsidian.landmark.portal-ruin`, `biome.obsidian.character.survivor`, `biome.obsidian.companion.fox-drone`, `biome.obsidian.enemy.rift-hound`, `biome.obsidian.vfx.aether-spark` และ `item.global.aether-potion` แกนเกมอ้างเฉพาะ logical ID ผ่าน manifest; path, file format, atlas location และรุ่นของภาพเป็นหน้าที่ของ pack

แต่ละ biome ต้องประกาศชุด `terrain_tiles`, `foliage_sets`, `resource_nodes`, `landmark_structures`, `ambient_particles`, `creature_variants` และ `ui_accent`. Asset กลาง เช่น ไอเทมรักษาใช้ร่วมกันได้ แต่กรอบ/สี accent ของ biome ให้มาจาก metadata ไม่ใช่การทำสำเนารูปหลายไฟล์

## First asset slice

| Asset domain | Obsidian Frontier baseline | Runtime use |
|---|---|---|
| Terrain | obsidian wall, ash floor, magma crust, elevated plateau step | chunk material families and elevation markers |
| Flora | crystalline fern, spore shrub, glow vine | decorative instancing around paths and landmarks |
| Resources | aether ore, obsidian shard, lumen bulb | harvestable node visuals and map pings |
| Landmarks | collapsed portal gate, ancient monolith, crystal geode core | navigation anchors and event locations |
| Characters | armored survivor, floating fox-like companion drone, rift hound, elite sentinel | GLB/voxel visual roots with art-pack fallback |
| VFX | cyan aether sparks, magma steam, violet slash arc | light-weight particles or billboard overlays |
| UI | cyan/violet/amber frame ramps, icon silhouettes, focus ring | pack-backed hotbar and interaction feedback |

## Mobile layout decision

ค่าเริ่มต้นคงโครงสร้าง left movement stick, right action cluster, bottom-center five-slot hotbar และ top status/radar ไว้ แต่ลด visual noise ของกรอบ/label ในระหว่างเล่น ปุ่ม `USE` ต้องแสดง item ที่เลือกและ feedback การใช้ให้ชัดเจน ส่วน inventory, tactical map และ settings เป็น overlay ที่เปิด/ปิดได้ ไม่ขยายเป็น HUD ถาวรเพิ่มเติม

ระยะขอบ runtime ใช้ safe-area inset ของ browser ร่วมกับ margin อย่างน้อย 16px; ปุ่มหลักต้องอยู่ห่างขอบจริงมากกว่าค่าขั้นต่ำเมื่อ device มี notch/punch-hole/gesture bar. Touch-layout editor เป็น P2 หลัง first art slice: ย้าย, ปรับขนาด 80–150%, ปรับ opacity 40–100%, reset/apply และบันทึก local profile

## 500m streaming decision

`radiusMeters` ของ playable map จะเป็น 500 และใช้ world unit 1:1 เมตรในระบบใหม่ เมื่อยังไม่เปลี่ยน scale ของเนื้อหาเดิม ให้ใช้ conversion layer แยกจาก encounter coordinates. Terrain chunk ขนาด 16×16 เมตร; full visual/physics อยู่ใกล้ผู้เล่น, static simplified tier อยู่ถัดออกไป, และ prefetch เดินหน้าไปตาม velocity โดยมี fallback ที่คง chunk เดิมไว้จนกว่าชุดใหม่พร้อม เพื่อลด popping

ค่าเริ่มต้นที่ต้อง benchmark บนอุปกรณ์จริงคือ visible radius 96m, prefetch 128m และ full-interaction radius 32m. ตัวเลขเหล่านี้เป็น tuning target ไม่ใช่ข้ออ้างว่า benchmark เสร็จแล้ว

## Provenance

ภาพ visual target และ asset concept ชุดนี้สร้างจาก Gemini-directed brief เมื่อ 2026-08-26. Google image API เดิมของโปรเจกต์เคยติด quota แต่ built-in image generation สร้าง visual target/asset concept ได้สำเร็จในรอบนี้. Asset ที่จะลง pack ต้องผ่านการลดขนาด, ตรวจ alpha/ขอบ, ตั้ง nearest sampling และประกาศ SHA-256 ใน manifest ก่อนใช้งานจริง
