# A_Survival Structure/Building Generator

**สถานะ:** backend/data tool checkpoint — ยังไม่เชื่อม player runtime และไม่มี generator UI ให้ผู้เล่น

Structure Generator ใช้แนวคิด `Asset/Blueprint → Placement Rules → Generation Rules → Validator/Registry` ตามข้อกำหนดล่าสุด โดยไม่สร้างโลกหรือโครงสร้างใหม่ทุก frame. การ generate รับ `mapId`, blueprint library, candidate locations และ deterministic seed แล้วคืน artifact ที่สามารถส่งต่อให้ Common Generator API ตรวจ hash, provenance, preview, save และ export ได้

## Blueprint levels

Library เริ่มต้นมีครบ 5 ระดับ ได้แก่ `object`, `building`, `compound`, `settlement` และ `landmark` ตัวอย่างคือ lantern, magic clock tower, frontier farm compound, Obsidian village และ leyline fortress. แต่ละ blueprint เก็บ footprint, height, style, tags, asset references, biome/terrain/climate constraints, slope/water/space/road/settlement/support/access rules และ generation rules สำหรับ interior, road, decorations, resources, NPC, mob และ child structures

การมี blueprint library 5 ระดับนี้เป็น **tool foundation** ไม่ได้หมายความว่ามี model/texture/mesh จริงครบทุกอาคาร. Asset references เป็น logical IDs และ `starter-authored` metadata เพื่อรอ asset pack ที่ผ่าน provenance ในงานถัดไป

## Placement validation

ก่อน export placement จะถูกตรวจ biome, terrain, climate, slope, water depth, free space, road distance, settlement distance, population, ground support, accessible entry, world bounds และ occupied footprint. ตำแหน่งที่อยู่นอก bounds จะถูก repair แบบจำกัดด้วยการ clamp และ align `y` กับ ground surface; หากไม่ผ่านกฎหรือคะแนนต่ำกว่า threshold จะถูก reject ไม่ฝืนวาง

ระบบคำนวณ placement score 0–100 จากกฎที่ผ่าน และรองรับ `minPlacementScore`. ถ้าจุดที่คะแนนสูงสุดชน footprint ที่ถูกวางแล้ว ระบบจะลอง candidate สำรองที่ผ่านกฎก่อน reject blueprint เพื่อไม่ให้จุดที่สุ่มได้จุดเดียวทำให้ generation เสียทั้งชุด

## Determinism และ performance boundary

candidate ordering, optional child choice และ NPC/mob spawn counts ใช้ seed เดียวกัน. Content hash ใช้ Common Generator API; เวลา generate/save เป็น metadata จึงไม่เปลี่ยนผลลัพธ์เดียวกัน. มีเพดานต่อ run: blueprint ไม่เกิน 100, candidate ไม่เกิน 500 และ placement ไม่เกิน 100 เพื่อกันงาน backend ชุดเดียวขยายเกินควบคุม

Tool นี้ทำงานหลังบ้านเท่านั้นและไม่ถูกเรียกจาก Babylon render loop. ยังไม่มี chunk streaming, terrain generator, road solver, interior asset generator, server database registry หรือ world-instance provider ใน checkpoint นี้ จึงยังไม่อ้างว่า world generation เต็มรูปแบบหรือ map ใดมีอาคารครบตาม library

## หลักฐาน

- Implementation: [`server/generators/structureGenerator.ts`](../server/generators/structureGenerator.ts)
- Tests: [`server/structureGenerator.test.ts`](../server/structureGenerator.test.ts)
- Verification: `pnpm check`, full Vitest `42` test files / `145` tests และ `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน; build ยังมี analytics placeholder และ Babylon vendor chunk warning เดิม
- Shared artifact contract: [`server/generators/commonGeneratorApi.ts`](../server/generators/commonGeneratorApi.ts)
- Requirements matrix: [`OWNER_REQUIREMENTS_MATRIX.md`](./OWNER_REQUIREMENTS_MATRIX.md)
- Requirements reconciliation: [`REQUIREMENTS_RECONCILIATION_2026-08-26.md`](./REQUIREMENTS_RECONCILIATION_2026-08-26.md)
