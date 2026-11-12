# Ticket — PAVE WebUI: OAuth paste-URL card for loopback-only MCP providers (MCP lane)

> **Superseded as the primary connect UX** by the API-key card
> (`pave-webui-paste-card-ticket.md`, decision 2026-11-12). Kept for installs
> that must avoid API keys. Original content below.

**Type:** Feature request · **Component:** WebUI (Settings → MCP servers) · **Priority:** Medium

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
① a Connect button opens the authorizeUrl; ② the user approves; the tab dies
(expected); ③ the user copies the address-bar URL into a field; ④ PAVE parses
`code` + `state`, validates against the pending OAuth state from `oauth/start`,
and feeds both into the existing `/oauth/callback` handler (PKCE exchange +
token store — `[verified 2026-11-12]`). No new OAuth machinery.

## Acceptance criteria

1. Card appears only when a pending OAuth state exists for that MCP entry.
2. URL validated (`code` present; `state` matches pending) before Connect
   enables; mismatch shows "link expired — press ① again".
3. Success shows the known-good state table (status, token keys, tool count).
4. Failure surfaces upstream error text (`error_code`/`message`/`next_steps`).
5. Provider-agnostic; nothing HeyGen-specific beyond the provider name.

## Reference materials (verified 2026-11-12)

- Full doctrine: `johnmak101-ops/openpave-heygen-mcp` → `SKILL.md` §2 (OAuth),
  §9.4 (both completion lanes), §9.8 (known-good state)
- Zero-copy upgrade path (relay endpoint spec + browser extension reference
  implementation): `docs/pave-oauth-relay-endpoint.md`, `extension/`
- Root-cause evidence: issue #1 milestone-0 comment + board topic
  01M76YF8DG57T0TNRDFD60BZ4Y

## Out of scope

- Automatic relay via browser extension (separate ticket; spec + reference
  implementation provided)
- HeyGen-side asks (device flow, hosted redirects) — tracked upstream
