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

## Install MCP Connector

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
