import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { FishingClient } from '../web/fishing-client.ts';
import { WorldClient, type WorldSocket } from '../web/world-client.ts';
import { WORLD_SCENE } from '../shared/world.ts';
import { CHECKPOINT_TOWN_BYTES, type NativeGame, type NativeFishingState } from '../shared/contracts.ts';
import type { FishingCast, FishingOperation, FishingOperationResult, FishingSnapshot, NativeFishingRequest } from '../shared/fishing.ts';

const pid = '12'.repeat(20), identity = { pid, townIdentity: '12345:4f776e6572202020', gameInstance: 3, visitor: false };
function fixture(visitor = false) {
  const sent: { type: string; value: any }[] = [], calls: string[] = [], errors: string[] = [], started: string[] = [], confirmed: string[] = [];
  const listeners = new Map<string, Set<(value: any) => void>>();
  const socket: WorldSocket = { send(type, value) { sent.push({ type, value }); if (type === 'fishing_operation') calls.push(`send:${(value as FishingOperation).id}`); }, onMessage(type, callback) {
    const group = listeners.get(type) ?? new Set(); group.add(callback); listeners.set(type, group); return () => group.delete(callback);
  } };
  const emit = (type: string, value: any) => { for (const listener of listeners.get(type) ?? []) listener(value); };
  let requestSequence = 0;
  let own = 1, baseline = 1, online = true, scene = WORLD_SCENE, identityAvailable = true, request: NativeFishingRequest | null = null, validAdmission = true, nativeAdmission = true;
  let nativeState: NativeFishingState = { castId: '', phase: 0, fishType: -1, pending: false, result: false, gameInstance: 3, checkpointToken: 0 };
  let enabled = false, duringCommit = () => {};
  let canonicalGate: Promise<void> = Promise.resolve(), ownGate: Promise<void> = Promise.resolve();
  let lineageOverride: Partial<NonNullable<ReturnType<NativeGame['checkpointLineage']>>> | null = null, missingCollection = false;
  let ownResult = true, ownProof = true, canonicalRevision: number | null = null, canonicalInvalid = false;
  const native = {
    worldIdentity: () => identityAvailable ? { ...identity, visitor } : null, position: () => ({ x: 0, y: 0, z: 0, rotation: 0, animation: 0, rootMotionFlags: 0 as const, animation1: -1, partTable: -1, frame: 1, speed: 0.5, loop: true, item: -1, scene, character: 0, cloth: 0, skinTone: 0, faceFlags: 0, design: '' }),
    worldEnabled() {}, worldBind() {}, async worldSnapshot() {}, async worldCommit() { calls.push('worldCommit'); await Promise.resolve(); duringCommit(); },
    worldComplete() { throw new Error('Fishing cannot complete through the fruit native command'); },
    worldRequest: () => null, worldAdmission: () => null, worldResumeAdmission: () => 0,
    worldRevision: () => 1, async worldOwnCheckpoint(token: number, revision: number) {
      calls.push(`own:${token}:${revision}`); await ownGate;
      if (ownResult && ownProof && lineageOverride) lineageOverride = { ...lineageOverride, reconciledRevision: revision };
      return ownResult;
    },
    fishingEnabled(value: boolean) { enabled = value; }, fishingBind() { calls.push('bind'); }, fishingSnapshot() { calls.push('shadows'); },
    fishingCast(cast: FishingCast, sequence: number) { calls.push(`phase:${cast.phase}`); nativeState = { ...nativeState, castId: cast.id, phase: ({ waiting: 1, approaching: 2, touch: 3, bite: 4, caught: 5, released: 6, escaped: 7 })[cast.phase] };
      if (request && sequence > requestSequence && (request.kind === 1 && cast.id === request.id && cast.phase === 'waiting'
        || cast.id === request.castId && (request.kind === 5 && cast.landedAt !== null || request.kind === 2 && ['caught', 'released', 'escaped'].includes(cast.phase)))) request = null;
    },
    fishingRequest: () => request, fishingState: () => nativeState, fishingAdmissionValid: () => validAdmission,
    fishingAdmit(value: NativeFishingRequest, versions: { expectedWorldVersion: number; expectedOwnRevision: number; appliedSequence: number }) {
      calls.push(`admit-native:${value.id}:${versions.appliedSequence}`); return nativeAdmission;
    },
    fishingRestorePending(castId: string) { calls.push('restore'); if (missingCollection) throw new Error('Collection is not in RAM yet'); nativeState = { ...nativeState, castId, phase: 5, pending: true, result: true }; },
    fishingResumeCast(token: number) {
      // Native throws from the game iframe: its Error is not this realm's Error.
      if (!enabled) throw runInNewContext("new Error('O lançamento aguarda a cópia confirmada do morador.')");
      calls.push(`resume:${token}`);
    },
    fishingResult(receipt: FishingOperationResult['receipt']) { calls.push('result'); nativeState = { ...nativeState, pending: receipt.cast.pending, result: true,
      checkpointToken: receipt.cast.pending ? nativeState.checkpointToken : 0 }; },
    fishingTerminal() { calls.push('terminal'); nativeState = { ...nativeState, checkpointToken: 0 }; },
    fishingResolvePendingTerminal(castId: string, operationId: string, sequence: number, revision: number) { calls.push(`pending-terminal:${castId}:${operationId}:${sequence}:${revision}`); nativeState = { ...nativeState, checkpointToken: 0, pending: false }; },
    fishingReject(id: string) { calls.push(`reject:${id}`); request = null; nativeState = { ...nativeState, phase: 6 }; },
    checkpointLineage: () => ({ pid, ownTownIdentity: identity.townIdentity, gameInstance: 3, currentGameInstance: 3,
      pendingExitCommit: false, continueCommit: false, exitCommit: false, acknowledged: true, acceptedRevision: lineageOverride?.acceptedRevision ?? own, reconciledInstance: 3, reconciledRevision: lineageOverride?.reconciledRevision ?? own, ...lineageOverride }),
  } as unknown as NativeGame;
  const world = new WorldClient({ townId: 'home', ownTownId: visitor ? 'visitor-own' : 'home', native, gameInstance: () => 'boot', activeTownId: () => 'home',
    baselineRevision: () => baseline, ownRevision: () => own, onOwnRevision: revision => { own = revision; },
    onBaselineRevision: revision => { baseline = revision; }, onError: (message, code) => errors.push(`${code}:${message}`) });
  const fishing = new FishingClient({ world, native, townId: () => 'home', online: () => online,
    admit: () => calls.push('admit'), async canonical(revision) { calls.push('GET'); await canonicalGate; return { checkpoint: { town: new ArrayBuffer(canonicalInvalid ? 1 : CHECKPOINT_TOWN_BYTES), passport: null , nes: null }, revision: canonicalRevision ?? revision }; },
    canonicalApplied(_checkpoint, revision) { calls.push(`canonical:${revision}`); },
    onError: (message, code) => errors.push(`${code}:${message}`) });
  // Probes: an operation starts when World accepts it and is confirmed when its paired commit completes.
  const send = world.fishingOperation.bind(world), complete = fishing.complete.bind(fishing);
  world.fishingOperation = operation => { const accepted = send(operation); if (accepted) started.push(operation.id); return accepted; };
  fishing.complete = operationId => { complete(operationId); confirmed.push(operationId); };
  const initialize = async () => {
    world.connect(socket); emit('world_snapshot', { townId: 'home', version: visitor ? 1 : own, sequence: world.versions().appliedSequence, foreground: Array(80 * 96).fill(0), entities: [], watered: [], furniture: [] });
    emit('actor_snapshot', { pid, ownRevision: own, pockets: Array(15).fill(0), learnedRecipes: [], conditions: 0, wallet: 0 }); await world.settled();
    fishing.connect(socket);
    emit('fishing_snapshot', { townId: 'home', townIdentity: identity.townIdentity, sequence: 0, version: 1, serverTime: Date.now(), entities: [], cast: null, pendingOrigin: null });
  };
  function intent(kind: NativeFishingRequest['kind'], castId = '') {
    request = { id: randomUUID(), token: 17, kind, castId, slot: 0, gameInstance: 3 };
    requestSequence = world.versions().appliedSequence;
    if (kind === 1) nativeState = { ...nativeState, castId: request.id, checkpointToken: 7, result: false };
    return request;
  }
  function result(operation: FishingOperation, phase: FishingCast['phase'], credit = false): FishingOperationResult {
    const cast: FishingCast = { id: operation.kind === 'cast' ? operation.id : operation.castId, actorId: 'owner', pid,
      townId: 'home', townIdentity: identity.townIdentity, fishId: randomUUID(), generation: 1, fishType: 0, phase,
      bobber: { x: 1, y: 20, z: 2 }, touches: [], biteAt: null, biteUntil: null, createdAt: Date.now(), rodType: 0, landedAt: phase === 'waiting' ? null : Date.now(), pending: false, credited: credit };
    const revision = operation.expectedOwnRevision + (credit ? 1 : 0), sequence = operation.appliedSequence + 1;
    const worldVersion = operation.expectedWorldVersion + (credit && !visitor ? 1 : 0);
    const fishing: FishingSnapshot = { townId: 'home', townIdentity: identity.townIdentity, sequence, version: worldVersion, serverTime: Date.now(), entities: [], cast, pendingOrigin: null };
    return { world: { kind: 'fishing', townId: 'home', operationId: operation.id, sequence, version: worldVersion, tiles: [], entities: [], watered: [], furniture: [] },
      actor: { operationId: operation.id, pid, ownRevision: revision, pockets: [credit ? 8960 : 0, ...Array(14).fill(0)], learnedRecipes: [], conditions: 0, wallet: 0 }, fishing,
      receipt: { operationId: operation.id, actorId: 'owner', pid, cast, intent: '{}', credit: credit ? { fishType: 0, item: 8960, slot: 0,
        collectionWordIndex: 24, collectionWordBefore: 0, collectionWordAfter: 1 << 26, completesCollection: false } : null }, replayed: false };
  }
  async function deliver(value: FishingOperationResult) {
    emit('fishing_receipt', value); emit('world_commit', value.world); emit('actor_commit', value.actor); await world.settled();
  }
  const lastOperation = () => sent.filter(value => value.type === 'fishing_operation').at(-1)!.value as FishingOperation;
  return { initialize, fishing, world, native, calls, errors, started, confirmed, sent, emit, intent, result, deliver, lastOperation, socket,
    resetCast() { nativeState = { ...nativeState, castId: "", phase: 0, checkpointToken: 0 }; request = null; },
    token(value: number) { nativeState.checkpointToken = value; }, online(value: boolean) { online = value; }, scene(value: number) { scene = value; },
    identityAvailable(value: boolean) { identityAvailable = value; },
    admission(value: boolean) { validAdmission = value; }, nativeAdmission(value: boolean) { nativeAdmission = value; }, gate(value: Promise<void>) { canonicalGate = value; }, baseline: () => baseline,
    duringCommit(value: () => void) { duringCommit = value; },
    lineage(value: typeof lineageOverride) { lineageOverride = value; },
    ownGate(value: Promise<void>) { ownGate = value; }, ownResult(value: boolean) { ownResult = value; }, ownProof(value: boolean) { ownProof = value; },
    canonicalRevision(value: number) { canonicalRevision = value; }, canonicalInvalid() { canonicalInvalid = true; },
    async advance(revision: number) { world.acceptOwnRevision(revision); own = revision;
      emit('world_snapshot', { townId: 'home', version: visitor ? 1 : revision, sequence: world.versions().appliedSequence,
        foreground: Array(80 * 96).fill(0), entities: [], watered: [], furniture: [] });
      emit('actor_snapshot', { pid, ownRevision: revision, pockets: Array(15).fill(0), learnedRecipes: [], conditions: 0, wallet: 0 });
      await world.settled();
    }, missingCollection(value: boolean) { missingCollection = value; } };
}

