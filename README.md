# SocialSuite Agent Tools

Private agent integration package for SocialSuite.

This repo contains:

- `mcp/socialsuite` - local MCP server for Hermes and other MCP-compatible agents.
- `skills/hermes/socialsuite` - Hermes skill that teaches agents how to use SocialSuite safely.
- `examples/hermes-config.example.yaml` - example Hermes MCP configuration.

## Security Rules

Never commit:

- `.env`
- SocialSuite passwords
- SocialSuite API keys
- Supabase service role keys
- generated user/session tokens

Each tester should create their own SocialSuite account or API key from **My Account -> Agent API Keys**.

## Current Connector Mode

The Hermes connector uses SocialSuite Agent API Keys from **My Account -> Agent API Keys**.

- **Read** key — inspection-only testing
- **Write** key — create projects, brand guides, campaigns, AI runs, notes, tasks, or content drafts

You only need an API key. The production Agent API URL is built into the package. Optional env overrides exist for staging/self-host.

## Current Feature Coverage

The API-key MCP is intended to cover the full SocialSuite workspace surface:

- Account and workspace identity, profile, API keys, team members, invitations, micro-tool registry, and AI credits.
- Projects, folders, campaigns, campaign content drafts, generated post/ad images, campaign calendar events, and AI campaign missions.
- Tasks, custom task stages, ordering, comments, read markers, and private reference attachments.
- AI Image Studio generation, image editing, prompt tools, uploads, job polling, collections, favorites, and campaign draft placement.
- Admin team role changes and member removal.
- Notes, Feed Monitor folders/posts, Password Vault credentials, and Client Portal review workflows.
- Brand guide setup, manual brand guide editing, brand assets, brand knowledge markdown, visual direction analysis, and Brand Guide-aware image generation.
- AI history, AI run details, custom AI agents, and AI workflow order.
- Scoped generic table tools for advanced cases when no workflow-specific tool fits.

The MCP wrapper calls the deployed SocialSuite `agent-api` Edge Function. The deployed app must include the matching expanded `agent-api` actions; otherwise the MCP will build but Hermes calls to newer tools will return `Unsupported agent action`.

## Install MCP Connector

Requires Node.js 20 or newer.

```bash
cd mcp/socialsuite
npm install
npm run build
cp .env.example .env
```

Edit `.env` and set **only**:

```env
SOCIALSUITE_API_KEY=ss_read_..._or_ss_write_...
```

Optional (defaults to SocialSuite production):

```env
# SOCIALSUITE_SUPABASE_URL=https://xeumxanbvsfbsctbyzfx.supabase.co
# SOCIALSUITE_AGENT_API_URL=https://xeumxanbvsfbsctbyzfx.supabase.co/functions/v1/agent-api
```

Verify the key:

```bash
npm run smoke
```

Expect JSON with your user email, active org, and `apiKey.permission` (`read` or `write`).

For Password Vault create/update with plain `password`, the deployed SocialSuite `agent-api` must have `VAULT_ENCRYPTION_KEY` or `VITE_VAULT_ENCRYPTION_KEY` configured to match the app. Without that, pass an already encrypted `encryptedPassword`.

## Configure Hermes

```bash
hermes mcp add socialsuite --command node --args "FULL_PATH_TO_REPO/mcp/socialsuite/dist/api-key-index.js"
```

If Hermes asks whether to enable tools, choose yes.

Then restart Hermes Desktop.

## Install Hermes Skill

Copy `skills/hermes/socialsuite` into the tester's Hermes local skills folder:

```text
%LOCALAPPDATA%\hermes\skills\social-media\socialsuite
```

Restart Hermes Desktop after copying.

## First Test Prompt

```text
Use the socialsuite skill and SocialSuite MCP tools. Tell me which SocialSuite account you are logged in as and list my projects.
```

## Recommended Campaign Test Prompt

```text
Use the socialsuite skill and SocialSuite MCP tools.

Create a project called Swiggy. Set up the Swiggy brand guide from https://www.swiggy.com, including website research and compiled markdown knowledge base.

Then start a Brief to Campaign AI mission in Deep Work mode using DeepSeek and Tavily research.

After the AI artifact is ready, summarize it for me. Do not commit drafts until I approve.
```

## Connector 0.3.0 rollout

Deploy the matching `agent-api` and `image-studio` Edge Functions from `social-suite-app` before using the new tools. Existing Studio and task-attachment database migrations and the current `team-invitations` function must already be installed. This update requires no new database migration. Rebuild the connector, restart the MCP client, and recopy the complete skill folder including references.

`socialsuite_whoami` reports `agentApiVersion` and `capabilities` on the updated backend. Older deployments may return `Unsupported agent action`; updating the MCP alone cannot add backend functionality.

Run `npm test` in `mcp/socialsuite` for an offline MCP protocol test against a mock Agent API. `npm run smoke` is an optional live identity check using your API key. Offline tests do not generate images, invite people, or spend credits.

The maintained entrypoint is `dist/api-key-index.js`. `src/index.ts` is the legacy session connector and does not expose the new tools. The skill works with other MCP-compatible agents too; install its entire folder in the client's supported skill directory.
