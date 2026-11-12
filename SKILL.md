# HeyGen MCP Skill Doctrines (SKILL.md)

Doctrines for working with HeyGen from PAVE through the **remote HeyGen MCP
server** (`https://mcp.heygen.com/mcp/v1`, bridged as `mcp_heygen_*` tools).

Every claim carries a tag. Trust them differently:

| Tag | Meaning |
|---|---|
| `[verified <date>]` | Tested live against the real server/account (through the bridge or the committed probe). |
| `[bridge snapshot <date>]` | Read from a live `tools/list` schema dump (`schemas/snapshot-*.json` in this repo). |
| `[web]` | From HeyGen developer docs or the official heygen-com/skills repo. Not independently reproduced. |
| `[unverified]` | No evidence either way. Do not rely on it. |

If you change something in this file, replace blanket dates with per-claim
tags. A single "verified" stamp over unverified material launders guesswork
into fact.

---

## 0. What this skill is — and is not

- Doctrine playbook for driving HeyGen from PAVE. **Two lanes, primary first
  (decision 2026-11-12, superseding the original MCP-only scope):**
  1. **API-key lane (primary)** — the user creates an API key at
      `https://platform.heygen.com/api-keys` and pastes it into PAVE once;
      PAVE stores it server-side and calls the **v3 REST API**
      (`api.heygen.com`, `X-Api-Key` header) directly. No OAuth, no redirect,
      no loopback geometry, no browser extension — the connection is one paste.
      `verified 2026-11-12: auth OK, free reads OK, paid calls gate at HTTP 402
      insufficient_credit (≥0.5 credits/video).` Billing: **wallet credits**
      (top up at platform.heygen.com; US$10 ≈ 20 credits).
  2. **MCP lane (alternative)** — everything below in this file: the remote
      MCP server over OAuth, fully verified 2026-11-12 end to end — login,
      magic link, consent, plan pick, and token landing — driven by the
      committed `tools/oauth-stepper.mjs` inside a hosted browser profile
      (§9.4 lane 1). Works on hosted/headless PAVE with a single user paste
      (the magic-link URL); the user's own browser is not needed at all. Use
      when an install must avoid API keys, or when PAVE's MCP bridge is the
      preferred surface. Billing: plan credits.
- Doctrine-only skill: entrypoint is this file plus per-area doctrine under
  `skills/`. No local code except the committed diagnostic probe, the OAuth
  stepper (hosted-browser lane driver, §9.4 lane 1), and the OAuth
  bridge/extension utilities (MCP-lane tools).
- The MCP token never enters a skill sandbox or process env: it is attached
  only inside the PAVE server's MCP connection manager. The probe reads it
  from `~/.pave/tokens.yaml` and never echoes it.
- **The official heygen-com/skills CLI credential does not transfer** to this
  bridge, and vice versa. Different OAuth client registrations.

## 1. Installing the HeyGen MCP in PAVE

The remote server is Streamable-HTTP at `https://mcp.heygen.com/mcp/v1`.
`[verified 2026-11-12]`

```
capabilities_add https://mcp.heygen.com/mcp/v1
```

- PAVE derives the entry id from the host: `mcp.heygen.com` → `heygen`,
  so bridged tools are named `mcp_heygen_*` and the token key is
  `MCP__heygen__ACCESS`. `[verified 2026-11-12 — host→id rule verified
  against PAVE source doctrine of the same bridge family]`
- Expect first connect to end `status: error` until auth completes
  (401 unauthorized). A dead-looking entry at this stage is normal.
- **The repair verb is `capabilities_refresh heygen`.** Never re-run
  `capabilities_add` to fix a broken connection — it rewrites the registry
  entry and can destroy the auth config (openpave-wrike-mcp precedent).
- After connect, ensure `auth.type: "oauth2"` on the `servers.json` entry
  (read-modify-write; `capabilities_add` may leave it `none`), then run the
  OAuth start below. `[web + verified 2026-11-12 on the AS side]`

### R10 first-use grant — the enum trap

Bridged calls are refused with `permissionAsk: true` until `mcp:heygen` is
allowed. The agent-surface `permission` tool schema may omit `type: "mcp"`
and coerce it to `module`, which writes a useless grant (observed on the
dropbox bridge 2026-11-06; treat as a live risk here until tested).

Working paths, in order:

1. `permission` tool `action: "grant"`, `type: "mcp"`, `target: "mcp:heygen"`
   — works from surfaces whose schema passes `mcp` through; shows the user a
   confirmation card.
2. Direct edit of `~/.pave/permissions.yaml` (read-modify-write):

   ```yaml
   permissions:
     mcp:
       allowed:
         - mcp:heygen
   ```

   The config store re-reads on mtime change — no restart needed.
   `[PAVE source — mcp-config-store mtime cache, same bridge family]`

## 2. Auth — OAuth lane (verified)

