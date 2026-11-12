---
name: heygen-lipsync
description: |
  HeyGen Standalone Lipsync through the remote MCP server (mcp_heygen_* tools).
  Part of the heygen-mcp playbook — read ../SKILL.md index first for
  auth, bridge-wide doctrine, and the MCP-only principle.
version: 0.1.0
license: MIT
---

# HeyGen Standalone Lipsync

Doctrine status: **[stub — schema-grounded]**. Tool names and descriptions
below come from the live `tools/list` snapshot (2026-11-12). Operational
doctrine is [unverified] unless tagged otherwise — verify with
`node probe/heygen-probe.mjs schema <tool>` and live calls before relying
on it. Bridge-wide rules (media inputs, polling, plan gates) live in
`../SKILL.md` §4.

## Tools (5)

| Tool | Live description (2026-11-12 snapshot) |
|---|---|
| `create_lipsync` | Replaces the audio on an existing video and re-animates the speaker's lip movements to match the new audio. Use mode: 'speed' for fast output or 'precision' for high-quality lip-sync. Media inputs take a HeyGen asset_id or a public https URL, never a local or sandbox path (/mnt/data/..., file://); import or upload the file first and pass its asset_id. |
| `get_lipsync` | Returns details for a lipsync job including status, video_url, caption_url, and failure info if applicable. |
| `list_lipsyncs` | Returns a paginated list of all lipsync jobs in the account. |
| `update_lipsync` | Updates the display title of a lipsync job. |
| `delete_lipsync` | Permanently deletes a lipsync job and its associated files. This action cannot be undone. |


