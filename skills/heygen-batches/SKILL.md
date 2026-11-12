---
name: heygen-batches
description: |
  HeyGen Batch Operations through the remote MCP server (mcp_heygen_* tools).
  Part of the heygen-mcp playbook — read ../SKILL.md index first for
  auth, bridge-wide doctrine, and the MCP-only principle.
version: 0.1.0
license: MIT
---

# HeyGen Batch Operations

Doctrine status: **[stub — schema-grounded]**. Tool names and descriptions
below come from the live `tools/list` snapshot (2026-11-12). Operational
doctrine is [unverified] unless tagged otherwise — verify with
`node probe/heygen-probe.mjs schema <tool>` and live calls before relying
on it. Bridge-wide rules (media inputs, polling, plan gates) live in
`../SKILL.md` §4.

## Tools (9)

| Tool | Live description (2026-11-12 snapshot) |
|---|---|
| `create_video_batch` | Submit up to 100 video creation payloads in one request and return a batch id immediately. Videos are created asynchronously; poll get_video_batch for per-item video ids and statuses. |
| `get_video_batch` | Returns batch aggregate status and one page of items with their video ids and statuses. Item statuses are one of queued, processing, completed, or failed. |
| `bulk_video_statuses` | Returns statuses for up to 100 videos in one request, addressed by comma-separated video_ids and/or batch_ids query params. Statuses are one of queued, processing, completed, or failed, plus not_found for unknown or unowned ids. |
| `create_video_translation_batch` | Submits up to 100 translation payloads, each shaped like create_video_translation, as one batch. A payload with several `output_languages` becomes one item per language, and items run independently. Returns 202 with a `batch_id` to poll. Check resource status before retrying an unknown outcome; repeating creation can create duplicate work. |
| `get_video_translation_batch` | Returns batch aggregate status and one page of items with their ids and statuses. Item statuses are one of queued, processing, completed, or failed. The per-item id is returned as video_id (the batch read model is shared with the videos batch API). |
| `bulk_video_translation_statuses` | Returns statuses for up to 100 video translations by `video_translation_ids` and/or `batch_ids`: `queued`, `processing`, `completed`, `failed`, or `not_found`. Each entry's id is in `video_id`. |
| `create_lipsync_batch` | Submits up to 100 lipsync payloads as one batch, and items run independently. Returns 202 with a `batch_id`; poll get_lipsync_batch. Check resource status before retrying an unknown outcome; repeating creation can create duplicate work. |
| `get_lipsync_batch` | Returns batch aggregate status and one page of items with their ids and statuses. Item statuses are one of queued, processing, completed, or failed. The per-item id is returned as video_id (the batch read model is shared with the videos batch API). |
| `bulk_lipsync_statuses` | Returns statuses for up to 100 lipsyncs by `lipsync_ids` and/or `batch_ids`: `queued`, `processing`, `completed`, `failed`, or `not_found`. Each entry's id is in `video_id`. |


