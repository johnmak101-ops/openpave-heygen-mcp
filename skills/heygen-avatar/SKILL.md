---
name: heygen-avatar
description: |
  Create and manage HeyGen avatars — reusable face (+voice) identities — through
  the remote MCP server (mcp_heygen_* tools). Prompt-based creation by default;
  photo upload for real-person digital twins; consent flow enforced.
  Use when: giving the agent or a named character a face, creating the user's
  own avatar from a photo, listing/updating/deleting avatar groups and looks,
  or checking avatar readiness BEFORE video generation (an unready avatar
  fails video silently).
  NOT for: generating videos (use heygen-video-agent or heygen-classic-video),
  voice-only work (use heygen-voice).
version: 0.1.0
license: MIT
---

# HeyGen Avatars and Looks

Ported from the official `heygen-avatar` skill (heygen-com/skills, MIT) to the
MCP-only bridge. Official CLI paths, OpenClaw workspace files, and Telegram/
Discord delivery were stripped; doctrine that survived the port is tagged
`[official]` unless independently verified.

## The one rule that saves you

**Never hardcode a `look_id`.** Looks are ephemeral. Store only the
`group_id` (the stable character identity) in `AVATAR-<NAME>.md`, and resolve
the current `look_id` at runtime via `list_avatar_looks(group_id=...)` —
pick the look whose orientation matches the target video.
`[official — production-hardened]`

## State contract: AVATAR-<NAME>.md

Written to the workspace root. The video skills read it:

```markdown
# Avatar: <Name>

## Appearance
- <natural language description used for the creation prompt>

## HeyGen
- Group ID: <stable — never changes>
- Voice ID: <matched or designed voice>
- Looks: landscape=<look_id>, portrait=<look_id>, square=<look_id>
- Last Synced: <ISO timestamp>
```

Resolve `Looks` fresh from Group ID every session; treat stored look_ids as
hints only.

## Creation paths

| Path | Tool | Input | When |
|---|---|---|---|
| Prompt (default) | `create_prompt_avatar` | name + text prompt (≤1000 chars; be descriptive: style, features, expression, lighting) | agents, fictional characters, no photo |
| Photo | `create_photo_avatar` | public https URL or `asset_id` (import via the assets runbook first — never a local path) | the user wants themselves or a consenting real person |
| Digital twin | `create_digital_twin` | speaking footage (URL/`asset_id`) | highest realism from video of the person |

After photo/twin creation: **consent is mandatory** before the avatar can
generate video — `create_avatar_consent(group_id=...)` returns a URL; the
subject approves in a browser within 24 h (one submission).
`[web — tool descriptions]`

## Readiness gate (BLOCKING before any video)

`get_avatar_creation_status` / `get_avatar_group` / `get_avatar_look` —
confirm the look (and its `preview_image_url`) exists and training is not
failed before handing the avatar to a video skill. Poll at 30 s intervals;
**never re-create to check progress** — repeating creation makes duplicate
work and can burn training quota. `[web — official doctrine]`

## Iteration

- "Adjust the appearance" → new look on the SAME group (keeps identity,
  account stays clean). New group only when the user explicitly wants a
  different character.
- "Different outfit/pose" → `create_look_pack_looks` / `create_template_looks`
  for wardrobe-scale changes.
- "Different voice" → the heygen-voice skill; update Voice ID in the file.
- `update_avatar_group` can set the group's default voice; `delete_avatar_look`
  / `delete_avatar_group` are irreversible — confirm first, and know the last
  look in a group deletes the group. `[web]`

## Tools (16)

| Tool | Role |
|---|---|
| `create_prompt_avatar` | AI-generated appearance from text |
| `create_photo_avatar` | Avatar from one photo (consent-gated) |
| `create_digital_twin` | Avatar from speaking footage (consent-gated) |
| `create_avatar_consent` | Start the consent flow for a private avatar |
| `get_avatar_creation_status` | Poll creation/training readiness |
| `list_avatar_groups` / `get_avatar_group` | Browse/read characters |
| `update_avatar_group` | Rename, set default voice |
| `delete_avatar_group` | Irreversible; last-look rule applies |
| `list_avatar_looks` / `get_avatar_look` | Resolve looks from group |
| `update_avatar_look` / `delete_avatar_look` | Rename/remove looks |
| `create_look_pack_looks` / `create_template_looks` / `list_look_templates` | Wardrobe/restyle operations |

Verification ledger: schema-grounded `[bridge snapshot 2026-11-12]`; live
creation paths `[unverified — pending M4 spend]`.
