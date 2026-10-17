import { WORLD_SCENE, type ActorCommit, type WorldCommit } from '../shared/world';
import type { NativeGame, NativeCheckpoint, WorldIdentity } from '../shared/contracts';
import type { FishingOperation, FishingOperationResult, FishingSnapshot, FishingCast, FishingPendingOrigin } from '../shared/fishing';
import { WorldClient, errorMessage, type WorldSocket, type FishingWorldPort } from './world-client';
import { isCheckpoint } from './checkpoint';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= max;
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u.test(value);
const time = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const point = (value: unknown): boolean => object(value) && ['x', 'y', 'z'].every(key => typeof value[key] === 'number' && Number.isFinite(value[key]) && Math.abs(value[key] as number) <= 100_000);
function validCast(value: unknown, townId: string, pid: string): value is FishingCast {
  return object(value) && uuid(value.id) && typeof value.townId === 'string' && value.pid === pid && typeof value.actorId === 'string'
    && typeof value.townIdentity === 'string' && (value.fishId === null || uuid(value.fishId))
    && (value.generation === null || integer(value.generation)) && (value.fishType === null || integer(value.fishType, 44))
    && ['waiting', 'approaching', 'touch', 'bite', 'caught', 'released', 'escaped'].includes(String(value.phase))
    && point(value.bobber) && Array.isArray(value.touches) && value.touches.length <= 5 && value.touches.every(time)
    && (value.biteAt === null || time(value.biteAt)) && (value.biteUntil === null || time(value.biteUntil))
    && (value.landedAt === null || time(value.landedAt)) && (value.rodType === 0 || value.rodType === 1)
    && integer(value.createdAt) && typeof value.pending === 'boolean' && typeof value.credited === 'boolean';
}
function validSnapshot(value: unknown, townId: string, identity: WorldIdentity): value is FishingSnapshot {
  if (!object(value)) return false;
  const origin = value.pendingOrigin;
  const validOrigin = origin === null || object(origin) && typeof origin.townId === 'string' && typeof origin.townIdentity === 'string' && uuid(origin.operationId);
  const validOwnedCast = value.cast === null ? origin === null : validCast(value.cast, townId, identity.pid)
    && (origin === null ? value.cast.townId === townId && value.cast.townIdentity === identity.townIdentity
      : object(origin) && value.cast.townId === origin.townId && value.cast.townIdentity === origin.townIdentity
        && value.cast.phase === 'caught' && value.cast.pending && !value.cast.credited);
  return value.townId === townId && value.townIdentity === identity.townIdentity && validOrigin && validOwnedCast
    && integer(value.sequence) && integer(value.version) && integer(value.serverTime)
    && Array.isArray(value.entities) && value.entities.length <= 2 && value.entities.every(entity => object(entity)
      && point(entity) && uuid(entity.id) && integer(entity.generation) && entity.generation > 0 && integer(entity.fishType, 44)
      && integer(entity.angle, 65535) && integer(entity.expiresAt) && (entity.reservation === null || object(entity.reservation)
        && typeof entity.reservation.actorId === 'string' && typeof entity.reservation.pid === 'string' && /^[a-f0-9]{40}$/u.test(entity.reservation.pid) && uuid(entity.reservation.castId)))
    ;
}
type Options = { native: NativeGame; world: WorldClient; townId(): string; online(): boolean;
  admit(): void; canonical(revision: number): Promise<{ checkpoint: NativeCheckpoint; revision: number }>;
  canonicalApplied(checkpoint: NativeCheckpoint, revision: number): void;
  onError(message: string, code: string): void };

