# Authority and account-security browser evidence — 2026-08-27

## Scope

ตรวจเฉพาะ local browser boundary หลังเพิ่ม authority/account-security contracts. หลักฐานนี้ไม่อ้าง authenticated Master E2E, live database role update, OAuth provider verification, password change/reset, email delivery หรือ production deployment.

## Unauthenticated Master authority route

URL: `http://localhost:3001/authority-admin`

ผลที่ตรวจพบหลังรอหน้าโหลด: แสดง `MASTER ONLY`, `เข้า Authority Admin ไม่ได้` และข้อความให้เข้าสู่ระบบด้วยบัญชี Master คนแรกก่อน พร้อมลิงก์กลับหน้าผู้เล่น. หน้านี้ไม่แสดงรายชื่อสมาชิกหรือปุ่มเปลี่ยน role ให้ unauthenticated user.

Screenshot: `/home/ubuntu/screenshots/localhost_2026-08-27_10-11-32_1884.webp`

## Runtime notes

Local server ใช้ port 3001 เพราะมี node server เดิมฟัง port 3000 อยู่. OAuth environment ยังไม่ตั้งค่า (`OAUTH_SERVER_URL` absent) จึงไม่อ้าง authentication E2E. Server เป็น process ชั่วคราวและต้องหยุดด้วย SIGTERM หลังตรวจครบ.

## Unauthenticated Account Security route

URL: `http://localhost:3001/account-security`

ผลที่ตรวจพบหลังรอหน้าโหลด: แสดง `ACCOUNT SECURITY`, `เข้าสู่ระบบก่อนจัดการบัญชี`, ข้อความว่าเกมใช้ Manus OAuth เป็นเจ้าของ session และไม่รับหรือเก็บรหัสผ่านใน A_Survival พร้อมปุ่มเข้าสู่ระบบ. ไม่พบช่องกรอกรหัสผ่านหรือการอ้างว่า verify/change/reset password ภายในแอปทำได้.

Screenshot: `/home/ubuntu/screenshots/localhost_2026-08-27_10-12-03_8428.webp`
