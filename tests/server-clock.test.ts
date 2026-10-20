import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ServerClock } from '../web/server-clock.ts';

test('server calendar survives device clock jumps and resynchronizes from a renewed lease', () => {
  let elapsed = 500;
  const clock = new ServerClock(() => elapsed);
  const serverTime = 1791505098000;
  clock.sync(serverTime);
  const originalNow = Date.now;
  try {
    Date.now = () => serverTime + 30 * 86400000;
    elapsed += 1000;
    assert.equal(clock.now(), serverTime + 1000);
    Date.now = () => serverTime - 30 * 86400000;
    elapsed += 29_000;
    assert.equal(clock.now(), serverTime + 30_000);
    clock.sync(serverTime + 120_000); // Fresh authority after a backgrounded phone returns.
    elapsed += 2000;
    assert.equal(clock.now(), serverTime + 122_000);
  } finally { Date.now = originalNow; }
});

test('missing or invalid server time cannot silently use the local device calendar', () => {
  const clock = new ServerClock();
  assert.throws(() => clock.now());
  for (const invalid of [NaN, Infinity, -Infinity, 0, 946684799999]) assert.throws(() => clock.sync(invalid));
});

test('delayed lease and heartbeat samples never rewind the calendar after a newer authority sample', () => {
  let elapsed = 0;
  const clock = new ServerClock(() => elapsed);
  const epoch = 1791505098000;
  clock.sync(epoch);
  elapsed = 5_000;
  clock.sync(epoch + 5_000); // Fresh heartbeat arrives before an older HTTP response.
  elapsed = 5_800;
  const before = clock.now();
  clock.sync(epoch + 4_000); // Lease response generated 1.8 seconds before receipt.
  assert.equal(clock.now(), before, 'an older response must not move calendar or fishing time backwards');
  elapsed = 6_400;
  assert.equal(clock.now(), epoch + 6_400);
  clock.sync(epoch + 6_200); // Even the latest response has transit latency.
  assert.equal(clock.now(), epoch + 6_400);
  clock.sync(epoch + 7_000); // Fresh authority can still correct a stopped device clock forward.
  assert.equal(clock.now(), epoch + 7_000);
});

test('a stalled frame or hidden-tab scheduler does not stall authoritative elapsed time', () => {
  let elapsed = 0;
  const clock = new ServerClock(() => elapsed);
  const epoch = 1791505098000;
  clock.sync(epoch);
  elapsed = 250;
  assert.equal(clock.now(), epoch + 250);
  elapsed = 125_250; // No render/timer callbacks ran for two minutes.
  assert.equal(clock.now(), epoch + 125_250);
  clock.sync(epoch + 125_000);
  assert.equal(clock.now(), epoch + 125_250);
  elapsed += 250.5;
  assert.equal(clock.now(), epoch + 125_500.5, 'retain sub-second precision for fishing presentation');
});
