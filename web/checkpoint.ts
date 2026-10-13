import { CHECKPOINT_TOWN_BYTES, PASSPORT_BYTES, NES_SAVE_BYTES, validNES, checkpointPacket, checkpointPayloads, type NativeCheckpoint, type NativeLiveCheckpoint, type CheckpointProviderState, type CheckpointProducer, type CheckpointLineage } from '../shared/contracts.ts';
import { checkpointRecoveryIntentJSON, type CheckpointRecoveryIntent, type CheckpointRecoveryRequest, type CheckpointRecoveryReceipt } from '../shared/checkpoint-recovery.ts';

export const OWN_TOWN_FILE = '/save/card_a/DobutsunomoriP_MURA.gci';
export const PASSPORT_FILE = '/save/passport.bin';
export const NES_FILE = '/save/card_a/DobutsunomoriP_F_SAVE.sav';
export const LIVE_NES_FILE = '/save/live-nes.sav';
export const LIVE_TOWN_FILE = '/save/live-checkpoint.gci';
export const LIVE_PASSPORT_FILE = '/save/live-passport.bin';
export const LIVE_CAPTURE_POLL_MS = 50;
export const LIVE_CAPTURE_TIMEOUT_MS = 15_000;
export type CheckpointFiles = { exists(path: string): boolean; read(path: string): Uint8Array };

function readPair(files: CheckpointFiles, townPath: string, passportPath: string, passport: boolean, nesPath: string, nesPresent: boolean): NativeCheckpoint {
  let checkpoint: NativeCheckpoint;
  try {
    checkpoint = { town: new Uint8Array(files.read(townPath)).buffer as ArrayBuffer,
      passport: passport ? new Uint8Array(files.read(passportPath)).buffer as ArrayBuffer : null,
      nes: nesPresent ? new Uint8Array(files.read(nesPath)).buffer as ArrayBuffer : null };
  } catch (error) { throw new Error('A cidade ou o passaporte da viagem não pôde ser lido. A cópia não foi enviada.', { cause: error }); }
  if (!isCheckpoint(checkpoint)) throw new Error('A cidade ou o passaporte da viagem não pôde ser lido por inteiro. A cópia não foi enviada.');
  return checkpoint;
}