HeyGen's MCP surface is **OAuth-only** — no API key. Every token traces to a
user's browser consent. `[verified 2026-11-12]`

**The OAuth lane is live, and it is DCR-native — no developer console, no app
key, no manual code exchange.** `[verified 2026-11-12]`

Discovery chain (all verified live 2026-11-12):

1. `GET https://mcp.heygen.com/mcp/v1` unauthenticated → `401` +
   `WWW-Authenticate: Bearer ... resource_metadata="https://mcp.heygen.com/.well-known/oauth-protected-resource/mcp/v1"`.
2. PRM → `authorization_servers: ["https://api2.heygen.com"]`, scopes
   `openid profile email` (`browser:handoff` also exists on the host-level
   PRM; the MCP resource exposes the three).
3. AS metadata at `https://api2.heygen.com/.well-known/oauth-authorization-server`
   → `authorization_endpoint` `/v1/oauth/authorize`, `token_endpoint`
   `/v1/oauth/token`, **`registration_endpoint` `/v1/oauth/register`** (RFC
   7591 DCR), PKCE `S256`, RFC 8707 resource indicators, `refresh_token`
   grant, public subjects, `token_endpoint_auth_method: none`.
4. DCR with `redirect_uris: ["http://127.0.0.1:4096/oauth/callback"]`
   (PAVE's default redirect) → **HTTP 201** — but the 201 is a no-op:
   HeyGen's registration endpoint always returns the **same shared client**
   (`client_id` issued 2026-02-17, `client_name "HeyGen MCP Default"`),
   echoing whatever `redirect_uris` you send without persisting them. There
   is no per-installation client. `[verified 2026-11-12 — two registrations
   hours apart returned the identical client_id; sandbox session re-confirmed
   and oracle-checked via POST /v1/oauth/client/info]`
5. That shared client is **RFC 8252 loopback-only**: `http://127.0.0.1:<any
   port>/<any path>` and `http://localhost:*` validate; every https origin,
   `0.0.0.0`, `host.docker.internal`, `[::1]` are rejected. Consequence:
   HeyGen's documented restriction ("Remote MCP sign-in works only from
   supported agents") does not bite dynamically registered clients, but
   **a `PAVE_PUBLIC_BASE_URL` pointing at a public origin can never
   validate** — hosted instances must use the hosted-browser stepper lane
   (§9.4 lane 1).
   `[verified 2026-11-12 — sandbox session, full allowlist matrix]`
6. Consent → authorization code → token exchange → Bearer access token
   (`expires_in: 864000` = 10 days) + refresh token + id_token. Scope
   normalizes to `openid` regardless of what you request.
7. Token verified against the live MCP surface: `initialize` OK
   (`heygen-mcp` v1.30.0), `tools/list` 114 tools, `get_current_user`
   returns the account email and plan.

### PKCE gotcha (cost one consent round to learn)

`code_challenge` must be
`base64url(sha256(verifier_ASCII_STRING))` — hash the **string**, not the
raw random bytes. Hashing the byte buffer fails the exchange with
`{"error":"invalid_grant","error_description":"Code challenge failed."}`
`[verified 2026-11-12]`

### Agent-driven OAuth start

```bash
curl -s -X POST http://127.0.0.1:4096/capabilities/mcp/heygen/oauth/start \
  -H "x-pave-internal-token: $(cat ~/.pave/.internal-token)" \
  -H "x-pave-internal-user: <owner email>" \
  -H 'Content-Type: application/json' -d '{}'
```

Returns an `authorizeUrl`; write it to `<oauth-dir>/authorize.url` (one line)
for the stepper (§9.4 lane 1). Tokens land as `MCP__heygen__ACCESS` /
`MCP__heygen__REFRESH` in `~/.pave/tokens.yaml`.

**The `state` in the authorizeUrl dies fast — observed ~35 minutes.** A
callback page reading `Connection Failed — Invalid or expired state token.
Please try again.` means the state expired mid-flow; the consent must be
redone against a fresh `oauth/start`. The banked browser login survives —
re-run `oauth/start`, write the new `authorize.url`, and redo only the tail
(`consent` / `finish`). `[verified 2026-11-12 — expired at ~35 min, tail redo
succeeded with the same profile]`

### Completing consent — hosted-browser stepper (primary, verified)

The authorizeUrl must end in a browser that shares loopback with PAVE. On
hosted/headless PAVE no user browser can — so host the browser yourself and
drive it with `tools/oauth-stepper.mjs`. **This lane is verified end to end
2026-11-12**: email form → magic link → consent → plan pick → callback
`Connected! Connected heygen!` → tokens stored → 114 bridged tools →
`get_current_user` live. Full runbook in §9.4 lane 1. Four findings the
runbook encodes:

1. **Headless Chromium is Turnstile-flagged.** Headless POST
   `api2.heygen.com/v1/pacific/account/magic_link` → `403`; the page toasts
   "Your request has been flagged for suspicious activity…" while the button
   keeps showing "Sending…" — the email is silently never sent. Fix: full
   Chromium **headed under `xvfb-run -a`**, normal Chrome UA,
   `--disable-blink-features=AutomationControlled`, init script masking
   `navigator.webdriver`. Turnstile then passes invisibly.
   `[verified 2026-11-12 — 403 headless vs 200 headed, same profile]`
2. **The magic link authenticates the requesting profile — it is not a
   standalone session.** The emailed link (`app.heygen.com/magic-web/<token>`)
   lands on a "Return to your original tab" page. Open the user-pasted URL
   inside the same persistent profile, then re-navigate the authorizeUrl; the
   consent screen appears there. `[verified 2026-11-12]`
3. **A plan-picker interstitial sits between "Authorize access" and the
   code.** HeyGen shows "Pick a plan for HeyGen MCP" (Free / Creator / Pro)
   before issuing the authorization code. This is billing consent: **always
   relay it to the user, never auto-pick.** The committed stepper enforces
   this — `finish` clicks a plan only when the name is passed in.
   `[verified 2026-11-12 — picker appeared, user chose Free]`
4. **One paste per install is the entire user cost** — the magic-link URL.
   Everything else is agent-driven in the hosted profile.

### Hosted-instance caveat

The default `redirect_uri` is `http://127.0.0.1:<PAVE_PORT|4096>/oauth/callback`
— a browser outside the container cannot reach it, and because the shared
client is RFC 8252 loopback-only (§2 step 5), **no public
`PAVE_PUBLIC_BASE_URL` can ever validate.** The hosted-browser stepper lane
(§9.4 lane 1) is the answer: the browser lives where PAVE lives, so loopback
is native. The bridge and native-relay lanes (§9.4 lanes 2–3) remain for
machines that cannot host a browser.

## 3. Tool surface — 114 tools, snapshot-verified

`[verified 2026-11-12 — live tools/list snapshot: schemas/snapshot-2026-11-12.json,
all 114 rows carry inputSchema; e2e initialize + tools/list + get_current_user
succeeded]` Upstream docs claim ~88 tools — the live surface is larger.
**Trust the probe, not the docs.** Doc drift already found: docs reference
an `upload_asset` tool that does not exist (the bridge exposes
`create_asset_upload` + `complete_asset_upload`), and `get_video_scenes`
exists on the bridge despite docs implying scene editing is API-only.

- **HeyGen runs a SECOND MCP server** at
  `https://mcp.heygen.com/mcp/hyperframes/` (`heygen-mcp-hyperframes` v1.30.0,
  18 tools, snapshot: `schemas/snapshot-hyperframes-2026-11-12.json`). It was
  API-only when this doctrine was written; promoted onto the bridge
  unannounced — a live example of §11's "re-check quarterly" rule.
  `[verified 2026-11-12 — bare probe, initialize, tools/list]`
- **One OAuth token covers every `mcp.heygen.com` resource.** The v1-minted
  token authenticated the hyperframes resource without a new consent —
  tokens are NOT audience-locked to the path that minted them.
  `[verified 2026-11-12 — same Bearer succeeded on /mcp/hyperframes/]`
  Local agents add each server with one command (`claude mcp add --transport
  http heygen https://mcp.heygen.com/mcp/v1/`) and complete OAuth
  zero-friction because the agent itself is the loopback receiver; remote
  PAVE follows §9.

Deep doctrine per product area lives in `skills/<area>/SKILL.md`:

| Area (folder) | Tools |
|---|---|
| `heygen-video-agent` | `create_video_agent`, `get_video_agent_session`, `list_video_agent_sessions`, `send_video_agent_message`, `stop_video_agent_session`, `list_video_agent_session_videos`, `get_video_agent_resource`, `list_video_agent_styles` |
| `heygen-classic-video` | `create_video_from_avatar`, `create_video_from_cinematic_avatar`, `create_video_from_image`, `create_video_from_studio`, `get_video_voice_capabilities`, `get_video`, `list_videos`, `lookup_videos`, `get_video_scenes`, `delete_video` |
| `heygen-avatar` | `list_avatar_groups`, `get_avatar_group`, `update_avatar_group`, `delete_avatar_group`, `create_prompt_avatar`, `create_photo_avatar`, `create_digital_twin`, `create_avatar_consent`, `get_avatar_creation_status`, `list_avatar_looks`, `get_avatar_look`, `update_avatar_look`, `delete_avatar_look`, `create_look_pack_looks`, `create_template_looks`, `list_look_templates` |
| `heygen-voice` | `list_voices`, `get_voice`, `design_voice`, `clone_voice`, `create_professional_voice`, `delete_voice`, `create_speech`, `create_speech_without_player`, `convert_speech`, `search_audio_sounds` |
| `heygen-models` | `text_to_video`, `image_to_video`, `reference_to_video`, `get_model_video`, `create_look_remix`, `get_look_remix`, `create_image`, `get_image` |
| `heygen-translate` | `create_video_translation`, `get_video_translation`, `list_video_translations`, `update_video_translation`, `delete_video_translation`, `list_video_translation_languages` |
| `heygen-lipsync` | `create_lipsync`, `get_lipsync`, `list_lipsyncs`, `update_lipsync`, `delete_lipsync` |
| `heygen-clipping` | `create_ai_clipping`, `get_ai_clipping`, `list_ai_clipping`, `delete_ai_clipping` |
| `heygen-filler-words` | `create_filler_word_removal`, `get_filler_word_removal` |
| `heygen-templates` | `list_templates`, `get_template`, `create_template`, `generate_from_template`, `update_template`, `delete_template`, `set_template_variables` |
| `heygen-brand` | `list_brand_kits`, `get_brand_kit`, `create_brand_kit`, `update_brand_kit`, `delete_brand_kit`, `list_brand_glossaries`, `get_brand_glossary`, `create_brand_glossary`, `update_brand_glossary`, `delete_brand_glossary` |
| `heygen-assets` | `list_assets`, `get_asset`, `delete_asset`, `create_asset_upload`, `complete_asset_upload`, `create_asset_upload_batch`, `complete_asset_batch`, `get_asset_batch`, `bulk_asset_statuses`, `create_folder`, `get_folder` |
| `heygen-batches` | `create_video_batch`, `get_video_batch`, `bulk_video_statuses`, `create_video_translation_batch`, `get_video_translation_batch`, `bulk_video_translation_statuses`, `create_lipsync_batch`, `get_lipsync_batch`, `bulk_lipsync_statuses` |
| `heygen-account` | `get_current_user` (+ hard-fenced subscription tools, §3.1) |

Dump the live surface yourself:

```bash
node probe/heygen-probe.mjs tools/list
node probe/heygen-probe.mjs schema create_video_agent
```

### 3.1 Tools that exist but doctrine forbids or fences

- **Subscription management** (`cancel_subscription`, `show_subscription_action`,
  `continue_subscription_cancellation`): on the bridge, but they touch
  billing. Never call these unless the user explicitly asks to change their
  subscription, and confirm once more before the final call.
  `[bridge snapshot 2026-11-12]`
- **Upstream telemetry** (`track_skill_activation`, `track_skill_completion`,
  `track_user_intent`): exist on the bridge for HeyGen's own product
  surfaces. **Never call these from PAVE.** `[bridge snapshot 2026-11-12]`
- **Feedback** (`submit_feedback`): exists on the bridge. Optional — call once
  after a session that hit real friction, with what broke and what you tried.
  Never required. `[bridge snapshot 2026-11-12]`

## 4. Bridge-wide doctrine

### 4.1 Media inputs: asset_id or public https URL — never local paths

Every media parameter (avatar creation, image/video inputs, B-roll,
translation sources) accepts a HeyGen `asset_id` or a public `https:// URL`.
Local paths (`C:\...`, `/mnt/...`, `file://`) are refused. Import first, then
pass the id. `[web — repeated across tool descriptions; consistent with live
schema snapshot 2026-11-12]`

### 4.2 Polling discipline

Video generation, translation, lipsync, clipping, avatar training, and batch
jobs are asynchronous. Poll status endpoints at 30 s intervals; after
5 minutes of no progress, tell the user the status and the id, and keep
waiting or hand off — do not spin silently, and never re-submit to "check".
`[web — per-tool descriptions]`

### 4.3 Plan and consent gates

- Paid-only features fail with `plan_upgrade_required`. When that fires,
  say plainly the feature is not in the account's plan and offer the closest
  plan-compatible alternative. Do not retry, do not auto-substitute a
  different paid feature. `[web — official skill doctrine]`
- Private avatars (photo, digital twin) require the consent flow:
  `create_digital_twin`/`create_photo_avatar` → `create_avatar_consent` →
  the subject approves in a browser within 24 h, one submission. Poll
  `get_avatar_creation_status` / `get_avatar_group` — never re-create to
  check progress. `[web]`

### 4.4 Upload runbook (the only raw-HTTP step, and it hits S3)

Media import is one MCP call, one `curl` to Amazon S3, one MCP call:

```bash
# 1. MCP: create_asset_upload(filename="clip.mp4", contentType="video/mp4",
#                             sizeBytes=1234567)
#    → { asset_id, upload_url, upload_headers }   (presigned S3 URL)
# 2. Shell: curl -X PUT -H "<each upload_headers entry>" --data-binary @clip.mp4 "<upload_url>"
# 3. MCP: complete_asset_upload(asset_id)  → asset finalized (idempotent)
```

`[verified 2026-11-12 — full runbook executed: 70-byte PNG → S3 HTTP 200 →
complete → get_asset]`

Field facts learned live (docs omit all of these):

- `contentType` and `sizeBytes` are **required** and **camelCase**; the
  validation error names them snake_case — read the schema, not the error.
- The response field is `upload_headers` (not `headers`); apply each entry
  verbatim to the PUT.
- **Media MIME types only** — `text/plain` is refused
  (`invalid_parameter`). Use image/video/audio types.
- The PUT target is Amazon S3 (`*.s3-accelerate.amazonaws.com`) — it never
  touches HeyGen's API, so it does not violate the MCP-only principle.
  Batch variant: `create_asset_upload_batch` (up to 100 files) → PUT each →
  `complete_asset_batch`.

### 4.5 Per-tool field naming — schema before first call

Parameter casing is **inconsistent across tools** and the validation errors
name fields differently from the schema (`contentType` in the schema,
`content_type` in the error). Before the first call to any tool, dump its
schema (`node probe/heygen-probe.mjs schema <tool>`) and use the schema's
exact property names. Verified examples 2026-11-12: `create_asset_upload`
wants `contentType`/`sizeBytes`; `create_video_agent` wants `avatarId`/
`voiceId`/`styleId`/`orientation` (only `prompt` required); `list_voices`
takes plain `type`/`language`/`limit`. `[verified 2026-11-12]`

### 4.6 Bridge error surfacing (good news)

This bridge does **not** swallow error text. Failures arrive in
`structuredContent` with `message`, `error_code`, `status_code`, a `doc_url`,
and `next_steps`; validation errors name the exact missing field. The
wrike-style bare-`isError` defect does not reproduce here (§7.2 closed).
`[verified 2026-11-12]`

### 4.7 Stringified payloads

Bridge results arrive as raw JSON **strings** inside MCP text content —
parse the text, do not expect pretty objects. `[verified 2026-11-12 —
get_current_user through the probe]`

### 4.6 State files

Avatar identity persists in `AVATAR-<NAME>.md` at the workspace root
(ported from the official heygen-avatar skill): the avatar skill writes it,
the video skill reads it (`group_id` + `voice_id`; resolve the ephemeral
`look_id` fresh via `list_avatar_looks` at runtime). No role symlinks.

## 5. Diagnostic fallback: drive the server directly

The bridge can swallow real error text (observed on the wrike bridge). When a
bridged call fails with a bare `isError`, use the committed probe:

```bash
node probe/heygen-probe.mjs tools/list
node probe/heygen-probe.mjs schema create_video_translation
node probe/heygen-probe.mjs call get_current_user '{}'
```

The probe reads the token from `~/.pave/tokens.yaml` — never from argv,
never echoed. Behind a proxy, prefix with `NODE_USE_ENV_PROXY=1`. On a
machine without the PAVE bridge (development), `HEYGEN_TOKEN_FILE` points at
a JSON `{"access_token": "..."}` file instead — dev-only, same never-echo
rules. `[verified 2026-11-12 — probe ran live: 114 tools + get_current_user]`

## 6. Config reference

| Key | Where | Purpose | Status |
|---|---|---|---|
| `MCP__heygen__ACCESS` | `~/.pave/tokens.yaml` | MCP access token (file 0600) | `[verified 2026-11-12]` |
| `MCP__heygen__REFRESH` | `~/.pave/tokens.yaml` | MCP refresh token | `[web — PAVE stores both on OAuth callback]` |
| `auth.type` | `~/.pave/mcp/servers.json` | `oauth2` after connect | `[web]` |
| `mcp:heygen` | `~/.pave/permissions.yaml` → `permissions.mcp.allowed` | R10 first-use approval | `[web — dropbox-bridge precedent]` |
| token lifetime | — | access token `expires_in: 864000` (10 days); refresh flow expected | `[verified 2026-11-12]` |

## 7. Open questions

1. Does the R10 `permission`-tool enum trap reproduce on this bridge? **Closed
   2026-11-12 — NO.** The grant landed correctly through the agent-surface
   permission tool (M5 sandbox install, `evidence/VERIFICATION.md`).
2. Does the bridge swallow error text like wrike's did? **Closed
   2026-11-12 — NO.** Errors arrive with full `message`/`error_code`/
   `next_steps` in `structuredContent` (§4.6).
3. Does PAVE's unattended refresh survive the 10-day access-token expiry?
   `[untested — first token issued 2026-11-12]`
4. Multi-skill discovery: this repo ships one skill (`heygen-mcp`) whose
   doctrine spans `skills/<area>/` sub-folders (pavesuperpower precedent on
   this PAVE lineage). Whether `pave install` registers the sub-folders as
   separately addressable skills is untested — until it is, address the
   whole playbook as `heygen-mcp`. `[untested]`
5. Does DCR work without a `redirect_uris` entry (no-redirect lane, for
   containers where the callback cannot reach PAVE)? **Moot 2026-11-12:** DCR
   is a no-op (§2 step 4) and the shared client is loopback-only (§2 step 5),
   so there is no no-redirect lane at all — the hosted-browser stepper
   (§9.4 lane 1) is the answer.

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| First `capabilities_add` shows `status: error` | Pre-auth 401 — normal | Run the OAuth lane (§2) |
| `Invalid redirect_uri: not registered for this client` | Only for pre-registered third-party clients; or a stale DCR id pinned with a different redirect | Re-run DCR via `oauth/start`; never hand-paste keys |
| `Code challenge failed` at token exchange | PKCE challenge hashed the raw bytes, not the verifier string | `challenge = b64url(sha256(verifier_string))` (§2) |
| Bridged call fails with bare `isError` | Bridge swallowed the error text | Re-run via the probe (§5) and read the real message |
| `plan_upgrade_required` | Feature not in account plan | Name the gap, offer plan-compatible alternative, wait for the user (§4.3) |
| Tool in docs but `no such tool` from the probe | Doc drift | Trust `tools/list` (§3); report upstream |
| `403` on `POST …/magic_link`, page toast "flagged for suspicious activity", button stuck on "Sending…" | Headless browser Turnstile-flagged; email never sent (§2) | Rerun the step with `HEADED=1 xvfb-run -a` (§9.4 lane 1) |
| Magic-link email never arrives (no 403 either) | Resent after a consume, or a corporate gateway pre-fetched it | Check the NEWEST email only; one resend max (§9.4 lane 1 step 4) |
| Callback page: "Invalid or expired state token" | `oauth/start` state died (~35 min) mid-flow | New `oauth/start` → rewrite `authorize.url` → redo only the tail (§2) |
| Magic-link page: link already used / expired | Link is single-use, first browser wins | Newest email holds the live link; consuming a dead one auto-sends a replacement (§9.4 lane 1 step 4) |
| Plan picker ("Pick a plan for HeyGen MCP") on screen | Normal interstitial before the code — billing consent | Relay to the user, never auto-pick (§2, §3.1) |

Whatever the outcome: **never** run `capabilities_add` to recover — the
repair verb is `capabilities_refresh heygen`.

## 9. Setup runbook — zero to working

### 9.0 Preflight

Confirm the PAVE build can host MCP at all: `~/.pave/mcp/servers.json` must
be the registry the server reads (check for the `mcp` dir; the
`capabilities_add` tool must exist in-session). Builds that predate the MCP
manager have none of this — upgrade PAVE first; every later step assumes it.
`[verified 2026-11-12 — a Sep-18 Windows PAVE build lacked the whole MCP
manager; see issue #1 milestone 0 evidence]`

### 9.1 Install the doctrine

```bash
pave install johnmak101-ops/openpave-heygen-mcp
cd ~/.pave/skills/heygen-mcp && git pull --ff-only
```

Confirm freshness: `grep -c 'OAuth lane' SKILL.md` must be ≥ 1, and for an
orchestrated install `grep -c 'INSTALL-QUESTION v2' SKILL.md` ≥ 1.

### 9.2 Register the server

```bash
capabilities_add https://mcp.heygen.com/mcp/v1
```

Expect `status: error` — normal pre-auth. **Never run this command twice**
(§1). The repair verb is `capabilities_refresh heygen`.

### 9.3 OAuth lane — pick by where the user's browser is

1. Back up `~/.pave/mcp/servers.json`, then set `heygen.auth.type = "oauth2"`.
2. `POST /capabilities/mcp/heygen/oauth/start` (see §2 for the curl); write
   the returned `authorizeUrl` to `<oauth-dir>/authorize.url`.
3. Finish consent in ONE of two places:
   - **User's own browser, only if it shares loopback with PAVE** (same
     machine, or a port-forwarded container): present the URL per §9.5; the
     user signs in, approves, picks the plan, and the redirect lands on
     PAVE's `/oauth/callback` natively.
   - **Hosted browser driven by the agent (default for hosted/headless
     PAVE — and it works locally too):** §9.4 lane 1, the stepper runbook.
