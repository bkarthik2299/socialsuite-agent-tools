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

The current MCP connector uses a SocialSuite test/user login with Supabase Auth. Use a dedicated SocialSuite user, not your personal owner account.

SocialSuite now supports generating Agent API Keys in My Account. The next connector version should switch from email/password auth to `SOCIALSUITE_API_KEY` once the SocialSuite API-key-authenticated action gateway is added.

## Install MCP Connector

```bash
cd mcp/socialsuite
npm install
npm run build
cp .env.example .env
```

Fill `.env` with the tester's own SocialSuite credentials.

## Configure Hermes

Add the MCP server to Hermes:

```bash
hermes mcp add socialsuite --command node --args "FULL_PATH_TO_REPO/mcp/socialsuite/dist/index.js"
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
