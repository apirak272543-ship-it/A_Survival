# Minecraft PE รุ่นเก่า: Static Analysis และ Blueprint เชิงสถาปัตยกรรม

**ผู้จัดทำ:** Manus AI  
**วัตถุประสงค์:** ศึกษาหลักการออกแบบแอปและเกมมือถือรุ่นเก่า เพื่อนำแนวคิดที่เป็นกลางมาสร้าง A_Survival ใหม่ โดยไม่คัดลอกโค้ด, branding, texture, model, UI artwork หรือไฟล์ของ Minecraft

> การตรวจครั้งนี้เป็น **static analysis เท่านั้น** ไฟล์ APK, DEX และ native library ไม่ถูกติดตั้งหรือ execute ใน sandbox ไฟล์ตัวอย่างเก็บอยู่นอก repository ที่ `/home/ubuntu/a_survival_audit/mcpe_samples/`

## 1. ชุดตัวอย่างและความน่าเชื่อถือ

| ตัวอย่าง | หลักฐานจาก archive | SHA-256 | สถานะการใช้เป็นหลักฐาน |
|---|---|---|---|
| Minecraft PE Alpha 0.9.0 build 1 | รายการ archive ระบุ Android Honeycomb ARMv7 และไฟล์ `PE-a0.9.0-build1-armv7-hc.apk`; `aapt` รายงาน package `com.mojang.minecraftpe`, version `0.9.0` | `e2136f4fd73859b50b6b2ae69c25c1d4ad4b1b96c99064b9415dee775aeb6e9e` | **Primary sample** สำหรับโครงสร้างรุ่นต้นยุค |
| Minecraft PE Alpha 0.16.0.5 | รายการ archive ระบุ version 0.16.0.5 และไฟล์ APK; `aapt` รายงาน package `com.mojang.minecraftpe`, version `0.16.0.5` | `ab8d4076b9a944a06d2a7862ffc603768e215aef33521db4f69d33016e5c1cc6` | **Primary sample** สำหรับ resource-pack/UI schema รุ่นหลัง |
| Minecraft PE 0.9.0 จากอีก archive item | decoded manifest มี AppCloner, package `com.mojang.minecraftpf`, permissions/metadata เพิ่มจำนวนมาก | `9e85ce4c4fb4aad8828f111761197021a91f09755ef96568be5de9050c9b8942` | **Excluded** จากข้อสรุป architecture หลัก เพราะเป็น clone/modified sample |

แหล่งที่มาของรายการและข้อควรระวังด้านสิทธิ์บันทึกไว้ที่ [source log](./minecraft_pe_research_sources.md) และไม่มีไฟล์ APK ใดถูกนำเข้า repository ของ A_Survival

## 2. ภาพรวมสถาปัตยกรรมที่พบ

จาก manifest, file layout, decoded resources, class names และ ELF headers ภาพรวมสามารถแบ่งเป็นชั้นดังนี้

| ชั้น | หลักฐานที่พบ | บทเรียนที่ถ่ายโอนได้ไปยัง A_Survival |
|---|---|---|
| Android app shell | `MainActivity`, launcher intent, fullscreen theme, `sensorLandscape`, `configChanges` สำหรับ orientation/screen/touch และ `android.app.lib_name=minecraftpe` | ให้ shell รับผิดชอบ orientation, lifecycle, focus, cutout/safe-area และส่ง input ไปยัง game runtime; ในเว็บให้ `App`/`GameCanvas` ทำหน้าที่เทียบเท่า shell |
| Java/platform bridge | class names เช่น `MainActivity`, `ActivityListener`, `TextInputProxyEditTextbox`, `Minecraft_Market`, `NotificationListenerService`, Xbox/Facebook account/store classes | แยก platform adapter ออกจาก core game; A_Survival ควรมี browser adapter และอนาคต WebView/Android adapter โดยไม่ย้าย logic เกมไปอยู่ใน UI layer |
| Native game engine | `libminecraftpe.so` เป็น binary หลัก ARMv7; รุ่น 0.9.0 build1 มีประมาณ 11.4 MB, รุ่น 0.16.0.5 ประมาณ 29.3 MB; รุ่น 0.16 มี `libfmod.so` แยกสำหรับ audio | แยก runtime systems เป็น modules ของเรา เช่น world, render, input, inventory, persistence, audio; อย่ารวมทุกอย่างเป็น bundle เดียวบนเว็บ เพราะ browser ต้องการ code-splitting และ lazy loading |
| Content/resource layer | รุ่น 0.9 มี `assets/images`, atlas และ `.meta`; รุ่น 0.16 มี `assets/resourcepacks/vanilla`, `natural`, `city`, `fantasy`, `plastic`, `skins` พร้อม manifests | เกมต้องอ้าง logical IDs แล้ว resolve ผ่าน pack manifest; core ไม่ควร hard-code URL ของภาพหรือโมเดล |
| Render mapping | `terrain.meta`, `items.meta`, `terrain_texture.json`, `models/mobs.json`, `materials/terrain.material` | แยก logical asset mapping, texture atlas, geometry schema, material profile และ animation data ออกจาก entity/terrain logic |
| UI/input data | `client/ui/hud_screen.json`, `inventory_screen.json`, `ui_common.json`; custom renderers, binding collections, anchors และ hotbar grid | ทำ HUD/inventory เป็น declarative data + renderer ของเรา; touch controls ต้องเป็น action map ไม่ผูกกับ DOM component เดียว |
| Offline/content updates | resource pack directories, manifests, multiple variants และ paths ที่ stable | ใช้ pack version, namespace, hash, cache, override stacking และ compatibility checks; update ภาพโดยไม่แก้ gameplay code |
| Audio/feedback | `assets/sounds`, `sounds.json`, FMOD native library, `particles.png`, `fire_atlas.png` และ flipbook metadata | แยก SFX/ambient/particle/effect packs พร้อม budget; load เฉพาะ biome/session ที่ต้องใช้ |