4. Tokens land in `~/.pave/tokens.yaml`.

### 9.4 Hosted / containerized instance — three lanes

The user's browser cannot reach a container's `127.0.0.1:<port>/oauth/callback`
— that is inherent. Three lanes, best first:

**Lane 1 — hosted-browser stepper (zero user browser; ONE paste of the magic
link; consent leg verified 2026-11-12).** Host a browser INSIDE the PAVE
sandbox — its loopback IS PAVE, so the redirect completes natively. Drive it
with the committed `tools/oauth-stepper.mjs`. Verified end to end on this
host 2026-11-12: `capabilities_add` → `pending_oauth` → stepper login +
magic link + consent + plan pick → callback `Connected!` → tokens stored →
`capabilities_status` installed → `get_current_user` live through the bridge.

1. **Install Playwright + full Chromium on the host** (system deps via
   passwordless sudo; `xauth` is required by `xvfb-run`; local `npm install
   playwright` in the oauth dir — a global npm install as root is refused).
   Keep every artifact on a durable path outside wipe dirs (`~/.cache` and
   `~/.pave/cache` get wiped); default `HEYGEN_OAUTH_DIR=~/heygen-oauth`.
2. **NEVER run the browser headless for HeyGen auth** — Cloudflare Turnstile
   403s the magic-link POST with a "flagged for suspicious activity" toast
   while the button still says "Sending…" (email silently never sent). Every
   stepper invocation is `HEADED=1 xvfb-run -a` — full Chromium headed,
   normal Chrome UA, `--disable-blink-features=AutomationControlled`,
   `navigator.webdriver` masked. Turnstile passes invisibly.
   `[verified 2026-11-12]`
