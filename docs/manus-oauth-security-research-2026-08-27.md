# Manus account security research — 2026-08-27

แหล่งทางการที่อ่านคือ [How can I change my password?](https://help.manus.im/en/articles/11712810-how-can-i-change-my-password), [What can I do if I forget my password?](https://help.manus.im/en/articles/11712029-what-can-i-do-if-i-forget-my-password) และ [How can I change the login methods?](https://help.manus.im/en/articles/11712048-how-can-i-change-the-login-methods).

เนื้อหาทางการระบุว่า ผู้ใช้ที่สมัครด้วย regular email สามารถเปลี่ยนหรือ reset password ผ่านหน้า Account/Edit profile และ verification code ทางอีเมลได้ ขณะที่ผู้ใช้ที่เข้าสู่ระบบด้วย Google/Apple/Microsoft ไม่มี password ที่ตั้งไว้ใน Manus และไม่สามารถเปลี่ยน password ผ่าน flow นั้นได้. เอกสารยังระบุว่า login method ถูกผูกกับวิธีสมัครเดิม.

สิ่งที่ repository A_Survival ตรวจพบใน source คือ OAuth callback/session contract ของแอป ไม่ใช่ provider account-settings API: มี `signIn` redirect, session cookie/Bearer verification และ user email แต่ไม่มี endpoint สำหรับ provider password change/reset หรือ verified-email claim. ดังนั้น app ไม่ควรรับ password หรือสร้าง verification code เอง. การเปลี่ยนรหัสผ่านของบัญชีที่เป็น regular-email ต้องทำที่ Manus Account/Edit profile ตาม provider UI; บัญชี social/OAuth ไม่มี password ของ Manus ให้เปลี่ยนตามเอกสาร.

การวิจัยนี้ไม่ใช้ credential ไม่ทำ login และไม่ยืนยัน account จริงของผู้ใช้.

## References

[1]: https://help.manus.im/en/articles/11712810-how-can-i-change-my-password "How can I change my password? — Manus Help Center"
[2]: https://help.manus.im/en/articles/11712029-what-can-i-do-if-i-forget-my-password "What can I do if I forget my password? — Manus Help Center"
[3]: https://help.manus.im/en/articles/11712048-how-can-i-change-the-login-methods "How can I change the login methods? — Manus Help Center"
