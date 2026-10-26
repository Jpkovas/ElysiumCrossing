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
