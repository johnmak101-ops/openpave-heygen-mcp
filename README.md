# OpenPAVE HeyGen MCP Skill

**Doctrine playbook for the HeyGen Remote MCP server** (`https://mcp.heygen.com/mcp/v1/`, bridged in PAVE as `mcp_heygen_*` tools).

This is a doctrine-only skill: it ships no local CLI and no API-key path. Its payload is `SKILL.md` plus per-product-area doctrine under `skills/` — verified operational knowledge for the HeyGen MCP bridge, a committed diagnostic probe (`probe/heygen-probe.mjs`) for dumping live tool schemas and reading real server errors the bridge swallows, and an orchestration brief (`orchestration/brief.template.md`) for A/B session installs.

## Install

```
pave install johnmak101-ops/openpave-heygen-mcp
```

Then read the doctrine from any PAVE session:

```
skill_docs(skill="heygen-mcp")
```

## What's inside

| Path | What it is |
|---|---|
| `SKILL.md` | Doctrine index, install runbook, verification ledger, bridge-wide rules |
| `skills/heygen-video-agent/` | Video Agent sessions (one-shot + multi-turn generation) |
| `skills/heygen-classic-video/` | Classic editor video creation (avatar/image/studio/cinematic), scenes |
| `skills/heygen-avatar/` | Avatar groups, looks, creation (prompt/photo/digital twin), consent |
| `skills/heygen-voice/` | Voices, speech (TTS), audio catalog |
| `skills/heygen-models/` | Model-first generation: text/image/reference-to-video, look remix, images |
| `skills/heygen-translate/` | Video translation |
| `skills/heygen-lipsync/` | Standalone lipsync jobs |
| `skills/heygen-clipping/` | AI clipping |
| `skills/heygen-filler-words/` | Filler word removal |
| `skills/heygen-templates/` | Templates and variable-driven generation |
| `skills/heygen-brand/` | Brand kits and brand glossaries |
| `skills/heygen-assets/` | Assets, direct-to-S3 upload, upload batches, folders |
| `skills/heygen-batches/` | Video / translation / lipsync batch operations |
| `skills/heygen-account/` | Account state, with hard-fenced subscription tools |
| `probe/heygen-probe.mjs` | Token-safe JSON-RPC diagnostic probe |
| `orchestration/brief.template.md` | A/B orchestrated-install brief |

## MCP-only principle

This skill never documents API keys, REST endpoints, or the `heygen` CLI. Everything runs through the hosted Remote MCP server with OAuth. Surfaces that are not on the bridge (proofreads, webhook management, streaming TTS, hyperframes) are named in `SKILL.md` so nobody hunts for phantom tools — and nothing more.

## Verification status

Every doctrine claim carries a tag: `[verified <date>]` (tested live), `[bridge snapshot <date>]` (from a live `tools/list` schema dump), or `[unverified]` (from upstream docs, not yet reproduced). Live surface verified 2026-11-12: **114 tools** on `heygen-mcp` v1.30.0 — upstream docs claim ~88; trust the probe, not the docs.

## License

MIT
