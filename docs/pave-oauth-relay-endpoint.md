# `POST /api/mcp/oauth-relay` — spec for the PAVE team

Receives the OAuth authorization code that a browser extension caught from a
dead loopback redirect, and completes the flow PAVE already started via
`oauth/start` (PAVE holds the PKCE verifier and the pending `state`).

## Request

```http
POST /api/mcp/oauth-relay
Content-Type: application/json
Cookie: <PAVE WebUI session>        # authenticated by session, same as WebUI
X-PAVE-Relay: 1                      # CSRF canary — reject without it

{
  "code":  "UYe4ojVqSKPofXyLCF9o8x2GgyolErgslMHPEgzPtDsL8dtm",
  "state": "xYO73bK6wBzpNCXU1zytPg",
  "callback_url": "http://127.0.0.1:4096/oauth/callback?code=...&state=..."
}
```

`callback_url` is informational (audit log); `code` + `state` are authoritative.

## Behaviour

1. **AuthN**: reject 401 without a valid WebUI session (or bearer token).
2. **CSRF**: require the `X-PAVE-Relay` header; session cookie must be
   `SameSite=Lax` at minimum.
3. **State match**: look up pending OAuth states for this session/workspace.
   No match → `409 {error:"no_pending_state"}` (the extension shows "start the
   connection from PAVE first").
4. **Exchange**: feed `{code, state}` into the SAME handler as the existing
   `GET /oauth/callback` route — PAVE already does PKCE verification and token
   storage there (`[verified 2026-11-12 — sandbox install]`).
5. **Response**:

```http
200 OK
{"installed": true, "provider": "heygen", "entry_id": "heygen"}
```

Errors: `400 invalid_code` (exchange refused, include upstream error text —
codes are single-use, so a duplicate relay of the same code lands here and
must not be treated as a server fault), `401 unauthenticated`,
`409 no_pending_state`, `429` rate-limited (max 5 attempts / state).

## Observed client behaviour (live test 2026-11-12)

The MV3 client can fire the relay more than once for one approval (two
distinct codes for the same state arrived 10 s apart in testing — likely a
double navigation/approval retry). The endpoint should therefore treat
"state already consumed" as a success-path lookup: if the entry is already
`installed` for that state, answer `200 {installed:true, provider, already:true}`
instead of an exchange attempt.

## Why this shape

- **No new OAuth machinery**: reuses the existing callback handler; this route
  is a second front door into it.
- **Session-cookie auth** means zero configuration for the user: if they can
  open the WebUI, the extension works.
- **Provider-agnostic**: any loopback-only MCP provider (today HeyGen, tomorrow
  others) flows through the same relay; the provider identity comes from the
  matched pending state, not the request.
- **Auditable**: log `callback_url` host+path (never full query elsewhere),
  matched entry id, and outcome.

## Reference client

`extension/` in this repo — MV3, ~120 lines, host permissions limited to
loopback. `tools/mock-relay-server.mjs` is a working mock for local testing.
