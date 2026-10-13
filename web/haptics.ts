/** Local, subtle feedback through the browser's actual vibration APIs. */
export type HapticKind = 'press' | 'confirm' | 'context' | 'pickup' | 'impact' | 'reward';
export type HapticResult = {
  status: 'idle' | 'accepted' | 'requested' | 'complete' | 'preempted' | 'blocked' |
    'disabled' | 'unavailable' | 'suppressed' | 'stopped' | 'failed';
  transport: 'device' | 'gamepad' | null;
  error?: string;
};
export type HapticsState = {
  enabled: boolean;
  available: boolean;
  device: boolean;
  gamepad: boolean;
  hasActivation: boolean;
  lastResult: HapticResult;
};

type Pattern = { durations: readonly number[]; weak: number; strong: number };
const patterns: Record<HapticKind, Pattern> = {
  press: { durations: [7], weak: 0.12, strong: 0 },
  confirm: { durations: [10, 22, 14], weak: 0.20, strong: 0.06 },
  context: { durations: [12], weak: 0.18, strong: 0.05 },
  pickup: { durations: [9, 18, 14], weak: 0.19, strong: 0.08 },
  impact: { durations: [22], weak: 0.28, strong: 0.20 },
  reward: { durations: [10, 30, 16, 30, 24], weak: 0.22, strong: 0.08 },
};
const nativePattern: Pattern = { durations: [40], weak: 0.18, strong: 0.09 };
const storageKey = 'elysium.haptics.enabled';
let initialized = false;
let enabled = true;
let nativeOn = false;
let sequence = 0;
let activeOrigin: 'native' | 'interface' | null = null;
let activeActuator: GamepadHapticActuator | null = null;
let activeDevice = false;
let lastInterfacePulse = -Infinity;
let lastInterfaceKind: HapticKind | null = null;
let lastResult: HapticResult = { status: 'idle', transport: null };
const timers = new Set<ReturnType<typeof setTimeout>>();
const listeners = new Set<(state: HapticsState) => void>();
const unsupportedActuators = new WeakSet<GamepadHapticActuator>();

