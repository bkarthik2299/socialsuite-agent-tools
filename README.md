# SocialSuite Agent Tools

The maintained MCP connector and portable Social Suite skill for Hermes and other MCP-compatible AI clients.

[Social Suite](https://www.socialsuite.app/) is an AI-powered workspace for campaign planning, Super AI content, Image Studio, client approvals and marketing analytics. This repository connects agents to those workflows using the account owner's permissions.

**Separate public repository:** https://github.com/bkarthik2299/socialsuite-agent-tools

Connector **0.4.1** exposes **135 tools**, with portable skill **1.3.0**. It uses a SocialSuite Agent API key; no SocialSuite password or Supabase service key is needed.

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

Create a key in SocialSuite **My Account → Agent API Keys**, or the app's **Social Suite MCP** setup page. Read keys inspect data; write keys additionally require workspace editor/admin access. The production API URL is built in. Use `SOCIALSUITE_AGENT_API_URL` for staging/self-hosting.

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

`socialsuite_whoami` should report Agent API 0.4.0 or a compatible newer version, with `super-ai`, `analytics`, `studio-model-selection` and `vault-v1-encryption`. `socialsuite_get_agent_catalog` returns model IDs from the app's maintained catalogs. A missing capability means the backend needs updating; reinstalling the MCP alone cannot add backend features.

## Feature coverage

| Surface | Coverage |
| --- | --- |
| Super AI | Chats, project/brand context, history, prepared image/document attachments on quotes, credit estimates, paid generation, research, polling, drafts, manual/AI revisions, destinations, saving/undo, branching, sharing, pin/archive, cancel/delete, admin health |
| Analytics | Clients, preferences, GA4/GSC/GBP/Google Ads/Meta Ads via Windsor, authorized resource discovery, mapping, reports, explicit date ranges, period comparison, refresh and disconnect; legacy SEO reports retained, no new SEO connections |
| Image Studio | GPT Image 2 / 2.5 Flare / 2.5 Sunburst model selection, generation, editing, prompt tools, uploads, jobs, collections, favorites and campaign draft placement |
| Workspace | Projects, folders, campaigns, content, calendar, tasks/stages/comments/references, notes, Feed Monitor, Client Portal reviews |
| Brand | Website setup, brand guide assets, knowledge markdown, visual analysis and brand-aware image generation |
| Account/team | Identity/profile, API keys, members/invitations, admin role changes/removal, micro-tool registry and credits |
| Existing AI missions | Start/poll/commit/cancel, run history, custom agents and workflow order; retained for existing mission workflows |
| Password Vault | Metadata and credential writes; plaintext writes now use the app's authenticated AES-GCM vault format with server-only `VAULT_ENCRYPTION_KEY` |

Read the [skill](skills/hermes/socialsuite/SKILL.md) for feature workflows. Super AI and Analytics preserve app permissions and private data boundaries through the same authenticated backend functions. They are not exposed through generic table access. Super AI worker and streaming endpoints are not MCP tools; poll request/thread tools instead. UI-only features such as chart layout, metric selection, Google sign-in and marketing navigation do not need MCP mutation tools. Saving campaign drafts does not publish to social networks.

## Upgrade

```bash
git pull --ff-only
cd mcp/socialsuite
npm ci
npm run build
npm test
```

Recopy the complete skill folder and restart the client's MCP connection. Existing API keys remain usable. The maintained entrypoint is `dist/api-key-index.js`; `src/index.ts` and the app's `agent-connectors/hermes-mcp` directory are legacy session integrations.

## Backend rollout and maintenance

Release 0.4.1 requires Agent API 0.4.0 or a compatible newer backend from `social-suite-app`, plus the app's Super AI, Analytics, Image Studio and database migrations. Ads reporting requires the ads-source migration and Analytics functions from app PR #92 (merged). Prepared attachments require the attachment migration and updated Super AI function from app PR #91, merged into app `main` on 13 October 2026. For staging or self-hosted installations, confirm the operator has deployed the matching backend before quoting files: an older Super AI backend can ignore unknown attachments. The `super-ai` capability does not identify attachment rollout. This connector change adds no database migration. Keep Agent API custom-key authentication (`verify_jwt = false`) and its own API-key validation; delegated workflows authenticate the key owner as a user and apply the app's membership checks.

Attachments are prepared payloads (`name`, original byte `size`, extracted `text`, and JPEG/PNG/WebP base64 `images`), not local file uploads. See the [Super AI reference](skills/hermes/socialsuite/references/super-ai.md) for limits and model changes. Ads reports preserve account currencies and provider attribution; see the [Analytics reference](skills/hermes/socialsuite/references/analytics.md).

Before releasing either repository, build the connector and check against the current app checkout:

```bash
npm test
npm run check:contract -- /absolute/path/to/social-suite
npm audit --omit=dev
```

The contract check compares every public Super AI/Analytics backend action with the Agent API allowlist and MCP tool discovery/permission annotations. It also compares Analytics source choices and, when the checkout includes the attachment backend, prepared-file validation and limits. It needs a local app checkout because the application repository is private. Offline MCP tests cover validation, action forwarding, model selection, errors and signed uploads; backend routing tests cover workspace scope and write gates. GitHub CI tests Node 22/24, and Dependabot proposes dependency updates. Run `npm run smoke` separately for an authenticated production identity check; tests do not generate paid output or invite people.
