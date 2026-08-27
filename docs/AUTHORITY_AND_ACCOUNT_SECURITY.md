# Authority และ Account Security ของ A_Survival

## สถานะของ checkpoint

เอกสารนี้บันทึกขอบเขตที่ลงมือทำใน repository ปัจจุบันเท่านั้น โดยยังไม่อ้างว่า live database migration, authenticated E2E หรือ provider account operation ทำงานแล้ว.

## Authority model

`users.role` รองรับ `user`, `gm`, `admin` และ `master`. Server เป็นผู้ตัดสินสิทธิ์จาก session user ที่ authenticate แล้ว ไม่อ่าน role จาก localStorage หรือ client input เพื่อยกระดับสิทธิ์.

| Role | ใช้ Creator Studio/Workbench | จัดการ role สมาชิก | เปลี่ยนหรือเพิกถอน Master |
|---|---:|---:|---:|
| `user` | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| `gm` | ได้ | ไม่ได้ | ไม่ได้ |
| `admin` | ได้ | ไม่ได้ | ไม่ได้ |
| `master` | ได้ | ได้ | ไม่ได้ผ่าน route นี้ |

บัญชี Master คนแรกกำหนดได้จาก `MASTER_ADMIN_EMAIL` ซึ่งมีค่าเริ่มต้นตามคำขอของเจ้าของเป็น `apirak272543@gmail.com` และมี `OWNER_OPEN_ID` เป็น fallback สำหรับ deployment ที่ยืนยัน OpenID ได้. ระบบจะ normalize อีเมลก่อนเปรียบเทียบและไม่ส่ง password หรือ secret เข้า repository. การมอบ GM/Admin ใช้ `auth.authority.setRole` สำหรับบัญชีที่เข้าสู่ระบบ OAuth และปรากฏใน user table แล้ว; การเพิกถอน creator ใช้การลด role กลับเป็น `user` โดยไม่ลบบัญชีถาวร. ทุกการ grant/revoke ที่ผ่าน route จะ update user และ insert immutable event ใน transaction เดียวกัน; Master อ่านเหตุการณ์จำกัดจำนวนได้จาก `auth.authority.audit` พร้อม actor, target, role ก่อน/หลัง และเหตุผล.

## Routes และ enforcement

`adminProcedure` อนุญาตเฉพาะ `gm`, `admin` และ `master` ทำให้ทุก creator preview/tool ใช้ได้ตามขอบเขตเดิม. `masterProcedure` สงวน `auth.authority.policy`, `auth.authority.list`, `auth.authority.audit`, `auth.authority.invitations`, `auth.authority.invite`, `auth.authority.revokeInvitation`, `auth.authority.setRole` และ `auth.authority.revokeCreatorAccess` ให้ Master เท่านั้น. `/authority-admin` เป็น route แยกและมี Master-only gate; ไม่ปรากฏใน player landing หรือเกม.

## Invitation สำหรับ GM/Admin

Master สร้าง invitation ได้จาก `/authority-admin` โดยระบุอีเมล, role `gm` หรือ `admin` และหมายเหตุได้ invitation ถูกเก็บแบบ email-bound พร้อมอายุ 7 วัน. ผู้รับต้องเข้าสู่ระบบ OAuth แล้วกดรับ invitation จาก `/account-security`; server จะใช้ email ที่อยู่ใน authenticated session เท่านั้น, ตรวจ pending/status/expiry แบบ case-insensitive และ grant role พร้อมเขียน authority audit event ใน transaction เดียว. Master เพิกถอน invitation ที่ยัง pending ได้.

ระบบยังไม่ส่งอีเมลเอง เพราะ repository ไม่มี mail provider หรือ verified delivery contract. ดังนั้นการสร้าง invitation สำเร็จหมายถึงบันทึก pending invitation เท่านั้น ไม่ใช่หลักฐานว่าอีเมลถูกส่งหรือผู้รับเห็นข้อความแล้ว.

## Verification และ password boundary

Provider ที่ตรวจจาก source จริงคือ Manus OAuth. เอกสาร Manus ระบุว่า regular-email users สามารถเปลี่ยนหรือ reset password พร้อม verification code ได้ แต่ social-login users ไม่มี password ของ Manus ให้เปลี่ยน [1] [2]. Contract ใน repository A_Survival ปัจจุบันมี sign-in/session และ user email แต่ไม่มี field หรือ endpoint ที่ยืนยัน email verification, เปลี่ยน password, reset password หรือส่ง recovery email. A_Survival จึงไม่รับหรือเก็บ password เอง และ `auth.securityStatus` รายงานข้อจำกัดนี้อย่างตรงไปตรงมา. `/account-security` แสดงสถานะ OAuth-managed และเปิดลิงก์ภายนอกได้ก็ต่อเมื่อ deployment ตั้ง `VITE_ACCOUNT_SECURITY_URL` หลังยืนยัน URL ของ provider แล้ว.

> ห้ามใช้หน้า account-security นี้เป็นหลักฐานว่าการเปลี่ยนรหัสผ่านหรือ verify email สำเร็จแล้ว เพราะ provider endpoint และ authenticated provider E2E ยังไม่ได้เชื่อมต่อใน repository.

## Migration และข้อจำกัด

`drizzle/0008_authority_roles.sql` เป็น additive migration สำหรับขยาย enum ของ `users.role`; `drizzle/0009_authority_audit_events.sql` เพิ่มตาราง immutable authority audit events พร้อม foreign keys และ indexes. ยังไม่ได้รัน `db:push`, migration หรือแก้ข้อมูลจริง เพราะ local environment ไม่มีหลักฐาน `DATABASE_URL`/live database ที่พร้อมและการรันดังกล่าวอยู่นอกขอบเขตที่ได้รับอนุมัติ.

## References

[1]: https://help.manus.im/en/articles/11712810-how-can-i-change-my-password "How can I change my password? — Manus Help Center"
[2]: https://help.manus.im/en/articles/11712029-what-can-i-do-if-i-forget-my-password "What can I do if I forget my password? — Manus Help Center"
