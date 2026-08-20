# SocialSuite Workflows

## Workspace Orientation

Start with `socialsuite_whoami`, then use `socialsuite_workspace_overview` when the user asks what exists or gives a vague request. Use `socialsuite_get_project_context` after you know the project.

SocialSuite structure:

`organization -> projects -> folders -> campaigns -> content_items`

Global and supporting features include tasks, calendar events, notes, brand guides, feed monitor, client portal review, AI missions, team/org settings, and AI credits.

## Projects, Folders, Campaigns

To create a normal workspace path:

1. `socialsuite_ensure_project`
2. `socialsuite_ensure_folder`
3. `socialsuite_ensure_campaign`

Use exact names from the user. If the user does not name a folder, use a practical folder name such as `Campaigns`, `General`, or the campaign theme. Campaign types are:

- `socials`
- `google-ad`
- `meta-ad`
- `blogs`

Use `deadline` only when the user gives a date or the brief contains a clear end date.

## Content Items

Use `socialsuite_create_content_item` for drafts inside a campaign.

Content item types:

- `social-post`
- `google-ad`
- `social-ad`
- `blog`

Keep payloads type-specific:

- Social posts: `caption`, `hashtags`, `platforms`, `scheduledDate`, `creativeBrief`, `visualGuide`
- Google ads: `keywords`, `finalUrl`, `path1`, `path2`, `headlines`, `descriptions`, `callouts`
- Social ads: `platform`, `primaryText`, `headline`, `description`, `cta`, `destinationUrl`, `visualGuide`, `scheduledDate`
- Blogs: `title`, `slug`, `excerpt`, `metaTitle`, `metaDescription`, `keywords`, `outline`, `publishDate`

## Brand Guides

If the user provides a website and wants brand setup, do not manually insert a partial brand guide and stop. Use `socialsuite_setup_brand_from_website`.

That tool is expected to:

1. Create/find the project.
2. Create/find the brand guide.
3. Store the website URL.
4. Run website research.
5. Charge brand research credits.
6. Compile the markdown knowledge base.
7. Charge knowledge generation credits.
8. Return the full brand bundle.

Afterward, verify the returned bundle has a guide and a knowledge document. If it does not, call `socialsuite_get_brand_bundle` and report the missing piece.

Use `socialsuite_get_brand_bundle` to inspect:

- brand identity
- voice/tone
- visual direction
- colors/fonts/logos
- compiled markdown knowledge

## AI Campaign Missions

For new Brief to Campaign work, use `socialsuite_start_campaign_mission`.

Important mappings:

- User says "Deep Work" -> `workMode: "deep"`
- User says "Instant" -> `workMode: "instant"`
- User says "DeepSeek" -> `modelPreference: "deepseek"`
- User says "Claude" or "Anthropic" -> `modelPreference: "anthropic"`
- User says "Tavily" -> `researchProvider: "tavily"`
- User says "Perplexity" -> `researchProvider: "perplexity"`

If the user asks for Deep Work, never omit `workMode: "deep"`. If the user asks for DeepSeek + Tavily, include both in the same campaign mission tool call.

Include IDs when available:

- `projectId`
- `folderId`
- `campaignId`
- `brandGuideId`
- `brandKnowledgeDocumentId`

After starting, poll with `socialsuite_wait_for_ai_artifact` unless the user only wanted the run started. When an artifact appears, summarize strategy, content counts, and any notable warnings. Do not commit until approval unless the user explicitly authorized commit.

## Tasks And Calendar

Use `socialsuite_create_task` for project, folder, or campaign tasks. Link as many IDs as are known.

Use `socialsuite_list_tasks` before complex task changes so you can see custom stages, assignees, comments, and read markers.

Use:

- `socialsuite_update_task` to edit title, description, status, due date, links, assignee, or order.
- `socialsuite_move_task` to move between custom stages.
- `socialsuite_save_task_stages` to rename/reorder task columns.
- `socialsuite_add_task_comment`, `socialsuite_delete_task_comment`, and `socialsuite_mark_task_comments_read` for task discussion.

Use `socialsuite_create_calendar_event` only when a campaign ID is known. Calendar event `type` should match the campaign type. Use `socialsuite_list_calendar_events` for date range views, and update/delete tools for changes.

## Notes

Use `socialsuite_create_note` for planning notes, research notes, or internal summaries. Link to `projectId` when the note belongs to a project. Use `socialsuite_list_notes`, `socialsuite_update_note`, and `socialsuite_delete_note` for note management.

## Feed Monitor

Use dedicated Feed Monitor tools:

- `socialsuite_list_feed_monitor`
- `socialsuite_create_feed_folder`
- `socialsuite_update_feed_folder`
- `socialsuite_delete_feed_folder`
- `socialsuite_create_feed_post`
- `socialsuite_update_feed_post`
- `socialsuite_delete_feed_post`

Use these for saved inspiration and monitored posts. Store source URLs and Open Graph metadata when available.

## Client Portal

Use dedicated Client Portal tools:

- `socialsuite_list_client_portal`
- `socialsuite_create_portal_client`
- `socialsuite_update_portal_client`
- `socialsuite_delete_portal_client`
- `socialsuite_create_portal_feed`
- `socialsuite_delete_portal_feed`
- `socialsuite_create_portal_review_post`
- `socialsuite_update_portal_review_status`
- `socialsuite_add_portal_comment`
- `socialsuite_delete_portal_review_post`

Be careful with portal actions because they affect client-facing review flows. Prefer reading existing rows unless the user explicitly asks to create or update portal data.

## Team And Settings

Use:

- `socialsuite_list_team` for members and pending invites.
- `socialsuite_invite_team_member` to create invite links or send invite emails.
- `socialsuite_revoke_team_invite` to revoke pending invites.
- `socialsuite_get_account_profile` and `socialsuite_update_account_profile` for account profile fields.
- `socialsuite_list_account_api_keys`, `socialsuite_create_account_api_key`, and `socialsuite_revoke_account_api_key` for Agent API keys.
- `socialsuite_list_ai_credits` to check available AI credits.
- `socialsuite_list_micro_tools` to inspect enabled micro-tools.

Do not change organization roles or settings unless the user explicitly asks and the intended user/email/org is unambiguous.

## Password Vault

Use Password Vault tools, not generic table writes:

- `socialsuite_list_vault_credentials`
- `socialsuite_create_vault_credential`
- `socialsuite_update_vault_credential`
- `socialsuite_delete_vault_credential`

By default, list results omit encrypted passwords. Only request `includeEncryptedPassword: true` when the user explicitly asks for credential migration or auditing. Creating/updating with plain `password` requires the deployed Agent API to have the same vault encryption key as the app; otherwise use `encryptedPassword`.

## AI Agents And Credits

Use `socialsuite_list_ai_credits` to check remaining credits. Use `socialsuite_list_ai_agents` before changing AI agents or workflows. Built-in agents cannot be deleted; custom workspace agents can be created, edited, deleted, and reordered with the dedicated AI agent tools.

## Generic Tables

Use generic table tools only when no workflow-specific tool fits:

- `socialsuite_list_table_rows`
- `socialsuite_get_table_row`
- `socialsuite_create_table_row`
- `socialsuite_update_table_row`
- `socialsuite_delete_table_rows`

Generic tools are workspace scoped by the Agent API and should still be treated as advanced tools.

## Browser Navigation

Use browser/UI navigation only for visual confirmation. For actual work, use MCP tools. MCP actions are more reliable than clicking through the UI.