test('periodic fishing snapshots during the native save scene wait for a fresh foreground binding', async () => {
  const f = fixture(); await f.initialize();
  const shadows = f.calls.filter(value => value === 'shadows').length, sent = f.sent.length;
  const snapshot: FishingSnapshot = { townId: 'home', townIdentity: identity.townIdentity, sequence: 0, version: 1,
    serverTime: Date.now(), entities: [], cast: null, pendingOrigin: null };
  f.scene(8706); f.identityAvailable(false);
  f.emit('fishing_snapshot', snapshot); f.fishing.tick();
  assert.deepEqual(f.errors, []); assert.equal(f.sent.length, sent);
  assert.equal(f.calls.filter(value => value === 'shadows').length, shadows);
  f.scene(WORLD_SCENE); f.identityAvailable(true);
  snapshot.entities = [{ id: randomUUID(), generation: 1, fishType: 0, x: 1, y: 0, z: 1, angle: 0,
    expiresAt: Date.now() + 20000, reservation: null }];
  f.emit('fishing_snapshot', snapshot);
  assert.deepEqual(f.errors, []);
  assert.equal(f.calls.filter(value => value === 'shadows').length, shadows + 1);
  f.emit('fishing_snapshot', { ...snapshot, townIdentity: 'foreign' });
  assert.equal(f.errors.length, 1); assert.match(f.errors[0]!, /^invalid_fishing_state:/);
});