## 3. App shell และ lifecycle

### 3.1 Orientation และ fullscreen

Clean 0.9.0 build1 รายงาน `sensorLandscape`, fullscreen no-title-bar, `android.hardware.screen.landscape`, support ของ small ถึง xlarge screen และ min/target SDK 11 สำหรับ sample นั้น ส่วน 0.16.0.5 ยังคง `sensorLandscape` และ fullscreen แต่เพิ่ม `configChanges` ครอบคลุม `screenLayout`, `smallestScreenSize`, `touchscreen` และ `uiMode` พร้อม min SDK 17 และ target SDK 22

**บทเรียนสำหรับ A_Survival:** orientation เป็น contract ระหว่าง shell กับ runtime ไม่ใช่เพียง CSS preference. เว็บต้องบังคับ gameplay layout ให้คิดเป็น landscape canvas, วัด `visualViewport`, ใช้ `env(safe-area-inset-*)`, ไม่วาง interactive control ใต้ cutout/navigation gesture bar และมี loading/error state หาก canvas ยังไม่มีขนาด

### 3.2 Activity และ native boundary

ทั้งสอง clean samples มี `MainActivity` เป็น launchable activity และประกาศ native library ชื่อ `minecraftpe`. รายชื่อ class ที่พบใน 0.16 ยังมี text-input proxy, activity listener, store/market, notification และ account-related services ซึ่งชี้ว่า app shell ทำหน้าที่เป็น bridge ระหว่าง OS กับ native engine ขณะที่ game engine อยู่ใน native library

**สิ่งที่ไม่ควรลอก:** ชื่อ package, class, permission, account/store integration หรือ implementation ของ Minecraft ไม่ใช่แบบแปลนที่ต้องนำมาใช้ตรง ๆ. A_Survival ใช้ Player ID แบบ local-first และไม่ต้องเพิ่ม account permissions เหล่านั้น

### 3.3 External file intent

Manifest 0.16 มี intent สำหรับ `minecraft:` URI และไฟล์ `.mcworld` / `.mcpack`. ในเชิงแนวคิด นี่คือ content import boundary ระหว่าง OS กับ game content

**การแปลงเป็นระบบของเรา:** ออกแบบ `Arcane Pack Import` ของเว็บ/อนาคต APK ให้รับเฉพาะ manifest/schema ของ `arcane-frontier`, ตรวจ namespace, version, hash, allowed file kinds และ size ก่อน cache; ไม่รับ arbitrary script และไม่แก้ core code

## 4. Content และ texture architecture

### 4.1 รุ่น 0.9.0: atlas + metadata

Clean 0.9.0 build1 มีไฟล์หลักดังนี้

