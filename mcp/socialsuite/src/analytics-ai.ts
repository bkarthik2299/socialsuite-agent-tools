import { openAgentResponse, type JsonObject } from './gateway.js';

export async function askAnalytics(input: JsonObject, signal: AbortSignal) {
  const response = await openAgentResponse('analytics_ai_ask', input, signal);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || `Analytics AI could not answer (${response.status}).`);
  }
  if (!response.body || !response.headers.get('Content-Type')?.startsWith('application/x-ndjson')) {
    throw new Error('Analytics AI requires the current SocialSuite Agent API.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const evidence: unknown[] = [];
  let buffer = '';
  let bytes = 0;
  let answer = '';
  let receipt: JsonObject | undefined;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as JsonObject;
    if (event.type === 'error') throw new Error(String(event.message || 'Analytics AI could not answer.'));
    if (event.type === 'text' && typeof event.text === 'string') answer += event.text;
    if (event.type === 'evidence') evidence.push(event.evidence);
    if (event.type === 'done') receipt = event;
  };

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2_000_000) throw new Error('The answer exceeded its size limit. Check the request before submitting a narrower question.');
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(consume);
    }
    consume(buffer + decoder.decode());
    if (!receipt) throw new Error(`Analytics AI did not return a completion receipt for ${input.requestId}. Check the request before submitting it again.`);
    const { model, reviewModel, creditsCharged, creditsRemaining } = receipt;
    return { requestId: input.requestId, answer, evidence, model, reviewModel, creditsCharged, creditsRemaining };
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
