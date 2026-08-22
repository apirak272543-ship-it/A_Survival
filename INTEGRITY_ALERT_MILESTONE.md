# Integrity Alert & Quarantine Milestone

เพิ่ม verdict model สำหรับตรวจ inventory ใน runtime, banner เตือนที่กดเปิดรายละเอียดได้ และ recovery sheet ที่เลื่อนอ่านได้บนจอมือถือแนวนอน. Query `?demo=lobby&integrity=demo` มีไว้ตรวจภาพเท่านั้น โดยจำลอง UUID ซ้ำในหน่วยความจำและไม่เขียนทับเซฟผู้เล่น.

| เหตุการณ์ | ผลลัพธ์ในต้นแบบ |
|---|---|
| Duplicate instance ID | กัก `instanceId` นั้น, เปลี่ยน Lobby status เป็น `REVIEW`, item อื่นนับเป็น valid |
| Missing/invalid provenance | กักเฉพาะ instance และอธิบายการ sync/recovery |
| Runtime scan ขณะออนไลน์ | ส่ง event ที่ de-duplicate ไปยัง integrity log โดยไม่อ้างว่า authoritative |
| Sync หรือ queue rejection | เปิด attention state โดยไม่เตะผู้เล่นออกจากเกม |
| Sync snapshot ที่มี suspect item | server บันทึกเฉพาะ `safeInventory`, แนบ `quarantinedInstanceIds` กับ payload และเขียน integrity log |
| Valid inventory | แสดง `VALID` และไม่มี banner |

> ข้อจำกัด: การกักใน milestone นี้เป็น policy/UI client-side ที่มี server-side safe snapshot fallback. ระบบ production ยังต้องทำ server-authoritative replay ของ transaction/provenance, ระงับ item action ทุกประเภท และมี resolution flow ที่รวม item กลับอย่างมีหลักฐาน.