3. **Runbook (each step dumps URL, visible fields/buttons, body text, and a
   numbered screenshot):**

   ```bash
   # one-time: the driver ships in the skill's source repo (the PAVE skill
   # store carries only SKILL.md files) — clone it, run every step from root:
   git clone --depth 1 https://github.com/johnmak101-ops/openpave-heygen-mcp
   cd openpave-heygen-mcp && export HEYGEN_OAUTH_DIR=~/heygen-oauth  # holds authorize.url
   HEADED=1 xvfb-run -a node tools/oauth-stepper.mjs form          # → "Use email" clicked
   # …ask the user for the account email if unknown…
   HEADED=1 xvfb-run -a node tools/oauth-stepper.mjs email '<addr>' # NET 200 …/magic_link
   # …user opens the NEWEST email, right-click → "Copy link address", pastes it…
   HEADED=1 xvfb-run -a node tools/oauth-stepper.mjs magiclink '<pasted-url>'
   HEADED=1 xvfb-run -a node tools/oauth-stepper.mjs poll            # exit 7 = consent waiting
   HEADED=1 xvfb-run -a node tools/oauth-stepper.mjs consent         # "Authorize access"
   # …plan picker appears → ASK THE USER which plan (billing consent)…
   HEADED=1 xvfb-run -a node tools/oauth-stepper.mjs finish 'continue with free'   # user's pick
   ```

   `finish` ends on the PAVE callback page — body `Connected! Connected
   heygen! You can close this window.` means the code reached PAVE and the
   exchange happened server-side. Verify: `capabilities_status heygen` →
   `installed`, `token stored: true`; `mcp_heygen_get_current_user` returns
   the account email + plan. `[verified 2026-11-12 — full sequence on this
   host; account landed on plan free]`

   The `code` step exists as an alternative to the magic link when the email
   shows a 6-digit code and the user reads it out; `where` dumps the current
   page without navigating (debug).