/** Fishing uses World's intention and delivery queue; it never owns a second mutation queue. */
export class FishingClient implements FishingWorldPort {
  private socket: WorldSocket | null = null;
  private unsubscribe: (() => void)[] = [];
  private identity: WorldIdentity | null = null;
  private snapshot: FishingSnapshot | null = null;
  private receipts = new Map<string, FishingOperationResult>();
  private pending: FishingOperation | null = null;
  private epoch = 0;
  private admittedToken = 0;
  private admittedIntent = 0;
  /** A confirmed cast's rod animation, started on the first tick where Native fishing is enabled again. */
  private resumeIntent = 0;
  private resolutionOrigin: FishingPendingOrigin | null = null;
  private appliedSignature = '';
  private snapshotAt = 0;
  private continuing: Promise<void> | null = null;
  private continueRetryAt = 0;
  constructor(private readonly options: Options) { options.world.attachFishing(this); }
  connect(socket: WorldSocket): void {
    this.disconnect(); this.socket = socket;
    const epoch = this.epoch;
    this.unsubscribe.push(socket.onMessage<unknown>('fishing_snapshot', value => {
      if (this.socket !== socket || epoch !== this.epoch) return;
      const identity = this.options.native.worldIdentity();
      // Save/title scenes have no active resident identity. The room sends a
      // fresh snapshot on the next world binding and during its regular tick.
      if (!identity) return;
      if (!validSnapshot(value, this.options.townId(), identity)) return this.invalid();
      if (!this.snapshot || value.sequence >= this.snapshot.sequence) { this.snapshot = structuredClone(value); this.snapshotAt = performance.now(); }
      this.tick();
    }));
    this.unsubscribe.push(socket.onMessage<unknown>('fishing_receipt', value => {
      if (this.socket !== socket || epoch !== this.epoch) return;
      const identity = this.options.native.worldIdentity();
      if (!identity || !object(value) || !object(value.receipt) || !uuid(value.receipt.operationId)
        || value.receipt.operationId !== this.pending?.id || value.receipt.pid !== identity.pid
        || !validSnapshot(value.fishing, this.options.townId(), identity) || !object(value.actor)
        || value.actor.pid !== identity.pid || !integer(value.actor.ownRevision)
        || !Array.isArray(value.actor.pockets) || value.actor.pockets.length !== 15 || !value.actor.pockets.every(item => integer(item, 65535))
        || !integer(value.actor.conditions, 0xffffffff) || !integer(value.actor.wallet, 0xffffffff) || !object(value.world)
        || value.world.kind !== 'fishing' || value.world.townId !== this.options.townId()
        || !integer(value.world.sequence) || !integer(value.world.version) || !Array.isArray(value.world.tiles) || value.world.tiles.length !== 0
        || value.world.sequence !== value.fishing.sequence && value.replayed !== true
        || typeof value.replayed !== 'boolean'
        || value.world.operationId !== this.pending.id || value.actor.operationId !== this.pending.id) return this.invalid();
      const result = value as unknown as FishingOperationResult;
      if (!validCast(result.receipt.cast, this.options.townId(), identity.pid)) return this.invalid();
      const sourceTownId = this.resolutionOrigin?.townId ?? this.options.townId();
      if (result.receipt.cast.townId !== sourceTownId || this.resolutionOrigin
        && result.receipt.cast.townIdentity !== this.resolutionOrigin.townIdentity) return this.invalid();
      const credit = result.receipt.credit;
      if (credit && (!integer(credit.fishType, 44) || !integer(credit.item, 65535) || credit.slot !== null && !integer(credit.slot, 14)
        || credit.collectionWordBefore !== null && !integer(credit.collectionWordBefore, 0xffffffff)
        || credit.collectionWordAfter !== null && !integer(credit.collectionWordAfter, 0xffffffff) || typeof credit.completesCollection !== 'boolean')) return this.invalid();
      this.receipts.set(result.receipt.operationId, structuredClone(result));
      // The original catch animation can reach its safe, gated FLY state while GET is in flight.
      const latestCast = result.replayed && result.fishing.cast?.id === result.receipt.cast.id ? result.fishing.cast : result.receipt.cast;
      try { if (latestCast.townId === this.options.townId()) this.options.native.fishingCast(latestCast, result.replayed ? result.fishing.sequence : result.world.sequence, result.fishing.serverTime); }
      catch (error) { this.options.onError(errorMessage(error, 'A pesca aguarda sincronização.'), 'fishing_apply_failed'); }
    }));
    this.unsubscribe.push(socket.onMessage<{ operationId?: string; code: string; message: string }>('fishing_error', value => {
      if (this.socket !== socket || epoch !== this.epoch || !object(value) || typeof value.code !== 'string' || typeof value.message !== 'string') return;
      this.options.world.fishingError(value);
      this.options.onError(value.message, value.code);
    }));
  }
  disconnect(): void {
    this.epoch++; for (const unsubscribe of this.unsubscribe.splice(0)) unsubscribe();
    this.socket = null; this.options.native.fishingEnabled(false); this.snapshot = null; this.appliedSignature = '';
    this.resumeIntent = 0; // The server releases a live cast on disconnect.
    this.continuing = null; this.continueRetryAt = 0;
    // Pending operation/receipt keeps its exact ID across a transport interruption.
  }
  tick(): void {
    const identity = this.options.native.worldIdentity();
    const ready = !!this.socket && !!identity && this.options.native.position()?.scene === WORLD_SCENE && this.options.online() && this.options.world.isReady();
    this.options.native.fishingEnabled(ready);
    if (!ready || !identity) return;
    if (this.identity && (identity.pid !== this.identity.pid || identity.townIdentity !== this.identity.townIdentity)) {
      if (this.pending) this.reject(this.pending.id);
      this.receipts.clear(); this.admittedToken = 0; this.resumeIntent = 0;
    }
    if (!this.identity || identity.gameInstance !== this.identity.gameInstance || identity.townIdentity !== this.identity.townIdentity) {
      this.options.native.fishingBind({ ...identity, townId: this.options.townId() });
      this.identity = { ...identity }; this.appliedSignature = '';
    }
    if (this.resumeIntent) {
      const token = this.resumeIntent; this.resumeIntent = 0;
      try { this.options.native.fishingResumeCast(token); }
      catch (error) { this.options.onError(errorMessage(error, 'O lançamento aguarda a cópia confirmada do morador.'), 'fishing_apply_failed'); }
    }
    const versions = this.options.world.versions();
    const request = this.options.native.fishingRequest();
    if (this.snapshot && this.snapshot.sequence <= versions.appliedSequence) {
      const serverTime = this.snapshot.serverTime + Math.max(0, performance.now() - this.snapshotAt);
      const projected = structuredClone(this.snapshot);
      const liveCast = projected.cast;
      if (liveCast && !['caught', 'released', 'escaped'].includes(liveCast.phase) && liveCast.landedAt !== null) {
        liveCast.phase = liveCast.biteUntil !== null && serverTime >= liveCast.biteUntil ? 'escaped'
          : liveCast.biteAt !== null && serverTime >= liveCast.biteAt ? 'bite'
          : liveCast.touches.some(at => at <= serverTime) ? 'touch' : liveCast.fishId === null ? 'waiting' : 'approaching';
      }
      const signature = JSON.stringify({ sequence: projected.sequence, entities: projected.entities, cast: liveCast, touches: liveCast?.touches.filter(at => at <= serverTime).length });
      if (signature !== this.appliedSignature) {
        this.options.native.fishingSnapshot(projected);
        const cast = liveCast;
        if (cast?.pending && cast.phase === 'caught' && cast.fishType !== null && !this.options.native.fishingState()?.castId) {
          try { this.options.native.fishingRestorePending(cast.id, cast.fishType); }
          catch {
            // An actor snapshot does not carry the collection words. Preserve
            // the pending descriptor until a real capture/GET Own pair rebases them.
            this.options.native.fishingEnabled(false);
            this.options.world.pauseForCheckpoint(); this.options.admit(); return;
          }
        }
        if (!request && cast && cast.townId === this.options.townId() && this.options.native.fishingState()?.castId === cast.id) this.options.native.fishingCast(cast, projected.sequence, serverTime);
        // Only a received terminal server state can release the canonical pin;
        // interpolated visuals never confirm a terminal operation or a reward.
        if (this.snapshot.cast && ['released', 'escaped'].includes(this.snapshot.cast.phase)
          && this.options.native.fishingState()?.checkpointToken && !this.pending) this.options.native.fishingTerminal(this.snapshot.cast.id, versions.expectedOwnRevision);
        this.appliedSignature = signature;
      }
    }
    if (this.pending || this.continuing || this.options.world.hasPendingOperation()) return;
    const activeCast = this.options.native.fishingState();
    // Before FLOAT, recovering disables the original READY→CAST request.
    // Proactive Own is safe only after this cast's server-confirmed LAND;
    // a pending LAND/REEL already carries the original native safe-point.
    const landed = this.snapshot?.cast?.id === activeCast?.castId && this.snapshot?.cast?.landedAt !== null;
    if (request?.kind === 2 || request?.kind === 5 || !request && landed && activeCast && activeCast.phase >= 1 && activeCast.phase <= 4
      && !activeCast.result && !activeCast.pending) {
      const token = this.options.native.fishingState()?.checkpointToken ?? 0;
      const proof = token > 0 ? this.options.native.checkpointLineage(token) : null;
      if (!proof?.acknowledged || proof.currentGameInstance !== identity.gameInstance
        || proof.reconciledInstance !== identity.gameInstance || proof.reconciledRevision < versions.expectedOwnRevision) {
        if (performance.now() < this.continueRetryAt) return;
        const epoch = this.epoch;
        const task = this.options.world.reconcileFishingCheckpoint(token, this.options.canonical, this.options.canonicalApplied)
          .then(() => {}).catch(error => {
            if (epoch === this.epoch) this.options.onError(errorMessage(error, 'A pesca aguarda a cópia confirmada do morador.'), 'fishing_apply_failed');
          }).finally(() => {
            if (epoch !== this.epoch) return;
            if (this.continuing === task) this.continuing = null;
            // A retained REEL/bite cannot spend its server window in backoff.
            // The in-flight promise already serializes the next safe attempt.
            const current = this.options.native.fishingRequest();
            const urgent = current?.kind === 2 || this.options.native.fishingState()?.phase === 4
              || !!current && current.id !== request?.id;
            this.continueRetryAt = urgent ? 0 : performance.now() + 500;
          });
        this.continuing = task;
        return;
      }
    }
    if (!request) return;
    if (request.kind === 1 || request.kind === 3 || request.kind === 4) {
      if (request.kind === 1 && !this.options.native.fishingAdmissionValid()) {
        this.options.native.fishingReject(request.id); this.options.onError('A posição ou a vara mudou antes de lançar. Tente novamente.', 'fishing_admission_changed'); return;
      }
      const token = this.options.native.fishingState()?.checkpointToken ?? 0;
      const lineage = token > 0 ? this.options.native.checkpointLineage(token) : null;
      const provenRevision = request.kind === 4 ? Math.max(lineage?.acceptedRevision ?? 0, lineage?.reconciledRevision ?? 0) : lineage?.acceptedRevision;
      if (!lineage?.acknowledged || provenRevision !== versions.expectedOwnRevision
        || lineage.currentGameInstance !== identity.gameInstance) { this.options.admit(); return; }
      this.admittedToken = token;
      this.admittedIntent = request.token;
    }
    const common = { id: request.id, ...versions };
    const operation: FishingOperation = request.kind === 1 ? { ...common, kind: 'cast' }
      : request.kind === 3 ? { ...common, kind: 'keep', castId: request.castId, slot: request.slot }
      : { ...common, kind: request.kind === 2 ? 'reel' : request.kind === 5 ? 'land' : 'release', castId: request.castId };
    if (!this.options.native.fishingAdmit(request, versions)) {
      this.options.native.fishingReject(request.id);
      this.options.onError('A origem da pesca mudou antes de enviar. Tente novamente após a sincronização.', 'fishing_admission_changed');
      return;
    }
    if (this.options.world.fishingOperation(operation)) {
      this.pending = operation; this.resolutionOrigin = request.kind === 3 || request.kind === 4 ? this.snapshot?.pendingOrigin ?? null : null;
    }
  }
  async beforeCommit(operationId: string, actor: ActorCommit, world: WorldCommit): Promise<number | null> {
    const result = this.receipts.get(operationId);
    const identity = this.options.native.worldIdentity();
    if (!result || !identity || world.kind !== 'fishing' || result.world.kind !== 'fishing'
      || result.actor.operationId !== actor.operationId || result.world.operationId !== world.operationId
      || result.actor.ownRevision !== actor.ownRevision || result.actor.conditions !== actor.conditions || result.actor.wallet !== actor.wallet
      || result.actor.pockets.length !== actor.pockets.length || result.actor.pockets.some((item, slot) => item !== actor.pockets[slot])
      || result.world.sequence !== world.sequence || result.world.version !== world.version || result.world.townId !== world.townId
      || world.tiles.length !== 0 || JSON.stringify(result.world.entities) !== JSON.stringify(world.entities)
      || result.receipt.pid !== identity.pid) throw new Error('O par confirmado do pescado está incompleto.');
    if (!result.receipt.credit) return null;
    const token = this.options.native.fishingState()?.checkpointToken || this.admittedToken;
    const proof = this.options.native.checkpointLineage(token);
    if (!proof?.acknowledged || proof.currentGameInstance !== identity.gameInstance) throw new Error('A origem do progresso do pescador não foi confirmada.');
    const canonical = await this.options.canonical(actor.ownRevision);
    const current = this.options.native.worldIdentity();
    if (!current || current.pid !== identity.pid || current.gameInstance !== identity.gameInstance || current.townIdentity !== identity.townIdentity
      || canonical.revision !== actor.ownRevision || !isCheckpoint(canonical.checkpoint)) throw new Error('A cidade mudou antes de aplicar o pescado confirmado.');
    if (!await this.options.native.worldOwnCheckpoint(token, canonical.revision, canonical.checkpoint)) throw new Error('O pescado aguarda um momento seguro para aplicar seu progresso.');
    this.options.canonicalApplied(canonical.checkpoint, canonical.revision);
    return canonical.revision;
  }
  complete(operationId: string): void {
    const result = this.receipts.get(operationId);
    if (!result || this.pending?.id !== operationId) throw new Error('A pesca ainda aguarda seu recibo.');
    if (result.receipt.credit) this.options.native.fishingResult(result.receipt, result.actor.ownRevision);
    const cast = result.replayed && result.fishing.cast?.id === result.receipt.cast.id ? result.fishing.cast : result.receipt.cast;
    // The commit is still in World's delivery queue here, so a periodic tick may
    // have disabled Native fishing; tick() resumes once World is ready again.
    if (this.pending.kind === 'cast' && !['released', 'escaped'].includes(cast.phase)) this.resumeIntent = this.admittedIntent;
    if (['released', 'escaped'].includes(cast.phase)) {
      if (cast.townId !== this.options.townId()) this.options.native.fishingResolvePendingTerminal(cast.id, operationId, result.world.sequence, result.actor.ownRevision);
      else this.options.native.fishingTerminal(cast.id, result.actor.ownRevision);
    }
    this.pending = null; this.resolutionOrigin = null; this.receipts.delete(operationId); this.snapshot = result.fishing; this.snapshotAt = performance.now();
    this.tick();
  }
  reject(operationId: string): void {
    this.options.native.fishingReject(operationId);
    const state = this.options.native.fishingState();
    if (state && state.phase >= 6 && state.checkpointToken > 0) this.options.native.fishingTerminal(state.castId, this.options.world.versions().expectedOwnRevision);
    if (this.pending?.id === operationId) this.pending = null;
    this.resolutionOrigin = null;
    this.receipts.delete(operationId); this.options.native.fishingEnabled(false);
  }
  private invalid(): void { this.options.native.fishingEnabled(false); this.options.onError('O estado confirmado da pesca está incompleto.', 'invalid_fishing_state'); this.options.world.requestSnapshot(); }
}
