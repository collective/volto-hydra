import { BaseAdapter, AdapterError } from './baseAdapter.js';

class Stub extends BaseAdapter {
  constructor(responses) {
    super({ name: 'stub', capabilities: ['content'] });
    this.responses = responses;
    this.calls = 0;
  }

  async fetchJson() {
    this.calls++;
    const r = this.responses.shift();
    if (r instanceof Error) throw r;
    return r;
  }

  async dispatch(intent) {
    return this.withAuthRetry(() => this.fetchJson(intent));
  }
}

test('re-runs the call once after a 401 and succeeds', async () => {
  const unauth = new AdapterError('Unauthorized', {
    code: 'UNAUTHORIZED',
    status: 401,
  });
  const a = new Stub([unauth, { ok: 1 }]);
  await a.init({ cmsBaseUrl: 'http://x', emit: () => {} });
  await expect(a.dispatch('content.get')).resolves.toEqual({ ok: 1 });
  expect(a.calls).toBe(2);
});

test('emits auth-required and rethrows when the retry also 401s', async () => {
  const events = [];
  const unauth = () =>
    new AdapterError('Unauthorized', { code: 'UNAUTHORIZED', status: 401 });
  const a = new Stub([unauth(), unauth()]);
  await a.init({ cmsBaseUrl: 'http://x', emit: (e, p) => events.push([e, p]) });
  await expect(a.dispatch('content.get')).rejects.toMatchObject({ status: 401 });
  expect(events.map(([e]) => e)).toContain('auth-required');
});

test('does not retry a non-401 error', async () => {
  const a = new Stub([
    new AdapterError('Boom', { code: 'SERVER_ERROR', status: 500 }),
  ]);
  await a.init({ cmsBaseUrl: 'http://x', emit: () => {} });
  await expect(a.dispatch('content.get')).rejects.toMatchObject({ status: 500 });
  expect(a.calls).toBe(1);
});

test('rejects an unsupported intent with NOT_IMPLEMENTED', async () => {
  const a = new BaseAdapter({ name: 'bare', capabilities: [] });
  await expect(a.dispatch('workflow.get', {})).rejects.toMatchObject({
    code: 'NOT_IMPLEMENTED',
  });
});
