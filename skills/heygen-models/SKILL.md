---
name: heygen-models
description: |
  HeyGen Model-First Generation through the remote MCP server (mcp_heygen_* tools).
  Part of the heygen-mcp playbook — read ../SKILL.md index first for
  auth, bridge-wide doctrine, and the MCP-only principle.
version: 0.1.0
license: MIT
---

# HeyGen Model-First Generation

Doctrine status: **[stub — schema-grounded]**. Tool names and descriptions
below come from the live `tools/list` snapshot (2026-11-12). Operational
doctrine is [unverified] unless tagged otherwise — verify with
`node probe/heygen-probe.mjs schema <tool>` and live calls before relying
on it. Bridge-wide rules (media inputs, polling, plan gates) live in
`../SKILL.md` §4.

## Tools (8)

| Tool | Live description (2026-11-12 snapshot) |
|---|---|
| `text_to_video` | Generate a HeyGen Video 1 clip from a text prompt. Use it for visual productions of 30 seconds or less, or with no stated length: scenes, animation, product footage, moving hosts, presenter plus B-roll, demonstrations and short ads. Use 5 seconds for shorter requests. A presenter only speaking to camera uses create_video_from_avatar. For a starting image use image_to_video; for references use reference_to_video. Follow the input schema for duration, resolution, assets and reference limits. Auto duration is capped at 15 seconds; set an explicit duration for a requested 16-30 second clip. Returns video_id; poll get_model_video until completed, failed or cancelled. Return video_url on completion. Do not use get_video or show_video for these IDs. Honor retry delays or wait 30 seconds between polls; after five minutes share the latest status and video_id for later follow-up. Each submission creates a new generation; check status before retrying an unknown outcome. Optional callbackUrl and callbackId deliver terminal events to a user-provided HTTPS endpoint. |
| `image_to_video` | Animate a first-frame image with a prompt. Optionally supply endImage to guide the ending. Output follows the first image proportions; aspectRatio is ignored. Each image is a HeyGen asset_id (preferred) or a public https URL; never a local or sandbox path such as /mnt/data/...; import or upload the file first and pass its asset_id. Follow the input schema for duration, resolution, assets and reference limits. Auto duration is capped at 15 seconds; set an explicit duration for a requested 16-30 second clip. Returns video_id; poll get_model_video until completed, failed or cancelled. Return video_url on completion. Do not use get_video or show_video for these IDs. Honor retry delays or wait 30 seconds between polls; after five minutes share the latest status and video_id for later follow-up. Each submission creates a new generation; check status before retrying an unknown outcome. Optional callbackUrl and callbackId deliver terminal events to a user-provided HTTPS endpoint. |
| `reference_to_video` | Generate a clip guided by reference images, videos or audio. Supply at least one reference in reference_images (up to 9), reference_videos (up to 3) or reference_audio (up to 3); audio-only is allowed. Each reference is a HeyGen asset_id (preferred) or a public https URL; never a local or sandbox path such as /mnt/data/...; import or upload the file first and pass its asset_id. Follow the input schema for duration, resolution, assets and reference limits. Auto duration is capped at 15 seconds; set an explicit duration for a requested 16-30 second clip. Returns video_id; poll get_model_video until completed, failed or cancelled. Return video_url on completion. Do not use get_video or show_video for these IDs. Honor retry delays or wait 30 seconds between polls; after five minutes share the latest status and video_id for later follow-up. Each submission creates a new generation; check status before retrying an unknown outcome. Optional callbackUrl and callbackId deliver terminal events to a user-provided HTTPS endpoint. |
| `get_model_video` | Returns a HeyGen Video generation: `pending`, `processing`, `completed`, `failed` or `cancelled`. Completed results include a fresh `video_url`, duration and dimensions; failed results include `failure_code` and `failure_message`. Poll again to refresh an expired URL. |
| `create_look_remix` | Remix a person's look: generate one to five portraits that keep the person's identity, with heygen-image-1 and mode identity_remix. For general image generation or editing, use create_image. Supply one to five identity_images and exactly one reference_images item for clothing, pose, composition and background. Each image is a HeyGen asset_id (preferred) or a public https URL; never a local or sandbox path such as /mnt/data/...; import or upload the file first and pass its asset_id. Custom prompts are not supported. Requires workspace access. Returns generation_id; poll get_look_remix until completed, failed or cancelled. Return the image URLs on completion; partial results are not returned. Honor retry delays or wait 30 seconds between polls. Each submission creates a new generation; check status before retrying an unknown outcome. |
| `get_look_remix` | Return the generation job status and ordered images with fresh download URLs once the entire job completes. |
| `create_image` | Generate images from a text prompt, or edit images: with referenceImages, the prompt says how to change or combine them. Set model to one of the GPT Image or Nano Banana models it lists. Each reference is a HeyGen asset_id (preferred) or a public https URL; never a local or sandbox path such as /mnt/data/...; import or upload the file first and pass its asset_id. Synchronous: waits for the images (up to about five minutes) and returns them. Each image url is a presigned download link that expires within about 7 days; call get_image with the returned id for fresh links. Bills HeyGen credits per image; a failed generation is not charged. Send a new idempotencyKey (a UUID) for every new generation. After an unknown outcome, retry once with the same idempotencyKey and arguments, which returns the original result instead of generating again. To restyle a person's portrait while keeping their identity, use create_look_remix instead. |
| `get_image` | Fetch a previous create_image generation: pass its id as generationId. Returns it completed with its images and fresh download URLs, failed with a failure code, or pending while the creating request is still running. Never call create_image to check status. |


