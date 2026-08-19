import { callAgentApi } from './gateway.js';

const me = await callAgentApi('whoami', {});

console.log(
  JSON.stringify(
    {
      ok: true,
      me,
    },
    null,
    2,
  ),
);
