---
name: heygen-video-agent
description: |
  Generate presenter-led videos through the v3 Video Agent pipeline — one-shot
  from a prompt, or multi-turn iterate-with-agent sessions — via the remote
  MCP server (mcp_heygen_* tools). Handles script framing, style selection,
  avatar resolution, and polling.
  Use when: any "make a video of X saying Y", personalized video messages,
  explainers, product demos, announcements — anything with a presenter or a
  narrated concept. If the user mentions an avatar, read AVATAR-<NAME>.md
  first (heygen-avatar skill).
  NOT for: translating an existing video (heygen-translate), classic
  scene-by-scene editor videos (heygen-classic-video), or TTS-only
  (heygen-voice).
version: 0.1.0
license: MIT
---

# HeyGen Video Agent

Ported from the official `heygen-video` skill (heygen-com/skills, MIT) to the
MCP-only bridge. The pipeline's hard-won production doctrine (script framing,
Frame Check, polling cadence, batch limits) survives the port tagged
`[official]`; transport-specific advice (CLI flags, subagent spawn patterns)
was replaced with PAVE-native guidance.

## Pipeline

```
Discovery (purpose/audience/duration/tone/orientation)
  → Avatar resolution (AVATAR file → group_id → fresh look_id) — BLOCKING gate
  → Script (in the video's language; on-screen text in a CRITICAL TEXT block)
  → Prompt Craft (narrator framing + duration signal + freedom directive + style block)
  → create_video_agent → poll get_video_agent_session → deliver video_url
  → iterate with send_video_agent_message (multi-turn sessions only)
```

## Non-negotiables

1. **Script framing directive** — Video Agent treats the script as a concept,
   not verbatim speech. Always append:
   > "This script is a concept and theme to convey — not a verbatim
   > transcript. You have full creative freedom to expand, elaborate, add
   examples, and fill the duration naturally. Do not pad with silence or
   pauses."
   Without it, output pads with dead air. `[official — production]`
2. **Frame Check (orientation match).** Resolve the look via
   `list_avatar_looks(group_id)` and pick the orientation matching the target
   video; if mismatched (e.g. portrait avatar in a landscape video), say so in
   the prompt: "Frame the presenter chest-up, centered; generative-fill the
   background to match; no black bars." Never describe the avatar's
   appearance in the prompt when a presenter is selected — that is the #1
   cause of avatar mismatch. `[official]`
3. **Polling.** `thinking` → `generating` → `completed`. First check at 5 min,
   then every 60 s. Total 20–45 min is normal. Stuck in `thinking` >15 min →
   tell the user. Silent polling; speak only on completion or a >5 min stall.
   `[official]`
4. **Deliverable boundary.** This skill's job ends at the `video_url`. Do not
   download. Share the URL and a one-line summary (duration, avatar used).
   `[playbook decision]`
5. **Never re-submit to "check".** Status comes from
   `get_video_agent_session`; retries only after a confirmed failure, and
   never with the identical prompt. `[official]`

## Styles

`list_video_agent_styles(tag=...)` returns curated style templates
(`style_id`, thumbnail, preview video). Show the user 3–5 options with
previews before choosing. Tags include `cinematic`, `retro-tech`,
`iconic-artist`, `pop-culture`, `handmade`, `print`. When no style fits, put
explicit visual direction at the END of the prompt as a style block
("Use minimal, clean styled visuals. Blue, black, white. Motion graphics as
B-roll...") — without one, scenes look inconsistent. `[official]`

## Modes

| Signal | Mode |
|---|---|
| Vague idea | Interview 1–2 questions (purpose, duration), then run the pipeline |
| Written prompt/script | Straight to Prompt Craft |
| "Just generate" / quick | Resolve avatar → Generate with defaults |
| "Interactive"/iterate | `create_video_agent` chat mode; follow-ups via `send_video_agent_message` (session mode is preserved); scene-level edits need the draft from `get_video_agent_session` |

Session hygiene: `list_video_agent_sessions` to find a lost session;
`list_video_agent_session_videos` for everything a session produced;
`stop_video_agent_session` halts at the next checkpoint (partial results
kept); `get_video_agent_resource` fetches a specific session resource by id.

## Tools (8)

`create_video_agent`, `get_video_agent_session`,
`list_video_agent_sessions`, `send_video_agent_message`,
`stop_video_agent_session`, `list_video_agent_session_videos`,
`get_video_agent_resource`, `list_video_agent_styles`.

Verification ledger: pipeline doctrine `[official]`; tool schemas
`[bridge snapshot 2026-11-12]`; live generation `[unverified — pending M4
spend]`.
