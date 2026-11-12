---
name: heygen-clipping
description: |
  HeyGen AI Clipping through the remote MCP server (mcp_heygen_* tools).
  Part of the heygen-mcp playbook — read ../SKILL.md index first for
  auth, bridge-wide doctrine, and the MCP-only principle.
version: 0.1.0
license: MIT
---

# HeyGen AI Clipping

Doctrine status: **[stub — schema-grounded]**. Tool names and descriptions
below come from the live `tools/list` snapshot (2026-11-12). Operational
doctrine is [unverified] unless tagged otherwise — verify with
`node probe/heygen-probe.mjs schema <tool>` and live calls before relying
on it. Bridge-wide rules (media inputs, polling, plan gates) live in
`../SKILL.md` §4.

## Tools (4)

| Tool | Live description (2026-11-12 snapshot) |
|---|---|
| `create_ai_clipping` | Submit a source video and return a job id immediately. The job runs asynchronously and produces one or more short clips. Highlights are picked from the spoken dialogue, so music-only or silent videos fail. Clips are 20 seconds or longer; output_settings.duration_types picks the length bands (30, 60, 180, long). Check progress with get_ai_clipping, or subscribe to the ai_clipping.success / ai_clipping.fail webhooks. Media inputs take a HeyGen asset_id or a public https URL, never a local or sandbox path (/mnt/data/..., file://); import or upload the file first and pass its asset_id. |
| `get_ai_clipping` | Returns the full job resource including produced clips, statuses, and presigned download URLs. |
| `list_ai_clipping` | Returns a cursor-paginated list of AI clip jobs in the authenticated user's workspace, newest first. |
| `delete_ai_clipping` | Soft-deletes an AI clip job and its clips. |


