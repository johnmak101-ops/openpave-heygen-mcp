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

- Doctrine-only skill: entrypoint is this file plus per-area doctrine under
  `skills/`. No local code except the committed diagnostic probe. No sandbox
  applies — the HeyGen MCP is a remote HTTPS service; no HeyGen code runs on
  your machine. `[verified 2026-11-12 — package layout + OAuth + 114-tool surface]`
- **MCP-only.** This skill never documents API keys, `api.heygen.com` REST
  paths, or the `heygen` CLI. Everything runs through the hosted Remote MCP
  server over OAuth. If a capability is not on the bridge, it is named in
  §11 and left there.
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
   (PAVE's default redirect) → **HTTP 201, client_id issued**. HeyGen's
   documented restriction ("Remote MCP sign-in works only from supported
   agents; others get `Invalid redirect_uri`") applies to pre-registered
   third-party clients — **it does not block dynamically registered
   clients.** `[verified 2026-11-12 — the exact PAVE-shaped DCR accepted]`
5. Consent → authorization code → token exchange → Bearer access token
   (`expires_in: 864000` = 10 days) + refresh token + id_token. Scope
   normalizes to `openid` regardless of what you request.
6. Token verified against the live MCP surface: `initialize` OK
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

Returns an `authorizeUrl`; the user opens it anywhere, signs in, approves,
and the redirect lands on PAVE's `/oauth/callback`. Tokens land as
`MCP__heygen__ACCESS` / `MCP__heygen__REFRESH` in `~/.pave/tokens.yaml`.

### Hosted-instance caveat

The default `redirect_uri` is `http://127.0.0.1:<PAVE_PORT|4096>/oauth/callback`
— a browser outside the container cannot reach it. Set `PAVE_PUBLIC_BASE_URL`
in `settings.yaml` to an origin that routes to PAVE itself, or fall back to
registering a DCR client against a redirect the user CAN reach and storing
the result via the tokens route. (Same doctrine as openpave-dropbox-mcp §2.)

## 3. Tool surface — 114 tools, snapshot-verified

`[verified 2026-11-12 — live tools/list snapshot: schemas/snapshot-2026-11-12.json,
all 114 rows carry inputSchema; e2e initialize + tools/list + get_current_user
succeeded]` Upstream docs claim ~88 tools — the live surface is larger.
**Trust the probe, not the docs.** Doc drift already found: docs reference
an `upload_asset` tool that does not exist (the bridge exposes
`create_asset_upload` + `complete_asset_upload`), and `get_video_scenes`
exists on the bridge despite docs implying scene editing is API-only.

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

1. Does the R10 `permission`-tool enum trap reproduce on this bridge?
   `[untested — dropbox coerced three calls 2026-11-06]`
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
   containers where the callback cannot reach PAVE)? Dropbox refuses it;
   HeyGen's AS is a different implementation. `[untested]`

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| First `capabilities_add` shows `status: error` | Pre-auth 401 — normal | Run the OAuth lane (§2) |
| `Invalid redirect_uri: not registered for this client` | Only for pre-registered third-party clients; or a stale DCR id pinned with a different redirect | Re-run DCR via `oauth/start`; never hand-paste keys |
| `Code challenge failed` at token exchange | PKCE challenge hashed the raw bytes, not the verifier string | `challenge = b64url(sha256(verifier_string))` (§2) |
| Bridged call fails with bare `isError` | Bridge swallowed the error text | Re-run via the probe (§5) and read the real message |
| `plan_upgrade_required` | Feature not in account plan | Name the gap, offer plan-compatible alternative, wait for the user (§4.3) |
| Tool in docs but `no such tool` from the probe | Doc drift | Trust `tools/list` (§3); report upstream |

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

### 9.3 OAuth lane

1. Back up `~/.pave/mcp/servers.json`, then set `heygen.auth.type = "oauth2"`.
2. `POST /capabilities/mcp/heygen/oauth/start` (see §2 for the curl).
3. Present the returned `authorizeUrl` per §9.5.
4. The user signs in and approves; the redirect returns to PAVE's
   `/oauth/callback`; tokens land in `~/.pave/tokens.yaml`.

### 9.4 Hosted instance

If the user's browser cannot reach `127.0.0.1:<port>/oauth/callback`, set
`PAVE_PUBLIC_BASE_URL` to an origin that routes to PAVE itself before
starting OAuth. If no such origin exists, open question §7.5 applies —
stop and report rather than improvising a token hand-copy.

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
`create_speech` on the bridge is request/response only), hyperframes cloud
rendering, Stripe project wallets. Re-check quarterly with the probe —
HeyGen promotes tools onto the bridge without always updating the docs
(§3). `[verified 2026-11-12 — absent from the 114-tool snapshot]`