| ไฟล์/กลุ่ม | หลักฐานจาก static inventory | หลักการ |
|---|---|---|
| `images/terrain-atlas.tga` | RGBA 512×256, ประมาณ 524 KB | เก็บ terrain tiles จำนวนมากใน atlas เดียวเพื่อลด texture handles และการโหลดซ้ำ |
| `terrain-atlas_mip0.tga` ถึง `mip3` | mip ที่ลดขนาดลง เช่น 256×128 | มีระดับ texture สำหรับระยะ/คุณภาพโดยไม่ต้องเก็บ texture แยกทุก tile |
| `images/terrain.meta` | JSON 16,994 bytes; record มี `name`, `uvs`, atlas dimensions 512×256 | logical name → UV rectangle/atlas; core ไม่ต้องรู้ตำแหน่งภาพแบบ hard-code |
| `images/items-opaque.png` | PNG 256×256 | item icon atlas ที่ browser-friendly สามารถเลียนแบบหลักการด้วย atlas ขนาดเล็กของเรา |
| `images/items.meta` | JSON 12,195 bytes; 151 named records; ส่วนใหญ่มี UV 1 ช่อง แต่บางรายการมีหลาย frame/variant | item ID → atlas UV และรองรับ animation/variant โดยใช้ metadata |
| `images/fire_atlas.png` | PNG 16×512 | effect animation แบบ strip/atlas |
| `images/particles.png` | PNG 128×128 | particle sprite atlas |
| `images/gui/touchgui.png` | PNG 256×256 | สื่อว่ารุ่น mobile มี UI artwork แยกจาก terrain/entity assets |

**ผลต่อ A_Survival:** pack ของเราควรมี `textures/terrain-atlas.png`, `textures/item-atlas.png`, `textures/entity-atlas.png` ขนาดเล็กตาม device tier พร้อม `atlas.json` ที่เก็บ logical asset IDs, UV, frame count, ticks และ fallback. ไฟล์ PNG/GLB ที่เป็นราย asset ยังควรมีไว้สำหรับ override/อัปเดตง่าย ส่วน atlas ใช้เมื่อ asset ถูกใช้ถี่และเหมาะกับ batching

### 4.2 รุ่น 0.16.0.5: resource packs และ variants

รุ่น 0.16 มีโฟลเดอร์ `assets/resourcepacks` หลายชุด ได้แก่ `vanilla`, `natural`, `city`, `fantasy`, `plastic`, `skins` และ `vanilla_vr`. Primary vanilla pack แยก `client` กับ `server` และมี manifest ของตัวเอง ขณะที่ทางเลือกอย่าง natural มี `pack_manifest.json`, UUID, version, module type resources, key art และ screenshots

`client/textures/terrain_texture.json` ระบุ `resource_pack_name`, `texture_name=atlas.terrain`, `padding=8`, `num_mip_levels=4` และ object `texture_data` ที่ map logical names เช่น `grass_side`, `stone`, `obsidian` ไปยัง texture paths, variants และ overlay colors. `flipbook_textures.json` แยก texture animation ออกมาเป็น records ที่มี `flipbook_texture`, `atlas_tile`, `frames`, `ticks_per_frame` และ `replicate`

**บทเรียน:** model, texture, animation, material และ palette variation ควรเป็นคนละ data contract. การเปลี่ยนภาพหรือ frame timing ไม่ควรแก้ระบบ movement/combat/world

## 5. Entity model และ animation mapping

`client/models/mobs.json` ใน 0.16 ใช้ geometry records เช่น `geometry.chicken` และ `geometry.blaze` โดยแต่ละ record มี `texturewidth`, `textureheight` และ `bones`. Bone มี `name`, `pivot`, `rotation` และ `cubes`; cube มี `origin`, `size` และ `uv`

นี่ชี้รูปแบบ **articulated low-poly/voxel model** ที่มี skeleton-like hierarchy กับ texture atlas แบบ 2D มากกว่าการสร้าง mesh ใหม่ทุก frame

**การออกแบบของ A_Survival:** ให้ GLB/mesh pack ของเราใช้ root entity + child visual nodes และเก็บ `boneMap`/`animationMap` เป็น metadata เมื่อ assets พร้อม; gameplay จะส่งเพียง state เช่น `idle`, `walk`, `run`, `dash`, `attack`, `hurt`, `dead` ให้ visual adapter. ถ้า GLB load ไม่สำเร็จ fallback จะเป็น pixel mesh แต่ metadata และ logical ID ยังเหมือนเดิม

## 6. Terrain material และ render performance