test('a save-scene periodic snapshot does not retire or replace a pending fishing operation', async () => {
  const f = fixture(); await f.initialize(); f.intent(1); f.fishing.tick();
  const operation = f.lastOperation(), response = f.result(operation, 'waiting');
  f.scene(8706); f.identityAvailable(false);
  f.emit('fishing_snapshot', response.fishing);
  assert.deepEqual(f.errors, []); assert.equal(f.lastOperation().id, operation.id);
  f.scene(WORLD_SCENE); f.identityAvailable(true);
  await f.deliver(response); f.fishing.tick();
  assert.deepEqual(f.errors, []); assert.ok(f.calls.includes('resume:17'));
  assert.equal(f.sent.filter(value => value.type === 'fishing_operation').length, 1);
});

test('cast waits for the existing save admission, sends one immutable ID and resumes with the native intent token', async () => {
  const f = fixture(); await f.initialize(); const intent = f.intent(1); f.token(0); f.fishing.tick();
  assert.ok(f.calls.includes('admit')); assert.equal(f.sent.filter(value => value.type === 'fishing_operation').length, 0);
  f.token(7); f.fishing.tick(); f.fishing.tick();
  assert.equal(f.sent.filter(value => value.type === 'fishing_operation').length, 1); assert.equal(f.lastOperation().id, intent.id);
  assert.ok(f.calls.indexOf(`admit-native:${intent.id}:0`) < f.calls.indexOf(`send:${intent.id}`));
  await f.deliver(f.result(f.lastOperation(), 'waiting')); f.fishing.tick();
  assert.ok(f.calls.includes('resume:17')); assert.equal(f.calls.includes('resume:7'), false); assert.equal(f.errors.length, 0);
});

test('a periodic tick during the cast commit cannot strand the confirmed cast or pause World', async () => {
  const f = fixture(); await f.initialize(); f.intent(1); f.fishing.tick();
  f.duringCommit(() => f.fishing.tick()); // The app's position loop runs while World awaits Native.
  await f.deliver(f.result(f.lastOperation(), 'waiting'));
  assert.deepEqual(f.errors, []); assert.equal(f.world.isReady(), true); assert.equal(f.calls.includes('resume:17'), false);
  f.fishing.tick();
  assert.equal(f.calls.filter(value => value === 'resume:17').length, 1); assert.deepEqual(f.errors, []);
  f.fishing.tick(); assert.equal(f.calls.filter(value => value === 'resume:17').length, 1);
});

test('a Native error from the game iframe keeps its message', async () => {
  const f = fixture(); await f.initialize(); f.intent(1); f.fishing.tick();
  await f.deliver(f.result(f.lastOperation(), 'waiting'));
  f.native.fishingEnabled = () => {}; // Native fishing stays disabled for this tick.
  f.fishing.tick();
  assert.deepEqual(f.errors, ['fishing_apply_failed:O lançamento aguarda a cópia confirmada do morador.']);
  assert.equal(f.world.isReady(), true);
});

