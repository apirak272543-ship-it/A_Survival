# Runtime telemetry browser evidence — 2026-08-27

## Initial player flow

หลังเริ่ม local dev server ใหม่ หน้า `http://localhost:3000/` render เป็น player landing `ARCANE FRONTIER` จริง และไม่มีข้อความหรือ controls ของ Creator Studio/Creator Workbench. กด `เข้าสู่พื้นที่รอยต่อ` แล้วเปิด identity screen ตาม flow ปกติ โดย browser แสดงช่อง `ชื่อผู้เล่น / PLAYER ID` และปุ่ม `ยืนยันชื่อ`.

การตรวจครั้งนี้เป็น browser smoke ของ telemetry integration เท่านั้น ยังไม่ใช่หลักฐาน real-device FPS, memory, thermal หรือ GPU timing.

## Identity and lobby flow

กรอก Player ID ทดลอง `TelemetryProof` และกดยืนยันได้จริง. Player hub แสดงชื่อ `TelemetryProof`, loadout, ปุ่ม Home/Vault/Codex และ `ออกสำรวจ เลือกแผนที่`; ไม่พบ creator-only control ใน player hub. ขั้นตอนนี้ยืนยันว่า telemetry callback/DOM bridge ไม่ขัดกับ local-first identity และ lobby flow.

## Map selector guard

กด `ออกสำรวจ เลือกแผนที่` แล้ว map selector แสดงเฉพาะ `Obsidian Frontier`, ข้อความ `OBSIDIAN VERTICAL SLICE · เล่นได้ตอนนี้`, รัศมี `500m` และ footnote ระบุว่าแผนที่อื่นเป็นข้อมูลแผนงานหลังบ้าน ไม่เปิดให้เลือกหรือเตรียม cache ใน runtime.

## Runtime telemetry DOM evidence

กด `เข้าเล่นจากแคช` แล้ว Babylon canvas และ player HUD render จริง. หลังรอประมาณ 1.8 วินาที อ่าน `.game-screen` ได้ค่า: `data-telemetry-scope="qa"`, `data-performance-tier="balanced"`, `data-target-fps-budget="60"`, `data-view-distance-blocks="20"`, `data-telemetry-sample-window-ms="1039.5"`, `data-telemetry-rendered-frames="7"`, `data-telemetry-throttled-frames="0"`, `data-telemetry-average-frame-ms="147.22"`, `data-telemetry-p95-frame-ms="162"`, `data-telemetry-worst-frame-ms="162"`, `data-telemetry-total-meshes="1342"` และ `data-telemetry-active-meshes="610"`.

ทุก metric ที่อ่านเป็น finite number, `hasCanvas: true`, `visibleProfilerPanel: false` และไม่พบข้อความ `Creator Studio` หรือ `CREATOR WORKBENCH`. ค่า cadence ที่เห็นใน sandbox browser รอบนี้ต่ำกว่า requested/effective target 60 FPS อย่างชัดเจน; ถือเป็น **observation สำหรับใช้ปรับปรุงต่อ** ไม่ใช่ข้อพิสูจน์สาเหตุ, ไม่ใช่ real-device benchmark และไม่ควรยกระดับเป็น performance acceptance.

## Settled-window observation

หลังรอเพิ่มประมาณ 2.2 วินาทีและอ่าน window ถัดไป ได้ `sampleWindowMs: 1017.4`, `renderedFrames: 7`, `throttledFrames: 0`, `averageFrameMs: 144.42`, `p95FrameMs: 152.6`, `worstFrameMs: 152.6`, `totalMeshes: 1342`, `activeMeshes: 630`, `tier: balanced`, `effectiveTargetFps: 60`. ฉากยัง render ต่อและ metrics เป็น finite แต่ cadence ใน sandbox ยังคงประมาณ 7 rendered frames ต่อ window; ไม่ควรอ้างสาเหตุหรือใช้แทน real-device benchmark. ค่านี้เป็น baseline ที่ชี้ว่าควรทำ optimization/วัดซ้ำใน checkpoint ถัดไป.
