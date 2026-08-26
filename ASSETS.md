# Asset Manifest

## Visual target

The visual target will be a 16:9 landscape scene of **Obsidian Frontier**, showing an isometric survivor in a ruined obsidian alien settlement surrounded by cyan ley-lines, violet energy mist, glowing xeno-plants, a pet companion and threatening zombies. It is the reference for scene density, palette, camera angle and mobile HUD contrast.

## Planned game assets

| Asset | Game use | Rendering path | Status |
| --- | --- | --- | --- |
| Obsidian Frontier visual target | Art direction and Landing background | Local pack `art/obsidian-frontier-key-art.jpg` | Implemented in pack v0.3.0 |
| Anime survivor character sheet | Player, Lobby and in-game presentation | Pack `art/obsidian-survivor.png` plus `models.survivor.glb` | Starter slice implemented |
| Arcane weapon and item icon sheet | Inventory, loadout and HUD | Gemini-directed icon visual | Planned |
| Impact VFX language sheet | Slash, arcane, projectile and harvest effects | Gemini-directed FX visual | Planned |
| Obsidian terrain texture | Ground material | Pack `textures/terrain/*.png`, 16×16 nearest tiles | Implemented for MAP_001 |
| Xenoflora emissive sheet | Biome flora/resource billboards | Pack `art/obsidian-*.png`, separate manifest IDs | Implemented for MAP_001 starter slice |
| Arcane-cyber rune decal | Pylons, portals and UI texture | Generated texture | Planned |
| Pet companion portrait | Lobby/Pet HUD art | Pack `art/obsidian-companion.png` plus `models.companion.glb` | Starter slice implemented |
| Weapon glyphs | HUD and inventory categories | Procedural/CSS icon treatment for MVP | Planned |

The managed-storage/JPEG records below are historical presentation assets and are not the gameplay pack source of truth. Current gameplay visuals use the local, hash-verified `arcane-frontier-voxel-pixel` pack described in the section below. Future generated or artist-authored files may be added to that pack without changing gameplay code; each visible asset must be registered by logical asset ID and manifest entry.

## Generated asset record — MAP_001

| Property | Value |
| --- | --- |
| Asset | Obsidian Outpost environment key art |
| Local source | `/home/ubuntu/webdev-static-assets/map001-obsidian-outpost.jpg` |
| Prompt source | Gemini `gemini-3.5-flash`, stored in `gemini_arcane_pollinations_brief_response.json` |
| Pollinations settings | `flux`, seed `847291`, with prompt metadata in `map001-obsidian-outpost.meta.json` |
| Intended use | MAP_001 loading background and atmospheric scene art |
| Visual validation | 1024×576 JPEG with no text, logo, UI, or frame; dark obsidian-blue palette with cyan light and violet foreground detail |

The generated composition is cinematic and wide rather than fully top-down, so it will be used first for loading transitions and atmospheric presentation. A later asset brief will produce a gameplay-specific top-down terrain texture and character sprites.

## Generated asset pack — MAP_001 characters

| Asset | Pollinations model / seed | Visual validation | Intended placement |
| --- | --- | --- | --- |
| `survivor-hero.jpg` | `flux` / `204593` | 768×768 dark, full-body hooded survivor silhouette with strong cyan backlight and paired blades; no text or UI | Lobby character key art, loading art and temporary player portrait/plane texture |
| `glass-stalker-monster.jpg` | `flux` / `883012` | 768×768 full-body quadruped obsidian beast with violet crystalline spine; no text or UI | Glass Stalker enemy portrait and temporary in-world sprite/plane texture |

Both assets were generated from the Gemini MAP_001 asset-pack brief and are stored under `/home/ubuntu/webdev-static-assets/` with a sidecar metadata file containing prompt, seed, model and Pollinations URL for reproducibility.

| Asset | Pollinations model / seed | Visual validation | Intended placement |
| --- | --- | --- | --- |
| `ley-crystal-resource.jpg` | `flux` / `551024` | 768×768 obsidian crystal mass with a central cyan energy seam; no text or UI | Ley Crystal resource node and inventory/harvest art |
| `void-reaper-boss.jpg` | `flux` / `910482` | 768×768 alien skull-like Void Reaper silhouette inside a violet-blue energy ring; no text or UI | Night-event boss alert portrait and temporary boss sprite/plane texture |

The resource art needs an alpha/colour-key treatment before use directly over terrain. The boss composition is especially suitable for the warning overlay described by Gemini, while the readable energy ring can become the event marker in the map HUD.

## In-engine verification

หลังลงทะเบียน Babylon legacy shader modules ฉาก MAP_001 แสดง mesh และ asset texture ได้จริงในมุมกล้อง top-down. การตรวจภาพพบว่า texture plane บางชิ้นกลับด้านใน Babylon และบอสแสดงใหญ่เกิน safe zone ของ HUD จึงต้องใช้ `vScale = -1` หรือ `invertY` กับ texture asset และลดขนาด/ย้าย boss event ให้เป็น warning overlay ที่อ่านง่ายกว่าการวางเต็มจอในฉาก.

