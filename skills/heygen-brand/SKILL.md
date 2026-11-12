---
name: heygen-brand
description: |
  HeyGen Brand Kits and Glossaries through the remote MCP server (mcp_heygen_* tools).
  Part of the heygen-mcp playbook — read ../SKILL.md index first for
  auth, bridge-wide doctrine, and the MCP-only principle.
version: 0.1.0
license: MIT
---

# HeyGen Brand Kits and Glossaries

Doctrine status: **[stub — schema-grounded]**. Tool names and descriptions
below come from the live `tools/list` snapshot (2026-11-12). Operational
doctrine is [unverified] unless tagged otherwise — verify with
`node probe/heygen-probe.mjs schema <tool>` and live calls before relying
on it. Bridge-wide rules (media inputs, polling, plan gates) live in
`../SKILL.md` §4.

## Tools (10)

| Tool | Live description (2026-11-12 snapshot) |
|---|---|
| `list_brand_kits` | Returns brand kits available in the authenticated user's workspace. Each brand kit contains colors, fonts, and logos. |
| `get_brand_kit` | Returns one brand kit with its colors, logos and fonts and the role each plays. While status is `loading` these are provisional; poll every 2 to 5 seconds until status is `completed`. |
| `create_brand_kit` | Creates a brand kit by importing logos, colors and fonts from a public website; by calling it you confirm you have the rights to use those assets. The kit assembles in the background: poll get_brand_kit until status is `completed`. Check resource status before retrying an unknown outcome; repeating creation can create duplicate work. |
| `update_brand_kit` | Updates a brand kit's name or role assignments: color roles, main logo, heading and body fonts. Omitted fields are unchanged and `null` is rejected. Each role object you send replaces the existing one in full; `{}` clears a role and it stays cleared. Role edits return 409 until the kit is `completed`; shared kits return 403. |
| `delete_brand_kit` | Deletes a brand kit and its colors, logos and fonts. This cannot be undone. Videos already rendered with it are unaffected. A kit shared from another workspace cannot be deleted and returns 403. |
| `list_brand_glossaries` | Lists the brand glossaries in your workspace. A glossary sets how terms are pronounced in generated speech and how they are handled in translation. Pass a `brand_glossary_id` when creating a video or translation to apply it. |
| `get_brand_glossary` | Returns one brand glossary with its full term list. Pronunciations affect generated audio only, not captions. Translation rules (`do_not_translate_terms`, `forced_translations`) apply only to translation features; a list is omitted from the response when it is empty. Language-specific entries include `pronunciation_language` or `target_language`; all-languages entries omit those fields. Specific-language rules override all-languages rules, and Don't Translate takes precedence over Force Translate without deleting it. Tone settings are not returned here. Temporary access-evaluation failures return 503; retry the request. |
| `create_brand_glossary` | Create the workspace's first brand glossary. Call list_brand_glossaries first; creation is refused with 409 if any active glossary exists, regardless of its name. Existing glossaries remain usable. Reuse the existing glossary ID with update_brand_glossary; if several older glossaries exist, ask which one to use. To add entries, call get_brand_glossary and preserve existing rules in any list sent to update_brand_glossary, because supplied lists replace that category across all languages. Only create when the workspace has no glossary. After an unknown create outcome, call list_brand_glossaries before retrying. |
| `update_brand_glossary` | Updates a brand glossary. A field you omit is left untouched, a list you send replaces the existing list in full across all languages, and an empty array removes every entry. Read the glossary and preserve every entry's `pronunciation_language` or `target_language` when sending an edited list; omitting a language field means all languages. A duplicate name or term/rule-type/language combination returns 409. A concurrent-edit conflict also returns 409 without saving the update; fetch the latest glossary and reapply your changes. Clients do not supply revisions. Tone settings are never modified by this endpoint. Temporary access-evaluation failures return 503; retry the request. |
| `delete_brand_glossary` | Deletes a brand glossary. This cannot be undone. Its pronunciation terms and translation rules stop applying to anything generated afterwards; videos already generated are unaffected, and requests that still reference it keep working. |


