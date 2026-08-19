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

Use generic table tools only when no specific workflow tool exists:

- `socialsuite_list_rows`
- `socialsuite_get_row`
- `socialsuite_create_row`
- `socialsuite_update_row`
- `socialsuite_delete_rows`

## Non-Negotiable Workflows

When the user asks to set up a brand guide from a website, use `socialsuite_setup_brand_from_website`. This tool creates/finds the project and brand guide, runs website research, compiles the knowledge base, and returns the brand bundle. After it completes, verify that the returned `knowledgeDocument` exists and is ready or contains markdown.

When the user asks for Deep Work, use `socialsuite_start_campaign_mission` with:

- `workMode: "deep"`
- `modelPreference: "deepseek"` when they ask for DeepSeek
- `researchProvider: "tavily"` when they ask for Tavily

Do not call the lower-level `socialsuite_start_ai_mission` for Deep Work unless the user gives exact low-level context keys. The higher-level campaign mission tool prevents accidental Instant mode.

When the user asks to create AI campaign output, start the mission and poll with `socialsuite_wait_for_ai_artifact` or set `waitForArtifact: true`. Show the artifact summary before committing. Commit with `socialsuite_commit_ai_artifact` only when the user clearly asks to commit or has already authorized automatic commit.

## Feature Coverage

For detailed workflows and feature mapping, read [references/workflows.md](references/workflows.md) when planning a multi-step SocialSuite task.

For table/tool mapping, read [references/tool-map.md](references/tool-map.md) when you need to use generic row tools or handle a feature not covered by a specific workflow tool.

## Safety

SocialSuite MCP actions use the configured SocialSuite API key and can affect real data. Read keys are inspection-only. Write keys can create projects, commit AI artifacts, edit brand guides, and spend AI credits.

Password Vault secret handling is not a good MCP workflow yet because the browser app owns encryption behavior. Do not create or modify password vault credentials unless a dedicated vault-safe tool exists or the user provides already-encrypted payloads and explicitly accepts the risk.

After every mutation, summarize the changed feature, table/tool used, and important IDs.
