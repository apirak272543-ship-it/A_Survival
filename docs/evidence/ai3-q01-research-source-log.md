# AI-3 Q-01 Research and Source Decision Log

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `Q-01` |
| Requirement | ใช้ Google/Gemini เมื่อไม่รู้และบันทึก source |
| Owner | AI-3 |
| Branch/worktree | `ai3/q01-research-source-log` / `/home/ubuntu/A_Survival-q01` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `docs/evidence/ai3-q01-research-source-log.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Decision protocol

ก่อนอ้างข้อเท็จจริงที่ไม่แน่ใจหรือเปลี่ยนแปลงได้ ต้องหยุดและแยก `known`, `unknown`, `assumption` และ `decision`. ถ้าเป็น unknown ที่กระทบ implementation ให้ใช้แหล่งที่อนุมัติ เช่น Google/Gemini หรือเอกสาร primary source ตามความเหมาะสม แล้วบันทึก provider/model, timestamp, query/prompt summary, source URL หรือ repository path, claim ที่ใช้, confidence และข้อจำกัด. ห้ามแปลงคำตอบที่ไม่มี source เป็น fact และห้ามบันทึก secret, credential หรือข้อมูลผู้ใช้ลงใน evidence.

ถ้าไม่มี unknown claim ที่จำเป็นต่อ bounded checkpoint ให้ไม่เรียก external research แบบไร้เหตุผล; ให้บันทึกเหตุผลว่าใช้ source-of-truth ใน repository แทน. การไม่เรียก provider ในกรณีที่ข้อมูลเป็น deterministic source ภายในถือเป็น decision ที่ตรวจสอบได้ ไม่ใช่ failed call.

## Source ledger for this checkpoint

| Claim/decision | Source | Retrieval/base | Confidence | Use |
|---|---|---|---|---|
| Q-01 requires unknown-claim handling and source recording | `docs/AI_COORDINATION_BACKLOG.md`, Q-01 row | repository `origin/main`, base `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` | high | defines this checkpoint scope |
| Coordination must use backlog/registry as source of truth | `docs/AI_COORDINATION_BACKLOG.md` and `docs/AI_COORDINATION_REGISTRY.md` | same base | high | task claim, dependency and reservation workflow |
| Existing asset/runtime claims require provenance or explicit limitation | `client/public/assets/packs/*/manifest.json`, `provenance.json`, and existing evidence docs | same base | high for repository state | used by V-03/Q-02 evidence; not a third-party license conclusion |
| No external unknown claim was required for this docs-only checkpoint | bounded audit decision by AI-3 | 2026-08-27 UTC+7 session; repository inspection only | high | avoids unsupported external claim |
| Google/Gemini invocation | not used in this checkpoint | no required unknown claim; no failed call to report | n/a | future unknown claims must follow protocol above |

## Source-record schema for future research

Every future research record should include:

```text
research_id:
question:
why_unknown:
provider:
model:
requested_at:
source_urls_or_paths:
prompt_or_query_summary:
claim_used:
confidence:
known_limitations:
implementation_impact:
```

For Gemini or another model, the response is an input to review, not a primary source by itself. A model-generated suggestion must either cite a source that can be checked or remain labelled `unverified`. License, copyright, trademark, safety, medical, legal, finance and production claims require primary/authoritative sources and human review; a model response alone cannot close those gates.

## Validation evidence

| Gate | Result |
|---|---|
| Source-of-truth | backlog and registry paths recorded; base SHA recorded |
| Unknown handling | known/unknown/assumption/decision separation documented |
| Provider honesty | no Gemini/Google call claimed; no failed call hidden |
| Secret hygiene | no credentials, tokens or user data written |
| Runtime changes | none; docs-only |
| Binary assets | none created or modified |
| `git diff --check` | must pass before commit |
| `pnpm check` | must pass before commit; docs-only checkpoint |

## Limitations and blockers

Q-01 report establishes a bounded research/source protocol; it does not complete all possible future research tasks, license review, or claim that every repository statement has external corroboration. AI-0 must decide whether this process-evidence slice is sufficient for Q-01 or whether a later checkpoint requires an actual Google/Gemini-backed unknown question with a checkable primary source.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `Q-01` |
| Requirement | `Q-01` bounded research/source protocol sub-checkpoint |
| Owner | AI-3 |
| Branch | `ai3/q01-research-source-log` |
| Commit SHA | `4622a7b7f9382fd0b4dfaa9944bd607961900873` |
| Files changed | `docs/evidence/ai3-q01-research-source-log.md` |
| Checks | `git diff --check` และ `pnpm check` ผ่าน; docs-only ไม่เพิ่ม runtime bundle |
| Result | source ledger และ honest unknown-claim protocol พร้อม future Gemini/source schema |
| Blockers/limitations | ไม่มี external research call ใน checkpoint นี้; ต้อง AI-0 review ว่าต้องการ actual sourced question เพิ่มหรือไม่ |
| Merge request | PR จะใช้ชื่อ `[AI-3][Q-01]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ scope และ source ledger |
