---
name: heygen-translate
description: |
  Translate and dub an EXISTING video into another language — voice cloning +
  lip-sync, same presenter — via the remote MCP server (mcp_heygen_* tools).
  Use when: the user has a finished video and wants it in another language
  ("translate this to Spanish", "dub this for Japan"), or wants a podcast
  audio-only translation.
  NOT for: creating a new video in another language (use heygen-video-agent
  and write the script in the target language), or text-only translation.
version: 0.1.0
license: MIT
---

# HeyGen Video Translation

Ported from the official `heygen-translate` skill (heygen-com/skills, MIT) to
the MCP-only bridge. Its translation-quality doctrine survives tagged
`[official]`; the CLI-only proofreads workflow was removed (see "Not on the
bridge" in `../SKILL.md` §11) and multi-language batching moved to
heygen-batches.

## The four phases

```
1 Discovery   — source video + target language(s); speaker count; captions?
2 Pre-flight  — validate language string; route the source; triage quality
3 Submit+Poll — silent; speak only on completion / failure / >5 min stall
4 Deliver     — one message per language: URL + one-line summary
```

## What decides quality (in order)

1. **Speaker count.** Wrong count is the #1 quality killer — voices bleed
   across speakers. Count exactly; ask the user when ambiguous.
2. **Source quality is the ceiling.** Muffled audio, dominant music,
   occluded/profile faces, fast cuts cap the result. Triage the first ~10 s;
   warn BEFORE submitting, not after. Offer audio-only translation when
   lip-sync would be poor.
3. **Dynamic duration** (`enable_dynamic_duration: true`, recommended unless
   frame-exact timing is required). Tonal compression makes this critical:
   en→zh/ja/ko run ~30 % shorter; de→en longer.
4. **Mode.** Default `precision`. Only use `speed` when the user asks.
   `[official — all four]`

## Pre-flight checks

- **Language string must match the canonical list exactly**
  (`list_video_translation_languages`): "Spanish (Spain)", "Chinese
  (Mandarin, Simplified)", "Chinese (Cantonese, Traditional)", ... Map
  loosely-typed input ("Spanish" → "Spanish (Spain)"; "Chinese" → Mandarin
  Simplified) and confirm regional variants matter (Spain vs Mexico, France
  vs Canada, Portugal vs Brazil).
- **Source routing**: public https URL directly; a local file goes through
  the assets runbook (`../SKILL.md` §4.4) first — never a local path.
  Auth-walled URLs are refused; ask for a public URL or upload.
- **Content profile** (pick silently, ~95 % of cases): talking-head default
  (`mode: precision`, speech enhancement on, captions on, dynamic duration
  on); podcast (audio-only); music-heavy (`disable_music_track`); multi-speaker
  (+ exact `speaker_num`); corporate (consider brand voice / glossary; mind
  that glossary tooling is thin on the bridge — see open questions).
  `[official]`

## Submit and poll

`create_video_translation(video={type,...}, output_languages=[...], ...)`
returns one `video_translation_id` per language. Poll
`get_video_translation` every 30 s for the first 3 min, then every 60 s;
5–15 min typical, 30+ for long sources, 60 min hard timeout.
`list_video_translations` for history; `update_video_translation` renames;
`delete_video_translation` is permanent — confirm first.

Multi-language jobs: one call per language is fine for a few targets; for
many, use `create_video_translation_batch` (heygen-batches).

## Failure decoder

| Symptom | Cause | Fix |
|---|---|---|
| `video URL not accessible` | Auth-walled/HTML URL | Public URL or upload route |
| `language not supported` | Not a canonical string | Re-run `list_video_translation_languages` |
| `failed: audio extraction` | No audible speech / bad codec | Verify source has speech |
| `failed: speaker detection` | Wrong `speaker_num` / noisy | Correct count, enable speech enhancement |
| Stuck >30 min running | Backend queue | Give 60 min total, then surface |
| Poor lip-sync | Source face conditions | Set expectation; offer audio-only |

`[official — adapted from the skill's failure-mode decoder]`

## Tools (6)

`create_video_translation`, `get_video_translation`,
`list_video_translations`, `update_video_translation`,
`delete_video_translation`, `list_video_translation_languages`.

Verification ledger: doctrine `[official]`; schemas `[bridge snapshot
2026-11-12]`; live translation `[unverified — pending M4 spend; translation
may be plan-gated on free accounts — expect plan_upgrade_required, name it,
do not retry (../SKILL.md §4.3)]`.