function bufferLength(value: unknown): number | null {
  // NativeGame runs in an iframe, so its buffers can belong to another realm.
  try { return Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')!.get!.call(value) as number; }
  catch { return null; }
}

export function isCheckpoint(value: unknown): value is NativeCheckpoint {
  if (!value || typeof value !== 'object') return false;
  const checkpoint = value as Partial<NativeCheckpoint>;
  return bufferLength(checkpoint.town) === CHECKPOINT_TOWN_BYTES
    && (checkpoint.passport === null || bufferLength(checkpoint.passport) === PASSPORT_BYTES)
    && (checkpoint.nes === null || bufferLength(checkpoint.nes) === NES_SAVE_BYTES && validNES(new Uint8Array(checkpoint.nes!)));
}

/** Every component participates in the same packet, digest and journal. */
export function encodeCheckpoint(checkpoint: NativeCheckpoint): ArrayBuffer {
  if (!isCheckpoint(checkpoint)) throw new Error('A cópia do progresso está incompleta.');
  return checkpointPacket(new Uint8Array(checkpoint.town), checkpoint.passport === null ? null : new Uint8Array(checkpoint.passport),
    checkpoint.nes === null ? null : new Uint8Array(checkpoint.nes)).buffer as ArrayBuffer;
}
export function decodeCheckpoint(packet: ArrayBuffer): NativeCheckpoint {
  if (bufferLength(packet) === null) throw new Error('Escolha um arquivo .ec-save válido.');
  const payload = checkpointPayloads(new Uint8Array(packet));
  return { town: new Uint8Array(payload.town).buffer, passport: payload.passport === null ? null : new Uint8Array(payload.passport).buffer,
    nes: payload.nes === null ? null : new Uint8Array(payload.nes).buffer };
}

function sameBytes(bytes: ArrayBuffer, previous: ArrayBuffer): boolean {
  if (previous.byteLength !== bytes.byteLength) return false;
  const a = new Uint8Array(bytes); const b = new Uint8Array(previous);
  for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return false;
  return true;
}

export function sameCheckpoint(checkpoint: NativeCheckpoint, previous: NativeCheckpoint | null): boolean {
  return !!previous && sameBytes(checkpoint.town, previous.town)
    && (checkpoint.passport === null ? previous.passport === null
      : previous.passport !== null && sameBytes(checkpoint.passport, previous.passport))
    && (checkpoint.nes === null ? previous.nes === null : previous.nes !== null && sameBytes(checkpoint.nes, previous.nes));
}

/** C already serialized the passport exactly once before notifying this physical COMMIT. */
export function readCommittedCheckpoint(result: number, files: CheckpointFiles, nesPresent: number): NativeCheckpoint | null {
  if (nesPresent !== 0 && nesPresent !== 1) throw new Error('A presença dos dados NES não foi confirmada. A cópia não foi enviada.');
  if (result !== 0 && result !== 1) throw new Error('Não foi possível guardar o passaporte da viagem. A cidade e o passaporte não foram enviados.');
  if (!files.exists(OWN_TOWN_FILE)) {
    if (result === 1) throw new Error('O passaporte da viagem ficou sem a cidade de origem. A cópia não foi enviada.');
    return null;
  }
  return readPair(files, OWN_TOWN_FILE, PASSPORT_FILE, result === 1, NES_FILE, nesPresent === 1);
}

export type LiveCheckpointCapture = {
  request(): number;
  status(token: number): number;
  passportPresent(token: number): number;
  nesPresent(token: number): number;
  producer(token: number): (CheckpointProducer & { repaymentWitness?: boolean; context?: CheckpointProviderState }) | null;
};
export function isCheckpointProducer(value: unknown): value is CheckpointProducer {
  if (!value || typeof value !== 'object') return false;
  const producer = value as Partial<CheckpointProducer>;
  return typeof producer.pid === 'string' && /^[a-f0-9]{40}$/.test(producer.pid)
    && typeof producer.ownTownIdentity === 'string' && /^\d{1,5}:[a-f0-9]{16}$/.test(producer.ownTownIdentity)
    && Number(producer.ownTownIdentity.split(':')[0]) <= 0xffff;
}

/** Status, metadata and both reads are synchronous: no other native request can interleave. */
export async function captureLiveCheckpoint(capture: LiveCheckpointCapture, files: CheckpointFiles, options: {
  signal?: AbortSignal; timeoutMs?: number; pollMs?: number;
  now?: () => number; wait?: (milliseconds: number) => Promise<void>;
} = {}): Promise<NativeLiveCheckpoint> {
  const clock = options.now ?? (() => performance.now());
  const wait = options.wait ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  const timeout = options.timeoutMs ?? LIVE_CAPTURE_TIMEOUT_MS;
  const poll = options.pollMs ?? LIVE_CAPTURE_POLL_MS;
  if (!Number.isFinite(timeout) || timeout <= 0 || !Number.isFinite(poll) || poll <= 0) throw new Error('O prazo da cópia da cidade está inválido.');
  options.signal?.throwIfAborted();
  const token = capture.request();
  if (!Number.isSafeInteger(token) || token <= 0) throw new Error('Não foi possível pedir uma cópia atual da cidade.');
  const deadline = clock() + timeout;
  for (;;) {
    options.signal?.throwIfAborted();
    const status = capture.status(token);
    if (status === 1) {
      const passport = capture.passportPresent(token);
      const nes = capture.nesPresent(token);
      if (nes !== 0 && nes !== 1) throw new Error('Os dados NES não pertencem à mesma cópia atual.');
      if (passport !== 0 && passport !== 1) throw new Error('A cidade e o passaporte atuais não pertencem à mesma cópia.');
      const producer = capture.producer(token);
      if (!isCheckpointProducer(producer)) throw new Error('O jogo não confirmou a identidade da cópia atual.');
      if (producer.repaymentWitness !== undefined && typeof producer.repaymentWitness !== 'boolean') throw new Error('O jogo não confirmou o marcador da cópia atual.');
      if (producer.repaymentWitness && passport !== 0) throw new Error('A cópia da quitação não pertence à cidade de origem.');
      if (producer.repaymentWitness && !isCheckpointContext(producer.context)) throw new Error('O jogo não confirmou a origem da cópia da quitação.');
      return { checkpoint: readPair(files, LIVE_TOWN_FILE, LIVE_PASSPORT_FILE, passport === 1, LIVE_NES_FILE, nes === 1), token,
        producer: { pid: producer.pid, ownTownIdentity: producer.ownTownIdentity },
        ...(producer.repaymentWitness ? { repaymentWitness: true, context: { ...producer.context! } } : {}) };
    }
    if (status === -2) throw new Error('A cópia da cidade foi substituída antes de ficar pronta. Tente novamente.');
    if (status !== 0) throw new Error('Não foi possível copiar o progresso atual da cidade. Ele continua na memória desta aba.');
    if (clock() >= deadline) throw new Error('A cópia do progresso atual demorou demais. Tente novamente antes de fechar a cidade.');
    await wait(Math.min(poll, Math.max(1, deadline - clock())));
  }
}

export type CheckpointBaseline = { revision: number; checkpoint: NativeCheckpoint | null };
export type CheckpointCapture = {
  id: string; checkpoint: NativeCheckpoint; context: CheckpointProviderState | null;
  baseline: CheckpointBaseline; nativeToken: number; source: 'live' | 'commit'; createdAt: number;
  gameInstance: string; producer: CheckpointProducer | null;
  /** Scheduling/preservation marker from the native capture; never an event allegation. */
  repaymentWitness?: true;
};
export type CheckpointQueue = {
  storedCheckpoint: NativeCheckpoint | null; storedRevision: number;
  latestCapture: CheckpointCapture | null; pendingCapture: CheckpointCapture | null;
  conflictCapture: CheckpointCapture | null; unboundCommit: CheckpointCapture | null;
  recoveryCaptures: CheckpointCapture[];
};
export type CheckpointWriteAck = { revision: number; checkpoint: NativeCheckpoint; reconciled: boolean };
export class CheckpointConflictError extends Error {
  constructor(readonly code: string, message: string, options?: ErrorOptions) { super(message, options); this.name = 'CheckpointConflictError'; }
}

export function isCheckpointContext(value: unknown): value is CheckpointProviderState {
  if (!value || typeof value !== 'object') return false;
  const context = value as Partial<CheckpointProviderState>;
  return typeof context.gameInstance === 'string' && context.gameInstance.length > 0 && context.gameInstance.length <= 128
    && typeof context.activeWorldTownId === 'string' && context.activeWorldTownId.length > 0 && context.activeWorldTownId.length <= 64
    && [context.ramBaselineRevision, context.appliedSequence, context.currentOwnRevision].every(n => Number.isSafeInteger(n) && n! >= 0)
    && context.currentOwnRevision! >= context.ramBaselineRevision!;
}
export function sameCheckpointContext(a: CheckpointProviderState | null, b: CheckpointProviderState | null): boolean {
  return !!a && !!b && a.gameInstance === b.gameInstance && a.ramBaselineRevision === b.ramBaselineRevision
    && a.activeWorldTownId === b.activeWorldTownId && a.appliedSequence === b.appliedSequence && a.currentOwnRevision === b.currentOwnRevision;
}
/** A newer CAS is valid; it never changes the immutable captured origin. */
export function canPublishCheckpoint(captured: CheckpointProviderState, current: CheckpointProviderState | null): boolean {
  return !!current && captured.gameInstance === current.gameInstance && captured.ramBaselineRevision === current.ramBaselineRevision
    && captured.activeWorldTownId === current.activeWorldTownId && captured.appliedSequence === current.appliedSequence
    && current.currentOwnRevision >= captured.currentOwnRevision;
}
function cloneCheckpoint(value: NativeCheckpoint): NativeCheckpoint {
  return { town: ArrayBuffer.prototype.slice.call(value.town, 0), passport: value.passport === null ? null : ArrayBuffer.prototype.slice.call(value.passport, 0), nes: value.nes === null ? null : ArrayBuffer.prototype.slice.call(value.nes, 0) };
}
function cloneCheckpointCapture(value: CheckpointCapture): CheckpointCapture {
  return Object.freeze({ ...value, checkpoint: cloneCheckpoint(value.checkpoint), context: value.context ? Object.freeze({ ...value.context }) : null,
    producer: value.producer ? Object.freeze({ ...value.producer }) : null,
    baseline: Object.freeze({ revision: value.baseline.revision, checkpoint: value.baseline.checkpoint ? cloneCheckpoint(value.baseline.checkpoint) : null }) });
}
export function createCheckpointCapture(checkpoint: NativeCheckpoint, context: CheckpointProviderState | null,
  baseline: CheckpointBaseline, nativeToken: number, source: 'live' | 'commit', gameInstance: string, producer: CheckpointProducer | null,
  repaymentWitness?: true): CheckpointCapture {
  if (!isCheckpoint(checkpoint) || (context !== null && !isCheckpointContext(context)) || (context === null && source !== 'commit')
    || !Number.isSafeInteger(nativeToken) || (source === 'live' ? nativeToken <= 0 : nativeToken === 0)
    || !Number.isSafeInteger(baseline.revision) || baseline.revision < 0
    || (baseline.checkpoint !== null && !isCheckpoint(baseline.checkpoint)) || typeof gameInstance !== 'string' || !gameInstance
    || context && context.gameInstance !== gameInstance || producer !== null && !isCheckpointProducer(producer)
    || source === 'live' && producer === null || repaymentWitness !== undefined && (repaymentWitness !== true || source !== 'live' || checkpoint.passport !== null)) throw new Error('A origem da cópia atual do progresso está incompleta.');
  return Object.freeze({ id: crypto.randomUUID(), checkpoint: cloneCheckpoint(checkpoint), context: context ? Object.freeze({ ...context }) : null,
    baseline: Object.freeze({ revision: baseline.revision, checkpoint: baseline.checkpoint ? cloneCheckpoint(baseline.checkpoint) : null }),
    nativeToken, source, createdAt: Date.now(), gameInstance, producer: producer ? Object.freeze({ ...producer }) : null,
    ...(repaymentWitness ? { repaymentWitness: true } : {}) });
}
/** The preserved queue already survives IDB writes and does not replace user archives. */
export function pendingRepaymentWitnesses(queue: CheckpointQueue): CheckpointCapture[] {
  const gameInstance = queue.latestCapture?.gameInstance ?? queue.pendingCapture?.gameInstance;
  return queue.recoveryCaptures.filter(capture => capture.repaymentWitness === true && capture.gameInstance === gameInstance);
}
export function queueCheckpoint(queue: CheckpointQueue, capture: CheckpointCapture): void {
  if (capture.repaymentWitness && !queue.recoveryCaptures.some(value => value.id === capture.id)) queue.recoveryCaptures.push(capture);
  const previous = queue.latestCapture;
  if (previous?.source === 'commit' && previous.id !== capture.id) {
    if (queue.unboundCommit && queue.unboundCommit.id !== previous.id
      && !queue.recoveryCaptures.some(value => value.id === queue.unboundCommit!.id)) queue.recoveryCaptures.push(queue.unboundCommit);
    queue.unboundCommit = previous;
  }
  queue.latestCapture = capture;
  if (capture.context === null) {
    if (queue.unboundCommit && queue.unboundCommit.id !== capture.id
      && !queue.recoveryCaptures.some(value => value.id === queue.unboundCommit!.id)) queue.recoveryCaptures.push(queue.unboundCommit);
    queue.unboundCommit = capture; return;
  }
  queue.pendingCapture = capture;
}
export function retryCheckpoint(queue: CheckpointQueue): void {
  if (queue.conflictCapture) throw new CheckpointConflictError('checkpoint_conflict', 'A cópia local precisa ser reconciliada antes de tentar guardar novamente.');
  if (queue.latestCapture?.context) queue.pendingCapture = queue.latestCapture;
}
/** Equal bytes identify a candidate; they never retire its unresolved original or native token. */
export function settledJournalCapture(queue: CheckpointQueue): string | null {
  if (queue.conflictCapture || queue.unboundCommit && !sameCheckpoint(queue.unboundCommit.checkpoint, queue.storedCheckpoint)) return null;
  if (queue.latestCapture) return sameCheckpoint(queue.latestCapture.checkpoint, queue.storedCheckpoint) ? queue.latestCapture.id : null;
  return queue.unboundCommit?.id ?? null;
}
/** Call only after an ACK and native reconciliation of this later live pair. */
export function settleSupersededCommit(queue: CheckpointQueue, capture: CheckpointCapture, lineage: CheckpointLineage | null, revision: number): boolean {
  const original = queue.unboundCommit;
  if (original && capture.source === 'live' && capture.gameInstance === original.gameInstance
    && capture.producer && original.producer && capture.producer.pid === original.producer.pid
    && capture.producer.ownTownIdentity === original.producer.ownTownIdentity && original.nativeToken > 0
    && capture.nativeToken > original.nativeToken && capture.createdAt >= original.createdAt
    && lineage?.pid === capture.producer.pid && lineage.ownTownIdentity === capture.producer.ownTownIdentity
    && lineage.acknowledged === true && lineage.acceptedRevision >= revision
    && lineage.currentGameInstance > 0 && lineage.reconciledInstance === lineage.currentGameInstance
    && lineage.reconciledRevision >= revision) { queue.unboundCommit = null; return true; }
  return false;
}

/** Coalesced captures retain their exact origin; an older failed request cannot replace a newer one. */
export async function flushPendingCheckpoints(queue: CheckpointQueue, write: (capture: CheckpointCapture) => Promise<CheckpointWriteAck | null>, active: () => boolean): Promise<void> {
  const reconciled = new Set<string>();
  for (;;) {
    const capture = pendingRepaymentWitnesses(queue).find(value => !reconciled.has(value.id)) ?? queue.pendingCapture;
    if (!capture || !active()) return;
    if (queue.pendingCapture?.id === capture.id) queue.pendingCapture = null;
    if (!capture.repaymentWitness && sameCheckpoint(capture.checkpoint, queue.storedCheckpoint)) continue;
    try {
      const ack = await write(capture);
      if (ack === null) { queue.pendingCapture ??= capture; return; }
      if (!Number.isSafeInteger(ack.revision) || ack.revision < 1 || !isCheckpoint(ack.checkpoint)) throw new Error('O servidor não confirmou a versão do progresso.');
      queue.storedRevision = ack.revision;
      queue.storedCheckpoint = ack.checkpoint;
      if (!ack.reconciled) { queue.pendingCapture ??= capture; return; }
      reconciled.add(capture.id);
    } catch (error) {
      queue.pendingCapture ??= capture;
      if (error instanceof CheckpointConflictError) queue.conflictCapture ??= capture;
      throw error;
    }
  }
}

/** User-keyed private journal. It contains no session or lease credentials and never imports itself. */
export type CheckpointJournal = {
  userId: string; latestCapture: CheckpointCapture | null; conflictCapture: CheckpointCapture | null;
  unboundCommit: CheckpointCapture | null; recoveryCaptures: CheckpointCapture[]; updatedAt: number;
};
/** Preserve every pending origin on a new boot; dedupe identical record IDs, never different captures. */
export function journalCaptures(journal: Pick<CheckpointJournal, 'latestCapture' | 'conflictCapture' | 'unboundCommit' | 'recoveryCaptures'> | null): CheckpointCapture[] {
  if (!journal) return [];
  const records = [...journal.recoveryCaptures, journal.conflictCapture, journal.unboundCommit, journal.latestCapture];
  return [...new Map(records.filter((capture): capture is CheckpointCapture => capture !== null).map(capture => [capture.id, capture])).values()];
}
/** Archives remain downloadable; retained repayment captures must finish before another boot. */
export function pendingJournalCaptures(journal: CheckpointJournal | null): CheckpointCapture[] {
  if (!journal) return [];
  const active = new Set([journal.latestCapture?.id, journal.conflictCapture?.id, journal.unboundCommit?.id]);
  return journalCaptures(journal).filter(capture => capture.repaymentWitness || active.has(capture.id))
    .sort((a, b) => Number(!!b.repaymentWitness) - Number(!!a.repaymentWitness) || a.createdAt - b.createdAt || a.nativeToken - b.nativeToken);
}

/** A pre-room entry copy carries no gameplay delta. Its original bytes remain downloadable. */
export function entryCommitContainedByLive(original: CheckpointCapture, later: CheckpointCapture): boolean {
  if (!validStoredCapture(original) || !validStoredCapture(later) || original.source !== 'commit' || later.source !== 'live'
    || original.repaymentWitness || later.repaymentWitness || original.checkpoint.passport !== null || later.checkpoint.passport !== null
    || original.gameInstance !== later.gameInstance || original.nativeToken >= later.nativeToken || original.createdAt > later.createdAt
    || !original.producer || !later.producer || original.producer.pid !== later.producer.pid
    || original.producer.ownTownIdentity !== later.producer.ownTownIdentity || original.baseline.revision < 1
    || original.baseline.revision !== later.baseline.revision || !original.baseline.checkpoint || !later.baseline.checkpoint
    || !sameCheckpoint(original.baseline.checkpoint, later.baseline.checkpoint) || !later.context
    || later.context.ramBaselineRevision !== original.baseline.revision || later.context.currentOwnRevision !== original.baseline.revision
    || original.context && (original.context.ramBaselineRevision !== original.baseline.revision
      || original.context.currentOwnRevision !== original.baseline.revision || original.context.appliedSequence !== 0
      || original.context.activeWorldTownId !== later.context.activeWorldTownId)
    || !checkpointNamesProducer(original.checkpoint, original.producer) || !checkpointNamesProducer(later.checkpoint, later.producer)
    || !checkpointNamesProducer(original.baseline.checkpoint, original.producer)) return false;
  const sameNES=(a:NativeCheckpoint,b:NativeCheckpoint)=>a.nes===null?b.nes===null:b.nes!==null&&sameBytes(a.nes,b.nes);
  if(!sameNES(original.checkpoint,original.baseline.checkpoint)&&!sameNES(original.checkpoint,later.checkpoint))return false;
  const before = new Uint8Array(original.baseline.checkpoint.town), entry = new Uint8Array(original.checkpoint.town);
  const live = new Uint8Array(later.checkpoint.town);
  const sameRegion = (a: Uint8Array, b: Uint8Array, offset: number, size: number) => {
    for (let index = offset; index < offset + size; index++) if (a[index] !== b[index]) return false;
    return true;
  };
  for (const bytes of [before, entry, live]) {
    for (let offset = 0; offset < 0x26000; offset++) if (bytes[0x26040 + offset] !== bytes[0x4c040 + offset]) return false;
  }
  // Every gameplay byte changed by entry must be identical in the later LIVE.
  // Only native serialization clocks, scene and checksums lack gameplay meaning.
  const clock = (offset: number) => offset >= 0x0a && offset < 0x12 || offset >= 0x12 && offset < 0x14
    || offset >= 0x14 && offset < 0x18;
  for (const base of [0x26040, 0x4c040]) {
    for (let offset = 0; offset < 0x26000; offset++) {
      if (entry[base + offset] !== before[base + offset] && !clock(offset) && entry[base + offset] !== live[base + offset]) return false;
    }
    if (!sameRegion(entry, live, base + 0x20, 4 * 0x2440)
      || !sameRegion(entry, live, base + 0x137a8, 80 * 96 * 2)) return false;
  }
  for (let offset = 0; offset < entry.length; offset++) {
    if (offset >= 0x26040 && offset < 0x4c040 || offset >= 0x4c040 && offset < 0x72040 || offset >= 0x28 && offset < 0x2c) continue;
    if (entry[offset] !== before[offset]) return false;
  }
  return true;
}

/** Only a metadata-only LIVE can leave the stale-sequence gate automatically. */
export function metadataOnlyStaleLiveRecovery(original: CheckpointCapture, later: CheckpointCapture, canonical: NativeCheckpoint): boolean {
  if (!validStoredCapture(original) || !validStoredCapture(later) || original.source !== 'live' || later.source !== 'live'
    || original.repaymentWitness || later.repaymentWitness || original.checkpoint.passport !== null || later.checkpoint.passport !== null
    || canonical.passport !== null || original.gameInstance !== later.gameInstance || original.nativeToken >= later.nativeToken
    || original.createdAt > later.createdAt || !original.producer || !later.producer || !original.context || !later.context
    || original.producer.pid !== later.producer.pid || original.producer.ownTownIdentity !== later.producer.ownTownIdentity
    || original.context.activeWorldTownId !== later.context.activeWorldTownId
    || original.context.appliedSequence >= later.context.appliedSequence
    || original.baseline.revision < 1 || original.baseline.revision !== later.baseline.revision
    || !original.baseline.checkpoint || !later.baseline.checkpoint || !sameCheckpoint(original.baseline.checkpoint, later.baseline.checkpoint)
    || !checkpointNamesProducer(original.checkpoint, original.producer) || !checkpointNamesProducer(later.checkpoint, later.producer)
    || !checkpointNamesProducer(original.baseline.checkpoint, original.producer) || !checkpointNamesProducer(canonical, original.producer)) return false;
  if(original.checkpoint.nes===null ? original.baseline.checkpoint.nes!==null : original.baseline.checkpoint.nes===null || !sameBytes(original.checkpoint.nes,original.baseline.checkpoint.nes))return false;
  const before = new Uint8Array(original.baseline.checkpoint.town), first = new Uint8Array(original.checkpoint.town);
  const current = new Uint8Array(later.checkpoint.town), confirmed = new Uint8Array(canonical.town);
  for (const bytes of [before, first, current, confirmed]) {
    for (let offset = 0; offset < 0x26000; offset++) if (bytes[0x26040 + offset] !== bytes[0x4c040 + offset]) return false;
  }
  for (let offset = 0; offset < first.length; offset++) {
    // Only the native serialization timestamp/checksum and scene are excluded.
    const local = offset >= 0x4c040 ? offset - 0x4c040 : offset >= 0x26040 ? offset - 0x26040 : -1;
    if (offset >= 0x28 && offset < 0x2c || local >= 0x0a && local < 0x18) continue;
    if (first[offset] !== before[offset]) return false;
  }
  return true;
}

export type PriorBootCheckpoint = { checkpoint: NativeCheckpoint; revision: number };
export type PriorBootRecoveryResult =
  | { status: 'durable' | 'merged'; captureId: string; canonical: PriorBootCheckpoint; verifiedCapture: CheckpointCapture }
  | { status: 'blocked'; captureId: string; reason: string };
export type PriorBootRecoveryTransport = {
  /** Authenticated private GET, with response size and digests already verified. */
  download(revision?: number): Promise<PriorBootCheckpoint | null>;
  /** Uses the current session/lease and CAS, but sends the original body/context. */
  recover(request: CheckpointRecoveryRequest, checkpoint: NativeCheckpoint): Promise<CheckpointRecoveryReceipt>;
  /** Becomes true before any new native bootstrap or capture can run. */
  currentCaptureStarted(): boolean;
};

/**
 * Identity-only check for the current GAFE01 codec, not a second save parser.
 * These wasm32 offsets are proved by tests/gci-fixture.c. The API validates
 * the complete save; here both native copies must name the exact producer.
 */
export function checkpointNamesProducer(checkpoint: NativeCheckpoint, producer: CheckpointProducer, pairedDeparture = false): boolean {
  if (!isCheckpoint(checkpoint) || !isCheckpointProducer(producer) || checkpoint.passport !== null && !pairedDeparture) return false;
  const bytes = new Uint8Array(checkpoint.town), view = new DataView(checkpoint.town);
  const hex = (offset: number, length: number) => Array.from(bytes.subarray(offset, offset + length), byte => byte.toString(16).padStart(2, '0')).join('');
  if (checkpoint.passport !== null) {
    // Original BE mCD_foreigner_c: full resident PID and complete word sum.
    // This identifies a confirmed departure pair; it never imports a passport.
    const passport = new Uint8Array(checkpoint.passport), passportView = new DataView(checkpoint.passport);
    const pid = Array.from(passport.subarray(32, 52), byte => byte.toString(16).padStart(2, '0')).join('');
    let sum = 0;
    for (let offset = 0; offset < passport.length; offset += 2) sum = (sum + passportView.getUint16(offset)) & 0xffff;
    if (sum !== 0 || passport[32 + 0x1086] !== 1 || pid !== producer.pid ||
      `${passportView.getUint16(32 + 0x12)}:${pid.slice(16, 32)}` !== producer.ownTownIdentity) return false;
  }
  if (String.fromCharCode(...bytes.subarray(0, 6)) !== 'GAFE01' || view.getUint16(0x38) !== 57) return false;
  let pairedResident = -1;
  for (const base of [0x26040, 0x4c040]) {
    if (view.getUint32(base) !== 6 || view.getUint32(base + 4) !== 0x47414645
      || `${view.getUint16(base + 0x9120 + 10)}:${hex(base + 0x9120, 8)}` !== producer.ownTownIdentity) return false;
    let found = false, sum = 0;
    for (let offset = base; offset < base + 0x26000; offset += 2) sum = (sum + view.getUint16(offset)) & 0xffff;
    if (sum !== 0) return false;
    for (let index = 0; index < 4; index++) {
      const resident = base + 0x20 + index * 0x2440;
      if (bytes[resident + 0x1086] === (checkpoint.passport === null ? 1 : 0) && hex(resident, 20) === producer.pid) {
        if (checkpoint.passport !== null) {
          if (found || pairedResident >= 0 && pairedResident !== index) return false;
          pairedResident = index;
        }
        found = true;
      }
    }
    if (!found) return false;
  }
  return true;
}
async function checkpointDigest(checkpoint: NativeCheckpoint): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encodeCheckpoint(checkpoint));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Finishes an original owned Save & Quit after its WASM instance has gone, or
 * confirms an already durable exact departure pair without publishing it.
 * This operation has no native methods: it never ACKs an old token, changes
 * RAM, retags the captured context, or imports a journal into a new game.
 */
