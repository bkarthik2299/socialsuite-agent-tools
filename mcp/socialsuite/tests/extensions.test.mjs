import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const uuid = '11111111-1111-4111-8111-111111111111';
test('MCP protocol: discovery, forwarding, validation, errors and signed local uploads', async () => {
  const calls = [];
  let uploaded;
  const http = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (req.method === 'PUT') {
      uploaded = Buffer.concat(chunks);
      res.end('{}'); return;
    }
    const body = JSON.parse(Buffer.concat(chunks).toString());
    calls.push(body);
    res.setHeader('Content-Type', 'application/json');
    if (body.action === 'remove_team_member') {
      res.statusCode = 403; res.end(JSON.stringify({ error: 'Only admins can remove team members.' })); return;
    }
    const result = body.action.startsWith('prepare_')
      ? { signedUrl: `http://127.0.0.1:${http.address().port}/upload`, path: 'org/inputs/test.png', attachment: { id: uuid, name: 'test.png', storagePath: 'org/task/test.png' } }
      : { echoed: body };
    res.end(JSON.stringify({ result }));
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/api-key-index.js'], env: {
    ...process.env, SOCIALSUITE_API_KEY: 'ss_write_test', SOCIALSUITE_AGENT_API_URL: `http://127.0.0.1:${http.address().port}`,
  } });
  const client = new Client({ name: 'offline-test', version: '1.0.0' });
  const dir = await mkdtemp(join(tmpdir(), 'socialsuite-mcp-'));
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    for (const name of ['get_studio_job', 'start_studio_job', 'upload_studio_image', 'set_task_attachments', 'update_team_member_role']) {
      assert.ok(tools.some(t => t.name === `socialsuite_${name}`), name);
    }
    assert.equal(tools.find(t => t.name === 'socialsuite_get_studio_job').annotations.readOnlyHint, true);
    const args = { requestId: uuid, tool: 'generate', settings: { prompt: 'A red bicycle', ratio: '3:4', count: 2 } };
    await client.callTool({ name: 'socialsuite_start_studio_job', arguments: args });
    assert.deepEqual(calls.at(-1), { action: 'start_studio_job', input: args });
    const before = calls.length;
    const invalid = await client.callTool({ name: 'socialsuite_start_studio_job', arguments: { ...args, settings: { count: 9 } } });
    assert.equal(invalid.isError, true);
    assert.equal(calls.length, before, 'invalid request must not reach the API');
    const denied = await client.callTool({ name: 'socialsuite_remove_team_member', arguments: { memberId: uuid } });
    assert.equal(denied.isError, true);
    assert.match(denied.content[0].text, /Only admins/);
    const file = join(dir, 'test.png');
    await writeFile(file, Buffer.from([137, 80, 78, 71, 1, 2, 3]));
    const upload = await client.callTool({ name: 'socialsuite_upload_studio_image', arguments: { filePath: file } });
    assert.equal(upload.isError, undefined);
    assert.equal(uploaded.length, 7);
    assert.deepEqual(JSON.parse(upload.content[0].text), { path: 'org/inputs/test.png' });
    assert.doesNotMatch(upload.content[0].text, /signedUrl|token/);
    const taskUpload = await client.callTool({ name: 'socialsuite_upload_task_attachment', arguments: { taskId: uuid, filePath: file } });
    assert.ok(JSON.parse(taskUpload.content[0].text).attachment);
    assert.equal(calls.at(-1).action, 'prepare_task_attachment_upload');
    assert.equal(calls.at(-1).input.taskId, uuid);
  } finally {
    await client.close();
    await new Promise(resolve => http.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
