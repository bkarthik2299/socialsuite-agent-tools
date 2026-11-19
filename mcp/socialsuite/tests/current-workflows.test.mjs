import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('Analytics AI requires credit authorization and returns the receipt, while deadlines use the read route', async () => {
  const requests = [];
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
    res.write('{"type":"evidence","evidence":{"source":"google_ads"}}\n');
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
      period: { start: '2026-11-01', end: '2026-11-08' }, messages: [{ role: 'user', content: 'How much was spent?' }],
      authorizeCredits: true,
    };
    for (const args of [{ ...input, authorizeCredits: false }, { ...input, messages: [{ role: 'assistant', content: 'No question' }] }]) {
      const denied = await client.callTool({ name: analyticsTool, arguments: args });
      assert.equal(denied.isError, true);
    }
    assert.equal(requests.length, 0);
    const result = await client.callTool({ name: analyticsTool, arguments: input });
    assert.ok(!result.isError, result.content[0].text);
    assert.deepEqual(JSON.parse(result.content[0].text), {
      requestId: input.requestId, answer: 'Spend was ₹240.', evidence: [{ source: 'google_ads' }],
      model: 'test-model', creditsCharged: 0.5, creditsRemaining: 3.5,
    });
    const interrupted = await client.callTool({ name: analyticsTool, arguments: { ...input, messages: [{ role: 'user', content: 'Interrupt' }] } });
    assert.equal(interrupted.isError, true);
    assert.match(interrupted.content[0].text, /did not return a completion receipt/);
    assert.equal(requests.length, 2, 'An interrupted paid request must not be retried automatically');
    const period = { from: '2026-11-01', to: '2026-11-08', limit: 2, offset: 2 };
    const deadlines = await client.callTool({ name: deadlinesTool, arguments: period });
    assert.ok(!deadlines.isError, deadlines.content[0].text);
    assert.deepEqual(requests.at(-1), { action: 'list_task_deadlines', input: period });
    assert.equal(JSON.parse(deadlines.content[0].text).nextOffset, 4);
  } finally {
    await client.close();
    await new Promise(resolve => http.close(resolve));
  }
});
