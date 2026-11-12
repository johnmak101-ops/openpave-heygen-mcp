# Ticket — PAVE WebUI: connect HeyGen via API-key paste card (primary lane)

**Type:** Feature request · **Component:** WebUI (Settings → Integrations) · **Priority:** High — simplest possible connect UX for HeyGen; verified feasible 2026-11-12

## Problem

HeyGen supports two integration surfaces:

1. **Remote MCP** (`mcp.heygen.com`) — OAuth, loopback-redirect-only,
   verified to be a poor fit for remote/containerised PAVE (see
   `docs/pave-webui-paste-card-ticket-mcp.md` for the full odyssey).
2. **v3 REST API** (`api.heygen.com`) — one API key, `X-Api-Key` header, no
   OAuth, no redirect geometry at all.

The REST lane reduces the entire connection ritual to **one paste**:

## Proposal

```
┌─ Settings → Integrations → HeyGen ────────────────────┐
│  HeyGen REST API                       [未連接]        │
│                                                        │
│  ① 去 https://platform.heygen.com/api-keys             │
│     開一個 API key（撳「Create new key」→ copy）        │
│                                                        │
│  ② 貼落嚟：                                             │
│     ┌──────────────────────────────────────┐          │
│     │ sk_V2_hgu_…                            │          │
│     └──────────────────────────────────────┘          │
│                   [ 連接 ]                             │
│                                                        │
│  （收費：API credits，喺 HeyGen wallet 充值）            │
└────────────────────────────────────────────────────────┘
```

Server side: store the key in PAVE's secret store (never in skill files or
chat transcripts); verify with `GET /v3/users/me` (returns email + wallet —
`verified 2026-11-12`); mark connected. From then on PAVE calls v3 REST
directly.

## Acceptance criteria

1. Key stored server-side with the same secrecy tier as tokens (0600 /
   secret store); never echoed after entry.
2. Verify-on-save via `GET /v3/users/me`; surface the account email so the
   user knows which HeyGen account they connected.
3. Paid-call failures surface HeyGen's own error (`402 insufficient_credit`
   with "At least N credits required" — `verified 2026-11-12`) with a
   "top up wallet" link instead of a generic failure.
4. Key rotatable (re-paste replaces; old key revoked by user at
   platform.heygen.com/api-keys).
5. Free reads (avatars, voices, templates lists) usable immediately after
   connect, zero balance required.

## Reference materials (verified 2026-11-12)

- Auth + reads + billing-gate probes: `johnmak101-ops/openpave-heygen-mcp`
  issue #2, `evidence/VERIFICATION.md`
- v3 endpoint surface: https://developers.heygen.com (llms.txt index)
- The MCP-lane alternatives (OAuth paste-URL card, relay endpoint spec,
  browser extension) remain documented in-repo for installs that must avoid
  API keys: `SKILL.md` §9/§11, `docs/pave-oauth-relay-endpoint.md`, `extension/`
