# Optional AI NPC Service — Obsidian Frontier

## ขอบเขต

Obsidian Frontier จะมี **NPC พิเศษที่ขับเคลื่อนด้วย AI ได้สูงสุดหนึ่งตัวต่อหนึ่ง map** แต่ในช่วง vertical slice จะไม่เปิดให้ผู้เล่นสร้าง agent เพิ่ม ไม่ทำงานเป็น background loop และไม่มีปุ่มตั้งค่า provider ในตัวเกม ค่าเริ่มต้นต้องปิด (`AI_NPC_ENABLED=false`) และการเปิด/ปิดทำจาก server environment หรือ backend configuration เท่านั้น

การเรียก AI เกิดเฉพาะเมื่อผู้เล่นอยู่ในระยะและส่งบทสนทนาหรือ interaction ที่อนุญาต ไม่ใช่การ polling ตลอดเวลา ทุกคำตอบต้องผ่าน validator ของเกมก่อนนำไปใช้ จึงไม่มีเส้นทางให้โมเดลแก้ block, inventory, chest, currency, quest state หรือ database โดยตรง

## Provider และ secret

การออกแบบใช้ Google Gemini เป็น provider หลักตามทิศทางของ owner โดยเรียกจาก server-side adapter เท่านั้น ตัวเกม/browser จะไม่เห็น `GEMINI_API_KEY`; Google ระบุให้เก็บ key ใน environment variable และห้าม expose key ใน client-side production code [1] [2] เอกสาร Gemini ปัจจุบันแนะนำ Interactions API สำหรับโปรเจกต์ใหม่ และยังมี structured output ที่บังคับผลลัพธ์ตาม JSON Schema ได้ [1] [3]

ค่า config ที่ควรใช้มีดังนี้:

| Config | ค่าเริ่มต้น | หน้าที่ |
|---|---:|---|
| `AI_NPC_ENABLED` | `false` | kill switch ฝั่งหลังบ้าน |
| `AI_NPC_PROVIDER` | `gemini` | provider ที่ adapter อนุญาต |
| `AI_NPC_MODEL` | `gemini-3.7-flash` | รุ่นที่ใช้เมื่อเปิด provider |
| `AI_NPC_COOLDOWN_MS` | `10000` | เว้นช่วงต่อ NPC/map/player |
| `AI_NPC_MAX_TURNS` | `8` | memory ที่ส่งต่อใน context ต่อ session |
| `AI_NPC_MAX_ACTIONS_PER_TURN` | `1` | จำกัด action ที่ validator รับต่อคำตอบ |

ไม่มี secret ใดเขียนใน repository และไม่มี default ที่ทำให้ production เรียก API ได้เองเมื่อไม่ได้ตั้ง key/enable flag

## Context และ memory

Context ที่ส่งได้มีเพียง `mapId`, NPC id, เวลา phase, ตำแหน่งแบบหยาบ, biome, local facts ที่เกมอนุญาต, สถานะ interaction และบทสนทนาล่าสุดไม่เกิน 8 turn การจัดเก็บ memory ต้องเป็น session/map-local และลบหรือย่อได้ตาม policy ไม่ส่ง inventory ทั้งหมด, personal data, API key, hidden catalog หรือข้อมูลจาก map ที่ผู้เล่นยังไม่ค้นพบ

## Structured response และ action allow-list

โมเดลต้องตอบ JSON ตาม schema ที่ service กำหนด ไม่รับ free-form tool call จากโมเดลโดยตรง ตัวอย่าง action ที่อนุญาตใน pass แรกคือ `speak`, `wander-to-safe-point`, `inspect-local-block`, `offer-hint` และ `return-to-home`. Server จะตรวจ enum, coordinate bounds, cooldown, NPC ownership, distance และ resource/quest permission ก่อนแปลงเป็น game command หาก JSON ไม่ผ่าน, safety filter ตัดคำตอบ, timeout, quota error หรือ provider ปิดอยู่ ระบบใช้ fallback dialogue และ deterministic idle/wander behavior แทน

> AI เสนอเจตนาได้ แต่ **game server เป็นผู้ตัดสินและลงมือทำ** เสมอ

## การใช้ทรัพยากรและความปลอดภัย

หนึ่ง map มี NPC AI ได้หนึ่งตัว และหนึ่ง interaction มีได้ไม่เกินหนึ่ง request หลัง cooldown การเดิน/คิดเองนอก interaction ใช้ state machine deterministic ไม่เรียก LLM เพื่อประหยัด latency และป้องกัน NPC ทำงานตลอดเวลา Response จะถูกตัดความยาว, log เฉพาะ metadata ที่จำเป็น และไม่เก็บ prompt ที่มีข้อมูลลับโดยไม่จำเป็น

## สถานะการส่งมอบ

เอกสารนี้เป็น contract ก่อน implementation ปัจจุบันยังต้องเพิ่ม server adapter, config loader, structured response validator, cooldown/memory tests, fallback tests และ browser proof ว่า disabled mode ไม่เรียก provider หลังจากนั้นจึงค่อยพิจารณาเปิด Gemini ใน environment จริง การมี adapter หรือ API key ใน environment ไม่ถือว่าเป็นหลักฐานว่า AI NPC ทำงานสำเร็จจนกว่าจะมี integration test/health result ที่ตรวจได้

## References

[1]: https://ai.google.dev/gemini-api/docs "Gemini API official documentation"

[2]: https://ai.google.dev/gemini-api/docs/api-key "Using Gemini API keys — official documentation"

[3]: https://ai.google.dev/gemini-api/docs/structured-output "Structured outputs — official documentation"