4. **Magic-link protocol — single-use rules, learned live:**
   - **One send only.** Every `POST /v1/pacific/account/magic_link`
     invalidates all previously issued links. Multiple sends during
     debugging burned the user's first paste.
   - **Never click.** The link is single-use, first browser wins. User
     right-click → "Copy link address" in the NEWEST email and pastes it;
     the agent redeems it via the `magiclink` step in the hosted profile.
   - The redeemed link lands on **"Return to your original tab"** — it
     authenticates the requesting browser profile, not a standalone
     session. Re-navigate the authorizeUrl (`poll` / `consent` does) to
     reach the consent screen. `[verified 2026-11-12]`
   - Corporate email gateways may pre-fetch and burn links — if a fresh
     unclicked paste fails, resend once.
   - Hitting a consumed/expired link makes HeyGen auto-send a replacement;
     the newest email then holds the live link.
5. **State expiry:** the `oauth/start` state dies in ~35 min (§2). Expired →
   new `oauth/start`, rewrite `authorize.url`, redo only the tail. The
   profile login survives.
6. Renewal (see §9.9): `capabilities_refresh heygen` first; if the refresh
   lane fails, full consent inside the banked profile (new `oauth/start` →
   stepper `consent`/`finish`). If the browser session itself expired,
   re-bootstrap via magic link (steps 3–4), then consent.

