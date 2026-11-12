---
name: heygen-account
description: |
  HeyGen Account and Billing through the remote MCP server (mcp_heygen_* tools).
  Part of the heygen-mcp playbook — read ../SKILL.md index first for
  auth, bridge-wide doctrine, and the MCP-only principle.
version: 0.1.0
license: MIT
---

# HeyGen Account and Billing

Doctrine status: **[stub — schema-grounded]**. Tool names and descriptions
below come from the live `tools/list` snapshot (2026-11-12). Operational
doctrine is [unverified] unless tagged otherwise — verify with
`node probe/heygen-probe.mjs schema <tool>` and live calls before relying
on it. Bridge-wide rules (media inputs, polling, plan gates) live in
`../SKILL.md` §4.

## Tools (4)

| Tool | Live description (2026-11-12 snapshot) |
|---|---|
| `get_current_user` | Returns the authenticated user's profile, remaining credits or balance, and billing details. |
| `cancel_subscription` | Start HeyGen's cancellation conversation in the chat. This tool does not open a widget or change billing. For a general request such as 'I want to cancel my HeyGen subscription', call this tool with skipRetention=false and send the returned opening question directly to the user, preserving its wording. Do not add an attribution such as 'HeyGen says', a preamble, or quotation marks. A reason is optional: forward only feedback already supplied. Set skipRetention=true only if the user explicitly asks to skip questions/offers or go directly to confirmation. Use an existing flowId to resume without replaying the opening turn. Continue new user turns with continue_subscription_cancellation. Display show_subscription_action only for an eligible offer or cancellation confirmation. |
| `show_subscription_action` | Display a subscription action card for an existing cancellation flow. Do not call for the initial general cancellation request: start with cancel_subscription and relay Cicero's opening question in chat. Use action='offer' only after Cicero returns an eligible offer; use action='cancel' immediately when Cicero indicates cancellation confirmation, the user reaffirms cancellation (including 'yes' to a cancellation question), or explicitly declines further questions/offers and wants to proceed. Do not ask another confirmation question in chat before opening this card. Reads current status and terms; it cannot apply an offer or cancel billing. The user must click an explicit action in the card. |
| `continue_subscription_cancellation` | Pass the user's latest cancellation feedback or question from the chat to HeyGen's existing retention conversation. Use the flowId returned by cancel_subscription and the user's own message; never invent feedback or call without a new user turn. If the returned snapshot.state is 'confirm', immediately call show_subscription_action with action='cancel' without another chat confirmation question. Otherwise send the returned cancellation reply directly to the user, preserving its wording. Do not add an attribution such as 'HeyGen says', a preamble, or quotation marks. Only offer terms returned by HeyGen are valid. This tool does not display a widget. When an offer is ready, call show_subscription_action with action='offer'. If the user reaffirms cancellation, including 'yes' to a cancellation question, or explicitly wants to skip further questions or offers, call show_subscription_action with action='cancel' instead of continuing the conversation. An affirmative answer to an offer or unrelated question is not cancellation intent. Neither this conversation nor the display tool changes billing; only explicit widget clicks accept offers or confirm cancellation. Do not automatically retry a timed-out message; reopen the existing flow to check status. |


## Hard fence: subscription tools

`cancel_subscription`, `show_subscription_action`, and
`continue_subscription_cancellation` touch billing. Never call them unless
the user explicitly asks to change their subscription — and confirm once more
immediately before the final call. `get_current_user` is the only
account tool in routine use. [bridge snapshot 2026-11-12]