// The effects field is in the W3C IDL and is not yet in this TypeScript lib.dom.
type RumbleActuator = GamepadHapticActuator & { readonly effects?: readonly GamepadHapticEffectType[] };
function controllerActuator(): GamepadHapticActuator | null {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return null;
  try {
    for (const controller of navigator.getGamepads()) {
      const actuator = controller?.connected ? controller.vibrationActuator as RumbleActuator | undefined : undefined;
      if (actuator && !unsupportedActuators.has(actuator) && typeof actuator.playEffect === 'function' && typeof actuator.reset === 'function' &&
          (!actuator.effects || actuator.effects.includes('dual-rumble'))) return actuator;
    }
  } catch { /* A document policy can deny gamepad enumeration. */ }
  return null;
}
function readPreference(): boolean {
  try { return localStorage.getItem(storageKey) !== 'false'; }
  catch { return true; }
}
function visible(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible';
}
function activated(): boolean {
  return typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive === true;
}
function initialize(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  enabled = readPreference();
  document.addEventListener('visibilitychange', () => { if (!visible()) stopHaptics(); });
  window.addEventListener('pagehide', stopHaptics);
  window.addEventListener('gamepadconnected', notify);
  window.addEventListener('gamepaddisconnected', () => { stopHaptics(); notify(); });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    enabled = readPreference();
    if (!enabled) stopHaptics();
    notify();
  });
  window.addEventListener('pointerdown', notify, { passive: true });
  window.addEventListener('keydown', notify);
}
export function getHapticsState(): HapticsState {
  initialize();
  const device = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const gamepad = controllerActuator() !== null;
  return { enabled, available: device || gamepad, device, gamepad, hasActivation: activated(), lastResult: { ...lastResult } };
}
function notify(): void { for (const listener of listeners) listener(getHapticsState()); }
function result(value: HapticResult): HapticResult { lastResult = value; notify(); return { ...value }; }
export function subscribeHaptics(listener: (state: HapticsState) => void): () => void {
  initialize(); listeners.add(listener); listener(getHapticsState());
  return () => { listeners.delete(listener); };
}
export function setHapticsEnabled(value: boolean): HapticsState {
  initialize(); enabled = value;
  try { localStorage.setItem(storageKey, String(value)); } catch { /* Session preference still applies. */ }
  if (!enabled) stopHaptics();
  notify(); return getHapticsState();
}
function clearPattern(): void {
  sequence++;
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
}
function stopHardware(): void {
  clearPattern();
  if (activeDevice && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(0); } catch { /* A disappearing document can reject cancellation. */ }
  }
  if (activeActuator) {
    try { void activeActuator.reset().catch(() => {}); } catch { /* Disconnected controller. */ }
  }
  activeActuator = null; activeDevice = false; activeOrigin = null;
}
export function stopHaptics(): void {
  initialize(); stopHardware(); nativeOn = false;
  result({ status: 'stopped', transport: null });
}
function later(callback: () => void, delay: number): void {
  const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
  timers.add(timer);
}
function play(pattern: Pattern, origin: 'native' | 'interface'): HapticResult {
  initialize();
  if (!enabled) return result({ status: 'disabled', transport: null });
  if (!visible()) return result({ status: 'blocked', transport: null });
  const actuator = controllerActuator();
  const device = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  if (!actuator && !device) return result({ status: 'unavailable', transport: null });
  // Vibration needs sticky activation. A reported gamepad already requires its
  // own controller gesture; the browser adjudicates playEffect capability.
  if (!actuator && !activated()) return result({ status: 'blocked', transport: 'device' });
  stopHardware(); activeOrigin = origin;
  const ownSequence = sequence;
  if (!actuator) {
    activeDevice = true;
    try {
      const accepted = navigator.vibrate([...pattern.durations]);
      return result({ status: accepted ? 'accepted' : 'blocked', transport: 'device' });
    } catch (error) {
      return result({ status: 'failed', transport: 'device', error: String(error) });
    }
  }
  activeActuator = actuator;
  result({ status: 'requested', transport: 'gamepad' });
  function segment(index: number): void {
    if (sequence !== ownSequence || !enabled || !visible()) return;
    const duration = pattern.durations[index];
    try {
      void actuator!.playEffect('dual-rumble', {
        duration, startDelay: 0, weakMagnitude: pattern.weak, strongMagnitude: pattern.strong,
      }).then(status => {
        if (sequence !== ownSequence) return;
        if (status === 'preempted') {
          clearPattern(); activeActuator = null; activeOrigin = null;
          result({ status, transport: 'gamepad' });
        } else if (index === pattern.durations.length - 1) result({ status, transport: 'gamepad' });
      }).catch(error => {
        if (sequence !== ownSequence) return;
        if (error instanceof DOMException && error.name === 'NotSupportedError') unsupportedActuators.add(actuator!);
        stopHardware(); result({ status: 'failed', transport: 'gamepad', error: String(error) });
      });
    } catch (error) {
      stopHardware(); result({ status: 'failed', transport: 'gamepad', error: String(error) }); return;
    }
    if (index + 2 < pattern.durations.length) later(() => segment(index + 2), duration + pattern.durations[index + 1]);
  }
  segment(0);
  return { ...lastResult };
}
export function pulseHaptic(kind: HapticKind): HapticResult {
  const now = performance.now();
  if (kind === lastInterfaceKind && now - lastInterfacePulse < 35) return result({ status: 'suppressed', transport: null });
  lastInterfacePulse = now; lastInterfaceKind = kind;
  return play(patterns[kind], 'interface');
}
/** Source on/off edges preserve native event rhythms; sustained on is capped at 40 ms. */
export function nativeMotor(on: boolean): HapticResult {
  initialize();
  if (nativeOn === on) return { status: 'suppressed', transport: null };
  nativeOn = on;
  if (on) return play(nativePattern, 'native');
  if (activeOrigin === 'native') { stopHardware(); return result({ status: 'stopped', transport: null }); }
  return { status: 'suppressed', transport: null };
}
