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

Use `socialsuite_create_calendar_event` only when a campaign ID is known. Calendar event `type` should match the campaign type.

## Notes

Use `socialsuite_create_note` for planning notes, research notes, or internal summaries. Link to `projectId` when the note belongs to a project.

## Feed Monitor

Feed Monitor tables are available through generic row tools:

- `feed_folders`
- `feed_posts`

Use these for saved inspiration and monitored posts. Keep source URLs and post metadata in the table payload fields already present in SocialSuite.

## Client Portal

Client Portal tables are available through generic row tools:

- `portal_clients`
- `portal_feeds`
- `portal_review_posts`
- `portal_comments`

Be careful with portal actions because they affect client-facing review flows. Prefer reading existing rows unless the user explicitly asks to create or update portal data.

## Team And Settings

Use generic row tools for org/member reads:

- `organizations`
- `org_members`

Do not change organization roles or settings unless the user explicitly asks and the intended user/email/org is unambiguous.

## Password Vault

Do not create or edit password vault credentials through generic tools. The app uses encryption behavior that is not represented by a safe MCP workflow yet. It is acceptable to say that Password Vault needs a dedicated vault-safe MCP tool before agent control.

## Browser Navigation

Use browser/UI navigation only for visual confirmation. For actual work, use MCP tools. MCP actions are more reliable than clicking through the UI.
