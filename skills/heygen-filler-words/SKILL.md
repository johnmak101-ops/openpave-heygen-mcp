---
name: heygen-filler-words
description: |
  HeyGen Filler Word Removal through the remote MCP server (mcp_heygen_* tools).
  Part of the heygen-mcp playbook — read ../SKILL.md index first for
  auth, bridge-wide doctrine, and the MCP-only principle.
version: 0.1.0
license: MIT
---

# HeyGen Filler Word Removal

Doctrine status: **[stub — schema-grounded]**. Tool names and descriptions
below come from the live `tools/list` snapshot (2026-11-12). Operational
doctrine is [unverified] unless tagged otherwise — verify with
`node probe/heygen-probe.mjs schema <tool>` and live calls before relying
on it. Bridge-wide rules (media inputs, polling, plan gates) live in
`../SKILL.md` §4.

## Tools (2)

| Tool | Live description (2026-11-12 snapshot) |
|---|---|
| `create_filler_word_removal` | Submits a video for filler-word removal and returns a job id. The job cuts filler words and long silences and renders one cleaned video; if nothing changes, the charge is refunded. Poll GET /v3/filler-word-removals/{id} or use webhooks. Media inputs take a HeyGen asset_id or a public https URL, never a local or sandbox path (/mnt/data/..., file://); import or upload the file first and pass its asset_id. |
| `get_filler_word_removal` | Returns the job resource: lifecycle status, progress, and — once completed — the presigned download URL of the cleaned video plus removal statistics (num_cuts, reduction_pct, durations). |


