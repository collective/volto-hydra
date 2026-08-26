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
