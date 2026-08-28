# A_Survival native-base migration note — 2026-08-28

## Decision

ตามคำยืนยันสิทธิ์ของผู้ใช้เมื่อวันที่ 2026-08-28, branch `native-base/mcpe` ใช้ source จาก `Endlad2/MCPE` เป็นฐานหลักสำหรับการพัฒนารุ่น native/web ที่ต่อยอดจาก MCPE architecture. การเปลี่ยนฐานทำใน branch แยกเท่านั้น; `main` เดิมยังไม่ถูกแทนที่.

## Preservation and rollback

Web implementation เดิมของ A_Survival ถูกเก็บไว้ที่ branch `backup/web-a-survival-2026-08-28` และ annotated tag `a-survival-web-baseline-2026-08-28` ซึ่งชี้ไปยัง commit ก่อนเปลี่ยนฐาน. สามารถย้อนกลับไปใช้ web baseline ได้โดย checkout branch/tag ดังกล่าวโดยไม่ต้องกู้ไฟล์จาก working tree.

## Native base evidence

ฐานใหม่ถูกสร้างบน commit `32774da` ของ A_Survival branch `native-base/mcpe` และ push ไปที่ `origin/native-base/mcpe`. Tree หลักมี `CMakeLists.txt`, `src/`, `data/`, `project/`, `glad/`, `misc/` และ build scripts ของ MCPE source. CMake กำหนด C++14 สำหรับ desktop และมี Web/Emscripten path แยกต่างหาก; ดังนั้นการต่อยอดต้องรักษา native/web target boundary ไม่ผสมกับ Vite/React package scripts ของ web baseline โดยไม่มีแผน port ใหม่.

Desktop configure/build ถูกตรวจด้วย CMake/Ninja และจบที่ executable `build-native/MinecraftPE` ขนาดประมาณ 60.8 MB. Build output ถูก ignore และไม่ถูก commit. การ build นี้ยืนยันเฉพาะ compile/link ของ desktop base ไม่ได้ยืนยันการเปิดหน้าต่าง, gameplay acceptance, mobile build, Emscripten build, touch controls, persistence หรือ Obsidian content integration.

## Integration rules

การเติม feature ต่อจากนี้ต้องกำหนด canonical owner ใน native tree ก่อนแก้, รักษา runtime map ID `obsidian-frontier`, แยก generated content ออกจาก render loop, ไม่สร้าง asset จาก Minecraft ที่ provenance ไม่ชัด และ commit/push แยกตาม checkpoint. ระบบเดิมใน web baseline จะถูกใช้เป็น behavioral reference หรือ port specification เท่านั้นจนกว่าจะมี compatibility map ระหว่าง TypeScript contracts กับ C++ owners.

## Known limitations

README ของ upstream ระบุ source เป็น Minecraft Pocket Edition 0.6.1 alpha และ GitHub API ไม่ประกาศ repository license. ผู้ใช้ยืนยันสิทธิ์ในการใช้และดัดแปลง source แล้ว; การเผยแพร่ภายนอกยังควรเก็บหลักฐานสิทธิ์นั้นไว้กับ release records. Upstream tree มี legacy/native dependencies และไฟล์ขนาดใหญ่ ดังนั้นยังไม่ควร merge branch นี้เข้า `main` จนกว่าจะผ่าน Web/Emscripten หรือ target ที่ผู้ใช้ต้องการ, Obsidian gate, playable smoke test และ asset/provenance audit.

## References

[1]: https://github.com/Endlad2/MCPE "Endlad2/MCPE repository"
[2]: https://github.com/apirak272543-ship-it/A_Survival/tree/native-base/mcpe "A_Survival native-base/mcpe branch"
[3]: https://github.com/apirak272543-ship-it/A_Survival/tree/backup/web-a-survival-2026-08-28 "A_Survival web baseline backup branch"
