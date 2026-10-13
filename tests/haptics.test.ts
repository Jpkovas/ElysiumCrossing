import { test, type TestContext } from 'node:test';
import { strict as assert } from 'node:assert';
import type { HapticKind } from '../web/haptics.ts';

type Haptics = typeof import('../web/haptics.ts');
let moduleId = 0;
async function fixture(t: TestContext, options: { device?: boolean; activated?: boolean; gamepad?: boolean; saved?: boolean } = {}) {
  const calls: (number | number[])[] = [];
  const effects: GamepadEffectParameters[] = [];
  const preferences = new Map<string, string>();
  if (options.saved !== undefined) preferences.set('elysium.haptics.enabled', String(options.saved));
  const browser = new EventTarget();
  const doc = new EventTarget() as EventTarget & { visibilityState: string };
  doc.visibilityState = 'visible';
  let time = 100;
  let nextTimer = 1;
  let resetCount = 0;
  let response: GamepadHapticsResult | Error = 'complete';
  const timers = new Map<number, { at: number; fn: () => void }>();
  const actuator = {
    effects: ['dual-rumble'],
    playEffect(type: string, params: GamepadEffectParameters) {
      assert.equal(type, 'dual-rumble'); effects.push({ ...params });
      return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
    },
    reset() { resetCount++; return Promise.resolve('complete'); },
  };
  const nav = {
    userActivation: { hasBeenActive: options.activated ?? true },
    getGamepads: () => options.gamepad ? [{ connected: true, vibrationActuator: actuator }] : [],
    vibrate: options.device === false ? undefined : (pattern: number | number[]) => { calls.push(pattern); return true; },
  };
  for (const [key, value] of Object.entries({ navigator: nav, document: doc, window: browser,
    localStorage: { getItem: (key: string) => preferences.get(key) ?? null, setItem: (key: string, value: string) => preferences.set(key, value) },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  t.mock.method(performance, 'now', () => time);
  t.mock.method(globalThis, 'setTimeout', (fn: () => void, delay: number) => {
    const id = nextTimer++; timers.set(id, { at: time + delay, fn }); return id;
  });
  t.mock.method(globalThis, 'clearTimeout', (id: number) => { timers.delete(id); });
  const h: Haptics = await import(`../web/haptics.ts?case=${moduleId++}`);
  t.after(() => h.stopHaptics());
  function advance(ms: number) {
    const until = time + ms;
    for (;;) {
      const next = [...timers.entries()].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      time = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    time = until;
  }
  function storage(value: boolean) {
    preferences.set('elysium.haptics.enabled', String(value));
    const event = new Event('storage'); Object.defineProperty(event, 'key', { value: 'elysium.haptics.enabled' }); browser.dispatchEvent(event);
  }
  return { h, nav, doc, browser, calls, effects, timers, preferences, storage, advance,
    resets: () => resetCount, outcome: (value: GamepadHapticsResult | Error) => { response = value; } };
}
async function settle() { await Promise.resolve(); await Promise.resolve(); }

test('six interface patterns stay distinct, short and explicitly accepted by the Vibration API', async t => {
  const f = await fixture(t);
  const expected: Record<HapticKind, number[]> = { press: [7], confirm: [10, 22, 14], context: [12], pickup: [9, 18, 14], impact: [22], reward: [10, 30, 16, 30, 24] };
  for (const kind of Object.keys(expected) as HapticKind[]) {
    assert.deepEqual(f.h.pulseHaptic(kind), { status: 'accepted', transport: 'device' });
    assert.deepEqual(f.calls.at(-1), expected[kind]);
    assert(expected[kind].reduce((a, b) => a + b, 0) <= 120);
    assert(expected[kind].filter((_, index) => index % 2 === 0).reduce((a, b) => a + b, 0) <= 50);
    f.advance(150);
  }
});

test('absent Safari-style API is unavailable and unactivated device requests are blocked', async t => {
  const absent = await fixture(t, { device: false });
  assert.equal(absent.h.getHapticsState().available, false);
  assert.equal(absent.h.pulseHaptic('press').status, 'unavailable');
  assert.equal(absent.timers.size, 0); assert.equal(absent.calls.length, 0);
});

test('Vibration API requires actual sticky activation and does not invent a successful result', async t => {
  const f = await fixture(t, { activated: false });
  assert.equal(f.h.getHapticsState().hasActivation, false);
  assert.equal(f.h.pulseHaptic('press').status, 'blocked'); assert.equal(f.calls.length, 0);
  f.nav.userActivation.hasBeenActive = true; f.advance(40);
  f.nav.vibrate = () => false;
  assert.equal(f.h.pulseHaptic('press').status, 'blocked');
});

test('disabled local preference blocks effects, persists the new value and stops an active effect', async t => {
  const f = await fixture(t, { saved: false });
  assert.equal(f.h.getHapticsState().enabled, false);
  assert.equal(f.h.nativeMotor(true).status, 'disabled'); assert.equal(f.calls.length, 0);
  f.h.setHapticsEnabled(true); f.h.pulseHaptic('context');
  assert.deepEqual(f.calls.at(-1), [12]);
  f.h.setHapticsEnabled(false);
  assert.equal(f.preferences.get('elysium.haptics.enabled'), 'false'); assert.equal(f.calls.at(-1), 0);
  f.advance(40); assert.equal(f.h.pulseHaptic('reward').status, 'disabled');
});

test('native rumble follows on/off edges with a subtle duration cap and never repeats a held command', async t => {
  const f = await fixture(t);
  assert.equal(f.h.nativeMotor(false).status, 'suppressed');
  for (let i = 0; i < 120; i++) f.h.nativeMotor(true);
  assert.deepEqual(f.calls, [[40]]);
  for (let i = 0; i < 120; i++) f.h.nativeMotor(false);
  assert.deepEqual(f.calls, [[40], 0]);
  f.h.nativeMotor(true); f.h.pulseHaptic('context'); const count = f.calls.length;
  f.h.nativeMotor(false); assert.equal(f.calls.length, count, 'native stop must preserve later interface feedback');
});

test('connected gamepad uses low dual-rumble magnitudes and a real promise result, without vibrating both devices', async t => {
  const f = await fixture(t, { gamepad: true, activated: false });
  assert.equal(f.h.getHapticsState().gamepad, true);
  assert.equal(f.h.pulseHaptic('reward').status, 'requested'); assert.equal(f.calls.length, 0);
  await settle(); f.advance(110); await settle();
  assert.deepEqual(f.effects.map(effect => effect.duration), [10, 16, 24]);
  assert(f.effects.every(effect => effect.weakMagnitude! <= 0.28 && effect.strongMagnitude! <= 0.20 && effect.startDelay === 0));
  assert.equal(f.h.getHapticsState().lastResult.status, 'complete');
});

test('hidden document, pagehide and stop cancel both the gamepad and pending pattern segments', async t => {
  const f = await fixture(t, { gamepad: true });
  f.h.pulseHaptic('reward'); assert.equal(f.effects.length, 1); assert.equal(f.timers.size, 1);
  f.doc.visibilityState = 'hidden'; f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.resets(), 1); assert.equal(f.timers.size, 0);
  f.advance(200); assert.equal(f.effects.length, 1); assert.equal(f.h.pulseHaptic('impact').status, 'blocked');
  f.doc.visibilityState = 'visible'; f.advance(40); f.h.pulseHaptic('confirm');
  f.browser.dispatchEvent(new Event('pagehide')); f.advance(200); assert.equal(f.effects.length, 2);
});

test('actuator rejects and preemption are reported honestly and cancel later segments', async t => {
  const f = await fixture(t, { gamepad: true, device: false });
  f.outcome(new DOMException('No dual-rumble motor', 'NotSupportedError'));
  assert.equal(f.h.pulseHaptic('reward').status, 'requested'); await settle();
  assert.equal(f.h.getHapticsState().lastResult.status, 'failed');
  assert.match(f.h.getHapticsState().lastResult.error!, /No dual-rumble/);
  assert.equal(f.h.getHapticsState().available, false); assert.equal(f.timers.size, 0);
});

test('preempted gamepad effect cannot revive its remaining pulses', async t => {
  const f = await fixture(t, { gamepad: true }); f.outcome('preempted');
  f.h.pulseHaptic('reward'); await settle(); f.advance(200);
  assert.equal(f.effects.length, 1); assert.equal(f.h.getHapticsState().lastResult.status, 'preempted');
});

test('storage preference synchronizes parent and iframe state, stops feedback and notifies subscribers', async t => {
  const f = await fixture(t); const notifications: boolean[] = [];
  const unsubscribe = f.h.subscribeHaptics(state => notifications.push(state.enabled));
  f.h.nativeMotor(true); f.storage(false);
  assert.equal(f.h.getHapticsState().enabled, false); assert.equal(f.calls.at(-1), 0); assert.equal(notifications.at(-1), false);
  f.storage(true); assert.equal(f.h.getHapticsState().enabled, true); assert.equal(notifications.at(-1), true);
  unsubscribe(); const count = notifications.length; f.storage(false); assert.equal(notifications.length, count);
});

test('rapid duplicate interface actions are coalesced instead of issuing excess API calls', async t => {
  const f = await fixture(t); f.h.pulseHaptic('press');
  for (let i = 0; i < 60; i++) assert.equal(f.h.pulseHaptic('press').status, 'suppressed');
  assert.deepEqual(f.calls, [[7]]); f.advance(40); assert.equal(f.h.pulseHaptic('press').status, 'accepted');
});

test('confirmed pickup or reward can replace a generic button pulse in the same native frame', async t => {
  const f = await fixture(t);
  f.h.pulseHaptic('press'); f.advance(16);
  assert.equal(f.h.pulseHaptic('pickup').status, 'accepted');
  assert.deepEqual(f.calls.at(-1), [9, 18, 14]);
  assert.equal(f.h.pulseHaptic('pickup').status, 'suppressed');
  f.advance(16);
  assert.equal(f.h.pulseHaptic('reward').status, 'accepted');
  assert.deepEqual(f.calls.at(-1), [10, 30, 16, 30, 24]);
});
