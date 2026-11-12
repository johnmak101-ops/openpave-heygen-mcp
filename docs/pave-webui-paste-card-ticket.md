# Ticket — PAVE WebUI: OAuth paste-URL card for loopback-only MCP providers

**Type:** Feature request · **Component:** WebUI (Settings → MCP servers) · **Priority:** Medium — unblocks every remote/sandboxed PAVE install of a loopback-only MCP provider (HeyGen today; verified 2026-11-12)

## Problem

HeyGen's Remote MCP (`https://mcp.heygen.com/mcp/v1`) accepts **loopback
redirect URIs only** (`http://127.0.0.1:<port>/<path>`, `http://localhost:*`
— allowlist verified against the live AS). Containerised/remote PAVE cannot
receive the OAuth callback: the browser's loopback lands on the user's own
machine, where the tab dies with `ERR_CONNECTION_REFUSED`.

Today the only completion path is an agent-run ritual: the user copies the
dead tab's address-bar URL and pastes it into the PAVE chat; the agent relays
it into PAVE's own `/oauth/callback`. **Verified working end-to-end**
(sandbox install 2026-11-12, 114 tools bridged) — but the UX is agent-shaped,
not product-shaped, and breaks entirely without a live agent session.

Device flow (the standard answer) is advertised in HeyGen's AS metadata but
disabled (`unauthorized_client`). Hosted redirect URIs are refused. So the
paste is, for now, a physical floor — productize it.

## Proposal

Add a first-class **paste-URL card** to the MCP server connection flow:

```
┌─ Settings → MCP Servers → HeyGen ────────────────────┐
│  HeyGen Remote MCP                    [未連接]        │
│                                                       │
│  ① [連接 HeyGen]  ← opens authorizeUrl in new tab     │
│                                                       │
│     （批准後個分頁會顯示「無法連線」—— 正常，唔使驚）   │
│                                                       │
│  ② 喺嗰個分頁：撳地址欄 → Ctrl+C，貼落嚟：            │
│     ┌──────────────────────────────────────┐         │
│     │ http://127.0.0.1:4096/oauth/callback?…│         │
│     └──────────────────────────────────────┘         │
│                    [ 連接 ]                           │
└───────────────────────────────────────────────────────┘
```

Server side: parse `code` + `state` from the pasted URL, validate the state
against the pending OAuth state PAVE already holds from `oauth/start`, feed
both into the existing `/oauth/callback` handler (which does PKCE exchange +
token store — `[verified 2026-11-12]`). No new OAuth machinery.

## Acceptance criteria

1. Card appears when (and only when) a pending OAuth state exists for that
   MCP entry — no phantom boxes on unconfigured servers.
2. Pasted URL is validated (`code` present; `state` matches pending) before
   the Connect button enables; mismatches get a one-line reason
   ("link expired — press ① again").
3. Success transitions the entry to `installed` and shows the §9.8
   known-good table equivalent (status, token keys present, tool count).
4. Failure surfaces the upstream error text (this bridge returns full
   `error_code`/`message`/`next_steps` — display them).
5. Works for any loopback-only provider; nothing HeyGen-specific in the UI
   copy beyond the provider name.

## Reference materials (all verified 2026-11-12)

- Full verified install doctrine: `johnmak101-ops/openpave-heygen-mcp` →
  `SKILL.md` §2 (OAuth), §9.4 (both completion lanes), §9.8 (known-good state)
- Relay endpoint spec (upgrade path that removes even the paste, plus a
  ready-made browser extension reference implementation):
  `docs/pave-oauth-relay-endpoint.md` + `extension/` in the same repo
- Root-cause evidence (DCR no-op, loopback allowlist matrix, device flow
  disabled): issue #1 milestone-0 comment + board topic 01M76YF8DG57T0TNRDFD60BZ4Y

## Out of scope

- Automatic relay via browser extension (separate ticket; spec + reference
  implementation provided — ships zero-copy once the endpoint exists)
- HeyGen-side asks (device flow, hosted redirects) — tracked upstream
