# Asset Manifest

## Visual target

The visual target will be a 16:9 landscape scene of **Obsidian Frontier**, showing an isometric survivor in a ruined obsidian alien settlement surrounded by cyan ley-lines, violet energy mist, glowing xeno-plants, a pet companion and threatening zombies. It is the reference for scene density, palette, camera angle and mobile HUD contrast.

## Planned game assets

| Asset | Game use | Rendering path | Status |
| --- | --- | --- | --- |
| Obsidian Frontier visual target | Art direction and Landing background | Gemini-directed JPEG reference image | Generation queued |
| Anime survivor character sheet | Player, Lobby and in-game presentation | Gemini-directed character visual | Planned |
| Arcane weapon and item icon sheet | Inventory, loadout and HUD | Gemini-directed icon visual | Planned |
| Impact VFX language sheet | Slash, arcane, projectile and harvest effects | Gemini-directed FX visual | Planned |
| Obsidian terrain texture | Ground material | Generated texture on procedural ground | Planned |
| Xenoflora emissive sheet | Biome prop texture | Generated sprite/plane texture | Planned |
| Arcane-cyber rune decal | Pylons, portals and UI texture | Generated texture | Planned |
| Pet companion portrait | Lobby/Pet HUD art | Generated square asset | Planned |
| Weapon glyphs | HUD and inventory categories | Procedural/CSS icon treatment for MVP | Planned |

All final generated visual assets will be held outside the project source tree and referenced through managed storage URLs.

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