การตรวจ Landing และ Lobby หลังนำ hero asset มาใช้ยืนยันว่าภาพจาก managed storage แสดงได้บนทั้งสองหน้า แต่ไฟล์ JPEG มีฉากหลังดำมาพร้อมภาพ จึงต้องใช้ blend treatment และ framing เพิ่มเติมเพื่อให้ตัวละครผสานกับฉาก UI แทนการดูเป็นกรอบรูปสี่เหลี่ยม.

## MAP_001 gameplay slice — review pass 1

| Asset | Gemini/Pollinations setting | Visual validation | Intended use |
| --- | --- | --- | --- |
| `commander-koral-portrait.jpg` | `flux` / seed `42` | 512×512 close-up ของทหารผ่านศึกโทน blue-grey, armor มีร่องรอยศึก, ไม่มีข้อความ | Portrait ใน objective/interaction ของ Commander Koral; ไม่ใช้เป็น world sprite โดยตรง |
| `crashed-leyline-monolith.jpg` | `flux` / seed `108` | ภาพ landmark หินดำขนาดใหญ่กับพลัง cyan, ฉากหลังมืดอ่าน silhouette ได้ | Textured landmark plane และ backdrop/telegraph ของ Void Reaper; ไม่ใช้เป็น terrain tile |
| `obsidian-golem-elite.jpg` | `flux` / seed `777` | 512×512 elite silhouette สีดำ มีรอยพลัง orange-red, ท่ายืนอ่านง่าย, ไม่มีข้อความ | Plane texture สำหรับ elite Obsidian Golem และ event warning |
| `frontier-alloy-icon.jpg` | `flux` / seed `99` | 256×256 ingot มืด รอยพลังสีส้ม, พื้นหลังเข้ม, ไม่มีข้อความ | Reward icon ใน HUD/telegraph ของ alloy drop |

ทั้งสองไฟล์เป็น JPEG ที่ยังมีพื้นหลัง จึงใช้เป็น Billboard/portrait/overlay ที่มี backing panel และ glow ได้ทันที แต่ไม่ใช่ transparent sprite จนกว่าจะมี asset pass ที่สร้าง alpha-safe art เพิ่มเติม.

| Asset | Managed storage URL |
| --- | --- |
| Commander Koral portrait | `/manus-storage/commander-koral-portrait_06a487e5.jpg` |
| Crashed Leyline Monolith | `/manus-storage/crashed-leyline-monolith_35d89c1e.jpg` |
| Elite Obsidian Golem | `/manus-storage/obsidian-golem-elite_a0a82e7e.jpg` |
| Frontier Alloy icon | `/manus-storage/frontier-alloy-icon_1192ae58.jpg` |

## Companion asset review

| Asset | Gemini/Pollinations setting | Visual validation | Intended use |
| --- | --- | --- | --- |
| `arcane-cyber-fox.jpg` | `flux` / seed `4209182` | 768×768 fox companion สีน้ำเงิน มีชุดเกราะ arcane; มีภาพ reference หลายมุมและตัวอักษร artifact เล็กน้อยจึงต้อง crop/framing ใน plane | Companion billboard ระหว่างฉากสำรวจ; ใช้ centre subject เป็นหลัก |
| `arcane-cyber-fox-hud-icon.jpg` | `flux` / seed `882910` | 512×512 portrait ใบหน้าจิ้งจอกตาสี cyan ในวงแหวนสีอ่อน, contrast ดี, ไม่มีข้อความ | HUD avatar และ follow-toggle ในจอมือถือแนวนอน |

| Asset | Managed storage URL |
| --- | --- |
| Arcane Cyber Fox companion | `/manus-storage/arcane-cyber-fox_d0832d7b.jpg` |
| Arcane Cyber Fox HUD icon | `/manus-storage/arcane-cyber-fox-hud-icon_d96b6bd0.jpg` |

## Current modular gameplay pack — Arcane Frontier v0.3.0

The authoritative gameplay pack is `client/public/assets/packs/arcane-frontier-voxel-pixel/`. Its `manifest.json` uses namespace `af`, nearest sampling, a 480×270 logical design surface, per-entry SHA-256 values and a deterministic `packSha256`. Version 0.3.0 adds separate replaceable Obsidian Frontier key art, survivor/companion/enemy presentation art, flora/resource/landmark PNGs, and terrain-family bindings. The pack also contains separate PNG entity, terrain and item/icon files, five articulated starter GLB models, terrain/item/entity atlases, and declarative atlas/animation metadata. The runtime resolves logical IDs such as `models.survivor`, `entities.enemy`, `items.seed`, `terrain.obsidian`, `art.obsidian.crystal-fern`, `data.atlas` and `data.animations`; gameplay logic does not need to change when a registered file is replaced.

