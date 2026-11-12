# Upstream issue watch — claude-ai-mcp#284 (HeyGen token exchange fails on Claude Desktop)

Date inspected: 2026-11-12 · Source: https://github.com/anthropics/claude-ai-mcp/issues/284

## What it reports

Claude Desktop (Windows 11) + HeyGen Remote MCP as custom connector: browser
OAuth succeeds, callback reaches Claude Desktop, then **token exchange fails
server-side in the client** ("Authorization with the MCP server failed",
reference ofid_*). Matches #207/#46/#34 — a cross-provider pattern of
"callback received, exchange never completes". Reported 2026-05-13.

## Why it matters here

HeyGen's own "supported agent" list names Claude Desktop — and even that path
is broken on Windows. Independent evidence that the MCP/OAuth lane is fragile
across every client we examined (PAVE sandbox: loopback geometry; Claude
Desktop: token-exchange regression). Reinforces the 2026-11-12 pivot: API-key
+ REST is the dependable primary lane.

## Hypotheses for the root cause (ranked by testability)

| # | Hypothesis | Evidence for/against |
|---|---|---|
| 1 | Token endpoint 307-redirect kills strict clients | **Excluded** — probed live: POST /v1/oauth/token answers 400 directly, no redirect (trailing-slash variant 404s) |
| 2 | `resource` parameter (RFC 8707) required at exchange; client omits it | **EXCLUDED 2026-11-12** — live test: exchange WITHOUT `resource` returned HTTP 200 with a full token set. The parameter is accepted but not required. |
| 3 | `redirect_uri` mismatch — client's exact redirect string differs from authorize step (e.g. trailing slash, port) | **CONFIRMED as live server behaviour 2026-11-12** — exchange with a mismatched port (`49996` vs authorized `49997`) returned `400 invalid_grant "Invalid 'redirect_uri' in request."`. HeyGen exact-matches the literal string. If Claude Desktop replays anything but the byte-identical redirect_uri, the exchange fails with exactly this — matching #284's symptom (callback OK, exchange fails, generic client error). **Leading hypothesis.** Client-side confirmation requires Anthropic to log the exchange request body. |
| 4 | Client sends JSON body instead of form-encoded | Untested; endpoint speaks form-encoded OAuth standard |
| 5 | Returned scope normalization (`openid` regardless of request) trips strict scope validation in the client | Weak but cheap to rule out |
| 6 | Fixed in later Claude Desktop builds (issue is 6 months old) | Check current build before deeper work |

## Actionable notes

- `claude mcp add` in **Claude Code** (CLI) is a different, newer OAuth stack
  than **Claude Desktop's** connector — do not assume #284 applies to it.
- If testing hypothesis 2: mint authorize URL (with resource), consent, then
  exchange once omitting `resource`. Single-use code = one hypothesis per
  consent round.
