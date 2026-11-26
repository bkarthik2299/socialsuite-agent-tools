---
name: socialsuite
description: Use SocialSuite MCP tools to manage workspace content, brand guides, Super AI chats and drafts, Analytics, connected and manual DIY Reports with branding, Image Studio, tasks, calendar, notes, and client reviews from MCP-compatible agents.
metadata:
  version: "1.7.0"
  author: SocialSuite
  hermes:
    tags: [socialsuite, social-media, mcp, campaigns, brand-guides]
    category: social-media
---

# SocialSuite

Use this skill whenever the user asks to inspect, create, update, organize, or run AI workflows inside SocialSuite.

## First Move

Call `socialsuite_whoami` before doing SocialSuite work. Confirm the active org, account, and API key permission in your own working context, then proceed.

Tool names here are the MCP server names. Some harnesses add prefixes (for example Hermes registers `mcp_socialsuite_socialsuite_whoami`); use the discovered equivalent in your client.

Check the capability for the requested workflow. `diy-reports` covers report editing and preview links. `analytics-ai` and `calendar-task-deadlines` require Agent API 0.7.0. The references below list other requirements. Call `socialsuite_get_agent_catalog` for live model IDs and available actions. Use `superAiModels.choices` and its default for current chats. Verify the workspace and capabilities during setup without changing data or spending credits.

Use SocialSuite MCP tools directly. Do not try to click through the SocialSuite UI unless the user specifically asks for a visual check or browser-based verification.

## Tool Preference

Prefer workflow-specific tools over generic row tools:

- Workspace overview: `socialsuite_workspace_overview`
- Super AI (the current app chat workflow): read [references/super-ai.md](references/super-ai.md) for chats, credit quotes, generation, research, draft revisions, saving, undo and sharing.
- Analytics: read [references/analytics.md](references/analytics.md) for dashboards, paid Analytics AI answers and Windsor breakdowns, client/source setup, SEO credits and data interpretation.
- DIY Reports: read [references/reports.md](references/reports.md) before building, editing or sharing. Complete requested draft reports from one prompt: discover any available catalog metrics, use compatible connected dimensions, save, wait for source jobs and verify the resolved draft. Connected keyword rows require reports-keyword-rows; server verification requires reports-preview. Follow the reference for snapshots and unsupported dimensions. Use `socialsuite_reports_share` for the sign-in-free report preview.
- Create/find project: `socialsuite_ensure_project`
- Create/find folder: `socialsuite_ensure_folder`
- Create/find campaign: `socialsuite_ensure_campaign`
- Brand website setup: `socialsuite_setup_brand_from_website`
- Brand bundle verification: `socialsuite_get_brand_bundle`
- Campaign AI mission: `socialsuite_start_campaign_mission`
- AI artifact polling: `socialsuite_wait_for_ai_artifact`
- Regular content/task/calendar/note creation: use the matching `socialsuite_create_*` tool
- Post/ad image generation: `socialsuite_generate_content_image`
- Standalone Image Studio: read [references/image-studio.md](references/image-studio.md) for image generation/editing, prompt tools, uploads, collections, favorites, and campaign drafts.
- Task references: `socialsuite_list_task_attachments`, `socialsuite_upload_task_attachment`, and `socialsuite_set_task_attachments`; read the attachment workflow before editing reference lists.
- Team membership: `socialsuite_update_team_member_role` and `socialsuite_remove_team_member` use membership IDs from `socialsuite_list_team`.
- Tasks: `socialsuite_list_tasks`, `socialsuite_update_task`, `socialsuite_move_task`, task comment tools, and task stage tools
- Calendar: use `socialsuite_list_calendar_events` for events and `socialsuite_list_task_deadlines` for dated tasks. See [Tasks and Calendar](references/workflows.md#tasks-and-calendar).
- Notes: use `socialsuite_list_notes`, `socialsuite_create_note`, `socialsuite_update_note` and `socialsuite_delete_note`. See [Notes](references/workflows.md#notes) for private links and collaborative editing.
- Password Vault: `socialsuite_list_vault_credentials`, `socialsuite_create_vault_credential`, `socialsuite_update_vault_credential`, `socialsuite_delete_vault_credential`
- Feed Monitor: `socialsuite_list_feed_monitor` and matching feed folder/post tools
- Client Portal: `socialsuite_list_client_portal` and matching portal client/feed/review/comment tools
- Team/account/settings: `socialsuite_list_team`, invite/revoke tools, account profile tools and account API key tools. See [AI Agents and Credits](references/workflows.md#ai-agents-and-credits) for the balance, monthly renewals and Activity log.
- AI customization/history: `socialsuite_list_ai_agents`, custom agent tools, workflow tools, and `socialsuite_delete_ai_run`

Use generic table tools only when no specific workflow tool exists:

- `socialsuite_list_table_rows`
- `socialsuite_get_table_row`
- `socialsuite_create_table_row`
- `socialsuite_update_table_row`
- `socialsuite_delete_table_rows`

## Non-Negotiable Workflows

When the user asks to set up a brand guide from a website, use `socialsuite_setup_brand_from_website`. This tool creates/finds the project and brand guide, runs website research, compiles the knowledge base, and returns the brand bundle. After it completes, verify that the returned `knowledgeDocument` exists and is ready or contains markdown.

For Super AI or the current app AI experience, use the Super AI quote/send workflow. Super AI uses discovered model IDs, `deep: true` for Deep Work, and research providers `tavily` or `sonar` (Perplexity). The following mission settings apply only when the user wants the older campaign mission workflow.

When the user asks for a legacy campaign mission in Deep Work, use `socialsuite_start_campaign_mission` with:

- `workMode: "deep"`
- `modelPreference: "deepseek"` when they ask for DeepSeek
- `researchProvider: "tavily"` when they ask for Tavily

Use the campaign mission tool for both Instant and Deep Work. The old session connector's `socialsuite_start_ai_mission` is not exposed by the API-key connector.

When the user asks to create AI campaign output, start the mission and poll with `socialsuite_wait_for_ai_artifact` or set `waitForArtifact: true`. Show the artifact summary before committing. Commit with `socialsuite_commit_ai_artifact` only when the user clearly asks to commit or has already authorized automatic commit.

When the user asks to generate images for approved posts or ads, use `socialsuite_generate_content_image` for each target social post or social ad content item. Prefer `useBrandGuide: true` unless the user explicitly asks not to use the Brand Guide. Pass `aspectRatio` when the user asks for a size or format such as square, portrait, story, reel, or landscape. Pass `visualGuide` when the user wants the image prompt/visual direction revised, and keep `updateVisualGuide: true` so SocialSuite stores the new prompt with the draft.

## Feature Coverage

For detailed workflows and feature mapping, read [references/workflows.md](references/workflows.md) when planning a multi-step SocialSuite task.

For table/tool mapping, read [references/tool-map.md](references/tool-map.md) when you need to use generic row tools or handle a feature not covered by a specific workflow tool.

## Safety

SocialSuite MCP actions use the configured SocialSuite API key and can affect real data. Read keys are inspection-only. Write keys can create projects, commit AI artifacts, generate images, edit brand guides, invite people, edit portal/client-facing review flows, and spend AI credits.

Password Vault tools redact encrypted passwords by default. Only request encrypted password values when the user explicitly needs credential migration or inspection. Prefer `encryptedPassword` unless the deployed Agent API has the same vault encryption key as the app.

Summarize the requested result and important IDs after completing the workflow. Never expose API keys, signed upload tokens, or temporary user sessions in summaries.
