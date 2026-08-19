# SocialSuite MCP Tool Map

## Preferred Tools

| Goal | Tool |
| --- | --- |
| Identify account/org | `socialsuite_whoami` |
| See workspace state | `socialsuite_workspace_overview` |
| Create/find project | `socialsuite_ensure_project` |
| Create/find folder | `socialsuite_ensure_folder` |
| Create/find campaign | `socialsuite_ensure_campaign` |
| Get project context | `socialsuite_get_project_context` |
| Set up brand from website | `socialsuite_setup_brand_from_website` |
| Inspect brand guide/knowledge | `socialsuite_get_brand_bundle` |
| Create content draft | `socialsuite_create_content_item` |
| Create task | `socialsuite_create_task` |
| Create calendar event | `socialsuite_create_calendar_event` |
| Create note | `socialsuite_create_note` |
| Start campaign AI mission | `socialsuite_start_campaign_mission` |
| Poll AI run | `socialsuite_wait_for_ai_artifact` |
| Commit AI artifact | `socialsuite_commit_ai_artifact` |
| Cancel AI mission | `socialsuite_cancel_ai_mission` |

## Generic Tools

Use these only when a preferred tool does not fit:

- `socialsuite_list_rows`
- `socialsuite_get_row`
- `socialsuite_create_row`
- `socialsuite_update_row`
- `socialsuite_delete_rows`

Generic tools expose allowlisted tables, not unrestricted SQL.

## Common Tables

| Feature | Tables |
| --- | --- |
| Projects | `projects` |
| Folders | `folders` |
| Campaigns | `campaigns` |
| Content | `content_items` |
| Tasks | `tasks`, `task_comments` if exposed later |
| Calendar | `calendar_events` |
| Notes | `notes` |
| Brand Guide | `brand_guides`, `brand_colors`, `brand_fonts`, `brand_logos`, `brand_logo_rules`, `brand_mood_images`, `brand_knowledge_documents` |
| Feed Monitor | `feed_folders`, `feed_posts` |
| Client Portal | `portal_clients`, `portal_feeds`, `portal_review_posts`, `portal_comments` |
| AI | `ai_agents`, `ai_agent_versions`, `ai_agent_workflow_steps`, `ai_runs`, `ai_run_steps`, `ai_run_events`, `ai_artifacts`, `ai_run_approvals`, `ai_credit_accounts` |
| Organization | `organizations`, `org_members` |

## AI Context Keys

`socialsuite_start_campaign_mission` handles these for you. If using low-level `socialsuite_start_ai_mission`, include:

```json
{
  "context": {
    "workMode": "deep",
    "aiModelId": "deepseek/deepseek-v4-pro",
    "researchProvider": "tavily",
    "researchProviderName": "Tavily",
    "researchModel": null
  }
}
```

For Instant DeepSeek:

```json
{
  "context": {
    "workMode": "instant",
    "aiModelId": "deepseek/deepseek-v4-flash"
  }
}
```

For Perplexity research in Deep Work:

```json
{
  "context": {
    "workMode": "deep",
    "researchProvider": "perplexity",
    "researchProviderName": "Perplexity",
    "researchModel": "perplexity/sonar-pro"
  }
}
```
