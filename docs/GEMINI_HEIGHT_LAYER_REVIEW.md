# Gemini height-layer review — Obsidian Frontier

วันที่: 26 สิงหาคม 2026

## วิธีเรียก

ใช้ Gemini `gemini-3.6-flash` ผ่าน Google Gemini API ด้วย structured JSON prompt เพื่อขอคำแนะนำสำหรับ top-down voxel map ที่มี integer X/Z, vertical Y, radius ประมาณ 500 เมตร, relief prototype 0–4 เมตร, surface/water/cave/object bounds, slope, support, overlap และ validation order

## ผลที่นำไปใช้

Gemini ยืนยันหลักการว่ากล้อง top-down/isometric ต้องคุม vertical clarity เพื่อป้องกันวัตถุบังกันและลดปัญหา pathing โดยเริ่มจาก relief 0–4 เมตรแล้วค่อย scale Y-band ในอนาคตได้โดยรักษาสัญญา grid validation เดิมไว้ คำตอบให้ลำดับ validation ที่มีประโยชน์ดังนี้:

`validate_world_bounds` → `enforce_bedrock_and_abyssal_floor` → `generate_underground_and_caves` → `sculpt_surface_heightmap` → `apply_water_tables` → `validate_slopes_and_tolerances` → `place_safe_zones_and_shops` → `place_structures` → `place_resources_and_vegetation` → `place_npcs_and_spawners` → `resolve_overlaps_and_clearances` → `verify_structural_support_and_falling`

## ข้อจำกัดของคำตอบ

Structured response ที่ได้รับมี `rationale` และ `validationOrder` แต่ `rules` เป็น object ว่าง จึง **ไม่ได้นำตัวเลขหรือกฎเชิง gameplay จาก Gemini มาอ้างว่าเป็นคำแนะนำที่ได้รับ** ผมจะแปลงเฉพาะหลักการและลำดับข้างต้นเป็นกฎ A_Survival ที่เขียนและทดสอบใน repository เอง พร้อมระบุว่าเป็น `project-authored enforcement rules` ไม่ใช่ข้อเท็จจริงจาก Gemini

## กฎ project-authored ที่จะเพิ่ม

Obsidian จะมี world bounds แบบ hard constraint, surface height ต่อ cell, surface layer ใต้ ground-based objects, object vertical height bands, allowed surface types, slope tolerance, water exclusion/depth, footprint overlap/clearance, safe-zone/boss minimum distance, support requirement สำหรับ block ที่มี gravity และ deterministic reject/repair validation pass ก่อน export วัตถุทุกชนิดจะถูกตรวจพิกัดและความสัมพันธ์กับพื้นก่อนเขียนลง module

## Provenance และความปลอดภัย

คำตอบนี้ใช้เป็น design assistance เท่านั้น ไม่ได้ถูกฝังเป็น prompt/runtime behavior ของผู้เล่น และไม่ได้ส่ง secret หรือข้อมูลผู้เล่นไปให้ Gemini ผลลัพธ์ถูกเก็บไว้เพื่อ audit; runtime generator ยังคง deterministic จาก seed และไม่เรียก Gemini ระหว่างการสร้างโลก

## References

[1]: https://ai.google.dev/gemini-api/docs "Gemini API official documentation"

[2]: https://ai.google.dev/gemini-api/docs/structured-output "Gemini structured outputs official documentation"
