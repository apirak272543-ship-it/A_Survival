# Endlad2/MCPE repository audit — 2026-08-28

## Source identity

Repository: [Endlad2/MCPE](https://github.com/Endlad2/MCPE). ตรวจจาก default branch `main` ที่ commit `d08948fb00f273682ce39ca2c859705c5b089084` หัวข้อ `renable generation features`, author `Shredder`, วันที่ commit `2026-05-23`. GitHub ระบุ repository เป็น public, ไม่มี description และ `licenseInfo: null`; README ระบุชัดว่าเป็น source code ของ **Minecraft Pocket Edition 0.6.1 alpha** ที่มีการแก้ไขและปรับปรุง และชี้ไปยัง Gitea repository เป็นแหล่งหลักของ issues/pull requests.

## Provenance and reuse decision

เนื่องจาก GitHub repository ไม่ประกาศ license ระดับ repository และโค้ด/ชื่อ/metadata ระบุว่าเป็น source ของ Minecraft PE โดยตรง จึง **ห้ามนำ source code, texture, sound, font, model, protocol implementation, identifier, branding หรือ binary ใด ๆ เข้า A_Survival** โดยอัตโนมัติ แม้ผู้ใช้จะส่ง repository มาให้ตรวจแล้วก็ตาม การนำมาใช้ได้เฉพาะการอ่านเชิงสถาปัตยกรรมและ re-implement หลักการทั่วไปด้วย code/data/assets ของ A_Survival เอง จนกว่าจะมี license และสิทธิ์จากเจ้าของที่ยืนยันเป็นลายลักษณ์อักษรสำหรับส่วนที่ต้องการ port.

## Architecture reference

โครงสร้างที่เป็นประโยชน์ในเชิง reference ประกอบด้วยการแยก `client`, `server`, `world`, `entity`, `inventory`, `item`, `level`, `phys`, `renderer`, `sound`, `platform`, `network` และ `nbt`; มี platform targets สำหรับ GLFW, Android, iOS, Win32 และ dedicated server; และมี source ที่เกี่ยวข้องกับ performance, terrain formats และ application lifecycle. สิ่งเหล่านี้ช่วยยืนยันการแยก domain ของเกม voxel และการแยก platform layer แต่ไม่ใช่ drop-in architecture สำหรับ A_Survival ซึ่งเป็น Vite/React 19/TypeScript/Babylon.js/tRPC/Dexie web stack.

README ยังระบุว่าต้นฉบับมี procedural generation, Android touch-control improvements, options, sprinting, chat/commands และ server hosting ใน roadmap/feature notes แต่ข้อมูลดังกล่าวเป็นคำอธิบายของ upstream project ไม่ใช่หลักฐานการทำงานของ A_Survival และไม่นำมาเปลี่ยนสถานะใน OWNER_REQUIREMENTS_MATRIX.

## Safe adaptation boundary

| ส่วนจาก repository | การตัดสินใจสำหรับ A_Survival |
|---|---|
| Domain separation: world/entity/item/inventory/physics/renderer | ใช้เป็น reference architecture และ mapping เท่านั้น; re-implement ใน canonical TypeScript owners |
| Platform abstraction และ touch-control concepts | ใช้เป็น design reference สำหรับ M-01/M-02; ไม่ port native C++/Objective-C/Java |
| World/level/chunk/generation concepts | ใช้เป็น reference สำหรับ chunk lifecycle และ generate-once/cache; ต้องรักษา `obsidian-frontier` gate และห้าม generate ใน render loop |
| NBT/network/server implementation | ไม่ port เพราะไม่ตรง web stack และมี provenance/license uncertainty; สร้าง contract ของ A_Survival เอง |
| Textures, sounds, fonts, models, binaries และ Minecraft identifiers | ห้ามนำเข้า; ต้องใช้ original assets หรือ assets ที่มี verified license/provenance |

## Conclusion

Repository นี้มีโครงสร้างกว้างและเป็นประโยชน์ในการลดเวลาคิด domain boundaries แต่ไม่ใช่ source ที่สามารถหยิบมาใส่ A_Survival ได้ทันที การนำมาใช้ที่อนุมัติในรอบนี้คือ reference architecture เท่านั้น และ implementation ที่ทำต่อจะต้องผ่าน owner reservation, Obsidian-only validation, tests, build และ provenance gate ทุกครั้ง.

## References

[1]: https://github.com/Endlad2/MCPE "Endlad2/MCPE repository"
[2]: https://gitea.sffempire.ru/Kolyah35/minecraft-pe-0.6.1 "Upstream Gitea repository linked from README"