test('a refused immutable native fishing admission cannot enqueue, send, or complete an operation', async () => {
  const f = fixture(); await f.initialize(); const request = f.intent(1); f.nativeAdmission(false); f.fishing.tick();
  assert.equal(f.sent.filter(value => value.type === 'fishing_operation').length, 0);
  assert.equal(f.world.hasPendingOperation(), false); assert.ok(f.calls.includes(`reject:${request.id}`));
  assert.deepEqual(f.started, []); assert.deepEqual(f.confirmed, []);
  assert.ok(f.errors.some(error => error.startsWith('fishing_admission_changed:')));
});

test('visitor fishing commits preserve host version while own capture and immutable replay advance personal progress once', async () => {
  const f = fixture(true); await f.initialize(); const cast = f.intent(1); f.fishing.tick();
  const castOperation = structuredClone(f.lastOperation()), first = f.result(castOperation, 'waiting');
  await f.deliver(first);
  assert.equal(f.world.versions().expectedWorldVersion, 1); assert.equal(f.world.versions().expectedOwnRevision, 1);
  f.intent(2, cast.id); f.fishing.tick(); const operation = structuredClone(f.lastOperation());
  const caught = f.result(operation, 'caught', true); await f.deliver(caught);
  assert.equal(f.world.versions().expectedWorldVersion, 1); assert.equal(f.world.versions().expectedOwnRevision, 2);
  assert.equal(f.world.context()!.appliedSequence, 2); assert.equal(f.baseline(), 2);
  assert.deepEqual(f.errors, []); assert.equal(f.calls.filter(call => call === 'result').length, 1);
  f.emit('world_commit', caught.world); f.emit('actor_commit', caught.actor); await f.world.settled();
  assert.equal(f.calls.filter(call => call === 'result').length, 1);
  assert.equal(f.world.context()!.appliedSequence, 2);
});

test('an accepted empty LAND finishes once although the server phase remains waiting', async () => {
  const f = fixture(); await f.initialize();
  const cast = f.intent(1); f.fishing.tick();
  const castResult = f.result(f.lastOperation(), 'waiting');
  Object.assign(castResult.receipt.cast, { fishId: null, generation: null, fishType: null });
  await f.deliver(castResult);
  const land = f.intent(5, cast.id); f.fishing.tick();
  const landResult = f.result(f.lastOperation(), 'waiting');
  Object.assign(landResult.receipt.cast, { fishId: null, generation: null, fishType: null, landedAt: Date.now() });
  await f.deliver(landResult);
  assert.deepEqual(f.errors, []);
  assert.equal(f.world.context()!.appliedSequence, 2);
  assert.equal(f.native.fishingRequest(), null);
  assert.deepEqual(f.confirmed, [cast.id, land.id]);
  for (let frame = 0; frame < 250; frame++) f.fishing.tick();
  const operations = f.sent.filter(value => value.type === 'fishing_operation');
  assert.equal(operations.length, 2);
  assert.equal(operations.filter(value => value.value.kind === 'land').length, 1);
  assert.equal(f.calls.includes('result'), false);
  assert.equal(f.calls.includes('terminal'), false);
  assert.equal(f.native.fishingState()!.checkpointToken, 7);
});

test('a replayed empty LAND preserves its exact ID and original sequence without a new intention', async () => {
  const replay = fixture(); await replay.initialize();
  const replayCast = replay.intent(1); replay.fishing.tick(); await replay.deliver(replay.result(replay.lastOperation(), 'waiting'));
  const replayLand = replay.intent(5, replayCast.id); replay.fishing.tick();
  const replayOperation = replay.lastOperation(), replayResult = replay.result(replayOperation, 'waiting');
  Object.assign(replayResult.receipt.cast, { fishId: null, generation: null, fishType: null, landedAt: Date.now() });
  replayResult.replayed = true;
  await replay.deliver(replayResult);
  for (let frame = 0; frame < 250; frame++) replay.fishing.tick();
  assert.deepEqual(replay.errors, []);
  assert.equal(replay.world.context()!.appliedSequence, replayOperation.appliedSequence + 1);
  assert.equal(replay.native.fishingRequest(), null);
  assert.equal(replay.sent.filter(value => value.type === 'fishing_operation' && value.value.id === replayLand.id).length, 1);
  assert.equal(replay.confirmed.filter(id => id === replayLand.id).length, 1);
  assert.equal(replay.calls.includes('result'), false);
});

test('a foreign operation receipt cannot acknowledge an empty LAND intention', async () => {
  const f = fixture(); await f.initialize();
  const cast = f.intent(1); f.fishing.tick(); await f.deliver(f.result(f.lastOperation(), 'waiting'));
  const land = f.intent(5, cast.id); f.fishing.tick();
  const response = f.result(f.lastOperation(), 'waiting');
  Object.assign(response.receipt.cast, { fishId: null, generation: null, fishType: null, landedAt: Date.now() });
  response.receipt.operationId = randomUUID();
  const phaseCalls = f.calls.filter(value => value.startsWith('phase:')).length;
  f.emit('fishing_receipt', response); await f.world.settled();
  assert.equal(f.native.fishingRequest()!.id, land.id);
  assert.equal(f.calls.filter(value => value.startsWith('phase:')).length, phaseCalls);
  assert.equal(f.confirmed.includes(land.id), false);
  assert.ok(f.errors.some(value => value.startsWith('invalid_fishing_state:')));
});

