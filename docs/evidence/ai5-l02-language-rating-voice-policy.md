# AI-5 L-02 Language, Rating and Voice Policy Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `L-02` |
| Requirement | Adult rating/policy, colloquial dialogue/voice with safety copy |
| Owner | AI-5 |
| Branch/worktree | `ai-5/l02-language-rating-voice-policy` / `/home/ubuntu/A_Survival-ai5-l02` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/languageRatingVoicePolicy.ts`, `server/languageRatingVoicePolicy.test.ts`, `docs/evidence/ai5-l02-language-rating-voice-policy.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure policy contract สำหรับตรวจข้อความ disclosure, safety-copy boundary และ voice asset provenance โดยยึด policy ใน `docs/LANGUAGE_RATING_VOICE_POLICY.md`. Contract นี้จะไม่ generate audio/voice asset ไม่อ้าง rating จากหน่วยงานภายนอก ไม่รับ password/token ไม่แก้ player UI และไม่เปลี่ยน gameplay.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `L-02` |
| Requirement | Adult rating/policy, colloquial dialogue/voice with safety copy |
| Owner | AI-5 |
| Branch | `ai-5/l02-language-rating-voice-policy` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/languageRatingVoicePolicy.ts`, `server/languageRatingVoicePolicy.test.ts`, `docs/evidence/ai5-l02-language-rating-voice-policy.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/languageRatingVoicePolicy.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | policy ระบุ Thai เป็น locale หลัก, system copy ต้องชัดเจน, English ยังอยู่สถานะเตรียมชุดภาษา, voice เป็น optional และไม่จำเป็นต่อกติกา; ตรวจ disclosure ไม่ให้ claim external certification และตรวจ voice asset path/license/provenance/runtime boundary แบบ fail-closed |
| Blockers/limitations | ยังไม่มี voice asset จริงใน checkpoint นี้ จึงไม่อ้าง voice generation, provider identity, licensing approval, external rating certification, player UI integration, mobile/device acceptance หรือ production readiness |
| Merge request | branch จะ push ขึ้น origin หลัง commit; ยังไม่ merge เข้า `main` |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก policy checkpoint โดยตรง.
