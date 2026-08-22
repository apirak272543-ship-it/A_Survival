# Destination-Specific Loading Variants Milestone

ทุก transition ยังใช้ cache-aware progress เดิม แต่ presentation เปลี่ยนตามปลายทางแทน generic shell เดียว. `?loading=lobby|home|maps|biome&map=<mapId>` เป็น query สำหรับตรวจภาพเท่านั้น; ไม่บันทึกเซฟและไม่อยู่ใน flow ปกติ.

| Variant | Visual treatment | State ที่ตรวจแล้ว |
|---|---|---|
| Lobby | Holographic cyan relay grid | online relay preparation |
| Home | Amber safe-zone core/shield | cached route |
| Map Observatory | Violet tactical coordinate grid | offline cached route |
| Game biome | Unblurred biome key art และ threat metric | biome asset preparation |

การตรวจภาพบน viewport 812×375 แสดงสี่ variant แยกกันได้ชัดเจน และ unit tests ตรวจ variant contract. ข้อจำกัด: ไม่มี Web Worker asset decompression, haptic feedback หรือ live measurement ของ animation frame ระหว่าง cache write.