test('paired canonical GET and native own proof precede world sequence and native NOTICE credit', async () => {
  const f = fixture(); await f.initialize(); const cast = f.intent(1); f.fishing.tick(); await f.deliver(f.result(f.lastOperation(), 'waiting'));
  f.intent(2, cast.id); f.fishing.tick(); const receipt = f.result(f.lastOperation(), 'caught', true);
  let resolve!: () => void; const gate = new Promise<void>(yes => { resolve = yes; }); f.gate(gate);
  f.emit('fishing_receipt', receipt); f.emit('world_commit', receipt.world); f.emit('actor_commit', receipt.actor);
  await Promise.resolve(); assert.equal(f.world.context()!.appliedSequence, 1); assert.equal(f.baseline(), 1);
  assert.equal(f.calls.includes('result'), false); resolve(); await f.world.settled();
  assert.equal(f.errors.length, 0, f.errors.join('\n'));
  assert.equal(f.world.context()!.appliedSequence, 2); assert.equal(f.baseline(), 2);
  const get = f.calls.lastIndexOf('GET'), own = f.calls.lastIndexOf('own:7:2'), commit = f.calls.lastIndexOf('worldCommit'), result = f.calls.lastIndexOf('result');
  assert.ok(get < own && own < commit && commit < result); assert.equal(f.errors.length, 0);
});

test('offline and interior states cannot launch or bind the foreground fishing simulation', async () => {
  const f = fixture(); await f.initialize(); f.intent(1); f.online(false); f.fishing.tick();
  assert.equal(f.sent.filter(value => value.type === 'fishing_operation').length, 0);
  f.online(true); f.scene(8706); f.fishing.tick(); assert.equal(f.sent.filter(value => value.type === 'fishing_operation').length, 0);
  f.scene(WORLD_SCENE); f.fishing.tick(); assert.equal(f.sent.filter(value => value.type === 'fishing_operation').length, 1);
});

test('a changed native admission rejects before sending a cast or another checkpoint', async () => {
  const f = fixture(); await f.initialize(); const intent = f.intent(1); f.admission(false); f.fishing.tick();
  assert.ok(f.calls.includes(`reject:${intent.id}`)); assert.equal(f.sent.filter(value => value.type === 'fishing_operation').length, 0);
  assert.ok(f.errors.some(value => value.startsWith('fishing_admission_changed:')));
});

test('disconnect discards old socket callbacks and keeps the original fishing operation for world replay', async () => {
  const f = fixture(); await f.initialize(); f.intent(1); f.fishing.tick(); const op = f.lastOperation(), receipt = f.result(op, 'waiting');
  f.fishing.disconnect(); f.world.disconnect(); const before = f.calls.length;
  f.emit('fishing_receipt', receipt); f.emit('actor_commit', receipt.actor); f.emit('world_commit', receipt.world);
  assert.equal(f.calls.length, before); assert.equal(f.world.hasPendingOperation(), true); assert.equal(f.calls.includes('result'), false);
});

test('full-pocket RELEASE uses the existing B reconciled to D without inventing another ACK or delaying the decision', async () => {
  const f = fixture(); await f.initialize(); const cast = f.intent(1); f.fishing.tick(); await f.deliver(f.result(f.lastOperation(), 'waiting'));
  f.intent(2, cast.id); f.fishing.tick(); const full = f.result(f.lastOperation(), 'caught', true);
  full.receipt.cast.pending = true; full.receipt.cast.credited = false; full.fishing.cast = full.receipt.cast;
  full.fishing.pendingOrigin = { townId: 'home', townIdentity: identity.townIdentity, operationId: full.receipt.operationId }; full.receipt.credit!.slot = null; full.actor.pockets.fill(0x2200);
  await f.deliver(full); f.lineage({ acceptedRevision: 1, reconciledRevision: 2 });
  const before = f.calls.filter(value => value === 'admit').length;
  f.intent(4, cast.id); f.fishing.tick(); assert.equal(f.lastOperation().kind, 'release');
  assert.equal(f.calls.filter(value => value === 'admit').length, before);
  const released = f.result(f.lastOperation(), 'released'); released.actor.pockets = [...full.actor.pockets];
  await f.deliver(released); assert.ok(f.calls.includes('terminal')); assert.equal(f.errors.length, 0);
});

test('a restored pending capture with no live B requests admission before RELEASE or KEEP', async () => {
  const f = fixture(); await f.initialize(); const op: FishingOperation = { id: randomUUID(), kind: 'cast', expectedWorldVersion: 1, expectedOwnRevision: 1, appliedSequence: 0 };
  const restored = f.result(op, 'caught', true).fishing; restored.sequence = 0; restored.version = 1;
  restored.pendingOrigin = { townId: 'home', townIdentity: identity.townIdentity, operationId: op.id }; restored.cast!.pending = true; restored.cast!.credited = false;
  f.emit('fishing_snapshot', restored); assert.ok(f.calls.includes('restore'));
  f.intent(4, restored.cast!.id); f.token(0); f.fishing.tick();
  assert.ok(f.calls.includes('admit')); assert.equal(f.sent.filter(value => value.type === 'fishing_operation').length, 0);
  f.token(8); f.fishing.tick(); assert.equal(f.lastOperation().kind, 'release');
});