export async function recoverPriorBootCommit(capture: CheckpointCapture,
  owner: { userId: string; currentGameInstance: string; ownTownIdentity: string },
  transport: PriorBootRecoveryTransport): Promise<PriorBootRecoveryResult> {
  const blocked = (reason: string): PriorBootRecoveryResult => ({ status: 'blocked', captureId: capture.id, reason });
  if (!validStoredCapture(capture) || capture.source !== 'commit' || capture.nativeToken <= 0
    || capture.gameInstance === owner.currentGameInstance || !owner.currentGameInstance
    || !capture.context || !capture.producer
    || capture.context.activeWorldTownId !== owner.userId || capture.producer.ownTownIdentity !== owner.ownTownIdentity
    || capture.baseline.revision < 1 || capture.baseline.revision !== capture.context.ramBaselineRevision
    || !checkpointNamesProducer(capture.checkpoint, capture.producer, true)) {
    return blocked('A cópia original não comprova a cidade, o morador e a origem desta recuperação. Ela foi preservada.');
  }
  // ArrayBuffers are mutable even inside frozen records. Own the original
  // request bytes and metadata throughout asynchronous preflight/publication.
  const original = cloneCheckpointCapture(capture);
  const unchanged = () => !transport.currentCaptureStarted() && sameStoredCapture(original, capture);
  try {
    if (!unchanged()) return blocked('Outra partida já começou ou a cópia local mudou. A recuperação foi preservada.');
    const downloadedCurrent = await transport.download();
    if (!unchanged()) return blocked('Outra partida começou durante a verificação. A recuperação foi preservada.');
    const current = downloadedCurrent && isCheckpoint(downloadedCurrent.checkpoint)
      ? { revision: downloadedCurrent.revision, checkpoint: cloneCheckpoint(downloadedCurrent.checkpoint) } : null;
    if (!current || !Number.isSafeInteger(current.revision) || current.revision < original.context!.currentOwnRevision
      || current.revision < original.baseline.revision
      || !checkpointNamesProducer(current.checkpoint, original.producer!, original.checkpoint.passport !== null)) return blocked('A cidade atual do servidor não confirma a origem desta cópia. Ela foi preservada.');
    const downloadedBaseline = await transport.download(original.baseline.revision);
    if (!unchanged()) return blocked('Outra partida começou durante a verificação. A recuperação foi preservada.');
    const baseline = downloadedBaseline && isCheckpoint(downloadedBaseline.checkpoint)
      ? { revision: downloadedBaseline.revision, checkpoint: cloneCheckpoint(downloadedBaseline.checkpoint) } : null;
    if (!baseline || baseline.revision !== original.baseline.revision || !checkpointNamesProducer(baseline.checkpoint, original.producer!, original.checkpoint.passport !== null)
      || original.baseline.checkpoint && !sameCheckpoint(baseline.checkpoint, original.baseline.checkpoint)) {
      return blocked('A revisão histórica não corresponde à origem da cópia local. Ela foi preservada.');
    }
    if (sameCheckpoint(original.checkpoint, current.checkpoint)) return { status: 'durable', captureId: original.id, canonical: current, verifiedCapture: cloneCheckpointCapture(original) };
    // A past departure cannot be replayed over a later town or passport. Only
    // the authenticated exact pair above can retire its old journal origin.
    if (original.checkpoint.passport !== null) return blocked('O passaporte original não corresponde à viagem confirmada no servidor. A cópia foi preservada.');
    // A native publication after the historical baseline is rejected by the
    // server's publication ledger. Resource commits may still merge atomically.
    const baselineSHA256=await checkpointDigest(baseline.checkpoint),checkpointSHA256=await checkpointDigest(original.checkpoint);
    const intent:CheckpointRecoveryIntent={id:original.id,source:'commit',gameInstance:original.gameInstance,nativeToken:original.nativeToken,
      producer:original.producer!,context:original.context!,baselineRevision:original.baseline.revision,baselineSHA256,checkpointSHA256};
    const intentJSON=checkpointRecoveryIntentJSON(intent);
    const intentHash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(intentJSON));
    const intentSHA256=Array.from(new Uint8Array(intentHash),byte=>byte.toString(16).padStart(2,'0')).join('');
    if(!unchanged())return blocked('A origem mudou antes da recuperação. A cópia foi preservada.');
    const receipt=await transport.recover({intent,expectedOwnRevision:current.revision},cloneCheckpoint(original.checkpoint));
    if(!unchanged()||receipt.captureId!==original.id||receipt.intentSHA256!==intentSHA256||receipt.baselineRevision!==original.baseline.revision||
      receipt.baselineSHA256!==baselineSHA256||receipt.submittedSHA256!==checkpointSHA256||!Number.isSafeInteger(receipt.revision)||!Number.isSafeInteger(receipt.previousOwnRevision)||
      receipt.previousOwnRevision<original.context!.currentOwnRevision||receipt.previousOwnRevision>current.revision||
      receipt.revision<receipt.previousOwnRevision||receipt.revision>receipt.previousOwnRevision+1||
      !Number.isSafeInteger(receipt.worldSequence)||receipt.worldSequence<original.context!.appliedSequence||! /^[a-f0-9]{64}$/.test(receipt.checkpointSHA256))return blocked('O recibo não confirma a recuperação original. A cópia foi preservada.');
    const canonical=await transport.download(receipt.revision);
    if(!unchanged()||!canonical||canonical.revision!==receipt.revision||!checkpointNamesProducer(canonical.checkpoint,original.producer!)||
      await checkpointDigest(canonical.checkpoint)!==receipt.checkpointSHA256)return blocked('A revisão recuperada não foi conferida por inteiro. A cópia foi preservada.');
    if(!unchanged())return blocked('A origem mudou durante a última conferência. A cópia original foi preservada.');
    // This result confirms durability only. The caller cannot use it to rebase
    // a current game or acknowledge the original native token.
    return { status: sameCheckpoint(original.checkpoint, canonical.checkpoint) ? 'durable' : 'merged', captureId: original.id, canonical, verifiedCapture: cloneCheckpointCapture(original) };
  } catch (error) {
    return blocked(error instanceof Error ? error.message : 'A conexão não confirmou a recuperação. A cópia original foi preservada.');
  }
}

