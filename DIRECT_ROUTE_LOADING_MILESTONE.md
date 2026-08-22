# Direct Route & Cache-Aware Loading Milestone

Direct entry รองรับ `?route=lobby`, `?route=maps`, `?route=home`, และ `?route=game&map=<mapId>` รวมถึง URL `?demo=` เดิม. Route ที่ระบุ map ใช้ loading pipeline เดียวกับการกด Expedition ในเกม: hydrate session → Cache Storage check → map/key-art preparation → transition ไป scene.

| Scenario | ผลลัพธ์ที่ตรวจแล้ว |
|---|---|
| `?route=home` | เข้า Aether Homestead หลัง transition โดยไม่ข้าม session hydration |
| `?route=game&map=ashen-hellscape` | เข้า scene ของ map ที่เลือกหลัง cache-aware preparation |
| Online first map load | เขียน module metadata, fetch key art และคืน `ready: true` |
| Offline cached map | ไม่ fetch เพิ่มและคืน `ready: true` |
| Offline uncached map | ไม่สร้าง cache record เทียม, คง LoadingGate แล้วไป Maps พร้อมข้อความไทย |
| Unknown route/map | กลับ Landing หรือ MAP_001 อย่าง deterministic |

> ข้อจำกัด PWA: milestone นี้ตรวจ cache contract ด้วย Vitest และตรวจผลลัพธ์ route ใน browser. ยังไม่มี network-emulation UI test ที่จับภาพ LoadingGate ระหว่าง frame, Babylon ready handshake timeout หรือ Workbox-grade precache manifest.