test('foreign pending origin restores only the personal decision; RELEASE applies current-room sequence without foreign bobber or actor', async () => {
  const f = fixture(); await f.initialize(); const castId = randomUUID(), receiptId = randomUUID();
  const source = f.result({ id: castId, kind: 'cast', expectedWorldVersion: 1, expectedOwnRevision: 1, appliedSequence: 0 }, 'caught', true).fishing;
  source.sequence = 0; source.version = 1; source.cast!.townId = 'host'; source.cast!.townIdentity = '12346:486f737420202020'; source.cast!.pending = true; source.cast!.credited = false;
  source.pendingOrigin = { townId: 'host', townIdentity: source.cast!.townIdentity, operationId: receiptId };
  f.emit('fishing_snapshot', source); f.intent(4, castId); f.token(8); f.fishing.tick();
  const op = f.lastOperation(), response = f.result(op, 'released'); response.receipt.cast.townId = 'host'; response.receipt.cast.townIdentity = source.cast!.townIdentity;
  response.fishing.cast = null; response.fishing.pendingOrigin = null;
  await f.deliver(response);
  assert.equal(f.calls.includes('phase:released'), false, 'foreign actor/bobber descriptor is never applied to this Game');
  assert.ok(f.calls.includes(`pending-terminal:${castId}:${op.id}:1:1`)); assert.equal(f.errors.length, 0);
});

test('missing Own collection pauses readiness and requests real reconciliation before retrying a foreign restored choice', async () => {
  const f = fixture(); await f.initialize(); f.missingCollection(true);
  const castId = randomUUID(), source = f.result({ id: castId, kind: 'cast', expectedWorldVersion: 1, expectedOwnRevision: 1, appliedSequence: 0 }, 'caught', true).fishing;
  source.sequence = 0; source.version = 1; source.cast!.townId = 'host'; source.cast!.townIdentity = '12346:486f737420202020'; source.cast!.pending = true; source.cast!.credited = false;
  source.pendingOrigin = { townId: 'host', townIdentity: source.cast!.townIdentity, operationId: randomUUID() };
  f.emit('fishing_snapshot', source); assert.equal(f.world.isReady(), false); assert.ok(f.calls.includes('admit'));
  assert.equal(f.native.fishingState()!.castId, '');
  f.missingCollection(false); f.world.requestSnapshot();
  f.emit('world_snapshot', { townId: 'home', version: 1, sequence: 0, foreground: Array(80 * 96).fill(0), entities: [], watered: [], furniture: [] });
  f.emit('actor_snapshot', { pid, ownRevision: 1, pockets: Array(15).fill(0), learnedRecipes: [], conditions: 0, wallet: 0 }); await f.world.settled();
  f.fishing.tick(); assert.equal(f.native.fishingState()!.castId, castId); assert.equal(f.world.isReady(), true);
});

test('a cast confirms only after its receipt and paired commit, then resumes Native', async () => {
  const f = fixture(); await f.initialize();
  const op = f.intent(1); f.fishing.tick();
  assert.deepEqual(f.started, [op.id]);
  const response = f.result(f.lastOperation(), 'waiting');
  f.emit('fishing_receipt', response); f.emit('world_commit', response.world);
  await f.world.settled();
  assert.deepEqual(f.confirmed, [], 'a receipt alone does not complete Native application');
  f.emit('actor_commit', response.actor); await f.world.settled(); f.fishing.tick();
  assert.deepEqual(f.confirmed, [op.id]); assert.ok(f.calls.includes('resume:17'));
});

test('a REEL dispatch stays reachable after the cast confirms', async () => {
  const f = fixture(); await f.initialize();
  f.intent(1); f.fishing.tick();
  const castOperation = f.lastOperation(); await f.deliver(f.result(castOperation, 'waiting'));
  f.intent(2, castOperation.id); f.fishing.tick();
  const reel = f.lastOperation(); assert.equal(reel.kind, 'reel');
  await f.deliver(f.result(reel, 'escaped'));
  assert.ok(f.confirmed.includes(reel.id));
});

test('a rejected fishing operation is released, and a retry confirms on its own', async () => {
  const f = fixture(); await f.initialize();
  const op = f.intent(1); f.fishing.tick();
  f.emit('fishing_error', { operationId: op.id, code: 'resident_required', message: 'Vincule seu morador e atualize sua posição antes de pescar.' });
  assert.equal(f.world.hasPendingOperation(), false); assert.ok(f.calls.includes(`reject:${op.id}`)); assert.equal(f.confirmed.length, 0);
  const retry = f.intent(1); f.fishing.tick();
  await f.deliver(f.result(f.lastOperation(), 'waiting'));
  assert.deepEqual(f.confirmed, [retry.id]);
});

test('a mismatched fishing receipt cannot confirm the active operation', async () => {
  const f = fixture(); await f.initialize();
  f.intent(1); f.fishing.tick(); const response = f.result(f.lastOperation(), 'waiting');
  response.receipt.operationId = randomUUID();
  f.emit('fishing_receipt', response); await f.world.settled();
  assert.deepEqual(f.confirmed, []);
  assert.ok(f.errors.includes('invalid_fishing_state:O estado confirmado da pesca está incompleto.'), f.errors.join());
});

