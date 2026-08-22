# MAP_010 Asset Manifest

Gemini plan มี Thai fields **“สร้างพร้อมสำหรับ…”** และ **“จุดประสงค์ของภาพ…”** ครบสำหรับ NPC, regular, elite, boss และ resource แล้ว จึงสร้าง visual assets ด้วย Pollinations `flux`, 768×768, `nologo=true` และ seed ที่เก็บไว้ใน `/home/ubuntu/webdev-static-assets/arcane-map010/manifest.json` รวมถึง focused replacement seeds 10110–10114.

| Role | Runtime URL | Source candidate / review outcome |
|---|---|---|
| Void Wanderer | `/manus-storage/void-wanderer-final_388eac96.jpg` | replacement seed 10110; silhouette/staff ดี แต่มี noise คล้าย text ขนาดเล็กที่ขอบล่าง |
| Void Larva | `/manus-storage/void-larva_17e9a4a9.jpg` | original seed 10011; contrast ดี แม้ silhouette ออกแนว orb มากกว่า larva |
| Rift Horror | `/manus-storage/rift-horror_7749a2c0.jpg` | original seed 10012; elite silhouette ชัด |
| Void Singularity | `/manus-storage/void-singularity_6a946640.jpg` | original seed 10013; ไม่มี text แต่มี seam เล็กเมื่อขยายเต็มภาพ |
| Void Essence | `/manus-storage/void-essence-final_17daa419.jpg` | replacement seed 10114; crystal resource ตรง brief |

ผลตรวจอยู่ที่ `/home/ubuntu/webdev-static-assets/arcane-map010/visual-review.md`. Asset ทั้งหมดเป็น 2D billboard textures ของต้นแบบ ไม่ใช่โมเดล 3D, animation หรือ sound set.
