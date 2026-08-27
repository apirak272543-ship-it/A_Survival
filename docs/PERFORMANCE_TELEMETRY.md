# Structured Runtime Performance Telemetry

เอกสารนี้กำหนด telemetry snapshot สำหรับตรวจสอบ **browser runtime ของ Obsidian Frontier vertical slice** แบบ bounded และ browser-safe. เป้าหมายคือให้ QA/creator-side tooling ในอนาคตอ่านหลักฐานเชิงโครงสร้างได้ โดยไม่ส่งข้อมูลออกนอกเครื่อง ไม่เขียนลง player save และไม่เพิ่ม profiler panel เข้า player HUD

## ขอบเขตของ snapshot

snapshot เกิดจาก render loop ที่มีอยู่แล้วใน `GameCanvas` และถูกสรุปเป็นช่วงเวลา ไม่ใช่การบันทึกทุก frame ลง React state. sampler เก็บข้อมูลใน memory เฉพาะช่วงปัจจุบัน มีขนาด frame interval จำกัด และปล่อย snapshot หลังครบ sample window จากนั้น reset เพื่อไม่ให้ข้อมูลสะสมไม่สิ้นสุด

| Field | ความหมาย | ข้อจำกัดในการตีความ |
|---|---|---|
| `tier` | performance profile ที่ active | เป็นค่าที่ผู้ใช้เลือก/normalize ไม่ใช่ device detection |
| `effectiveTargetFps` | ceiling ที่ profile อนุญาต | เป็น render-loop policy ไม่ใช่ FPS ที่ GPU ทำได้จริง |
| `sampleWindowMs` | เวลาจริงของช่วงที่สรุป | window ของ browser tab นั้น อาจถูกรบกวนด้วย background throttling |
| `renderedFrames` | จำนวนครั้งที่ `scene.render()` ถูกเรียก | ไม่ใช่ GPU-present count และไม่ใช่ frame pacing ของอุปกรณ์จริง |
| `throttledFrames` | จำนวน render-loop callbacks ที่ถูก skip เพราะ target cadence | ไม่รวม frame ที่ browser ไม่เรียก callback เลย |
| `averageFrameMs` | ค่าเฉลี่ยช่วงห่างระหว่าง rendered frames | เป็น wall-clock cadence รวม throttle/scheduling ไม่ใช่ CPU/GPU render time |
| `p95FrameMs` | percentile 95 ของช่วงห่างที่เก็บไว้ | มีความหมายเฉพาะใน sample window และถูกจำกัดจำนวนตัวอย่าง |
| `worstFrameMs` | ช่วงห่างที่สูงสุดในตัวอย่าง | ไม่ใช่ thermal spike หรือ long-run benchmark |
| `totalMeshes` | จำนวน mesh ใน Babylon scene ตอนปิด window | เป็น scene metadata snapshot ไม่ใช่ draw-call count |
| `activeMeshes` | จำนวน active meshes ตอนปิด window | เป็น Babylon active-mesh metadata; ไม่ใช่ occlusion/GPU visibility proof |

ค่าเวลาถูกปัดให้เหมาะกับ QA และค่าที่ไม่มี sample จะไม่ถูกสร้างเป็น `0` ปลอม. Snapshot ไม่มี player ID, item data, world content payload, credential, URL หรือ network upload

## Sampling policy

sampler ใช้ default window หนึ่งวินาทีและเก็บ frame intervals ได้ไม่เกิน 120 ค่า. การเรียก `recordRender` เกิดหลัง `scene.render()` ใน loop ที่มีอยู่แล้ว; การอ่าน mesh counts จะเกิดเฉพาะตอนปิด window ไม่ใช่ทุก frame. callback ไปยัง React เกิดอย่างมากประมาณหนึ่งครั้งต่อ window และไม่มีการเรียก generator, asset loader หรือ definition recalculation ใน sampler

เมื่อ profile หรือ requested view/FPS เปลี่ยน `GameCanvas` เปลี่ยน budget reference ที่ loop ใช้ต่อไป; snapshot จึงประกาศทั้ง `tier` และ `effectiveTargetFps` ที่ใช้กับ render cadence ของช่วงนั้น. Metrics ถูกส่งผ่าน prop callback เฉพาะใน memory และสะท้อนเป็น `data-*` attributes บน `.game-screen` เพื่อให้ browser QA อ่านได้โดยไม่รบกวนภาพผู้เล่น

## Acceptance และ non-claims

การทดสอบ unit ต้องครอบคลุม bounded sample count, skipped/rendered accounting, percentile/rounding, reset ระหว่าง windows และ no-sample behavior. Browser smoke ต้องเห็น canvas จริง, `data-telemetry-scope="qa"`, metrics ที่เป็น finite values และไม่มี Creator Studio/Workbench text ใน player page

หลักฐานนี้ไม่รับรอง mobile FPS, memory, thermal, battery, WebView, WebGL/WebGPU capability, draw calls, GPU time, occlusion culling, object pooling, adaptive tier switching, airplane mode หรือ reconnect. การเพิ่ม telemetry ไม่เปลี่ยน Obsidian-only runtime allow-list และไม่ทำให้ future maps selectable/cache-prepared/playable
