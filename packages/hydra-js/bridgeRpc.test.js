import { jest } from '@jest/globals';
import { BridgeRPC } from './bridgeRpc.js';

test('resolves a request when the matching response arrives', async () => {
  const sent = [];
  const rpc = new BridgeRPC({ send: (msg) => sent.push(msg) });

  const promise = rpc.request('content.get', { path: '/news' });

  expect(sent).toHaveLength(1);
  expect(sent[0].type).toBe('BACKEND_REQUEST');
  expect(sent[0].intent).toBe('content.get');
  expect(sent[0].args).toEqual({ path: '/news' });
  expect(typeof sent[0].requestId).toBe('string');

  rpc.handleMessage({
    type: 'BACKEND_RESPONSE',
    requestId: sent[0].requestId,
    ok: true,
    result: { title: 'News' },
  });

  await expect(promise).resolves.toEqual({ title: 'News' });
});

test('ignores a response with an unknown requestId', () => {
  const rpc = new BridgeRPC({ send: () => {} });
  expect(() =>
    rpc.handleMessage({ type: 'BACKEND_RESPONSE', requestId: 'nope', ok: true }),
  ).not.toThrow();
});

test('rejects when no response arrives before the timeout', async () => {
  jest.useFakeTimers();
  const rpc = new BridgeRPC({ send: () => {} });
  const promise = rpc.request('content.get', {}, { timeoutMs: 1000 });
  const assertion = expect(promise).rejects.toMatchObject({
    code: 'TIMEOUT',
    intent: 'content.get',
  });
  jest.advanceTimersByTime(1001);
  await assertion;
  jest.useRealTimers();
});

test('clears the timer when a response arrives', async () => {
  jest.useFakeTimers();
  const sent = [];
  const rpc = new BridgeRPC({ send: (m) => sent.push(m) });
  const promise = rpc.request('content.get', {}, { timeoutMs: 1000 });
  rpc.handleMessage({
    type: 'BACKEND_RESPONSE',
    requestId: sent[0].requestId,
    ok: true,
    result: 1,
  });
  await expect(promise).resolves.toBe(1);
  expect(rpc.pending.size).toBe(0);
  jest.advanceTimersByTime(5000); // must not throw an unhandled rejection
  jest.useRealTimers();
});

test('asset.upload gets a longer default timeout than content.get', () => {
  const rpc = new BridgeRPC({ send: () => {} });
  expect(rpc.timeoutFor('asset.upload')).toBeGreaterThan(
    rpc.timeoutFor('content.get'),
  );
});

test('rejects with a structured error when ok is false', async () => {
  const sent = [];
  const rpc = new BridgeRPC({ send: (m) => sent.push(m) });
  const promise = rpc.request('content.get', { path: '/missing' });
  rpc.handleMessage({
    type: 'BACKEND_RESPONSE',
    requestId: sent[0].requestId,
    ok: false,
    error: { code: 'NOT_FOUND', status: 404, message: 'No such resource' },
  });
  await expect(promise).rejects.toMatchObject({
    code: 'NOT_FOUND',
    status: 404,
    message: 'No such resource',
  });
});

test('exposes the raw flag alongside the result', async () => {
  const sent = [];
  const rpc = new BridgeRPC({ send: (m) => sent.push(m) });
  const promise = rpc.request('http', { op: 'get', path: '/news' });
  rpc.handleMessage({
    type: 'BACKEND_RESPONSE',
    requestId: sent[0].requestId,
    ok: true,
    raw: true,
    result: { '@id': 'http://x/news' },
  });
  const res = await promise;
  expect(res).toEqual({ '@id': 'http://x/news' });
  expect(rpc.lastResponseWasRaw).toBe(true);
});

const fakeAdapter = {
  name: 'fake',
  capabilities: ['content'],
  async dispatch(intent, args) {
    if (intent === 'content.get') return { title: 'ok', path: args.path };
    const e = new Error('unsupported');
    e.code = 'NOT_IMPLEMENTED';
    throw e;
  },
};

test('serves a request from the registered adapter', async () => {
  const sent = [];
  const rpc = new BridgeRPC({ send: (m) => sent.push(m) });
  rpc.serve(fakeAdapter);

  await rpc.handleMessage({
    type: 'BACKEND_REQUEST',
    requestId: 'r1',
    intent: 'content.get',
    args: { path: '/a' },
  });

  expect(sent[0]).toEqual({
    type: 'BACKEND_RESPONSE',
    requestId: 'r1',
    ok: true,
    raw: false,
    result: { title: 'ok', path: '/a' },
  });
});

test('converts an adapter throw into an error response', async () => {
  const sent = [];
  const rpc = new BridgeRPC({ send: (m) => sent.push(m) });
  rpc.serve(fakeAdapter);

  await rpc.handleMessage({
    type: 'BACKEND_REQUEST',
    requestId: 'r2',
    intent: 'workflow.get',
    args: {},
  });

  expect(sent[0].ok).toBe(false);
  expect(sent[0].error.code).toBe('NOT_IMPLEMENTED');
});

test('replies NO_ADAPTER when nothing is registered', async () => {
  const sent = [];
  const rpc = new BridgeRPC({ send: (m) => sent.push(m) });
  await rpc.handleMessage({
    type: 'BACKEND_REQUEST',
    requestId: 'r3',
    intent: 'content.get',
    args: {},
  });
  expect(sent[0].error.code).toBe('NO_ADAPTER');
});