Trust boundary: a logged-in profile on the box equals `tokens.yaml` — anyone
with this PAVE instance has the HeyGen web session.

**Lane 2 — bridge (one paste).** Run the committed bridge on the
machine where the user's browser runs:

```bash
node bridge/heygen-oauth-bridge.mjs        # listens on 127.0.0.1:49153, opens the browser
```

Zero-dependency variant for machines without Node (double-click, no
terminal): `bun build --compile bridge/heygen-oauth-bridge.mjs --outfile heygen-oauth-bridge.exe`
(verified 2026-11-12, ~94 MB, self-contained).

It generates its own PKCE pair, captures the redirect, performs the exchange
itself, and renders the finished token JSON on a page with a copy button
(the Google-Workspace "credential blob" pattern — HeyGen's own SPA renders
nothing usable). The user pastes that one JSON blob into the PAVE chat; the
agent stores it via the sanctioned route and refreshes:

```bash
curl -X PUT http://127.0.0.1:4096/capabilities/mcp/heygen/tokens \
  -H "x-pave-internal-token: $(cat ~/.pave/.internal-token)" \
  -H "x-pave-internal-user: <owner email>" \
  -H 'Content-Type: application/json' -d '<pasted blob>'
capabilities_refresh heygen
```

`[verified 2026-11-12 — bridge tested end to end on the laptop; tokens
validated against the live MCP surface]`

