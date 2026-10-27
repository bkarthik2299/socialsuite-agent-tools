// Run against an app checkout before releasing either side of the integration.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { attachmentsSchema } from '../dist/attachments.js';

const app = process.argv[2];
if (!app) throw new Error('Usage: npm run check:contract -- /absolute/path/to/social-suite');
const shared = resolve(app, 'supabase/functions/_shared/agent_extensions.ts');
const { superAiActions, analyticsActions, extensionWriteActions, workflowReadActions } = await import(pathToFileURL(shared).href);
const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/api-key-index.js'], env: { ...process.env, SOCIALSUITE_API_KEY: 'ss_read_contract_test' } });
const client = new Client({ name: 'contract-check', version: '1.0.0' });
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const { sources, connectableSources = sources } = await import(pathToFileURL(resolve(app, 'supabase/functions/_shared/analytics-model.ts')).href);
  for (const action of ['analytics_resources', 'analytics_map', 'analytics_connect_source']) {
    const schema = tools.find(t => t.name === `socialsuite_${action}`).inputSchema;
    assert.deepEqual([...schema.properties.source.enum].sort(),
      [...(action === 'analytics_connect_source' ? connectableSources : sources)].sort(),
      `${action}: Analytics source choices drifted from the app`);
  }
  const connect = tools.find(t => t.name === 'socialsuite_analytics_connect_source').inputSchema;
  assert.equal(connect.properties.apiKey?.type, 'string', 'SE Ranking setup must accept the client API key');
  const credits = tools.find(t => t.name === 'socialsuite_analytics_seo_credits');
  assert.ok(credits, 'SE Ranking subscription credits need an MCP tool');
  assert.deepEqual([...credits.inputSchema.required].sort(), ['clientId', 'connectionId']);
  const attachmentFile = resolve(app, 'supabase/functions/_shared/super_ai_attachments.ts');
  let attachmentValidator;
  try { await readFile(attachmentFile); attachmentValidator = await import(pathToFileURL(attachmentFile).href); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (attachmentValidator) {
    const { validateAttachments } = attachmentValidator;
    const image = 'data:image/png;base64,aGVsbG8=';
    const attachment = { name: 'brief.txt', size: 1, text: 'Brief', images: [] };
    for (const value of [
      undefined, [], [attachment], [{ ...attachment, text: '', images: [image] }],
      [{ ...attachment, size: 10 * 1024 * 1024 }],
      [{ ...attachment, name: ' ' }], [{ ...attachment, size: 0 }],
      [{ ...attachment, size: 1.5 }], [{ ...attachment, text: '', images: [] }],
      [{ ...attachment, text: 'x'.repeat(60001) }],
      Array(6).fill(attachment), Array(2).fill({ ...attachment, size: 6 * 1024 * 1024 }),
      Array(2).fill({ ...attachment, text: 'x'.repeat(50001) }),
      [{ ...attachment, images: Array(21).fill(image) }],
      [{ ...attachment, images: ['https://example.com/image.png'] }],
      [{ ...attachment, images: ['data:image/gif;base64,aGVsbG8='] }],
      [{ ...attachment, images: ['data:image/png;base64,' + 'A'.repeat(4 * 1024 * 1024)] }],
      [{ ...attachment, images: Array(6).fill('data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024)) }],
    ]) {
      let expected;
      try { expected = { success: true, data: validateAttachments(value) }; }
      catch { expected = { success: false }; }
      const actual = attachmentsSchema.optional().safeParse(value);
      assert.equal(actual.success, expected.success, 'Super AI attachment validation drifted from the app');
      if (actual.success && value !== undefined) assert.deepEqual(actual.data, expected.data);
    }
    console.log('Prepared attachment payloads and limits match the app backend.');
  } else console.log('App checkout has no attachment backend yet; attachment rollout is required separately.');
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