export type PriorBootLiveRecoveryTransport = {
  /** Authenticated private GET, with the paired body and digests verified. */
  download(revision?: number): Promise<PriorBootCheckpoint | null>;
  /** Dedicated receipt-backed recovery RPC; never a regular save PUT/import. */
  recover(request: CheckpointRecoveryRequest, checkpoint: NativeCheckpoint): Promise<CheckpointRecoveryReceipt>;
  currentCaptureStarted(): boolean;
};
export type PriorBootLiveRecoveryResult =
  | { status: 'recovered'; captureId: string; canonical: PriorBootCheckpoint; receipt: CheckpointRecoveryReceipt; verifiedCapture: CheckpointCapture }
  | { status: 'blocked'; captureId: string; reason: string };

function sameStoredCapture(a: CheckpointCapture, b: CheckpointCapture): boolean {
  return a.id === b.id && a.source === b.source && a.gameInstance === b.gameInstance && a.nativeToken === b.nativeToken
    && a.repaymentWitness === b.repaymentWitness
    && a.createdAt === b.createdAt && (a.context === null ? b.context === null : sameCheckpointContext(a.context, b.context))
    && a.producer?.pid === b.producer?.pid && a.producer?.ownTownIdentity === b.producer?.ownTownIdentity
    && sameCheckpoint(a.checkpoint, b.checkpoint) && a.baseline.revision === b.baseline.revision
    && (a.baseline.checkpoint === null ? b.baseline.checkpoint === null : sameCheckpoint(a.baseline.checkpoint, b.baseline.checkpoint));
}