| Pack domain | Current path | Runtime contract | Status |
| --- | --- | --- | --- |
| Entity textures | `textures/entities/*.png` | `entities.*` | Starter-authored from Gemini brief; nearest 32×32 PNG |
| Terrain textures | `textures/terrain/*.png` | `terrain.*` | Starter-authored from Gemini brief; nearest 16×16 PNG |
| Item icons | `icons/*.png` | `items.*` | Starter-authored from Gemini brief; displayed by hotbar asset IDs |
| Articulated models | `models/*.glb` | `models.*` | Separate GLB files with embedded PNG; fallback-first loading |
| Atlas metadata | `metadata/atlas.json` | `data.atlas` | Declarative logical-to-UV mapping for future batched materials |
| Animation states | `metadata/animations.json` | `data.animations` | Declarative idle/walk/run/dash/attack/hurt/dead timing; GLB clips remain future work |

The previous Gemini image endpoint was quota-blocked. The current v0.3.0 compact files were prepared with the built-in image-generation route from an original Google/Gemini visual direction; they are explicitly **starter-authored from a Google/Gemini visual brief**, not falsely labelled as Gemini-generated images. The high-resolution source concepts and crop script are kept outside the repository audit workspace. When Gemini image generation or an artist pipeline becomes available, replacement files should preserve asset IDs, update the manifest hash, and pass the same visual, size, transparency and browser-loading checks.


## Future content library starter pack — v0.1.0

`client/public/assets/packs/a-survival-content-library-v0-1/` เป็น pack แยกสำหรับคลัง content ในอนาคต ไม่ถูก import โดย Obsidian Frontier runtime ใน checkpoint นี้. Pack ใช้ namespace `afc`, nearest sampling และมี 16 PNG entries ได้แก่ terrain 4 รายการ (`obsidian-frontier`, `aether-crystal`, `verdant-humus`, `ashen-volcanic`) และ icon 12 รายการสำหรับ plant, weapon และ material. ทุก entry มี SHA-256, logical ID, `procedural-starter-authored` source และ provenance reference นี้

`server/generators/generateStarterTexturePack.py` สร้าง pack แบบ deterministic เพื่อให้ generate once → store → reuse ได้โดยไม่ผูกกับ AI image quota. ไฟล์นี้เป็น **original procedural starter art** ไม่ใช่ Minecraft asset, ไม่ใช่ Gemini-generated image และไม่ใช่ final art coverage ของ definitions 3,000 รายการ. เมื่อมี image/artist pipeline ในอนาคต ให้แทนที่ตาม logical IDs เดิม, อัปเดต manifest hash และผ่าน visual, size, alpha, provenance และ browser-loading checks ก่อน runtime ใช้จริง

| Pack | Entries | Status | Runtime boundary |
| --- | ---: | --- | --- |
| `arcane-frontier-voxel-pixel` | 30+ | Current Obsidian gameplay pack | Runtime-allowed, namespace `af` |
| `a-survival-content-library-v0-1` | 16 | Future content starter pack | Future-library-only, namespace `afc`; ไม่ selectable/player-facing |


## Future content library — Builder-owned migration v0.1.0

`client/public/assets/packs/a-survival-content-library-builder-v0-1/` คือผลลัพธ์จากการอ่าน procedural starter pack v0.1.0 แล้วส่ง pixel RGBA ทุกไฟล์เข้า `server/generators/texturePackBuilder.ts` ผ่าน `server/generators/migrateStarterTexturePack.ts`. Pack ใหม่นี้มี 16 entries เดิมในรูปแบบ Builder manifest `a-survival.texture-pack.v1`, namespace `afc-builder`, nearest sampling, per-entry PNG SHA-256, `packSha256` `f8abe22704a1d99290c770bcc028088d1c34b4a82c1a510bbcda6195efb0d4bb` และ `provenance.json` ที่อ้าง source pack เดิม.

สถานะ `procedural-starter-authored` ของ source pack ถูกเก็บไว้ใน provenance record ส่วน field ที่ Builder รองรับใช้ `starter-authored` เพื่อให้ผ่าน schema โดยไม่เรียกไฟล์เหล่านี้ว่า AI-generated. Output ยังคงเป็น original procedural starter art, ไม่ใช่ Minecraft asset และยังเป็น `future-library-only`; ไม่มีการเพิ่ม import หรือ runtime allow-list ให้ pack นี้.

| Pack | Generator path | Entries | Runtime boundary |
| --- | --- | ---: | --- |
| `a-survival-content-library-v0-1` | `generateStarterTexturePack.py` | 16 | Future-only source pack |
| `a-survival-content-library-builder-v0-1` | `migrateStarterTexturePack.ts` → `texture.pack@1.0.0` | 16 | Future-only Builder output, not imported by Obsidian runtime |

Migration tests ยืนยันการ decode non-interlaced 8-bit PNG, 4 tile entries + 12 icon entries, RGBA geometry, per-file digest, manifest equality, provenance status และ output pack hash. การ migrate นี้ยังไม่ใช่การขยาย coverage ของ catalog 3,000 definitions และยังไม่ใช่ final visual acceptance บนอุปกรณ์จริง.
