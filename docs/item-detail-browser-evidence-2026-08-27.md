# Item detail browser evidence — 2026-08-27

## Current observation

เปิด `http://localhost:3000/` สองครั้งหลังเริ่ม local dev server แล้ว browser viewport ยังเป็นสีขาว ไม่มี interactive element และไม่มี DOM text ที่ยืนยัน player root ได้ จึงยัง **ไม่ใช่หลักฐานว่า player runtime หรือ item-detail UX render สำเร็จ**.

## Diagnostic context

การเริ่ม server ครั้งแรกด้วย detached command ล้มด้วย `EBADF: bad file descriptor, read` ก่อน listen. การเริ่มครั้งที่สองด้วย `setsid` แสดงเฉพาะคำสั่ง `tsx watch server/_core/index.ts --host 0.0.0.0` ใน log แต่ root ยังว่าง จึงต้องตรวจ process/listening port, server log และ browser console ต่อก่อนแก้ source หรืออ้าง browser acceptance.

## Player boundary evidence

หลังรอให้ Vite/HMR settle หน้า `http://localhost:3000/` render สำเร็จจริง: แสดง `ARCANE FRONTIER`, ปุ่มคู่มือ/เครดิต/ตั้งค่า และปุ่มเข้าสู่พื้นที่รอยต่อ โดยไม่พบ Creator Studio หรือ Creator Workbench ใน player landing. การกดเข้าสู่พื้นที่รอยต่อเปิดหน้า identity ที่มี Player ID และยืนยันว่า player route ยังแยกจาก creator route.

ยังไม่ได้อ้าง item-detail UX สำเร็จจนกว่าจะกรอก identity เข้า lobby เปิดคลัง และทดสอบ long-press บน item จริง.

## Lobby evidence

ใช้ Player ID ทดลอง `BrowserProof` ใน local browser แล้วเข้าสู่ lobby สำเร็จจริง. DOM แสดง `ARCANE FRONTIER`, ผู้เล่น, ปุ่ม `บ้าน`, `คลัง`, `คู่มือ`, `แต่งสไตล์`, `ร้านค้า`, เครดิต และออกสำรวจ โดยไม่มี developer creator workbench/control. ผู้เล่นมี loadout `Aether Blade 001` และปุ่มเปิดคลัง item.

## Long-press item detail evidence

จาก lobby เปิด `คลัง` แล้ว DOM ของ item buttons แสดงคำแนะนำ `แตะสั้นเพื่อเลือก · กดค้าง 3.5 วินาทีเพื่อดูรายละเอียด` ครบทุก item. การจำลอง pointer hold 3.6 วินาทีบน `Aether Blade 001` เปิด dialog `ITEM DETAIL · LONG PRESS 3.5S` จริง โดยแสดงหมวด `sword`, ระดับ `ธรรมดา`, stack limit `1`, enhancement `+0`, item ID `sword-001`, provenance `starter`, tags และ event `starter-1`. หลักฐานนี้ยืนยัน interaction ใน player UI local browser เท่านั้น ไม่ใช่ mobile-device acceptance.

## Close-control observation

การตรวจซ้ำพบ dialog Item Detail ยังอยู่เหนือ Vault หลังการคลิกครั้งล่าสุด จึงยังไม่บันทึกว่า close action สำเร็จ. หลักฐานที่เชื่อถือได้ก่อนหน้านี้ยังคงเป็นการเปิด dialog จาก long-press; การทดสอบต่อจะใช้ selector/label ที่เจาะจงและตรวจ DOM หลัง action ทุกครั้ง.

## Stable Vault state

หลังใช้ปุ่มปิดที่เลือกด้วย `aria-label="ปิดรายละเอียดไอเทม"` โดยตรง DOM ยืนยันผล `detail-closed`. Vault ยังคงแสดง item list 12 รายการ, item detail pane ของ `Aether Blade 001`, ปุ่ม action เดิม และ long-press hints ครบทุก item.

## Obsidian-only map selector evidence

จาก lobby กดออกสำรวจแล้ว map selector แสดงเพียง `Obsidian Frontier`, สถานะ `OBSIDIAN VERTICAL SLICE · เล่นได้ตอนนี้`, รัศมี `500m` และปุ่มเข้าเล่นจากแคช. Footnote ระบุชัดว่าเปิดเฉพาะ Obsidian Frontier ส่วนแผนที่อื่นเป็นข้อมูลแผนงานหลังบ้านและไม่เปิดให้เลือกหรือเตรียม cache ใน runtime.

## Obsidian game and short-detail evidence

จาก map selector เข้า `Obsidian Frontier` สำเร็จ. DOM ของ game route แสดงพลังชีวิต/อีเธอร์/แรงกาย, companion HUD, ปุ่ม Codex/แผนที่/NPC/ตั้งค่า, hotbar 1–6, ปุ่มใช้/แดช/โต้ตอบ/โจมตี และการ render ฉาก Babylon จริง. ผล console ตรวจได้ว่า `gameHud: true`, `shortItemDetail: true` จากข้อความ `เลือก Aether Blade 001 · โจมตีระยะประชิดและสะสมรอยแยกพลังงาน`, `creatorControls: false`. ผลนี้เป็น local browser smoke evidence ไม่ใช่ mobile FPS/memory/thermal acceptance.
