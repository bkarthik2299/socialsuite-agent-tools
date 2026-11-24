import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('SEO dashboard details return scoped provider rows with dates, warnings and job state', async () => {
  const range = { start: '2026-11-01', end: '2026-11-08' };
  const previous = { start: '2026-10-24', end: '2026-10-31' };
  const input = { clientId: '10000000-0000-4000-8000-000000000001', ...range, compare: true };
  const organic = { label: 'Organic Search', metrics: { sessions: 0, keyEvents: null } };
  const keyword = { label: 'example keyword', metrics: { averageRank: null }, dimensions: { date: range.end } };
  const report = (id, source, provider, period, breakdowns) => ({
    id, mapping_id: source, start_date: period.start, end_date: period.end,
    data: { source, provider, period, resourceId: id, timezone: 'Source', dataThrough: period.end, warnings: ['Check coverage'], totals: { sessions: 99 }, breakdowns },
  });
  const fixture = {
    period: range, previous,
    mappings: [
      { id: 'ga4', source: 'ga4' },
      { id: 'seo', source: 'seo', config: { engine_id: 'engine-a' } },
      { id: 'google_ads', source: 'google_ads' },
    ],
    reports: [
      report('traffic', 'ga4', 'windsor', range, { sessionDefaultChannelGroup: [{ label: 'Paid Search', metrics: { sessions: 99 } }, organic] }),
      report('previous', 'ga4', 'windsor', previous, { sessionDefaultChannelGroup: [{ label: 'Organic Social' }] }),
      report('rankings', 'seo', 'seranking', range, { keywords: [keyword] }),
      report('legacy', 'seo', 'windsor', previous, {}),
    ],
    jobs: [{ mapping_id: 'ga4', status: 'queued' }, { mapping_id: 'google_ads', status: 'failed' }],
  };
  const requests = [];
  const http = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push(JSON.parse(Buffer.concat(chunks).toString()));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ result: fixture }));
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  const client = new Client({ name: 'seo-dashboard-test', version: '1.0.0' });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: ['dist/api-key-index.js'], env: {
      ...process.env, SOCIALSUITE_API_KEY: 'ss_read_seo_test',
      SOCIALSUITE_AGENT_API_URL: `http://127.0.0.1:${http.address().port}`,
    } }));
    const call = async args => {
      const result = await client.callTool({ name: 'socialsuite_analytics_dashboard', arguments: args });
      assert.ok(!result.isError, result.content[0].text);
      return JSON.parse(result.content[0].text);
    };
    assert.deepEqual(await call(input), fixture);
    const traffic = await call({ ...input, detail: 'ga4_organic_search' });
    assert.deepEqual(traffic.mappings, [fixture.mappings[0]]);
    assert.deepEqual(traffic.jobs, [fixture.jobs[0]]);
    assert.deepEqual(traffic.reports.map(row => row.data.breakdowns.sessionDefaultChannelGroup), [[organic], []]);
    assert.deepEqual(traffic.reports.map(row => row.data.period), [range, previous]);
    assert.equal(traffic.reports[0].data.dataThrough, range.end);
    assert.deepEqual(traffic.reports[0].data.warnings, ['Check coverage']);
    assert.equal(traffic.reports[0].data.totals, undefined);
    const rankings = await call({ ...input, detail: 'seo_keyword_rankings' });
    assert.deepEqual(rankings.mappings, [fixture.mappings[1]]);
    assert.deepEqual(rankings.reports.map(row => row.id), ['rankings']);
    assert.deepEqual(rankings.reports[0].data.breakdowns.keywords, [keyword]);
    assert.deepEqual(requests, Array.from({ length: 3 }, () => ({ action: 'analytics_dashboard', input })));
  } finally {
    await client.close();
    await new Promise(resolve => http.close(resolve));
  }
});

test('note tools preserve note data and link to the matching workspace and app', async () => {
  const requests = [];
  const note = { id: 'note-1', org_id: 'workspace-2', title: 'Planning', content: [] };
  const http = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    requests.push(body);
    const result = body.action === 'list_notes' ? { notes: [note] } : { note };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ result }));
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  try {
    for (const appUrl of ['https://staging.example', '']) {
      const client = new Client({ name: 'note-links-test', version: '1.0.0' });
      const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/api-key-index.js'], env: {
        ...process.env, SOCIALSUITE_API_KEY: 'ss_write_workflows_test',
        SOCIALSUITE_AGENT_API_URL: `http://127.0.0.1:${http.address().port}`,
        SOCIALSUITE_APP_URL: appUrl,
      } });
      try {
        await client.connect(transport);
        const expected = appUrl ? { ...note, noteUrl: `${appUrl}/tools/notes?note=note-1&org=workspace-2` } : note;
        for (const [action, input] of [
          ['list_notes', { limit: 5 }],
          ['create_note', { title: 'Planning', text: 'New note' }],
          ['update_note', { noteId: note.id, updates: { title: 'Planning' } }],
        ]) {
          const result = await client.callTool({ name: `socialsuite_${action}`, arguments: input });
          assert.ok(!result.isError, result.content[0].text);
          assert.deepEqual(requests.at(-1), { action, input });
          assert.deepEqual(JSON.parse(result.content[0].text), action === 'list_notes' ? { notes: [expected] } : { note: expected });
        }
      } finally {
        await client.close();
      }
    }
  } finally {
    await new Promise(resolve => http.close(resolve));
  }
});

