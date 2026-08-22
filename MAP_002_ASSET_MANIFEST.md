# MAP_002 Ashen Obsidian Plains — Pollinations Asset Manifest

ภาพทั้งหมดด้านล่างได้รับ brief จาก Gemini ก่อน แล้วสร้างผ่าน Pollinations (`flux`, `768×768`, `nologo=true`) และต้นฉบับ/metadata อยู่ที่ `/home/ubuntu/webdev-static-assets/arcane-map002/` ตาม policy asset ของโครงการ.

| Asset | Managed storage URL | Seed | Integration |
|---|---|---:|---|
| Scavenger Jax | `/manus-storage/scavenger-jax_5e8c7328.jpg` | 429182 | safe-zone NPC billboard |
| Ash Crawler v2 | `/manus-storage/ash-crawler-v2_63661c7a.jpg` | 882105 | regular enemy billboard |
| Obsidian Shell Golem | `/manus-storage/obsidian-shell-golem_6ec8be90.jpg` | 105923 | elite telegraph billboard |
| Pyroclastic Behemoth | `/manus-storage/pyroclastic-behemoth_2fdfe2eb.jpg` | 773012 | boss telegraph billboard |
| Ember Ore v2 | `/manus-storage/ember-ore-v2_8fe7e31d.jpg` | 334952 | resource node/altar billboard |

> Visual review: Scavenger Jax, Ash Crawler v2, elite and boss pass silhouette use for a 2D billboard prototype. Ember Ore v2 is accepted as a clear glowing resource node. The assets are scene illustrations rather than transparent sprite sheets; the Babylon material therefore keeps `backFaceCulling=false` and uses their intentional dark environmental background.