test('a fishing receipt must declare the fishing domain and match its paired inventory', async () => {
  for (const kind of [undefined, 'world', 'unknown']) {
    const f = fixture(); await f.initialize(); f.intent(1); f.fishing.tick();
    const response = f.result(f.lastOperation(), 'waiting');
    (response.world as any).kind = kind;
    f.emit('fishing_receipt', response);
    assert.ok(f.errors.some(error => error.startsWith('invalid_fishing_state:')));
    assert.deepEqual(f.confirmed, []);
  }
  const f = fixture(); await f.initialize(); f.intent(1); f.fishing.tick();
  const response = f.result(f.lastOperation(), 'waiting');
  f.emit('fishing_receipt', response); f.emit('world_commit', response.world);
  f.emit('actor_commit', { ...response.actor, wallet: response.actor.wallet + 1 });
  await f.world.settled();
  assert.equal(f.calls.includes('worldCommit'), false);
  assert.ok(f.errors.some(error => error.startsWith('world_apply_failed:')));
  assert.deepEqual(f.confirmed, []);
});

test('a malformed fishing receipt cannot change Native phase before a validated World and personal pair', async () => {
  for (const mutate of [
    (value: FishingOperationResult) => { value.actor.pockets = []; },
    (value: FishingOperationResult) => { value.actor.wallet = -1; },
    (value: FishingOperationResult) => { value.world.tiles = [{ x: 1, z: 2, before: 0, after: 1 }]; },
    (value: FishingOperationResult) => { value.world.townId = 'foreign'; },
    (value: FishingOperationResult) => { value.fishing.sequence++; },
  ]) {
    const f = fixture(); await f.initialize(); f.intent(1); f.fishing.tick();
    const response = f.result(f.lastOperation(), 'waiting'); mutate(response);
    f.emit('fishing_receipt', response);
    assert.equal(f.calls.some(call => call.startsWith('phase:')), false);
    assert.ok(f.errors.some(error => error.startsWith('invalid_fishing_state:')));
  }
});

test('a durable replay can carry a newer fishing snapshot without relabeling the original commit sequence', async () => {
  const f = fixture(); await f.initialize(); const request = f.intent(1); f.fishing.tick();
  const operation = structuredClone(f.lastOperation()), response = f.result(operation, 'waiting');
  response.replayed = true; response.fishing.sequence = 4;
  await f.deliver(response);
  assert.deepEqual(f.errors, []); assert.deepEqual(f.confirmed, [request.id]);
  assert.equal(f.world.context()!.appliedSequence, operation.appliedSequence + 1);
  assert.deepEqual(f.lastOperation(), operation);
});


const flushFishing = () => new Promise<void>(resolve => setImmediate(resolve));
async function continuingFixture(landed = false) {
  const f = fixture(); await f.initialize(); const cast = f.intent(1); f.fishing.tick();
  await f.deliver(f.result(f.lastOperation(), 'waiting')); f.fishing.tick();
  if (landed) {
    f.intent(5, cast.id); f.fishing.tick(); const response = f.result(f.lastOperation(), 'waiting');
    response.receipt.cast.landedAt = Date.now(); await f.deliver(response); f.fishing.tick();
  }
  f.lineage({ acceptedRevision: 1, reconciledRevision: 1 }); await f.advance(2);
  return { ...f, cast };
}
for (const kind of [2, 5] as const) test(`retained ${kind === 2 ? 'REEL' : 'LAND'} obtains current Own using its exact FISH token`, async () => {
  const f = await continuingFixture(), request = f.intent(kind, f.cast.id);
  const sent = f.sent.length; f.fishing.tick(); assert.equal(f.sent.length, sent);
  await flushFishing(); assert.ok(f.calls.includes('own:7:2')); assert.equal(f.baseline(), 2);
  assert.equal(f.native.fishingRequest()!.id, request.id); f.fishing.tick();
  assert.equal(f.lastOperation().id, request.id); assert.equal(f.lastOperation().expectedOwnRevision, 2);
  assert.equal(f.calls.some(call => call.startsWith('reject:')), false); assert.deepEqual(f.errors, []);
});
test('proactive Own after confirmed LAND does not consume an arriving REEL during GET, then retries that same intent', async () => {
  const f = await continuingFixture(true); let finish!: () => void;
  f.gate(new Promise<void>(resolve => { finish = resolve; })); f.fishing.tick();
  assert.equal(f.calls.at(-1), 'GET'); const reel = f.intent(2, f.cast.id); finish(); await flushFishing();
  assert.equal(f.calls.includes('own:7:2'), false); assert.equal(f.native.fishingRequest()!.id, reel.id);
  assert.equal((f.fishing as any).continueRetryAt, 0);
  const retryStarted = performance.now(); f.fishing.tick(); await flushFishing(); f.fishing.tick();
  assert.ok(performance.now() - retryStarted < 333);
  assert.equal(f.lastOperation().id, reel.id); assert.equal(f.baseline(), 2); assert.deepEqual(f.errors, []);
});
test('real Own306 is recorded despite peer307 during await without regressing canonical/CAS', async () => {
  const f = await continuingFixture(); const land = f.intent(5, f.cast.id); let finish!: () => void;
  f.ownGate(new Promise<void>(resolve => { finish = resolve; })); f.fishing.tick(); await flushFishing();
  assert.ok(f.calls.includes('own:7:2')); await f.advance(3); finish(); await flushFishing();
  assert.equal(f.baseline(), 2); assert.equal(f.world.versions().expectedOwnRevision, 3);
  assert.equal(f.calls.includes('canonical:2'), false); assert.equal(f.native.fishingRequest()!.id, land.id);
  assert.equal(f.sent.filter(v => v.type === 'fishing_operation').length, 1);
  (f.fishing as any).continueRetryAt = 0; f.fishing.tick(); await flushFishing(); f.fishing.tick();
  assert.equal(f.baseline(), 3); assert.ok(f.calls.includes('canonical:3')); assert.equal(f.lastOperation().id, land.id);
  assert.equal(f.lastOperation().expectedOwnRevision, 3); assert.deepEqual(f.errors, []);
});
for (const reason of ['version', 'request', 'token', 'instance', 'pid', 'accepted', 'invalid', 'revision'] as const)
  test(`continuation GET rejects changed ${reason} without rejecting the Native intention`, async () => {
    const f = await continuingFixture(); const request = f.intent(5, f.cast.id); let finish!: () => void;
    f.gate(new Promise<void>(resolve => { finish = resolve; })); f.fishing.tick();
    if(reason === 'version') await f.advance(3);
    if(reason === 'request') f.intent(2, f.cast.id);
    if(reason === 'token') f.token(8);
    if(reason === 'instance') f.lineage({ acceptedRevision: 1, reconciledRevision: 1, currentGameInstance: 4 });
    if(reason === 'pid') f.lineage({ acceptedRevision: 1, reconciledRevision: 1, pid: '34'.repeat(20) });
    if(reason === 'accepted') f.lineage({ acceptedRevision: 2, reconciledRevision: 1 });
    if(reason === 'invalid') f.canonicalInvalid();
    if(reason === 'revision') f.canonicalRevision(3);
    finish(); await flushFishing(); assert.equal(f.calls.includes('own:7:2'), false);
    assert.equal(f.baseline(), 1); assert.equal(f.sent.filter(v => v.type === 'fishing_operation').length, 1);
    assert.equal(f.calls.some(call => call.startsWith('reject:')), false); assert.ok(f.native.fishingRequest());
    if(reason !== 'request') assert.equal(f.native.fishingRequest()!.id, request.id);
  });