`materials/terrain.material` ของ 0.16 ระบุ `terrain_opaque` พร้อม `renderchunk.vertex`, `renderchunk.fragment`, defines เช่น `LOW_PRECISION`, `TEXEL_AA`, `ATLAS_TEXTURE`, vertex fields `Position`, `UV1`, `Color`, `UV0`, texture `atlas.terrain`, dynamic `Brightness` และ `SeasonFoliage`. มี variants สำหรับ fog, alpha, water, double-side, far rendering และ polygon offset เพื่อป้องกัน z-fighting

จากหลักฐานนี้สรุปได้ว่า render path ถูกออกแบบเป็น **chunk-oriented material variants** โดยมี low-precision/far variant และ texture atlas เป็นแกน ไม่ใช่การ draw cube แยกทุก block แบบไร้ batching

**การแปลงเป็น A_Survival:**

1. ใช้ chunk/module boundaries เช่น 16×16 หรือ 32×32 tile cells ตามการวัดจริง ไม่สร้าง mesh ใหม่ทั้งโลกทุก frame
2. merge static terrain geometry ต่อ biome/chunk และใช้ atlas UV
3. ใช้ quality tiers: low = nearest small atlas/no shadow/low effect density; medium = larger atlas/selected effects; high = farther view/effects เพิ่มขึ้น
4. ใช้ fog/far simplification และ culling ก่อนเพิ่ม post-process
5. แยก dynamic entities ออกจาก static terrain; update เฉพาะ visible/nearby actors
6. รักษา z-fighting rules ด้วย polygon offset หรือ layer separation เมื่อมี water/overlay/effect

เอกสาร Microsoft Learn ยังยืนยันหลักทั่วไปว่า texture ถูกโหลดเข้า memory ตาม dimensions หลัง decompress, atlas ช่วยลดการใช้ texture handles และ texture ที่ไม่ได้ใช้พื้นที่อย่างคุ้มค่าทำให้ memory สูงขึ้น [5] [6]

## 7. HUD, inventory และ touch interaction

`hud_screen.json` มี `namespace: hud`, custom renderers สำหรับ hotbar/heart/armor/hunger/bubbles/mob effects/vignette/cursor และ binding collections. Hotbar ใช้ grid collection และมี `anchor_from`/`anchor_to` แบบ `bottom_middle`; progress bar ถูกจัดเป็น control layers และมี binding เช่น `#exp_progress` กับ `#hotbar_grid_dimensions`

`inventory_screen.json` ใช้ item renderer ขนาด 16×16, tab images 24×23, grid/item templates และ button mappings สำหรับ select, take-all/place-all, half-stack, drop-one และ drop-all

**บทเรียนสำหรับเรา:**

| พฤติกรรม | การออกแบบใน A_Survival |
|---|---|
| เลือก slot | tap หนึ่งครั้ง select และแสดง selected state |
| ใช้ item | action button/context action หนึ่งตำแหน่งที่คงที่; ไม่บังคับ double-tap บนมือถือ |
| inventory | grid data-driven; cell มี item logical ID, icon path, quantity, tier, provenance state |
| HUD anchors | status top-left, map top-right, hotbar bottom-middle, joystick bottom-left, attack/action cluster bottom-right และทุกส่วนหัก safe-area |
| rendering | React เป็น shell/UI, Babylon เป็น world canvas, asset pack เป็น visual content |
| accessibility | ปรับ touch size, opacity, motion และ effect density ได้; ไม่ใช้ตำแหน่ง absolute ที่ทะลุ cutout |

## 8. Audio, localization และ feedback

รุ่น 0.16 แยกเสียงใน `assets/sounds` ตามหมวด mob, step, dig, jump, random, ambient, block, fire, liquid และอื่น ๆ รวมถึง `sounds.json`; มี fonts หลายชุดและ `.lang` หลายภาษา. รุ่น 0.9 มีชุดเสียงและ font/locale แบบ compact กว่า

**การแปลงเป็นของเรา:** ใช้ `sounds` เป็น pack kind แยกจาก `textures/models`, มี event IDs เช่น `player.step.ash`, `item.consume`, `combat.hit`, `biome.night`, และ locale keys ใน catalog. โหลดเฉพาะเสียงที่ biome/session ใช้จริงและมี silent fallback เมื่อ offline/low bandwidth

## 9. World generation และ save: สิ่งที่ static analysis ยืนยันไม่ได้

