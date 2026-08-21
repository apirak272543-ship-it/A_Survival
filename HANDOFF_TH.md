# เอกสารส่งต่อโครงการ A_Survival

เอกสารนี้รวบรวมเฉพาะสิ่งที่สร้างในแชตนี้ เพื่อให้สามารถนำ source ไปต่อหรือรวมกับงานจากแชตอื่นได้โดยไม่สับสน โครงการถูกสร้างแยกเป็น private repository ชื่อ `apirak272543-ship-it/A_Survival` และไม่มีการแก้ไขไฟล์ของ AP Service

> **สถานะจริง ณ จุดส่งต่อ:** เป็น code scaffold ที่ build ผ่าน และมี integration test ของ LAN Host ผ่านแล้ว ไม่ใช่เกมเอาชีวิตรอดฉบับสมบูรณ์ จึงต้องใช้เอกสารนี้เป็นขอบเขตการรับช่วงงาน ไม่ควรตีความว่า gameplay, discovery อัตโนมัติ หรือการทดสอบหลายอุปกรณ์เสร็จแล้ว

## คำสั่งและข้อกำหนดที่ได้รับ

| หัวข้อ | ข้อกำหนดที่ต้องรักษา |
|---|---|
| ชื่อเกม | **A_Survival** |
| การเก็บผู้เล่น | ไม่ใช้ระบบ login ออนไลน์ในระยะแรก ผู้เล่นกดสร้างผู้เล่นใหม่ และข้อมูลตัวละครของแต่ละคนต้องเก็บในอุปกรณ์ของตนเอง |
| ข้อมูลส่วนบุคคล | ตัวละคร ไอเทม ความคืบหน้า และการตั้งค่าของผู้เล่นหนึ่งคนต้องไม่เขียนทับของผู้เล่นคนอื่น |
| การเล่นร่วมกัน | ใช้เครือข่าย Wi‑Fi เดียวกัน สร้างห้อง เลือกแผนที่ และเข้าร่วมห้องได้ |
| การยืนยัน | ผู้ขอเข้าห้องส่งคำขอ ผู้รับต้องกด **ยอมรับ** หรือ **ปฏิเสธ** ก่อนเชื่อมต่อสำเร็จ |
| การเตรียมข้อมูล | หลังยอมรับ ทั้งสองฝ่ายต้องเห็นสถานะและเปอร์เซ็นต์การเตรียมข้อมูลก่อนเข้าสู่แผนที่เดียวกัน |
| จำนวนผู้เล่น | ห้าม hard-code จำนวนสูงสุดในกติกาห้อง แต่ต้องแจ้งว่าจำนวนที่เหมาะสมขึ้นอยู่กับทรัพยากรเครื่องโฮสต์และเครือข่าย |
| อนาคต | โครงสร้าง transport ต้องเปลี่ยนจาก Local LAN ไป online multiplayer ได้โดยไม่ต้องเขียนกติกาเกมและ UI ใหม่ทั้งหมด |

## Source ที่ส่งต่อ

| Path | เนื้อหา | สถานะ |
|---|---|---|
| `src/App.tsx` | UI เลือก/สร้างผู้เล่น, Lobby, สร้างห้อง, ขอเข้าห้อง, ยอมรับ/ปฏิเสธ และแถบเปอร์เซ็นต์ | เขียนแล้ว; ต้องทดสอบผ่านอุปกรณ์จริง |
| `src/game/localProfileStore.ts` | Local Player Profile บน `localStorage` | เขียนแล้ว; ใช้เก็บเฉพาะข้อมูลเครื่องเจ้าของ |
| `src/game/models.ts` | data models ของ profile, room, map และ member | เขียนแล้ว |
| `src/game/lan-protocol.ts` | message contract สำหรับสร้างห้อง ขอเข้า ยอมรับ/ปฏิเสธ และ session | เขียนแล้ว |
| `src/game/lan-transport.ts` | WebSocket transport interface และ Local LAN implementation | เขียนแล้ว |
| `server/lan-host.mjs` | LAN Host สำหรับ WebSocket, room และการอนุมัติคำขอ | เขียนแล้ว; test ผ่าน |
| `tests/lan-host.integration.mjs` | ทดสอบ host/guest สร้างห้อง ส่งคำขอ ยอมรับ และได้ session สองคน | ผ่านใน sandbox |
| `src/components/GameCanvas.tsx` | ฉาก Babylon ทดสอบแบบง่าย มีพื้น กองไฟ และต้นไม้ | เป็นฉาก proof-of-render ไม่ใช่ gameplay สมบูรณ์ |
| `UI_FLOW.md` | flow หน้าจอและ state ที่ผู้ใช้ต้องเห็น | เอกสารออกแบบ |
| `STRUCTURE.md`, `PLAN.md`, `ASSETS.md`, `MEMORY.md` | เอกสารสถาปัตยกรรม แผน งานภาพ และบันทึกเริ่มต้น | เอกสารรับช่วงงาน |

