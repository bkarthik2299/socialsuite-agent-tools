---
name: socialsuite
description: Use SocialSuite through the configured SocialSuite MCP tools for projects, campaigns, content, brand guides, AI missions, tasks, calendar, notes, portal review, and workspace operations.
version: 1.0.0
author: SocialSuite local
platforms: [windows]
metadata:
  hermes:
    tags: [socialsuite, social-media, mcp, campaigns, brand-guides]
    category: social-media
---

# SocialSuite

Use this skill whenever the user asks to inspect, create, update, organize, or run AI workflows inside SocialSuite.

## First Move

Call `socialsuite_whoami` before doing SocialSuite work. Confirm the active org, account, and API key permission in your own working context, then proceed.

Use SocialSuite MCP tools directly. Do not try to click through the SocialSuite UI unless the user specifically asks for a visual check or browser-based verification.

## Tool Preference

Prefer workflow-specific tools over generic row tools:

- Workspace overview: `socialsuite_workspace_overview`
- Create/find project: `socialsuite_ensure_project`
- Create/find folder: `socialsuite_ensure_folder`
- Create/find campaign: `socialsuite_ensure_campaign`
- Brand website setup: `socialsuite_setup_brand_from_website`
- Brand bundle verification: `socialsuite_get_brand_bundle`
- Campaign AI mission: `socialsuite_start_campaign_mission`
- AI artifact polling: `socialsuite_wait_for_ai_artifact`
- Regular content/task/calendar/note creation: use the matching `socialsuite_create_*` tool
- Post/ad image generation: `socialsuite_generate_content_image`
- Tasks: `socialsuite_list_tasks`, `socialsuite_update_task`, `socialsuite_move_task`, task comment tools, and task stage tools
- Calendar: `socialsuite_list_calendar_events`, `socialsuite_update_calendar_event`, `socialsuite_delete_calendar_event`
- Notes: `socialsuite_list_notes`, `socialsuite_update_note`, `socialsuite_delete_note`
- Password Vault: `socialsuite_list_vault_credentials`, `socialsuite_create_vault_credential`, `socialsuite_update_vault_credential`, `socialsuite_delete_vault_credential`
- Feed Monitor: `socialsuite_list_feed_monitor` and matching feed folder/post tools
- Client Portal: `socialsuite_list_client_portal` and matching portal client/feed/review/comment tools
- Team/account/settings: `socialsuite_list_team`, invite/revoke tools, account profile tools, account API key tools, and `socialsuite_list_ai_credits`
- AI customization/history: `socialsuite_list_ai_agents`, custom agent tools, workflow tools, and `socialsuite_delete_ai_run`

Use generic table tools only when no specific workflow tool exists:

- `socialsuite_list_table_rows`
- `socialsuite_get_table_row`
- `socialsuite_create_table_row`
- `socialsuite_update_table_row`
- `socialsuite_delete_table_rows`

## Non-Negotiable Workflows

When the user asks to set up a brand guide from a website, use `socialsuite_setup_brand_from_website`. This tool creates/finds the project and brand guide, runs website research, compiles the knowledge base, and returns the brand bundle. After it completes, verify that the returned `knowledgeDocument` exists and is ready or contains markdown.

When the user asks for Deep Work, use `socialsuite_start_campaign_mission` with:

- `workMode: "deep"`
- `modelPreference: "deepseek"` when they ask for DeepSeek
- `researchProvider: "tavily"` when they ask for Tavily

Do not call the lower-level `socialsuite_start_ai_mission` for Deep Work unless the user gives exact low-level context keys. The higher-level campaign mission tool prevents accidental Instant mode.

When the user asks to create AI campaign output, start the mission and poll with `socialsuite_wait_for_ai_artifact` or set `waitForArtifact: true`. Show the artifact summary before committing. Commit with `socialsuite_commit_ai_artifact` only when the user clearly asks to commit or has already authorized automatic commit.

When the user asks to generate images for approved posts or ads, use `socialsuite_generate_content_image` for each target social post or social ad content item. Prefer `useBrandGuide: true` unless the user explicitly asks not to use the Brand Guide. Pass `aspectRatio` when the user asks for a size or format such as square, portrait, story, reel, or landscape. Pass `visualGuide` when the user wants the image prompt/visual direction revised, and keep `updateVisualGuide: true` so SocialSuite stores the new prompt with the draft.

## Feature Coverage

For detailed workflows and feature mapping, read [references/workflows.md](references/workflows.md) when planning a multi-step SocialSuite task.

For table/tool mapping, read [references/tool-map.md](references/tool-map.md) when you need to use generic row tools or handle a feature not covered by a specific workflow tool.

## Safety

SocialSuite MCP actions use the configured SocialSuite API key and can affect real data. Read keys are inspection-only. Write keys can create projects, commit AI artifacts, generate images, edit brand guides, invite people, edit portal/client-facing review flows, and spend AI credits.

Password Vault tools redact encrypted passwords by default. Only request encrypted password values when the user explicitly needs credential migration or inspection. Prefer `encryptedPassword` unless the deployed Agent API has the same vault encryption key as the app.

After every mutation, summarize the changed feature, table/tool used, and important IDs.
