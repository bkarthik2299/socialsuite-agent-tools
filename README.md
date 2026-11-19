# SocialSuite Agent Tools

The maintained MCP connector and portable Social Suite skill for Hermes and other MCP-compatible AI clients.

[Social Suite](https://www.socialsuite.app/) is an AI-powered workspace for campaign planning, Super AI content, Image Studio, client approvals and marketing analytics. This repository connects agents to those workflows using the account owner's permissions.

**Separate public repository:** https://github.com/bkarthik2299/socialsuite-agent-tools

Connector **0.7.1** exposes **154 tools**, with portable skill **1.6.1**. It uses a SocialSuite Agent API key.

## Install

Requires **Node.js 22 or newer** (22 and 24 are checked in CI).

```bash
git clone https://github.com/bkarthik2299/socialsuite-agent-tools.git
cd socialsuite-agent-tools/mcp/socialsuite
npm ci
npm run build
```

Create `mcp/socialsuite/.env` from `.env.example` and set:

```env
SOCIALSUITE_API_KEY=your_own_socialsuite_api_key
```

Create a key in SocialSuite **My Account → Agent API Keys**, or the app's **Social Suite MCP** setup page. Read keys inspect data. Write actions also require workspace editor/admin access. For staging or self-hosting, use `SOCIALSUITE_AGENT_API_URL` for the backend. Set `SOCIALSUITE_APP_URL` to the matching browser origin to share reports on that instance.

Never commit `.env`, passwords, API keys, service-role keys or generated session tokens. Each person uses their own key. Client-provided environment variables take precedence over `.env`.

## Connect your harness

Run the local **stdio** MCP server with `node` and the absolute path to `mcp/socialsuite/dist/api-key-index.js`. The backend Agent API URL is an HTTP application API, not a remote MCP endpoint.

### Hermes

Add the entry from [examples/hermes-config.example.yaml](examples/hermes-config.example.yaml) to `~/.hermes/config.yaml`, replacing the server path. Hermes CLI registration is also available:

```bash
hermes mcp add socialsuite --command node --args "/absolute/path/to/socialsuite-agent-tools/mcp/socialsuite/dist/api-key-index.js"
```

Copy the **entire** `skills/hermes/socialsuite` folder, including `references`, into `~/.hermes/skills/social-media/socialsuite` (or your configured Hermes skills directory). Restart the MCP connection/session after updates. Hermes may prefix tools as `mcp_socialsuite_socialsuite_*`.

See the official [Hermes MCP documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/) and [skills documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills/) for client-specific settings.

### Other MCP clients

[examples/mcp-config.example.json](examples/mcp-config.example.json) shows the common `mcpServers` JSON format used by clients such as Claude Desktop and Cursor. Replace the absolute path and adapt the config location/format to your harness. Install the same complete skill folder wherever that client discovers `SKILL.md` skills. Clients without skill support can still discover and call MCP tools; load the skill instructions manually when needed. No npm package has been published; install from this repository.

### Verify without changing data

```bash
npm run smoke
```

Or ask your agent:

> Use SocialSuite MCP. Identify my connected account and workspace, inspect key permission and backend capabilities, then discover the current model catalog. Do not change data or spend credits.

Use the capabilities reported by `socialsuite_whoami` to check feature availability. Agent API 0.7.0 adds `analytics-ai` and `calendar-task-deadlines`. DIY Reports requires `diy-reports` and discovered `reportActions`. The catalog returns current model and workflow choices. Look up provider-specific requirements in the Analytics skill reference. The API key stays scoped to its workspace even if the user switches organizations in the browser.

## Feature coverage

| Surface | Coverage |
| --- | --- |
| Super AI | Chats, project/brand context, history, prepared image/document attachments on quotes, credit estimates, paid generation, research, polling, drafts, manual/AI revisions, destinations, saving/undo, branching, sharing, pin/archive, cancel/delete, admin health |
| Analytics | Clients, preferences, GA4/GSC/GBP/Google Ads/Meta Ads and eight organic social sources via Windsor, SE Ranking setup and audit drilldowns, SEO API credits, date ranges including All time, and Analytics AI with evidence and a 0.5-credit completion receipt |
| Image Studio | GPT Image 2 / 2.5 Flare / 2.5 Sunburst model selection, generation, editing, prompt tools, uploads, jobs, collections, favorites and campaign draft placement |
| DIY Reports | Manual and connected tables, metric discovery, table and KPI formulas, KPI targets, charts, branding, revision-safe saves, copies, and sign-in-free report previews with update and revoke controls |
| Workspace | Projects, folders, campaigns, content, calendar events and task deadlines, tasks/stages/comments/references, notes, Feed Monitor, Client Portal reviews |
| Brand | Website setup, brand guide assets, knowledge markdown, visual analysis and brand-aware image generation |
| Account/team | Identity/profile, API keys, members/invitations, admin role changes/removal, micro-tool registry and credits |
| Existing AI missions | Start/poll/commit/cancel, run history, custom agents and workflow order; retained for existing mission workflows |
| Password Vault | Metadata and credential writes; plaintext writes now use the app's authenticated AES-GCM vault format with server-only `VAULT_ENCRYPTION_KEY` |

Read the [skill](skills/hermes/socialsuite/SKILL.md) for feature workflows. Super AI, Analytics and Reports preserve app permissions and private data boundaries through the same authenticated backend functions. They are not exposed through generic table access. Super AI worker and streaming endpoints are not MCP tools; poll request/thread tools instead. UI-only features such as chart layout, metric selection, Google sign-in and marketing navigation do not need MCP mutation tools. Saving campaign drafts does not publish to social networks.

## Upgrade

Release 0.7.0 adds `socialsuite_reports_share`, `socialsuite_analytics_ai_ask` and `socialsuite_list_task_deadlines`. An active report link can be copied again without changing the preview. Set `updatePreview: true` to share the latest saved version at the same URL. The last two tools require Agent API 0.7.0. Analytics AI also needs the enabled backend feature and authorization to spend credits.

Release 0.6.0 adds 14 dedicated DIY Reports tools and the complete [Reports workflow reference](skills/hermes/socialsuite/references/reports.md). It requires Agent API 0.6.0 capability `diy-reports`, the Reports database migration and `reports-api` deployment. Reports delegate to the same user-authenticated app workflow, keep manual values and stable formula IDs, and reject stale revisions. Logo upload takes a normal local file; the user does not supply a URL. Public snapshots require explicit authorization. Read structured versions through MCP; CSV/XLSX/PDF downloads remain app exports.

The model catalog now includes current Super AI choices and Auto; older campaign-mission models have a separate catalog. The skill also explains Calendar task deadlines and distinguishes them from events. The connector lockfile includes the patched Hono dependency.

Release 0.5.2 added explicit task-card edit schemas for assignee, project, folder, campaign, date, stage and ordering, including snake_case aliases and top-level edits. Agent API 0.5.1 capability `task-card-updates` resolves member IDs, validates dates and workspace access, supports clearing fields, and keeps project/folder/campaign links consistent. The `task-recovery` capability reflects the app's private 30-day recovery behavior. The new read-only `socialsuite_analytics_seo_audit_details` tool exposes the app's latest paginated SE Ranking audit drilldowns. Update the backend and restart the MCP connection after updating the connector so clients refresh their tool schemas.

```bash
git pull --ff-only
cd mcp/socialsuite
npm ci
npm run build
npm test
```

Recopy the complete skill folder and restart the client's MCP connection. Existing API keys remain usable. The maintained entrypoint is `dist/api-key-index.js`; `src/index.ts` and the app's `agent-connectors/hermes-mcp` directory are legacy session integrations.

## Backend rollout and maintenance

Release 0.5.0 adds organic social analytics, SE Ranking setup and `socialsuite_analytics_seo_credits` (136 tools), with skill 1.4.0. These features require Agent API 0.5.0 with `analytics-social-organic`, `analytics-seranking` and `analytics-seo-credits`, plus the app updates from PRs #98, #99 and #107. SE Ranking uses the client's own Project API subscription and encrypted API key; never store that key in the MCP environment or skills. Existing workflows require Agent API 0.4.0 or a compatible newer backend from `social-suite-app`, plus the app's Super AI, Analytics, Image Studio and database migrations. Ads reporting requires the ads-source migration and Analytics functions from app PR #92 (merged). Prepared attachments require the attachment migration and updated Super AI function from app PR #91, merged into app `main` on 13 October 2026. For staging or self-hosted installations, confirm the operator has deployed the matching backend before quoting files: an older Super AI backend can ignore unknown attachments. The `super-ai` capability does not identify attachment rollout. This connector change adds no database migration. Keep Agent API custom-key authentication (`verify_jwt = false`) and its own API-key validation; delegated workflows authenticate the key owner as a user and apply the app's membership checks.

Attachments are prepared payloads (`name`, original byte `size`, extracted `text`, and JPEG/PNG/WebP base64 `images`), not local file uploads. See the [Super AI reference](skills/hermes/socialsuite/references/super-ai.md) for limits and model changes. Ads reports preserve account currencies and provider attribution; see the [Analytics reference](skills/hermes/socialsuite/references/analytics.md).

Before releasing either repository, build the connector and check against the current app checkout:

```bash
npm test
npm run check:contract -- /absolute/path/to/social-suite
npm audit --omit=dev
```

The contract check compares every public Super AI/Analytics/Reports backend action with the Agent API allowlist and MCP tool discovery/permission annotations. It also compares Analytics source choices and, when the checkout includes the attachment backend, prepared-file validation and limits. It needs a local app checkout because the application repository is private. Offline MCP tests cover validation, action forwarding, model selection, errors and signed uploads; backend routing tests cover workspace scope and write gates. GitHub CI tests Node 22/24, and Dependabot proposes dependency updates. Run `npm run smoke` separately for an authenticated production identity check; tests do not generate paid output or invite people.