## วิธีรันสำหรับพัฒนาต่อ

หลังแตกไฟล์หรือ clone repository แล้ว ให้ติดตั้ง Node.js รุ่น 22 หรือใหม่กว่า จากนั้นรันคำสั่งต่อไปนี้ในโฟลเดอร์โครงการ

```bash
pnpm install
pnpm check
pnpm build
```

สำหรับทดลองผ่าน Wi‑Fi เดียวกัน ให้เครื่องที่เป็นเจ้าของห้อง build ก่อน แล้วเปิด LAN Host บนพอร์ต 8787

```bash
PORT=8787 pnpm lan-host
```

ผู้เล่นในเครือข่ายเดียวกันเปิด `http://<LAN-IP-ของเครื่องโฮสต์>:8787` แล้วกรอกที่อยู่ WebSocket ใน Lobby เป็น `ws://<LAN-IP-ของเครื่องโฮสต์>:8787/lan` จากนั้นเจ้าของห้องสร้างห้องและส่งรหัสห้องให้ผู้ร่วมเล่น ผู้ร่วมเล่นกดส่งคำขอ ส่วนเจ้าของห้องกดยอมรับหรือปฏิเสธ

สำหรับแก้ UI ระหว่างพัฒนา ให้เปิด Vite แยกต่างหากด้วยคำสั่งด้านล่าง โดย LAN Host ยังคงต้องเปิดอยู่ที่พอร์ต 8787

```bash
pnpm dev
```

## หลักฐานการตรวจที่มี

มีการรัน `pnpm check` และ `pnpm build` สำเร็จแล้ว นอกจากนี้ `pnpm test` ผ่านการทดสอบ WebSocket จริงของ LAN Host ครอบคลุมการสร้างห้อง ส่งคำขอเข้าร่วม รอยืนยัน ยอมรับ และการคืน session ที่มีผู้เล่นสองคน

| สิ่งที่ยืนยันแล้ว | หลักฐาน |
|---|---|
| TypeScript compile | `pnpm check` ผ่าน |
| Production bundle | `pnpm build` ผ่าน |
| Local LAN signaling | `pnpm test` ผ่านด้วย host/guest WebSocket สองตัว |
| UI และ Babylon canvas | source และ production bundle ถูกสร้างแล้ว แต่ไม่ได้มีภาพ browser verification เพราะ browser ของ sandbox ไม่พร้อมใช้งานในช่วงนี้ |

## สิ่งที่ยังต้องทำก่อนเรียกว่าเกมพร้อมเล่น

| งานค้างสำคัญ | เหตุผลและแนวทางต่อ |
|---|---|
| LAN discovery อัตโนมัติ | ตอนนี้ผู้เล่นต้องกรอก LAN IP และรหัสห้องเอง การค้นหา host อัตโนมัติยังไม่มี |
| การปรับข้อมูลจริง | แถบเปอร์เซ็นต์ใน `App.tsx` เป็น UI flow แบบ deterministic เพื่อสื่อสารสถานะเท่านั้น ต้องแทนที่ด้วย manifest, hash และ chunk transfer ของข้อมูลที่อนุญาตให้แชร์จริง |
| Shared world state | protocol มีช่อง `world:state` แต่ server ยังไม่ relay/validate state และไม่มี authoritative simulation |
| Gameplay | ยังไม่มีระบบเดิน เก็บไอเทม คราฟต์ ศัตรู ความตาย/เกิดใหม่ หรือการบันทึกความคืบหน้าเกมจริง |
| ความปลอดภัยใน LAN | รุ่นนี้เป็น trusted local-network prototype ไม่มี pairing code แบบ cryptographic, encryption หรือ anti-cheat |
| การทดสอบอุปกรณ์จริง | ต้องทดสอบมือถือ/คอมพิวเตอร์อย่างน้อยสองเครื่องบน Wi‑Fi เดียวกัน รวมถึงกรณี Wi‑Fi ตัด การปฏิเสธ และผู้เล่นออกจากห้อง |
| Online multiplayer | ให้สร้าง `OnlineTransport` ที่ implements interface เดียวกับ `GameTransport`; ต้องมี backend, authoritative server, session security และ persistence แยกต่างหาก |

## ข้อควรระวังเมื่อนำไปต่อ

อย่าย้าย `LocalPlayerProfile` ไปเป็นข้อมูลกลางโดยอัตโนมัติ เพราะตรงข้ามกับข้อกำหนดที่ผู้ใช้ให้ไว้ ให้คง Local Profile เป็นของเครื่องเจ้าของ และแยก `RoomSessionSnapshot` กับ `SharedWorldState` สำหรับข้อมูลชั่วคราวระหว่างเล่นอย่างชัดเจน ในการเพิ่ม online mode ภายหลัง ควรคง message contract เดิมให้มากที่สุด แล้วเพิ่ม transport และ server-authoritative validation แทนการฝังกติกาเครือข่ายไว้ใน UI
