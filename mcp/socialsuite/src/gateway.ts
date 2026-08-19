import { config } from './config.js';

export type JsonObject = Record<string, unknown>;

export async function callAgentApi<T = unknown>(action: string, input: JsonObject = {}): Promise<T> {
  if (!config.apiKey) {
    throw new Error('SOCIALSUITE_API_KEY is required for API-key connector mode.');
  }

  const response = await fetch(config.agentApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, input }),
  });

  const payload = await response.json().catch(() => ({})) as { result?: T; error?: string; message?: string };
  if (!response.ok || payload.error) {
    throw new Error(payload.error || payload.message || `SocialSuite Agent API ${action} failed.`);
  }

  return payload.result as T;
}

export function textResult(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}
