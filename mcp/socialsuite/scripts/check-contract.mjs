// Run against an app checkout before releasing either side of the integration.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const app = process.argv[2];
if (!app) throw new Error('Usage: npm run check:contract -- /absolute/path/to/social-suite');
const shared = resolve(app, 'supabase/functions/_shared/agent_extensions.ts');
const { superAiActions, analyticsActions, extensionWriteActions, workflowReadActions } = await import(pathToFileURL(shared).href);
const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/api-key-index.js'], env: { ...process.env, SOCIALSUITE_API_KEY: 'ss_read_contract_test' } });
const client = new Client({ name: 'contract-check', version: '1.0.0' });
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  for (const [file, routes, excluded] of [
    ['super-ai', superAiActions, ['worker', 'stream']],
    ['analytics-api', analyticsActions, []],
  ]) {
    const source = await readFile(resolve(app, `supabase/functions/${file}/index.ts`), 'utf8');
    const actions = [...new Set([...source.matchAll(/body\.action === ["']([^"']+)["']/g)].map(m => m[1]))].filter(a => !excluded.includes(a)).sort();
    assert.deepEqual(Object.values(routes).sort(), actions, `${file}: backend public actions drifted from the agent allowlist`);
    for (const action of Object.keys(routes)) {
      const tool = tools.find(t => t.name === `socialsuite_${action}`);
      assert.ok(tool, `${action}: missing MCP tool`);
      assert.equal(tool.annotations?.readOnlyHint, workflowReadActions.has(action), `${action}: permission annotation drift`);
      assert.equal(extensionWriteActions.includes(action), !workflowReadActions.has(action), `${action}: write gate drift`);
    }
  }
  console.log(`Contract verified: ${tools.length} MCP tools; all Super AI and Analytics actions match the app.`);
} finally { await client.close(); }
