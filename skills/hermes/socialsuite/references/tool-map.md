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
| Manage content draft | `socialsuite_create_content_item`, `socialsuite_update_content_item`, `socialsuite_delete_content_item` |
| Manage tasks | `socialsuite_list_tasks`, `socialsuite_create_task`, `socialsuite_update_task`, `socialsuite_move_task`, `socialsuite_delete_task` |
| Manage task comments/stages | `socialsuite_add_task_comment`, `socialsuite_delete_task_comment`, `socialsuite_mark_task_comments_read`, `socialsuite_save_task_stages` |
| Manage calendar | `socialsuite_list_calendar_events`, `socialsuite_create_calendar_event`, `socialsuite_update_calendar_event`, `socialsuite_delete_calendar_event` |
| Manage notes | `socialsuite_list_notes`, `socialsuite_create_note`, `socialsuite_update_note`, `socialsuite_delete_note` |
| Manage Password Vault | `socialsuite_list_vault_credentials`, `socialsuite_create_vault_credential`, `socialsuite_update_vault_credential`, `socialsuite_delete_vault_credential` |
| Manage Feed Monitor | `socialsuite_list_feed_monitor`, feed folder/post create/update/delete tools |
| Manage Client Portal | `socialsuite_list_client_portal`, portal client/feed/review/comment tools |
| Manage team/account | `socialsuite_list_team`, `socialsuite_invite_team_member`, `socialsuite_revoke_team_invite`, account profile/API key tools |
| Check AI credits | `socialsuite_list_ai_credits` |
| Manage AI agents/workflow | `socialsuite_list_ai_agents`, custom agent create/edit/delete tools, `socialsuite_save_ai_workflow` |
| Start campaign AI mission | `socialsuite_start_campaign_mission` |
| Poll AI run | `socialsuite_wait_for_ai_artifact` |
| Commit AI artifact | `socialsuite_commit_ai_artifact` |
| Cancel AI mission | `socialsuite_cancel_ai_mission` |
| Delete AI history | `socialsuite_delete_ai_run` |

## Generic Tools

Use these only when a preferred tool does not fit:

- `socialsuite_list_rows`
- `socialsuite_get_row`
- `socialsuite_create_row`
- `socialsuite_update_row`
- `socialsuite_delete_rows`

In API-key mode, use the newer scoped generic tools:

- `socialsuite_list_table_rows`
- `socialsuite_get_table_row`
- `socialsuite_create_table_row`
- `socialsuite_update_table_row`
- `socialsuite_delete_table_rows`

Generic tools expose allowlisted tables, not unrestricted SQL.

## Common Tables

| Feature | Tables |
| --- | --- |
| Projects | `projects` |
| Folders | `folders` |
| Campaigns | `campaigns` |
| Content | `content_items` |
| Tasks | `tasks`, `task_stages`, `task_comments`, `task_comment_reads` |
| Calendar | `calendar_events` |
| Notes | `notes` |
| Brand Guide | `brand_guides`, `brand_colors`, `brand_fonts`, `brand_logos`, `brand_logo_rules`, `brand_mood_images`, `brand_knowledge_documents` |
| Feed Monitor | `feed_folders`, `feed_posts` |
| Client Portal | `portal_clients`, `portal_feeds`, `portal_review_posts`, `portal_comments`, `portal_review_events` |
| Password Vault | `vault_credentials` |
| AI | `ai_agents`, `ai_agent_versions`, `ai_agent_workflow_steps`, `ai_runs`, `ai_run_steps`, `ai_run_events`, `ai_artifacts`, `ai_run_approvals`, `ai_run_documents`, `ai_credit_accounts` |
| Organization | `organizations`, `org_members`, `org_tools`, `tool_registry` |
| API Keys | `account_api_keys` through `account-api-keys` function, not generic table tools |

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
