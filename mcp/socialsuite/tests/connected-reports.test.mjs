import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { connectedReportFixture } from './connected-report-fixture.mjs';
import { reportDatasetSchema } from '../dist/reports.js';

test('one-request connected report workflow discovers arbitrary metrics, saves keyword rows and waits for verification', async () => {
  const { groups, draft, cache } = connectedReportFixture();
  const calls = [];
  let saved, reads = 0;
  const http = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    calls.push(body);
    let result;
    if (body.action === 'whoami') result = { activeOrgId: 'org', apiKey: { permission: 'write' }, capabilities: ['diy-reports', 'reports-keyword-rows', 'reports-preview'] };
    else if (body.action === 'get_agent_catalog') result = { reportFeatures: { grains: ['total', 'month', 'campaign', 'keyword', 'custom'], preview: 'reports_data.presentation' } };
    else if (body.action === 'analytics_bootstrap') result = { clients: [{ id: draft.clientId, name: 'Example practice' }] };
    else if (body.action === 'reports_catalog') result = { groups };
    else if (body.action === 'reports_defaults') result = { branding: draft.document.branding };
    else if (body.action === 'reports_save') { saved = body.input; result = { revision: 0 }; }
    else if (body.action === 'reports_get') result = { report: { id: draft.reportId, revision: 0, document: saved.document }, datasets: saved.datasets };
    else if (body.action === 'reports_data') result = ++reads === 1
      ? { reportRevision: 0, cache: [], jobs: [{ mapping_id: groups[0].mappingId, status: 'queued' }], presentation: { name: draft.document.name, blocks: [] } }
      : { reportRevision: 0, cache, jobs: [], presentation: { name: draft.document.name, blocks: [{ type: 'kpi', title: 'providerSpecificMetric_2026', value: 42 }] } };
    else { res.statusCode = 400; res.end(JSON.stringify({ error: 'Unexpected action' })); return; }
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ result }));
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  const client = new Client({ name: 'connected-reports-test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/api-key-index.js'], env: {
    ...process.env, SOCIALSUITE_API_KEY: 'ss_write_reports_fixture', SOCIALSUITE_AGENT_API_URL: `http://127.0.0.1:${http.address().port}`,
  } });
  const invoke = async (name, args = {}) => {
    const result = await client.callTool({ name: `socialsuite_${name}`, arguments: args });
    assert.ok(!result.isError, result.content[0].text); return JSON.parse(result.content[0].text);
  };
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.equal(tools.find(t => t.name === 'socialsuite_reports_save').annotations.destructiveHint, false);
    assert.ok((await invoke('whoami')).capabilities.includes('reports-preview'));
    assert.ok((await invoke('get_agent_catalog')).reportFeatures.grains.includes('keyword'));
    assert.equal((await invoke('analytics_bootstrap')).clients[0].id, draft.clientId);
    const discovered = await invoke('reports_catalog', { clientId: draft.clientId });
    assert.equal(discovered.groups[1].metrics[0].key, 'providerSpecificMetric_2026');
    await invoke('reports_defaults', { clientId: draft.clientId });
    await invoke('reports_save', draft);
    const loaded = await invoke('reports_get', { reportId: draft.reportId });
    assert.deepEqual(loaded.datasets, draft.datasets, 'keyword fields and provider IDs must survive an MCP save/read');
    assert.ok(saved.datasets.every(d => d.columns.every(c => c.kind === 'connected') && !Object.keys(d.values).length));
    const pending = await invoke('reports_data', { reportId: draft.reportId });
    assert.equal(pending.jobs[0].status, 'queued');
    const ready = await invoke('reports_data', { reportId: draft.reportId });
    assert.equal(ready.jobs.length, 0);
    assert.equal(ready.reportRevision, loaded.report.revision);
    assert.equal(ready.presentation.blocks[0].value, 42);
    assert.equal(ready.cache[1].totals.missingProviderMetric, null);
    assert.equal(ready.cache[0].keywords[1].metrics.previousPosition, 'No earlier check');
    assert.ok(!calls.some(c => ['reports_publish', 'reports_share'].includes(c.action)), 'draft verification must not publish');
    const changed = { ...draft, revision: loaded.report.revision, datasets: loaded.datasets };
    await invoke('reports_save', changed);
    assert.equal(saved.datasets[1].grain, 'keyword', 'editing an existing connected report must stay supported');
    assert.equal(reportDatasetSchema.safeParse({ ...draft.datasets[1], grain: 'invented-dimension' }).success, false);
  } finally { await client.close(); await new Promise(resolve => http.close(resolve)); }
});