/** Recovers an exact old live origin by server receipt, without touching native RAM or its old token. */
export async function recoverPriorBootLive(capture: CheckpointCapture,
  owner: { userId: string; currentGameInstance: string; ownTownIdentity: string },
  transport: PriorBootLiveRecoveryTransport, factory: IDBFactory = indexedDB): Promise<PriorBootLiveRecoveryResult> {
  const captureId = capture.id;
  const blocked = (reason: string): PriorBootLiveRecoveryResult => ({ status: 'blocked', captureId, reason });
  if (!validStoredCapture(capture) || capture.source !== 'live' || !capture.context || !capture.producer
    || capture.gameInstance === owner.currentGameInstance || !owner.currentGameInstance
    || !Number.isSafeInteger(capture.createdAt) || capture.createdAt < 0
    || capture.context.activeWorldTownId !== owner.userId || capture.producer.ownTownIdentity !== owner.ownTownIdentity
    || capture.baseline.revision < 1 || capture.baseline.revision !== capture.context.ramBaselineRevision
    || !checkpointNamesProducer(capture.checkpoint, capture.producer)) {
    return blocked('A cópia ao vivo não comprova a cidade, o morador e a origem desta recuperação. Ela foi preservada.');
  }
  const original = cloneCheckpointCapture(capture);
  const unchanged = () => !transport.currentCaptureStarted() && sameStoredCapture(original, capture);
  const journalUnchanged = async () => {
    const journal = await readCheckpointJournal(owner.userId, factory);
    if (!journal || !unchanged()) return false;
    const records = [journal.latestCapture, journal.conflictCapture, journal.unboundCommit, ...journal.recoveryCaptures]
      .filter((value): value is CheckpointCapture => value !== null && value.id === captureId);
    return records.length > 0 && records.every(value => sameStoredCapture(original, value));
  };
  try {
    if (!unchanged() || !await journalUnchanged()) return blocked('A cópia local mudou ou outra partida começou. A recuperação foi preservada.');
    const downloadedCurrent = await transport.download();
    const current = downloadedCurrent && isCheckpoint(downloadedCurrent.checkpoint)
      ? { revision: downloadedCurrent.revision, checkpoint: cloneCheckpoint(downloadedCurrent.checkpoint) } : null;
    if (!unchanged()) return blocked('A origem da cópia mudou durante a verificação. Ela foi preservada.');
    if (!current || !Number.isSafeInteger(current.revision) || current.revision < original.context!.currentOwnRevision
      || !checkpointNamesProducer(current.checkpoint, original.producer!)) {
      return blocked('A cidade atual do servidor não confirma a origem desta cópia. Ela foi preservada.');
    }
    const downloadedBaseline = await transport.download(original.baseline.revision);
    const baseline = downloadedBaseline && isCheckpoint(downloadedBaseline.checkpoint)
      ? { revision: downloadedBaseline.revision, checkpoint: cloneCheckpoint(downloadedBaseline.checkpoint) } : null;
    if (!unchanged()) return blocked('A origem da cópia mudou durante a verificação histórica. Ela foi preservada.');
    if (!baseline || baseline.revision !== original.baseline.revision || !checkpointNamesProducer(baseline.checkpoint, original.producer!)
      || original.baseline.checkpoint && !sameCheckpoint(original.baseline.checkpoint, baseline.checkpoint)) {
      return blocked('A revisão histórica não corresponde à origem da cópia local. Ela foi preservada.');
    }
    const baselineSHA256 = await checkpointDigest(baseline.checkpoint);
    if (!unchanged()) return blocked('A origem da cópia mudou durante a conferência histórica. Ela foi preservada.');
    const checkpointSHA256 = await checkpointDigest(original.checkpoint);
    if (!unchanged()) return blocked('A origem da cópia mudou durante a conferência dos bytes. Ela foi preservada.');
    const intent: CheckpointRecoveryIntent = Object.freeze({ id: original.id, source: 'live', gameInstance: original.gameInstance,
      nativeToken: original.nativeToken, producer: original.producer!, context: original.context!, baselineRevision: original.baseline.revision,
      baselineSHA256, checkpointSHA256 });
    const intentJSON = checkpointRecoveryIntentJSON(intent);
    const intentDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(intentJSON));
    const intentSHA256 = Array.from(new Uint8Array(intentDigest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (!unchanged() || !await journalUnchanged()) return blocked('A cópia local mudou antes da publicação. Ela foi preservada.');
    const request: CheckpointRecoveryRequest = Object.freeze({ intent, expectedOwnRevision: current.revision });
    const receipt = { ...await transport.recover(request, cloneCheckpoint(original.checkpoint)) };
    if (!unchanged()) return blocked('A cópia local mudou durante a publicação. Ela foi preservada.');
    const sha = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
    if (receipt.captureId !== captureId || receipt.intentSHA256 !== intentSHA256 || receipt.baselineRevision !== original.baseline.revision
      || receipt.baselineSHA256 !== baselineSHA256 || receipt.submittedSHA256 !== checkpointSHA256
      || !Number.isSafeInteger(receipt.previousOwnRevision) || receipt.previousOwnRevision < original.context!.currentOwnRevision
      || receipt.previousOwnRevision > request.expectedOwnRevision || !Number.isSafeInteger(receipt.revision)
      || receipt.revision < receipt.previousOwnRevision || receipt.revision > receipt.previousOwnRevision + 1
      || !Number.isSafeInteger(receipt.worldSequence)
      || receipt.worldSequence < original.context!.appliedSequence || !sha(receipt.checkpointSHA256)
      || checkpointRecoveryIntentJSON(request.intent) !== intentJSON) {
      return blocked('O recibo não confirma esta origem e estes bytes. A cópia original foi preservada.');
    }
    // On replay this can be older than the latest GET: pin the receipt's own
    // revision, rather than mistaking a subsequent save for this recovery.
    const downloaded = await transport.download(receipt.revision);
    const canonical = downloaded && isCheckpoint(downloaded.checkpoint)
      ? { revision: downloaded.revision, checkpoint: cloneCheckpoint(downloaded.checkpoint) } : null;
    if (!unchanged()) return blocked('A cópia local mudou durante a confirmação. Ela foi preservada.');
    if (!canonical || canonical.revision !== receipt.revision || !checkpointNamesProducer(canonical.checkpoint, original.producer!)
      || await checkpointDigest(canonical.checkpoint) !== receipt.checkpointSHA256) {
      return blocked('A revisão do recibo não pôde ser conferida por inteiro. A cópia original foi preservada.');
    }
    if (!unchanged() || !await journalUnchanged()) return blocked('O journal mudou durante a confirmação. Nenhuma nova partida foi iniciada.');
    return { status: 'recovered', captureId, canonical, receipt, verifiedCapture: cloneCheckpointCapture(original) };
  } catch (error) {
    return blocked(error instanceof Error ? error.message : 'O servidor não confirmou a recuperação. A cópia original foi preservada.');
  }
}
const JOURNAL_DATABASE = 'elysium-server-checkpoints';
const PREVIOUS_JOURNAL_DATABASE = 'elysium-private-checkpoints';
const JOURNAL_STORE = 'pending';
/** Local browser/account gate inspects only pending-record metadata. It never
 * decodes old checkpoints, migrates entries, clears archives or claims their
 * durability. Unresolved or unknown old records block this browser's game. */
export async function assertPreviousCheckpointJournalSettled(userId: string, factory: IDBFactory = indexedDB): Promise<void> {
  const blocked=()=>new Error('Há uma cópia do seu progresso anterior que ainda precisa ser conferida neste navegador. Para preservá-la, o jogo não pode começar aqui. Essa cópia permanece guardada, sem ser apagada ou substituída.');
  const databases=await factory.databases();
  if(!databases.some(value=>value.name===PREVIOUS_JOURNAL_DATABASE))return;
  const database=await new Promise<IDBDatabase>((resolve,reject)=>{
    const request=factory.open(PREVIOUS_JOURNAL_DATABASE);
    request.onupgradeneeded=()=>{request.transaction?.abort();reject(blocked());};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(blocked());request.onblocked=()=>reject(blocked());
  });
  try {
    if(!database.objectStoreNames.contains(JOURNAL_STORE))throw blocked();
    const previous=await new Promise<unknown>((resolve,reject)=>{
      const request=database.transaction(JOURNAL_STORE,'readonly').objectStore(JOURNAL_STORE).get(userId);
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(blocked());
    });
    if(previous===undefined)return;
    if(!previous||typeof previous!=='object')throw blocked();
    const record=previous as Record<string,unknown>;
    if(record.userId!==userId||!Number.isSafeInteger(record.updatedAt)||(record.updatedAt as number)<0||record.latestCapture!==null||record.conflictCapture!==null||record.unboundCommit!==null||
      !Array.isArray(record.recoveryCaptures)||record.recoveryCaptures.some(value=>!value||typeof value!=='object'||
        (value.source!=='live'&&value.source!=='commit')||typeof value.id!=='string'||!value.id||value.repaymentWitness!==undefined||
        !Number.isSafeInteger(value.nativeToken)||(value.source==='live'?value.nativeToken<=0:value.nativeToken===0)||
        typeof value.gameInstance!=='string'||!value.gameInstance||!Number.isSafeInteger(value.createdAt)||value.createdAt<0||
        !(isCheckpointContext(value.context)||value.context===null&&value.source==='commit')||
        value.context&&value.context.gameInstance!==value.gameInstance||
        !(isCheckpointProducer(value.producer)||value.producer===null&&value.source==='commit')||
        !Number.isSafeInteger(value.baseline?.revision)||value.baseline.revision<0))throw blocked();
    // Only recognized inactive archive metadata remains. Its bytes stay in
    // the old DB; accepting this metadata does not assert archive durability.
  } finally {database.close();}
}
function journalDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(JOURNAL_DATABASE, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(JOURNAL_STORE, { keyPath: 'userId' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Este navegador não conseguiu preservar a cópia local do progresso.', { cause: request.error }));
    request.onblocked = () => reject(new Error('A cópia local aguarda outra aba liberar o armazenamento.'));
  });
}
function validStoredCapture(value: unknown): value is CheckpointCapture {
  if (!value || typeof value !== 'object') return false;
  const capture = value as CheckpointCapture;
  return typeof capture.id === 'string' && !!capture.id && isCheckpoint(capture.checkpoint)
    && (isCheckpointContext(capture.context) || capture.context === null && capture.source === 'commit')
    && Number.isSafeInteger(capture.nativeToken) && (capture.source === 'live' ? capture.nativeToken > 0 : capture.nativeToken !== 0)
    && (capture.source === 'live' || capture.source === 'commit')
    && (capture.repaymentWitness === undefined || capture.repaymentWitness === true && capture.source === 'live' && capture.checkpoint.passport === null)
    && typeof capture.gameInstance === 'string' && !!capture.gameInstance && (!capture.context || capture.context.gameInstance === capture.gameInstance)
    && Number.isSafeInteger(capture.createdAt) && capture.createdAt >= 0
    && (capture.producer === null && capture.source === 'commit' || isCheckpointProducer(capture.producer))
    && Number.isSafeInteger(capture.baseline?.revision) && capture.baseline.revision >= 0
    && (capture.baseline.checkpoint === null || isCheckpoint(capture.baseline.checkpoint));
}
function validJournal(value: unknown, userId: string): value is CheckpointJournal {
  if (!value || typeof value !== 'object') return false;
  const entry = value as CheckpointJournal;
  return entry.userId === userId && [entry.latestCapture, entry.conflictCapture, entry.unboundCommit].every(capture => capture === null || validStoredCapture(capture))
    && Array.isArray(entry.recoveryCaptures) && entry.recoveryCaptures.every(validStoredCapture);
}
export async function readCheckpointJournal(userId: string, factory: IDBFactory = indexedDB): Promise<CheckpointJournal | null> {
  const database = await journalDatabase(factory);
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(JOURNAL_STORE, 'readonly').objectStore(JOURNAL_STORE).get(userId);
      request.onsuccess = () => {
        if (request.result === undefined) resolve(null);
        else if (validJournal(request.result, userId)) resolve(request.result);
        else reject(new Error('A cópia local está incompleta. Ela foi preservada sem substituir sua cidade.'));
      };
      request.onerror = () => reject(request.error);
    });
  } finally { database.close(); }
}
export async function writeCheckpointJournal(userId: string, queue: Pick<CheckpointQueue, 'latestCapture' | 'conflictCapture' | 'unboundCommit' | 'recoveryCaptures'>,
  factory: IDBFactory = indexedDB): Promise<void> {
  const entry: CheckpointJournal = { userId, latestCapture: queue.latestCapture, conflictCapture: queue.conflictCapture, unboundCommit: queue.unboundCommit, recoveryCaptures: queue.recoveryCaptures, updatedAt: Date.now() };
  if (!userId || !validJournal(entry, userId)) throw new Error('A cópia local do progresso está incompleta.');
  const database = await journalDatabase(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(JOURNAL_STORE, 'readwrite');
      const store = transaction.objectStore(JOURNAL_STORE);
      if (entry.latestCapture || entry.conflictCapture || entry.unboundCommit || entry.recoveryCaptures.length) store.put(entry);
      else store.delete(userId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('A cópia local não foi concluída.'));
    });
  } finally { database.close(); }
}
/** A late ACK cannot delete a newer capture or unresolved original COMMIT. */
export async function acknowledgeCheckpointJournal(userId: string, captureId: string, factory: IDBFactory = indexedDB): Promise<void> {
  const database = await journalDatabase(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(JOURNAL_STORE, 'readwrite');
      const store = transaction.objectStore(JOURNAL_STORE), request = store.get(userId);
      request.onsuccess = () => {
        const entry = request.result;
        if (validJournal(entry, userId) && entry.latestCapture?.id === captureId && !entry.latestCapture.repaymentWitness && !entry.conflictCapture && !entry.unboundCommit) {
          if (entry.recoveryCaptures.length) store.put({ ...entry, latestCapture: null, updatedAt: Date.now() });
          else store.delete(userId);
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}
/** An exact origin proof retires only that record, in every journal position. */
export async function retireCheckpointJournalCapture(userId: string, capture: CheckpointCapture,
  factory: IDBFactory = indexedDB): Promise<boolean> {
  if (!validStoredCapture(capture)) throw new Error('A origem da cópia recuperada está incompleta.');
  const proof = cloneCheckpointCapture(capture), captureId = proof.id, database = await journalDatabase(factory);
  let retired = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(JOURNAL_STORE, 'readwrite'), store = transaction.objectStore(JOURNAL_STORE), request = store.get(userId);
      request.onsuccess = () => {
        const entry = request.result;
        if (!validJournal(entry, userId)) return;
        const matches = [...entry.recoveryCaptures, entry.latestCapture, entry.conflictCapture, entry.unboundCommit]
          .filter((capture): capture is CheckpointCapture => capture !== null && capture.id === captureId);
        if (!matches.length || matches.some(capture => !sameStoredCapture(capture, proof))) return;
        const keep = (capture: CheckpointCapture | null) => capture?.id === captureId ? null : capture;
        const next: CheckpointJournal = { ...entry, latestCapture: keep(entry.latestCapture), conflictCapture: keep(entry.conflictCapture),
          unboundCommit: keep(entry.unboundCommit), recoveryCaptures: entry.recoveryCaptures.filter(capture => capture.id !== captureId), updatedAt: Date.now() };
        if (journalCaptures(next).length) store.put(next); else store.delete(userId);
        retired = true;
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return retired;
  } finally { database.close(); }
}
/** A confirmed merge archives this original without replacing another capture. */
export async function archiveCheckpointJournalCapture(userId: string, capture: CheckpointCapture,
  factory: IDBFactory = indexedDB): Promise<boolean> {
  if (!validStoredCapture(capture)) throw new Error('A origem da cópia recuperada está incompleta.');
  const proof = cloneCheckpointCapture(capture), captureId = proof.id, database = await journalDatabase(factory);
  let archived = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(JOURNAL_STORE, 'readwrite'), store = transaction.objectStore(JOURNAL_STORE), request = store.get(userId);
      request.onsuccess = () => {
        const entry = request.result;
        if (!validJournal(entry, userId)) return;
        const matches = [entry.latestCapture, entry.conflictCapture, entry.unboundCommit, ...entry.recoveryCaptures]
          .filter((capture): capture is CheckpointCapture => capture !== null && capture.id === captureId);
        if (!matches.length || matches.some(capture => !sameStoredCapture(capture, proof))) return;
        const keep = (capture: CheckpointCapture | null) => capture?.id === captureId ? null : capture;
        const recoveryCaptures = entry.recoveryCaptures.some(capture => capture.id === captureId)
          ? entry.recoveryCaptures : [...entry.recoveryCaptures, matches[0]!];
        store.put({ ...entry, latestCapture: keep(entry.latestCapture), conflictCapture: keep(entry.conflictCapture),
          unboundCommit: keep(entry.unboundCommit), recoveryCaptures, updatedAt: Date.now() } satisfies CheckpointJournal);
        archived = true;
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return archived;
  } finally { database.close(); }
}
/** Only an explicit recovery decision removes an unresolved previous session. */
export async function discardCheckpointJournal(userId: string, factory: IDBFactory = indexedDB): Promise<void> {
  const database = await journalDatabase(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(JOURNAL_STORE, 'readwrite');
      transaction.objectStore(JOURNAL_STORE).delete(userId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}
