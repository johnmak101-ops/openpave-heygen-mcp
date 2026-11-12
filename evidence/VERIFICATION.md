# Verification Ledger — 2026-11-12

Account: john.mak@candrholdings.com · plan: **free** · server: heygen-mcp v1.30.0
Method: committed probe (`probe/heygen-probe.mjs`) with a dev token file
(`HEYGEN_TOKEN_FILE`); every call through `https://mcp.heygen.com/mcp/v1`.

| # | Tool | Result | Cost | Notes |
|---|---|---|---|---|
| 1 | `get_current_user` | ✅ verified | free | email + plan; stringified payload confirmed |
| 2 | `tools/list` | ✅ verified | free | 114 tools; snapshot committed (`schemas/snapshot-2026-11-12.json`) |
| 3 | `list_video_agent_styles` | ✅ verified | free | style items with thumbnails/previews |
| 4 | `list_templates` | ✅ verified | free | empty on free account (expected) |
| 5 | `search_audio_sounds` | ✅ verified | free | music tracks with S3 audio URLs |
| 6 | `list_voices` | ✅ verified | free | one transient `fetch failed`, retry OK — edge flakiness |
| 7 | `create_speech` | ✅ verified | free | turbo-free model + public voice → WAV URL, 3.7 s |
| 8 | `create_folder` / `get_folder` | ✅ verified | free | round-trip OK; folder_id `4e044eab…` |
| 9 | `create_asset_upload` → S3 PUT → `complete_asset_upload` → `get_asset` | ✅ verified | free | full §4.4 runbook; see doctrine notes below |
| 10 | `create_prompt_avatar` | ✅ verified | free (accepted on free plan) | group_id == look_id for prompt avatars; preview null → ready in ~90 s |
| 11 | `list_avatar_looks` | ✅ verified | free | resolves looks from group |
| 12 | `get_avatar_creation_status` | ✅ verified | free | **semantic quirk**: returns "No avatar creation is in progress" when idle — it tracks the guided creation flow, not look rendering. Use `list_avatar_looks` preview state for readiness |
| 13 | `create_video_agent` | ✅ **verified** | free (plan still `free`, no meter) | session `843f64bd…` → `completed` in ~19 min; **11.5 s MP4** `video_url` delivered via `get_video`; thinking→generating(81→97)→completed |

## Headline result — 2026-11-12

**Full generate chain verified on a free plan for US$0:**
prompt avatar (`create_prompt_avatar`) → readiness via `list_avatar_looks`
(~90 s) → public voice (`list_voices`) → `create_video_agent` (mode
`generate`, camelCase `avatarId`/`voiceId`/`orientation`) → poll
`get_video_agent_session` → `get_video` → working presigned MP4 URL
(11.5 s, ~7-day expiry). One transient HTTP 502 from the bridge during
polling — retried fine; renders were unaffected.

## Runbook lessons folded into doctrine (all verified 2026-11-12)

1. **Field naming is per-tool — read the schema before every first call.**
   `create_asset_upload` requires `filename`, `contentType` (camelCase),
   `sizeBytes`; the error message calls it `content_type`. The response field
   is `upload_headers` (not `headers`).
2. **Asset uploads accept media types only** — `text/plain` refused with
   `invalid_parameter`; use image/video/audio MIME types.
3. **The bridge surfaces real error text** — failures arrive in
   `structuredContent` with `message`, `error_code`, `doc_url`, and
   `next_steps`. The wrike "swallowed error" defect does **not** reproduce
   here (§7.2 of SKILL.md closed).
4. **Argument validation errors are explicit**: `invalid_arguments` with the
   missing field named (`sizeBytes: Field required`).
5. Video Agent params are camelCase: `avatarId`, `voiceId`, `styleId`,
   `brandKitId`, `orientation`; only `prompt` is required.

## Spend tracker

- **Total verification spend: US$0.** All 13 verified tools ran on the free
  plan; the account's credit meter reads `remaining: null` throughout and
  the plan stayed `free` after the full video-generation chain (including
  an 11.5 s rendered Video Agent MP4). The US$10 budget was not needed.
- Refresh token held locally (mode 0600) for re-verification after the
  10-day access-token expiry (SKILL.md §7.3).