test('Analytics AI requires credit authorization and returns the receipt, while deadlines use the read route', async () => {
  const requests = [];
  const period = { start: '2026-11-01', end: '2026-11-08' };
  const evidence = [
    {
      id: 'E1', title: 'Meta Ads · Main account · custom query', source: 'meta_ads', period,
      origin: 'provider', currency: 'INR', warnings: ['Windsor returned no rows for the second account.'],
      data: { resourceLabel: 'Main account', rows: [{ placement: 'Feed', spend: 240 }] },
    },
    {
      id: 'E2', title: 'Meta Ads · Second account · custom query', source: 'meta_ads', period,
      origin: 'provider', currency: null, warnings: ['Windsor returned no rows for the requested fields and period.'],
      data: { resourceLabel: 'Second account', rows: [] },
    },
  ];
  const http = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    requests.push(body);
    if (body.action === 'list_task_deadlines') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ result: { tasks: [{ id: 'a', due_date: '2026-11-07' }], nextOffset: 4 } }));
      return;
    }
    res.setHeader('Content-Type', 'application/x-ndjson');
    if (body.input.messages[0].content === 'Interrupt') {
      res.end('{"type":"text","text":"Partial answer"}\n');
      return;
    }
    const chunk = Buffer.from('{"type":"text","text":"Spend was ₹240."}\n');
    const split = chunk.indexOf(Buffer.from('₹')) + 1;
    res.write('{"type":"heartbeat"}\n');
    res.write(chunk.subarray(0, split));
    res.write(chunk.subarray(split));
    for (const entry of evidence) res.write(JSON.stringify({ type: 'evidence', evidence: entry }) + '\n');
    res.end('{"type":"done","model":"test-model","creditsCharged":0.5,"creditsRemaining":3.5}');
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  const client = new Client({ name: 'current-workflows-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/api-key-index.js'], env: {
    ...process.env, SOCIALSUITE_API_KEY: 'ss_write_workflows_test', SOCIALSUITE_AGENT_API_URL: `http://127.0.0.1:${http.address().port}`,
  } });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const analyticsTool = 'socialsuite_analytics_ai_ask';
    const deadlinesTool = 'socialsuite_list_task_deadlines';
    assert.equal(tools.find(tool => tool.name === analyticsTool).annotations.readOnlyHint, false);
    assert.equal(tools.find(tool => tool.name === deadlinesTool).annotations.readOnlyHint, true);
    const input = {
      clientId: '10000000-0000-4000-8000-000000000001', requestId: '10000000-0000-4000-8000-000000000002',
      period, section: 'meta_ads', messages: [{ role: 'user', content: 'Show Meta Ads spend by placement for each account.' }],
      authorizeCredits: true,
    };
    for (const args of [{ ...input, authorizeCredits: false }, { ...input, messages: [{ role: 'assistant', content: 'No question' }] }]) {
      const denied = await client.callTool({ name: analyticsTool, arguments: args });
      assert.equal(denied.isError, true);
    }
    assert.equal(requests.length, 0);
    const result = await client.callTool({ name: analyticsTool, arguments: input });
    assert.ok(!result.isError, result.content[0].text);
    assert.deepEqual(requests[0], { action: 'analytics_ai_ask', input });
    assert.deepEqual(JSON.parse(result.content[0].text), {
      requestId: input.requestId, answer: 'Spend was ₹240.', evidence,
      model: 'test-model', creditsCharged: 0.5, creditsRemaining: 3.5,
    });
    const interrupted = await client.callTool({ name: analyticsTool, arguments: { ...input, messages: [{ role: 'user', content: 'Interrupt' }] } });
    assert.equal(interrupted.isError, true);
    assert.match(interrupted.content[0].text, /did not return a completion receipt/);
    assert.equal(requests.length, 2, 'An interrupted paid request must not be retried automatically');
    const deadlineFilter = { from: '2026-11-01', to: '2026-11-08', limit: 2, offset: 2 };
    const deadlines = await client.callTool({ name: deadlinesTool, arguments: deadlineFilter });
    assert.ok(!deadlines.isError, deadlines.content[0].text);
    assert.deepEqual(requests.at(-1), { action: 'list_task_deadlines', input: deadlineFilter });
    assert.equal(JSON.parse(deadlines.content[0].text).nextOffset, 4);
  } finally {
    await client.close();
    await new Promise(resolve => http.close(resolve));
  }
});