for (const reason of ['pending', 'missing-proof', 'instance', 'pid'] as const)
  test(`continuation Own ${reason} cannot promote the Web RAM baseline`, async () => {
    const f = await continuingFixture(); const request = f.intent(2, f.cast.id); let finish!: () => void;
    f.ownGate(new Promise<void>(resolve => { finish = resolve; })); f.fishing.tick(); await flushFishing();
    if(reason === 'pending') f.ownResult(false);
    if(reason === 'missing-proof') f.ownProof(false);
    if(reason === 'instance') f.lineage({ acceptedRevision: 1, reconciledRevision: 1, currentGameInstance: 4 });
    if(reason === 'pid') f.lineage({ acceptedRevision: 1, reconciledRevision: 1, pid: '34'.repeat(20) });
    finish(); await flushFishing(); assert.equal(f.baseline(), 1); assert.equal(f.native.fishingRequest()!.id, request.id);
    assert.equal(f.calls.includes('canonical:2'), false); assert.equal(f.calls.some(call => call.startsWith('reject:')), false);
  });

test('disconnect invalidates an old continuation GET without delaying or retagging the new cast', async () => {
  const f = await continuingFixture(); f.intent(5, f.cast.id); let finish!: () => void;
  f.gate(new Promise<void>(resolve => { finish = resolve; })); f.fishing.tick();
  assert.ok((f.fishing as any).continuing); f.fishing.disconnect(); f.world.disconnect();
  assert.equal((f.fishing as any).continuing, null); assert.equal((f.fishing as any).continueRetryAt, 0);
  f.resetCast(); await f.initialize(); f.gate(Promise.resolve());
  const next = f.intent(1); f.lineage(null); f.fishing.tick(); assert.equal(f.lastOperation().id, next.id, JSON.stringify({ready:f.world.isReady(),context:f.world.context(),versions:f.world.versions(),calls:f.calls,errors:f.errors}));
  finish(); await flushFishing(); assert.equal(f.calls.includes('own:7:2'), false);
  assert.equal(f.calls.includes('canonical:2'), false); assert.equal(f.baseline(), 1);
  assert.equal((f.fishing as any).continueRetryAt, 0); assert.equal(f.native.fishingRequest()!.id, next.id);
});

test('before Native FLOAT/confirmed LAND a newer revision never starts proactive Own or blocks READY→CAST', async () => {
  const f = await continuingFixture();
  // Exact Web-visible state of real pending Native33 cast40: WAITING with a
  // retained old ACK, no LAND intent and landedAt null. Native is READY49.
  f.fishing.tick(); await flushFishing(); f.fishing.tick();
  assert.equal(f.calls.filter(v => v === 'GET').length, 0); // OLD_PRECAST_OWN_ORACLE
  assert.equal(f.calls.includes('own:7:2'), false); assert.equal(f.world.isReady(), true);
  assert.equal((f.fishing as any).continuing, null); assert.equal(f.baseline(), 1);
  // Once original FLOAT emits LAND, the same strict held-token Own is allowed.
  const land = f.intent(5, f.cast.id); f.fishing.tick(); await flushFishing(); f.fishing.tick();
  assert.ok(f.calls.includes('own:7:2')); assert.equal(f.baseline(), 2);
  assert.equal(f.lastOperation().id, land.id); assert.equal(f.lastOperation().kind, 'land');
  assert.deepEqual(f.errors, []);
});
