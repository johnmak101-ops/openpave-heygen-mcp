# OpenPAVE HeyGen MCP Skill

**Doctrine playbook for the HeyGen Remote MCP server** (`https://mcp.heygen.com/mcp/v1/`, bridged in PAVE as `mcp_heygen_*` tools).

This is a doctrine-first skill: its payload is `SKILL.md` plus per-product-area doctrine under `skills/` — verified operational knowledge for the HeyGen MCP bridge — with three committed tools: a diagnostic probe (`probe/heygen-probe.mjs`) for dumping live tool schemas and reading real server errors, an OAuth stepper (`tools/oauth-stepper.mjs`) that drives the hosted-browser consent lane, and an orchestration brief (`orchestration/brief.template.md`) for A/B session installs.

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
| `tools/oauth-stepper.mjs` | Playwright driver for the hosted-browser OAuth lane (login → magic link → consent → plan pick → callback); refuses headless runs |
| `orchestration/brief.template.md` | A/B orchestrated-install brief |

## Two connection lanes (decision 2026-11-12)

1. **API-key lane (primary)** — paste a HeyGen API key once; PAVE calls the
   v3 REST API directly. No OAuth geometry. Verified 2026-11-12.
2. **MCP lane (alternative)** — the remote MCP server over OAuth. Consent is
   driven by `tools/oauth-stepper.mjs` in a hosted Playwright browser
   (headed under Xvfb — headless is Turnstile-flagged), verified end to end
   2026-11-12 with a single user paste (the magic-link URL). Bridge and
   paste-URL relay lanes remain as fallbacks.

See `SKILL.md` §0 for the full doctrine and §9.4 for the lane runbooks.

## Verification status

Every doctrine claim carries a tag: `[verified <date>]` (tested live), `[bridge snapshot <date>]` (from a live `tools/list` schema dump), or `[unverified]` (from upstream docs, not yet reproduced). Live surface verified 2026-11-12: **114 tools** on `heygen-mcp` v1.30.0 — upstream docs claim ~88; trust the probe, not the docs. The running ledger is `evidence/VERIFICATION.md`.

## Maintenance

Quarterly (or when the bridge behaves oddly):

```bash
node probe/heygen-probe.mjs tools/list > /tmp/tools-now.txt          # count tools
diff <(node -e "const s=require('./schemas/snapshot-2026-11-12.json');console.log(s.tools.map(t=>t.name).sort().join('\n'))") \
     <(grep '^- ' /tmp/tools-now.txt | sed 's/^- \([^:]*\):.*/\1/' | sort)   # what changed
```

New tools → write doctrine for them before use. Missing tools → check
[HeyGen's changelog](https://developers.heygen.com/changelog.md) and the
[official skills repo](https://github.com/heygen-com/skills) for intent
before assuming removal. Also watch that repo's releases — its skills are the
upstream wedge this playbook ports.

## License

MIT
