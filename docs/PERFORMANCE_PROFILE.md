# Runtime Performance Profiles

เอกสารนี้อธิบาย **นโยบาย performance แบบ explicit ที่ผู้เล่นเลือกเอง** ใน Obsidian Frontier vertical slice ณ วันที่ 27 สิงหาคม 2026. เอกสารนี้ไม่ใช่ผล benchmark บนอุปกรณ์จริง และไม่ใช่คำประกาศว่าเกมรองรับ FPS, memory, thermal หรือ WebView ทุกระดับแล้ว

## หลักการ

ระบบยึดกฎ `Generate Once → Store → Cache → Reuse`: definition และ content catalog ไม่ถูก generate ซ้ำใน render frame; runtime ใช้ข้อมูลที่เตรียมไว้, asset/scene state ที่ cache แล้ว และทำเฉพาะ simulation/visibility ที่จำเป็นกับผู้เล่น. Performance profile เป็น data contract ใน `client/src/game/systems/performanceProfile.ts` ไม่ใช่การตรวจจับสเปกเครื่องอัตโนมัติ

> ค่าระยะทั้งหมดเป็น **budget policy** สำหรับ runtime slice ไม่ใช่การรับรองว่าทุก object ในระยะดังกล่าวถูก render หรือ simulation พร้อมกันบนอุปกรณ์จริง

## โปรไฟล์ที่มี

| โปรไฟล์ | เป้าหมาย | View budget | Mob simulation | Animation | Physics | Target FPS ceiling | Visual budget |
|---|---|---:|---:|---:|---:|---:|---|
| `low` / `ประหยัดอุปกรณ์` | ลดภาระเครื่องและเหมาะกับการทดสอบ low-end policy | 15 blocks | 24m | 24m | 16m | 30 | particles 80, shadows off, LOD aggressive |
| `balanced` / `สมดุล` | ค่ากลางสำหรับ vertical slice | 35 blocks | 40m | 48m | 32m | 60 | particles 160, shadows low, LOD balanced |
| `high` / `คุณภาพสูง` | เพิ่ม budget ที่อนุญาตใน browser runtime | 50 blocks | 64m | 96m | 64m | 120 | particles 320, shadows high, LOD detailed |

ค่าที่ใช้จริงต้องผ่าน `resolvePerformanceBudget`; tier ที่ไม่รู้จักหรือ malformed fallback เป็น `balanced`. ค่า view distance ยังถูก clamp ให้ไม่เกินขอบเขตของ Obsidian 500m runtime contract

## จุดที่เชื่อมกับ runtime

`GameSettings.performanceTier` ถูก normalize และ persist แบบ backward-compatible ใน local-first session state โดย default เป็น `balanced`. Global Settings แสดงตัวเลือกภาษาไทยแยกจาก In-map Settings และไม่ใส่ creator controls เข้า player HUD

`GameCanvas` รับ tier แล้วคำนวณ effective render-loop cadence จาก budget ของ tier. ค่า `targetFps` ที่ผู้เล่นเลือกใน In-map Settings ยังคงเป็น requested target; `data-target-fps-budget` บน `.game-screen` แสดง ceiling ที่ tier อนุญาต เพื่อให้ QA แยกสองค่านี้ได้อย่างชัดเจน

`scene.ts` นำ budget เดียวกันไปใช้กับ streaming metadata, plant animation/update radius, enemy distance checks, enemy sleep/wake และ snapshot metadata. ค่า `viewDistanceBlocks` ใน snapshot คือค่าที่ผู้เล่นร้องขอหลัง clamp; ตารางด้านบนคือเพดานของแต่ละ tier. การปรับ budget จึงเป็นการเปลี่ยน policy ของ runtime ที่มีอยู่ ไม่ใช่การสร้างโลก/texture/model/animation ใหม่ระหว่าง render

## หลักฐานที่ผ่านแล้ว

Focused tests ของ performance policy, render distance, visible region และ offline map state ผ่าน `4` test files / `18` tests. Full suite ผ่าน `65` test files / `254` tests. `pnpm check`, `git diff --check` และ production build ผ่าน โดย build ยังคงมี warning เดิมเกี่ยวกับ analytics placeholders และ Babylon vendor chunk ขนาดใหญ่

Browser evidence ใน `docs/performance-profile-browser-evidence-2026-08-27.md` ยืนยันว่าเลือก `ประหยัดอุปกรณ์` จาก Global Settings ได้จริง, profile `low` ของ `PerfProof` แสดง `15` view / `24m` mob / `24m` animation / `16m` physics และ effective FPS ceiling `30`, ส่วน profile `balanced` ของ `PerfAfterPatch` แสดงค่าที่ร้องขอ `20` blocks (ต่ำกว่าเพดาน `35`), `40m` / `48m` / `32m` และ effective `60`. ทั้งสองเส้นทางแสดง Babylon canvas จริงและไม่แสดง Creator Studio/Workbench controls. Map selector แสดงเฉพาะ Obsidian Frontier รัศมี 500m

## ขอบเขตที่ยังไม่อ้าง

งานนี้ยังไม่ใช่ adaptive device-tier system: ไม่มี WebGL/WebGPU/CPU/GPU/RAM capability detection, short benchmark, hysteresis หรือ auto-switching. ยังไม่มี unified implementation ที่พิสูจน์ครบสำหรับ occlusion culling, frustum culling ทุก object, object pooling, full LOD controller, shadow/texture streaming, structured telemetry/profiler หรือ mobile WebView integration

ยังไม่มีหลักฐาน real-device FPS, memory, thermal, battery, airplane mode, reconnect/resync หรือ acceptance บนขนาดหน้าจอและอุปกรณ์จริง. `target FPS` จึงเป็น policy ceiling/render-loop clamp ใน browser runtime เท่านั้น ไม่ใช่การรับประกัน FPS

ระบบยังคง Obsidian-only: future map records อาจอยู่ใน backend/content data ตามข้อกำหนด แต่ไม่ selectable, ไม่ cache-prepared และไม่ playable. Creator Studio และ Creator Domain Workbench เป็นเส้นทาง developer/admin-only แยกจาก player UI และไม่ถูกเปิดด้วย performance profile
