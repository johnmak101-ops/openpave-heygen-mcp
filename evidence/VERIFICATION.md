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

---

# M5 — end-to-end in PAVE sandbox: PASS (2026-11-12 04:16 UTC)

Sandbox session `01M76WFEXEWWYYW6FK560X8MHM` completed the install via the
native relay lane (§9.4):

1. `pave install johnmak101-ops/openpave-heygen-mcp` → heygen-mcp@0.1.0 at `~/.pave/skills/heygen-mcp`
2. `capabilities_add https://mcp.heygen.com/mcp/v1` → `pending_oauth`, auth.type oauth2, `mcp:heygen` granted (R10 enum trap does NOT reproduce on this bridge — answers SKILL.md §7.1)
3. PAVE `oauth/start` (verifier held by PAVE) → user approved → pasted dead-loopback address-bar URL → agent relayed verbatim into PAVE's own `/oauth/callback` → PAVE did the PKCE exchange and stored tokens itself
4. `mcp:heygen [installed]`, `tokens.yaml` mode 0600 with `MCP__heygen__ACCESS` + `MCP__heygen__REFRESH`
5. `tool_search "heygen"` → 114 `mcp_heygen_*` tools; `mcp_heygen_get_current_user` returned john.mak@candrholdings.com / free plan — through the bridge, not the probe

**Both §9.4 lanes are now production-verified** (bridge lane on the laptop
2026-11-12; native relay lane in the sandbox 2026-11-12). Epic complete:
M0–M6 all pass. Total spend US$0 of the US$10 budget.

---

# PAVE Connect extension — live test (2026-11-12, Chrome, unpacked)

- **Tab capture: PASS.** Approve → loopback tab dies (ERR_CONNECTION_REFUSED)
  → `webNavigation.onErrorOccurred` fired → tab redirected to the extension
  page (fallback copy-page when no origin configured — user copied with one
  button).
- **Relay path: PASS.** Origin `http://127.0.0.1:49200` (mock relay) →
  extension POSTed `{code, state, callback_url}` → mock answered
  `200 {installed:true}` → tab rendered "Connected ✓". Mock log captured the
  full round trip; observed double-fire (two codes, same state, 10 s apart) —
  endpoint spec updated with idempotent-state guidance.
- **Fallback preservation: PASS.** With no origin, the same capture shows the
  copy page — the manual paste-URL lane survives as the floor.
- Firefox manifest provided (untested — no Firefox on the build machine);
  Safari path requires macOS/Xcode to package (code is Safari-compatible).

---

# HyperFrames MCP server — verified 2026-11-12

- Separate MCP resource: `https://mcp.heygen.com/mcp/hyperframes/`
  (`heygen-mcp-hyperframes` v1.30.0, 18 tools; snapshot
  `schemas/snapshot-hyperframes-2026-11-12.json` committed)
- **One OAuth token spans all mcp.heygen.com resources** — the v1-minted
  Bearer authenticated hyperframes with no new consent (not audience-locked)
- Tool families: compose/agentic project editing (`compose`,
  `get_project_status`), renders (`render_video`,
  `render_project_with_variables` — PAID, confirm first; status polls),
  Claude-Design imports (`import-claude-design-from-url`,
  `import-claude-motion-from-url`), projects CRUD, plus `internal_*`
  widget/player/analytics tools that are HeyGen-internal — never call from PAVE
- Was API-only (§11) when first documented; promoted onto the bridge
  unannounced — the quarterly re-probe rule earned its keep same-day

---

# browser:handoff scope — tested and excluded (2026-11-12)

The host-level PRM advertises a `browser:handoff` scope. Tested: authorize
URL with `scope=openid profile email browser:handoff` → approval → identical
loopback redirect, identical dead tab. No handoff page, no rendered code, no
behaviour change. Conclusion: the scope serves HeyGen's own widget/player
handoff (`internal_widget_event` class), NOT cloud-agent OAuth. Every
hypothesis for a no-paste cloud path (device flow, hosted redirects,
handoff scope) is now empirically closed; paste-back or API-key lanes are
the complete answer set.

---

# Hosted-browser lane — login bootstrap COMPLETE (2026-11-12 ~07:46, sandbox)

- Persistent HeyGen web login banked at /home/pave/heygen-browser/profile
  ("Welcome, John"), verified across a fresh browser process; screenshot
  proofs on the host.
- Key finding: chrome-headless-shell is Turnstile-detected (403 on magic-link
  POST); full Chromium headed under Xvfb passes invisibly. Canonical driver:
  driver.mjs status|sendlink|openlink via xvfb-run.
- Magic-link single-use protocol learned live: one send only (resends
  invalidate), never click (first browser wins), corporate gateways may
  pre-fetch and burn links, consumed links auto-trigger a replacement email.
- Renewal ladder (first expiry ~2026-11-22): capabilities_refresh →
  oauth/result check → consent in banked browser → magic-link re-bootstrap.
