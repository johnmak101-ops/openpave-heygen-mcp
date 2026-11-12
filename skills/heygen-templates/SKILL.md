---
name: heygen-templates
description: |
  HeyGen Templates through the remote MCP server (mcp_heygen_* tools).
  Part of the heygen-mcp playbook — read ../SKILL.md index first for
  auth, bridge-wide doctrine, and the MCP-only principle.
version: 0.1.0
license: MIT
---

# HeyGen Templates

Doctrine status: **[stub — schema-grounded]**. Tool names and descriptions
below come from the live `tools/list` snapshot (2026-11-12). Operational
doctrine is [unverified] unless tagged otherwise — verify with
`node probe/heygen-probe.mjs schema <tool>` and live calls before relying
on it. Bridge-wide rules (media inputs, polling, plan gates) live in
`../SKILL.md` §4.

## Tools (7)

| Tool | Live description (2026-11-12 snapshot) |
|---|---|
| `list_templates` | Returns a paginated list of API-ready templates in the workspace. Templates are created and edited in the HeyGen web editor; only templates with variables defined are listed. |
| `get_template` | Returns template details including its variable schema (with current default values) and scenes. Variable defaults are returned in the same shape the generate request accepts, so a response can be edited and posted back. Only draft version 4 templates (the current editor format) are supported. |
| `create_template` | Creates a private template from one of your videos, copying its scenes, avatars, script and media. URL-to-Video and older editor videos return `template_source_unsupported`. The template starts with no variables; declare them with set_template_variables. |
| `generate_from_template` | Generates a video from a template by filling its variables. Use `scene_ids` to select, reorder or repeat the template's existing scenes. Poll get_video or use webhooks for completion. An idempotent replay returns the original response, not the video's current state. |
| `update_template` | Renames a template. Other properties are edited in the HeyGen editor or through set_template_variables. Returns the template detail. |
| `delete_template` | Soft-deletes a template. It disappears from the list and can no longer be used to generate videos; videos already generated from it are unaffected. Templates managed by another HeyGen product cannot be deleted here. |
| `set_template_variables` | Replaces a template's full set of variables: any variable you omit is removed. Media, character and voice variables bind to a node by `element_id`, listed under `composition` in get_template. A text variable with `match` turns that text into a `{{name}}` placeholder. |


