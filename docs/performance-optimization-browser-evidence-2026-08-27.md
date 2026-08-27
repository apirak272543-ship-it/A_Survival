# Runtime visibility optimization browser evidence — 2026-08-27

## Player flow smoke

หลังเริ่ม local dev server ด้วยโค้ด optimization หน้า `http://localhost:3000/` render เป็น `ARCANE FRONTIER` landing จริง และกด `เข้าสู่พื้นที่รอยต่อ` เปิด identity screen ได้. ช่อง Player ID และปุ่มยืนยันชื่อยังอยู่ตาม flow เดิม.

ยังไม่มีการอ้าง FPS/device acceptance จากขั้นตอนนี้.

## Identity and lobby

กรอก Player ID ทดลอง `OptiProof` และยืนยันได้จริง. Lobby แสดงชื่อโปรไฟล์, loadout, Home/Vault/Codex และปุ่ม `ออกสำรวจ เลือกแผนที่`; ไม่มี Creator Studio/Workbench controls ใน player UI. นี่เป็น smoke evidence ว่า spatial visibility policy ไม่ทำให้ local-first flow เสีย.

## Map/game entry

Map selector ยังคงแสดงเฉพาะ Obsidian Frontier พร้อมข้อความ vertical slice และรัศมี 500m; future maps ไม่ selectable/cache-prepared. กด `เข้าเล่นจากแคช` แล้ว Babylon canvas, HUD, hotbar และศัตรูในฉาก render ได้จริงหลัง optimization.

## Post-optimization telemetry

หลังรอประมาณ 2.6 วินาที อ่าน `.game-screen` ได้ `telemetryScope: qa`, `tier: balanced`, `effectiveTargetFps: 60`, `viewDistanceBlocks: 20`, `sampleWindowMs: 1095`, `renderedFrames: 9`, `throttledFrames: 0`, `averageFrameMs: 120.89`, `p95FrameMs: 131.7`, `worstFrameMs: 131.7`, `totalMeshes: 1342`, `activeMeshes: 418`, `hasCanvas: true`, `hasCreatorText: false`.

เทียบกับ baseline telemetry checkpoint ก่อนเพิ่ม spatial activation ที่อ่าน `activeMeshes: 610–630`, window แรก `renderedFrames: 7`, `averageFrameMs: 144.42–147.22` ได้เห็นการลด active mesh และ cadence ดีขึ้นใน sandbox รอบนี้. อย่างไรก็ตามนี่เป็น observation คนละ run ไม่ใช่ controlled benchmark และ cadence ยังต่ำกว่า effective target 60 FPS; ห้ามสรุปว่า optimization ผ่าน mobile/device acceptance หรือเป็นสาเหตุเดียวของการเปลี่ยนแปลง.
