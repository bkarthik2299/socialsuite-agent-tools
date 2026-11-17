import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { reportDocumentSchema, reportDatasetSchema } from '../dist/reports.js';

const reference = await readFile('../../skills/hermes/socialsuite/references/reports.md', 'utf8');
const example = JSON.parse(reference.match(/```json\n([\s\S]*?)\n```/)[1]);
test('the report construction skill example is a complete valid draft', () => {
  assert.deepEqual(reportDocumentSchema.parse(example.document), example.document);
  assert.deepEqual(example.datasets.map(d => reportDatasetSchema.parse(d)), example.datasets);
  for (const date of ['2026-02-30', 'today']) assert.equal(reportDocumentSchema.safeParse({ ...example.document, period: { start: date, end: '2026-11-30' } }).success, false);
  assert.equal(reportDocumentSchema.safeParse({ ...example.document, period: { start: '2026-11-30', end: '2026-11-01' } }).success, false);
});

test('MCP report construction, discovery, revision conflicts, branding upload and explicit publication', async () => {
  const calls = [];
  let saved;
  let revision = -1;
  let published = null;
  const http = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    calls.push(body);
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.authorization !== 'Bearer ss_write_reports_test') {
      res.statusCode = 403; res.end(JSON.stringify({ error: 'Read-only key' })); return;
    }
    let result = { echoed: body };
    if (body.action === 'reports_save') {
      if (body.input.revision !== revision) {
        res.statusCode = 409; res.end(JSON.stringify({ error: 'Report changed in another session' })); return;
      }
      saved = structuredClone(body.input); result = { revision: ++revision };
    } else if (body.action === 'reports_get') {
      result = { report: { document: saved.document, revision }, datasets: saved.datasets };
    } else if (body.action === 'reports_upload_logo') result = { url: 'https://assets.example.test/logo.png' };
    else if (body.action === 'reports_publish') {
      published = structuredClone(saved); result = { token: 'fixture-report-token' };
    } else if (body.action === 'reports_version') result = { presentation: published.document };
    res.end(JSON.stringify({ result }));
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  const client = new Client({ name: 'reports-offline-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/api-key-index.js'], env: {
    ...process.env, SOCIALSUITE_API_KEY: 'ss_write_reports_test', SOCIALSUITE_AGENT_API_URL: `http://127.0.0.1:${http.address().port}`,
  } });
  const dir = await mkdtemp(join(tmpdir(), 'socialsuite-report-'));
  const invoke = async (action, input) => {
    const response = await client.callTool({ name: `socialsuite_${action}`, arguments: input });
    assert.ok(!response.isError, response.content[0].text);
    return JSON.parse(response.content[0].text);
  };
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const reads = ['list', 'get', 'data', 'catalog', 'defaults', 'branding_assets', 'version'];
    const writes = ['save', 'refresh', 'duplicate', 'publish', 'revoke', 'delete', 'upload_logo'];
    for (const [actions, readOnly] of [[reads, true], [writes, false]]) for (const suffix of actions) {
      const tool = tools.find(t => t.name === `socialsuite_reports_${suffix}`);
      assert.ok(tool, suffix);
      assert.equal(tool.annotations.readOnlyHint, readOnly);
    }
    assert.equal(tools.find(t => t.name === 'socialsuite_reports_publish').annotations.openWorldHint, true);
    assert.equal(tools.find(t => t.name === 'socialsuite_reports_delete').annotations.destructiveHint, true);
    assert.ok(!tools.some(t => t.name === 'socialsuite_reports_public'));
    await invoke('reports_save', example);
    assert.equal(published, null, 'saving a draft must never publish');
    const draft = await invoke('reports_get', { reportId: example.reportId });
    assert.deepEqual(draft.datasets, example.datasets);
    const manual = structuredClone(draft.datasets[0].values);
    const stale = await client.callTool({ name: 'socialsuite_reports_save', arguments: example });
    assert.equal(stale.isError, true);
    assert.match(stale.content[0].text, /another session/);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64');
    const filePath = join(dir, 'logo.png');
    await writeFile(filePath, png);
    const uploaded = await invoke('reports_upload_logo', { reportId: example.reportId, filePath });
    assert.deepEqual(calls.at(-1), { action: 'reports_upload_logo', input: { reportId: example.reportId, mime: 'image/png', data: png.toString('base64') } });
    assert.equal(published, null, 'logo upload must never publish');
    const next = { ...example, revision: draft.report.revision, document: { ...draft.report.document, branding: { ...draft.report.document.branding, clientLogo: uploaded.url } }, datasets: draft.datasets };
    await invoke('reports_save', next);
    assert.deepEqual(saved.datasets[0].values, manual);
    await invoke('reports_publish', { reportId: example.reportId, acknowledgeMissing: false });
    await invoke('reports_save', { ...next, revision: 1, document: { ...next.document, name: 'Changed draft' } });
    const version = await invoke('reports_version', { reportId: example.reportId, versionId: example.reportId });
    assert.equal(version.presentation.name, example.document.name);
    assert.equal(version.presentation.branding.clientLogo, uploaded.url);
    const cases = [
      ['reports_list', {}], ['reports_catalog', { clientId: example.clientId }],
      ['reports_defaults', { clientId: example.clientId }], ['reports_branding_assets', { clientId: example.clientId }],
      ['reports_data', { reportId: example.reportId }], ['reports_refresh', { reportId: example.reportId }],
      ['reports_duplicate', { reportId: example.reportId, clientId: example.clientId, period: example.document.period }],
      ['reports_revoke', { reportId: example.reportId }],
    ];
    for (const [action, input] of cases) {
      await invoke(action, input);
      assert.deepEqual(calls.at(-1), { action, input });
    }
    const prior = calls.length;
    for (const [action, input] of [
      ['reports_save', { ...example, revision: 'latest' }],
      ['reports_save', { ...example, document: { ...example.document, branding: { ...example.document.branding, accent: 'olive' } } }],
      ['reports_save', { ...example, datasets: [{ ...example.datasets[0], columns: [{ ...example.datasets[0].columns[0], field: 'script' }] }] }],
      ['reports_get', { reportId: 'wrong' }], ['reports_publish', {}],
      ['reports_upload_logo', { reportId: example.reportId, filePath: 'relative.png' }],
      ['reports_upload_logo', { reportId: example.reportId, filePath: join(dir, 'logo.svg') }],
      ['reports_duplicate', { reportId: example.reportId, clientId: example.clientId, period: { start: '2026-01-01', end: '2027-12-31' } }],
    ]) assert.equal((await client.callTool({ name: `socialsuite_${action}`, arguments: input })).isError, true);
    assert.equal(calls.length, prior, 'invalid report input must not reach the API');
  } finally {
    await client.close();
    await new Promise(resolve => http.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