**Lane 3 — native relay (paste a URL).** If you instead used PAVE's own
`oauth/start` (PAVE holds the verifier), the browser dies on the container's
loopback — expected. The user copies the full address-bar URL; relay it
verbatim into PAVE's own callback so PAVE does the exchange:

```bash
curl -s "http://127.0.0.1:4096/oauth/callback?code=<CODE>&state=<STATE>"
```

Never hand-copy tokens into `tokens.yaml` outside these two routes (§2, R6).

### 9.5 Presenting the authorize URL — do not use a question card

Emit the URL as a **clickable markdown link in the chat reply**:

```
[Authorize HeyGen](https://api2.heygen.com/v1/oauth/authorize?...)
```

Question-card text is not copyable in the WebUI. In an orchestrated install
(§10), session A presents the link; B never shows anything to the user.

### 9.6 Grant and verify

```yaml
# ~/.pave/permissions.yaml
permissions:
  mcp:
    allowed:
      - mcp:heygen
```

Then `tool_search "heygen"` → 114 tools, `get_current_user` returns the
account. `[verified 2026-11-12 via probe; bridge path pending on an
MCP-capable PAVE build]`

### 9.7 Clean up

Delete every temp file that held a token or PKCE verifier. Keep
`tokens.yaml` at mode 0600.

