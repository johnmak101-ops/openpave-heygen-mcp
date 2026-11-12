---
name: heygen-assets
description: |
  HeyGen Assets, Upload, and Folders through the remote MCP server (mcp_heygen_* tools).
  Part of the heygen-mcp playbook — read ../SKILL.md index first for
  auth, bridge-wide doctrine, and the MCP-only principle.
version: 0.1.0
license: MIT
---

# HeyGen Assets, Upload, and Folders

Doctrine status: **[stub — schema-grounded]**. Tool names and descriptions
below come from the live `tools/list` snapshot (2026-11-12). Operational
doctrine is [unverified] unless tagged otherwise — verify with
`node probe/heygen-probe.mjs schema <tool>` and live calls before relying
on it. Bridge-wide rules (media inputs, polling, plan gates) live in
`../SKILL.md` §4.

## Tools (11)

| Tool | Live description (2026-11-12 snapshot) |
|---|---|
| `list_assets` | **Beta**: may change with a few days' notice. Lists a workspace member's uploaded assets, newest first, with cursor pagination. `username` is required during the beta. Pass `folder_id` to narrow to one folder, or an empty value for the root. |
| `get_asset` | Returns metadata for an asset in the caller's workspace — including owner, upload timestamp, file type, and a publicly accessible URL. |
| `delete_asset` | Permanently deletes an asset. The asset must belong to the caller's workspace and not already be deleted. |
| `create_asset_upload` | Begin a direct-to-S3 upload. Returns an asset_id and a presigned upload_url; PUT the file bytes to upload_url, then call complete_asset_upload. Unlike POST /v3/assets (which proxies the bytes), this never sends the file through the API. |
| `complete_asset_upload` | Finalize a direct-to-S3 upload into a reusable asset. Call after the upload PUT returns 200. Idempotent: repeated calls return the same finalized asset. |
| `create_asset_upload_batch` | Returns up to 100 presigned upload URLs in one call. PUT each file to its `upload_url` with the returned headers, then call complete_asset_batch. Check resource status before retrying an unknown outcome; repeating creation can create duplicate work. |
| `complete_asset_batch` | Finalizes every uploaded file in a batch once all PUTs return 200. Files are ingested independently. Returns 202 with the `batch_id`; poll get_asset_batch for progress. Safe to repeat. |
| `get_asset_batch` | Returns batch aggregate status and one page of items with their ids and statuses. Item statuses are one of queued, processing, completed, or failed. The per-item id is returned as video_id (the batch read model is shared with the videos batch API); for asset batches it holds the asset_id. |
| `bulk_asset_statuses` | Returns statuses for up to 100 assets by `asset_ids` and/or `batch_ids`: `queued`, `processing`, `completed`, `failed`, or `not_found`. Each entry's id is in `video_id`. |
| `create_folder` | Creates a folder at the root or inside `parent_id`. Pass its `folder_id` to create_video_from_avatar / create_video_from_cinematic_avatar / create_video_from_image / create_video_from_studio or create_video_translation to file output there. Names need not be unique, so store the ids you receive. Check resource status before retrying an unknown outcome; repeating creation can create duplicate work. |
| `get_folder` | Returns one folder in your workspace, including one in the trash (`is_trash`). Use it to check that a stored `folder_id` still exists. Deleted folders and folders in other workspaces return 404. |


