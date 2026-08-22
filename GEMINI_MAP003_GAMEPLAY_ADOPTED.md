# Gemini MAP_003 Spore Bloom Plan — Adopted Scope

นำ Spore Bloom แบบ deterministic, player regeneration, enemy enrage, elite threshold, shrine telegraph และ safe reset มาใช้กับ MAP_003. ข้อเสนอ cryptographic hash/WASM/custom shader ถูกเลื่อนออกไป เพราะ prototype ปัจจุบันใช้ local event provenance ที่ตรวจ integrity ได้และไม่มี shader performance budget ที่วัดบนอุปกรณ์จริง.

| Gemini recommendation | การนำไปใช้ |
|---|---|
| Spore Bloom | window deterministic, +5 health/second และ enemy movement ×1.25 |
| Elite reveal | harvest Glow Crystal 2 node หรือ defeat beetles 4 ตัว |
| Boss shrine | ต้อง interact ระหว่าง bloom, telegraph 2.6 วินาที แล้ว Empress คง state |
| Safe zone | Researcher Lyra reset health/position เมื่อ player defeat |
| Reward provenance | Glow Crystal ส่งผ่าน reward callback ด้วย map-specific event ID |
| Mobile visuals | billboard textures และ pulse scale แทน custom shader/particle graph |

> ข้อจำกัด: Mycelium Empress และ Luminous Stalker ยังเป็น presentation/telegraph entities ไม่มี health, attack, drops หรือ audio action set เต็มรูปแบบ.