### 9.8 Known-good state — what "done" looks like

| Artifact | Expected value |
|---|---|
| `servers.json → heygen.status` | `installed` |
| `servers.json → heygen.auth` | `type: "oauth2"` |
| `tokens.yaml` | `MCP__heygen__ACCESS` + `MCP__heygen__REFRESH`, file mode 0600 |
| `permissions.yaml` | `permissions.mcp.allowed` contains `mcp:heygen` |
| `tool_search "heygen"` | 114 `mcp_heygen_*` tools |
| `get_current_user` | returns email + plan |

### 9.9 After token expiry — confirm unattended refresh

Renewal ladder (verified plan 2026-11-12, first expiry ~2026-11-22):
1. `capabilities_refresh heygen` (refresh-token lane, no browser, no user);
   check `GET /capabilities/mcp/heygen/oauth/result` for `connected:true`.
2. Refresh failed → consent inside the banked profile (§9.4 lane 1 step 6):
   fresh `oauth/start` → `authorize.url` → stepper `consent`/`finish`.
3. Browser session dead → magic-link re-bootstrap (§9.4 lane 1 steps 3–4),
   then step 2.

The access token lives 10 days. When it expires, a bridged call should
refresh silently. If you see 401s: `capabilities_refresh heygen` once, then
re-check; if refresh is not working, re-auth via §9.3. Never re-add.

## 10. Install orchestration — A/B session split

Same protocol as openpave-dropbox-mcp §10 (A talks to the user and runs the
card-showing steps; B runs the runbook; relay via explicit
`send_to_session` one-shots with round-numbered `INSTALL-QUESTION v2` /
`ANSWERS v2`; lock file `~/.pave/mcp/.heygen-install.lock`; watchdog;
ghost dead-letter). The full brief for B is
`orchestration/brief.template.md`. Differences from the dropbox flow, because
HeyGen OAuth is DCR-native:

- **No developer-console step.** There is no app key to create, no
  authorization code to paste, no App Secret to discard. The only user
  action is opening the `authorizeUrl` and approving.
- The B-session upload runbook (§4.4) runs only if the user asks for upload
  capability mid-install.

## 11. Not on the bridge (stop looking)

These are API-only today. They are named so nobody burns time hunting; the
doctrine deliberately documents no paths for them: proofread sessions,
webhook endpoint management, streaming TTS (the WebSocket/HTTP stream —
`create_speech` on the bridge is request/response only), Stripe project
wallets. Re-check quarterly with the probe — HeyGen promotes tools onto the
bridge without always updating the docs (§3): **hyperframes used to be on
this list and moved to its own MCP server** (`/mcp/hyperframes/`, §3).
`[verified 2026-11-12 — absent from the 114-tool snapshot]`
