/**
 * @file room-transport.subscribe.test.mjs
 * Unit tests for subscribeRoom's control flow, using a MOCK Supabase client (no network). The
 * logic is driven by hand; the catch-up/timer cases use short real timers, so those are mildly
 * timing-based. These cover the paths the real-Realtime integration test cannot drive reliably:
 * the connect delivery + the catch-up re-read, a change event triggering a read, a FAILED read
 * being reported to onError while a change queued during it still re-reads (coalescing), each failed
 * subscription STATUS (CHANNEL_ERROR / TIMED_OUT / unexpected CLOSED) being reported, a throwing
 * onRoomChange being swallowed (feed survives), a pending catch-up timer being cancelled on
 * unsubscribe and replaced on re-SUBSCRIBED, a late SUBSCRIBED/change after unsubscribe being
 * ignored (no leaked fetch, checked via the RPC count), and unsubscribe halting callbacks.
 *
 *     node --test room-transport.subscribe.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoomTransport } from './room-transport.js';

const DEPS = { randomBytes: () => [0, 0, 0, 0, 0, 0], now: () => 0 };
const CODE = 'ABC234';
const ROOM_ROW = {
  code: CODE, type: 'rhythm-dictation', teacher_uid: 't', created: '2026-07-10T00:00:00Z',
  teacher_last_seen: '2026-07-10T00:00:00Z', meter: { timeSignature: '4/4', beatsPerMeasure: [4], beatUnit: 'quarter' },
  bars: 1, tempo: 100, figures: { quarter: 1 }, rhythm: null, state: 'lobby', revealed: [],
};
const OK = { data: { room: ROOM_ROW, students: [], answers: [] }, error: null };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A mock Supabase client exposing only what subscribeRoom + fetchRoom touch. `rpc` supplies the
// get_room result; fireStatus / fireChange drive the subscription callbacks by hand.
function makeMock({ rpc }) {
  let statusCb = null, removed = false, rpcCalls = 0;
  const handlers = [];
  const channel = {
    on(_evt, _cfg, handler) { handlers.push(handler); return channel; },
    subscribe(cb) { statusCb = cb; return channel; },
  };
  return {
    client: {
      channel: () => channel,
      removeChannel: async () => { removed = true; return 'ok'; },
      rpc: (n, a) => { rpcCalls += 1; return rpc(n, a); },
    },
    fireStatus: (s, e) => statusCb(s, e),
    fireChange: () => handlers[0](),
    get removed() { return removed; },
    get rpcCalls() { return rpcCalls; },
  };
}

test('delivers current state on connect and does one catch-up re-read', async () => {
  const mock = makeMock({ rpc: async () => OK });
  const rooms = [];
  const unsub = createRoomTransport(mock.client, DEPS).subscribeRoom(CODE, (r) => rooms.push(r), { catchUpMs: 20 });
  mock.fireStatus('SUBSCRIBED');
  await sleep(10);
  assert.equal(rooms.length, 1, 'connect delivered the current state');
  assert.equal(rooms[0].state, 'lobby');
  await sleep(40);
  assert.equal(rooms.length, 2, 'one catch-up re-read fired');
  await unsub();
  assert.ok(mock.removed, 'unsubscribe removed the channel');
});

test('a change event triggers a re-read', async () => {
  const mock = makeMock({ rpc: async () => OK });
  const rooms = [];
  const unsub = createRoomTransport(mock.client, DEPS).subscribeRoom(CODE, (r) => rooms.push(r), { catchUpMs: 0 });
  mock.fireStatus('SUBSCRIBED');
  await sleep(10);
  assert.equal(rooms.length, 1);
  mock.fireChange();
  await sleep(10);
  assert.equal(rooms.length, 2, 'the change event delivered a fresh read');
  await unsub();
});

test('a failed read is reported to onError, and a change queued during it still re-reads', async () => {
  let call = 0, resolveFirst;
  const mock = makeMock({
    rpc: () => {
      call += 1;
      if (call === 1) return new Promise((res) => { resolveFirst = res; }); // first read: pending
      return Promise.resolve(OK);                                            // later reads: succeed
    },
  });
  const rooms = [], errs = [];
  const unsub = createRoomTransport(mock.client, DEPS)
    .subscribeRoom(CODE, (r) => rooms.push(r), { catchUpMs: 0, onError: (e) => errs.push(e) });
  mock.fireStatus('SUBSCRIBED');   // → first read, left pending
  await sleep(10);
  assert.equal(call, 1, 'first read is in flight');
  mock.fireChange();               // arrives mid-read → coalesced (again = true)
  resolveFirst({ data: null, error: { message: 'boom' } }); // first read fails
  await sleep(20);
  assert.equal(errs.length, 1, 'the failed read was reported, not swallowed');
  assert.equal(call, 2, 'the change queued during the failed read still triggered a retry read');
  assert.equal(rooms.length, 1, 'the retry read delivered state');
  await unsub();
});

for (const status of ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']) {
  test(`a ${status} subscription status is reported to onError (caller is not left hanging)`, async () => {
    const mock = makeMock({ rpc: async () => OK });
    const errs = [];
    const unsub = createRoomTransport(mock.client, DEPS)
      .subscribeRoom(CODE, () => {}, { catchUpMs: 0, onError: (e) => errs.push(e) });
    mock.fireStatus(status, new Error('x'));
    await sleep(10);
    assert.equal(errs.length, 1, `${status} was reported`);
    await unsub();
  });
}

test('a throwing onRoomChange is swallowed AND the change it queued still re-reads (coalescing)', async () => {
  const mock = makeMock({ rpc: async () => OK });
  let n = 0;
  const rooms = [];
  const unsub = createRoomTransport(mock.client, DEPS).subscribeRoom(CODE, (r) => {
    n += 1;
    if (n === 1) { mock.fireChange(); throw new Error('callback bug'); } // queue a change mid-loop, then throw
    rooms.push(r);
  }, { catchUpMs: 0 });
  mock.fireStatus('SUBSCRIBED'); // read 1 delivers -> callback queues a change then throws (swallowed)
  await sleep(20);
  // The broken version would exit the loop on the throw WITHOUT honouring the queued change: rooms stays [].
  assert.equal(rooms.length, 1, 'the change queued during the throwing callback was still re-read and delivered');
  await unsub();
});

test('unsubscribe cancels a still-pending catch-up timer', async () => {
  const mock = makeMock({ rpc: async () => OK });
  const unsub = createRoomTransport(mock.client, DEPS).subscribeRoom(CODE, () => {}, { catchUpMs: 100 });
  mock.fireStatus('SUBSCRIBED'); // initial read + schedules a catch-up timer 100ms out
  await sleep(10);               // timer still pending
  await unsub();
  const calls = mock.rpcCalls;
  await sleep(140);              // past the 100ms delay
  assert.equal(mock.rpcCalls, calls, 'the pending catch-up timer did not fire after unsubscribe');
});

test('a second SUBSCRIBED replaces a still-pending catch-up timer (only one fires)', async () => {
  const mock = makeMock({ rpc: async () => OK });
  const unsub = createRoomTransport(mock.client, DEPS).subscribeRoom(CODE, () => {}, { catchUpMs: 60 });
  mock.fireStatus('SUBSCRIBED'); // schedules timer A (60ms)
  await sleep(10);
  mock.fireStatus('SUBSCRIBED'); // replaces A with a fresh timer (A must be cleared)
  await sleep(10);
  const before = mock.rpcCalls;  // both initial reads have settled; no catch-up has fired yet
  await sleep(120);              // both would-be delays elapse
  assert.equal(mock.rpcCalls, before + 1, 'exactly one catch-up fetch fired (the replacement, not both)');
  await unsub();
});

test('after unsubscribe, a late SUBSCRIBED or change event is ignored — no fetch', async () => {
  const mock = makeMock({ rpc: async () => OK });
  const unsub = createRoomTransport(mock.client, DEPS).subscribeRoom(CODE, () => {}, { catchUpMs: 20 });
  mock.fireStatus('SUBSCRIBED');
  await sleep(40);               // the initial read + the catch-up have happened
  await unsub();
  const calls = mock.rpcCalls;   // RPC count catches a leaked fetch even though closed suppresses delivery
  mock.fireStatus('SUBSCRIBED'); // a late status callback after unsubscribe...
  mock.fireChange();             // ...and a late change event...
  await sleep(40);               // ...neither may fetch or schedule a new catch-up timer
  assert.equal(mock.rpcCalls, calls, 'no fetch after unsubscribe (late status or change)');
});

test('after unsubscribe, no further callbacks', async () => {
  const mock = makeMock({ rpc: async () => OK });
  const rooms = [];
  const unsub = createRoomTransport(mock.client, DEPS).subscribeRoom(CODE, (r) => rooms.push(r), { catchUpMs: 0 });
  mock.fireStatus('SUBSCRIBED');
  await sleep(10);
  const n = rooms.length;
  await unsub();
  assert.ok(mock.removed);
  mock.fireChange();
  await sleep(10);
  assert.equal(rooms.length, n, 'no callback after unsubscribe');
});