APK inventory มีคำและไฟล์ที่ชี้ถึง world/level/game systems ใน native/DEX strings และมี server-side content JSON ใน resource pack รุ่น 0.16 แต่การตรวจครั้งนี้ **ไม่สามารถยืนยัน** chunk size, seed algorithm, noise parameters, serialization format, tick scheduling หรือ frame-time budget จาก binary ที่ไม่มี source ได้โดยไม่ใช้ dynamic reverse engineering/execute ซึ่งอยู่นอกขอบเขตที่ปลอดภัยและไม่จำเป็นสำหรับการออกแบบ A_Survival

สิ่งที่นำมาใช้ได้อย่างปลอดภัยคือหลักระดับสถาปัตยกรรม: world state ควรแยกจาก renderer, generation ควร deterministic ต่อ seed/module, โหลดพื้นที่ใกล้ผู้เล่นก่อน, เก็บ persistent state เป็น module/region, และมี budget ต่อ frame. A_Survival จึงควรใช้ `WorldModule`, `ChunkStore`, `GenerationRecipe`, `VisibleRegionSystem` และ `MapStateStore` ของตัวเอง

## 10. Blueprint ของ A_Survival ที่ควรใช้แทนการเริ่มจากศูนย์

```text
App Shell / PWA / future WebView
  ├─ Orientation + VisualViewport + SafeArea adapter
  ├─ Player ID + Local profile + loading/error/offline gates
  ├─ Pack registry + manifest/hash/cache/override resolver
  ├─ UI shell (HUD, hotbar, inventory, tactical map, settings)
  └─ Input router (touch, keyboard, controller)

Game Runtime
  ├─ Session / tick clock / deterministic seed
  ├─ Player movement + stamina + combat + item action
  ├─ Entity registry + visual adapter (GLB/atlas/fallback)
  ├─ World modules + chunk/region generation + culling
  ├─ Resource interaction + encounter state
  ├─ Map state / fog / waypoints / harvest persistence
  ├─ Audio/effects event bus
  └─ Save/sync boundary (offline queue, integrity validation, future LAN transport)

Pack Content (replaceable without core edits)
  ├─ manifest.json + namespace + version + pack hash
  ├─ textures/terrain + atlas metadata + variants
  ├─ textures/entities + entity atlas metadata
  ├─ models/*.glb + visual metadata/bone map
  ├─ animations/*.json + frame/tick metadata
  ├─ icons/*.png + item catalog mapping
  ├─ ui/*.json + HUD skin/control theme
  ├─ effects/*.png/json + particle definitions
  ├─ audio/* + sound event mapping
  └─ maps/<map-id>/* + biome/landmark/encounter data
```

## 11. ข้อสรุป

รุ่นเก่าไม่ได้ทำให้เกมเร็วเพราะภาพเล็กเพียงอย่างเดียว แต่ใช้การแบ่งหน้าที่ที่ชัดเจน: **shell จัดการอุปกรณ์และ lifecycle, engine จัดการ world/render/tick, content อยู่ใน atlas/metadata/resource packs, UI ใช้ renderer + bindings, และ native/platform services แยกจาก gameplay**

A_Survival ไม่ควรคัดลอก implementation ของ Minecraft แต่ควรใช้ blueprint นี้เป็นหลักในการขยายระบบของตัวเอง. สิ่งที่มีหลักฐานชัดและควรดำเนินการต่อคือ manifest-driven pack resolver, atlas metadata, articulated visual adapter, chunk/visible-region render budget, data-driven HUD/inventory, quality tiers และ import/cache boundary. สิ่งที่ยังต้องวัดจากเกมของเราเองคือ frame time, draw calls, actual memory, device-safe-area และ performance บนโทรศัพท์จริง

## References

[1]: https://minecraft.wiki/w/Pocket_Edition_Alpha "Pocket Edition Alpha — Minecraft Wiki"
[2]: https://minecraft.wiki/w/Pocket_Edition_v0.8.0_alpha "Pocket Edition v0.8.0 alpha — Minecraft Wiki"
[3]: https://archive.org/details/pe-a-0.9.0-build-1-armv-7-hc "Minecraft PE Alpha 0.9.0 build 1 — Internet Archive"
[4]: https://archive.org/details/minecraft-pe-0.16.0.5 "Minecraft PE Alpha 0.16.0.5 — Internet Archive"
[5]: https://learn.microsoft.com/en-us/minecraft/creator/documents/resourcepack?view=minecraft-bedrock-stable "Introduction to Resource Packs — Microsoft Learn"
[6]: https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/improvingperformanceandresourceusage?view=minecraft-bedrock-stable "Improving performance and resource usage — Microsoft Learn"
