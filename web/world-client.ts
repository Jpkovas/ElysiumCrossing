import { BARREL_RECIPE } from '../shared/crafting';
import { WORLD_HEIGHT, WORLD_WIDTH, WORLD_FURNITURE_ITEM, WORLD_FURNITURE_LIMIT, type ActorCommit, type ActorSnapshot, type WorldCommit, type WorldFurniture, type WorldOperation, type WorldSnapshot } from '../shared/world';
import type { CheckpointProviderState, NativeCheckpoint, NativeGame, WorldIdentity } from '../shared/contracts';
import { isCheckpoint } from './checkpoint';
import type { FishingOperation } from '../shared/fishing';

export interface FishingWorldPort {
  beforeCommit(operationId: string, actor: ActorCommit, world: WorldCommit): Promise<number | null>;
  complete(operationId: string): void;
  reject(operationId: string): void;
}
export interface PlantingWorldPort {
  prepare(operation: Extract<WorldOperation, { kind: 'plant_fruit' }>): 'accepted' | 'rejected' | 'foreign';
  complete(operationId: string, receipt: { sequence: number; ownRevision: number }): void;
  reject(operationId: string): void;
}
type Intention = WorldOperation | FishingOperation;
const isCrafting = (value: Intention): value is Extract<WorldOperation, { kind: 'learn_recipe' | 'craft_recipe' }> => value.kind === 'learn_recipe' || value.kind === 'craft_recipe';
const isFishing = (value: Intention): value is FishingOperation => value.kind !== 'shake_tree' && value.kind !== 'pickup' && value.kind !== 'plant_fruit' && value.kind !== 'place_furniture' && value.kind !== 'remove_furniture' && !isCrafting(value);

/** Native implementations acknowledge application only after their main-loop safepoint. */
export type WorldNative = Pick<NativeGame, 'lifecycle' | 'checkpointLineage' | 'worldIdentity' | 'checkpointContinuation' | 'worldEnabled' | 'worldBind' | 'worldSnapshot' | 'worldCommit' | 'worldComplete' | 'worldRequest' | 'worldRevision' | 'worldOwnCheckpoint' | 'worldAdmission' | 'worldResumeAdmission' | 'worldCraftRequest' | 'worldCraftCancel' | 'worldCrafting'>;
export interface WorldSocket {
  send(type: string, payload: unknown): void;
  onMessage<T>(type: string, callback: (payload: T) => void): () => void;
}
type WorldError = { operationId?: string; code: string; message: string };
type Delivery = { kind: 'snapshot'; world: WorldSnapshot; actor: ActorSnapshot | null }
  | { kind: 'commit'; world: WorldCommit; actor: ActorCommit | null; own: boolean };
type WorldClientOptions = {
  townId: string;
  ownTownId: string;
  native: WorldNative;
  gameInstance(): string;
  activeTownId(): string;
  baselineRevision(): number;
  ownRevision(): number;
  onOwnRevision(revision: number): void;
  onBaselineRevision(revision: number): void;
  onChange?(context: CheckpointProviderState | null, ready: boolean, requestFreshCapture: boolean): void;
  onError(message: string, code: string): void;
};
const integer = (value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= maximum;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
/** Native commands throw from the game iframe, whose Error is not this realm's Error. */
export const errorMessage = (error: unknown, fallback: string): string => object(error) && typeof error.message === 'string' ? error.message : fallback;
const target = (value: unknown): boolean => object(value) && integer(value.x, WORLD_WIDTH - 1) && integer(value.z, WORLD_HEIGHT - 1);
function validEntities(value: unknown): boolean {
  return Array.isArray(value) && value.length <= WORLD_WIDTH * WORLD_HEIGHT && value.every(entity => object(entity)
    && typeof entity.id === 'string' && entity.id.length > 0 && entity.id.length <= 200 && entity.kind === 'fruit' && integer(entity.item, 0xffff) && target(entity));
}
export function validFurniture(value: unknown, version: number): value is WorldFurniture[] {
  if (!Array.isArray(value) || value.length > WORLD_FURNITURE_LIMIT) return false;
  const cells = new Set<string>();
  let previous = '';
  for (const item of value) {
    if (!object(item) || typeof item.id !== 'string' || !/^[\w-]{8,96}$/u.test(item.id) || item.id <= previous
      || typeof item.ownerId !== 'string' || !/^[\w-]{1,64}$/u.test(item.ownerId) || item.item !== WORLD_FURNITURE_ITEM
      || !target(item) || !integer(item.rotation, 3) || !integer(item.revision) || item.revision < 1 || item.revision > version) return false;
    const cell = `${item.x},${item.z}`;
    if (cells.has(cell)) return false;
    cells.add(cell); previous = item.id;
  }
  return true;
}
export function sameFurniture(left: WorldFurniture[], right: WorldFurniture[]): boolean {
  return left.length === right.length && left.every((item, index) => {
    const other = right[index]!;
    return item.id === other.id && item.ownerId === other.ownerId && item.item === other.item && item.x === other.x && item.z === other.z
      && item.rotation === other.rotation && item.revision === other.revision;
  });
}
function validActor(value: unknown): value is ActorSnapshot {
  return object(value) && typeof value.pid === 'string' && /^[a-f0-9]{40}$/.test(value.pid) && integer(value.ownRevision)
    && Array.isArray(value.pockets) && value.pockets.length === 15 && value.pockets.every(item => integer(item, 0xffff))
    && Array.isArray(value.learnedRecipes) && value.learnedRecipes.length <= 1 && value.learnedRecipes.every(id => id === BARREL_RECIPE.id)
    && integer(value.conditions, 0xffffffff) && integer(value.wallet, 0xffffffff);
}
function validSnapshot(value: unknown, townId: string): value is WorldSnapshot {
  return object(value) && value.townId === townId && integer(value.version) && integer(value.sequence)
    && Array.isArray(value.foreground) && value.foreground.length === WORLD_WIDTH * WORLD_HEIGHT
    && value.foreground.every(item => integer(item, 0xffff)) && validEntities(value.entities) && validFurniture(value.furniture, value.version);
}
function validCommit(value: unknown, townId: string): value is WorldCommit {
  return object(value) && (value.kind === 'world' || value.kind === 'fishing' || value.kind === 'crafting') && value.townId === townId && typeof value.operationId === 'string' && value.operationId.length <= 200
    && integer(value.version) && integer(value.sequence) && Array.isArray(value.tiles) && value.tiles.length <= WORLD_WIDTH * WORLD_HEIGHT
    && (value.kind === 'world' || value.tiles.length === 0)
    && value.tiles.every(tile => object(tile) && target(tile) && integer(tile.before, 0xffff) && integer(tile.after, 0xffff)) && validEntities(value.entities)
    && validFurniture(value.furniture, value.version);
}
function validOperation(value: unknown): value is WorldOperation {
  return object(value) && typeof value.id === 'string' && /^[\w-]{8,96}$/u.test(value.id)
    && integer(value.expectedWorldVersion) && value.expectedWorldVersion > 0 && integer(value.expectedOwnRevision) && value.expectedOwnRevision > 0 && integer(value.appliedSequence)
    && (value.kind === 'shake_tree' || value.kind === 'pickup' || value.kind === 'plant_fruit' && integer(value.pocketSlot, 14)
      || value.kind === 'place_furniture' && integer(value.pocketSlot, 14) && integer(value.rotation, 3)
      || (value.kind === 'learn_recipe' || value.kind === 'craft_recipe') && value.recipeId === BARREL_RECIPE.id
      || value.kind === 'remove_furniture' && typeof value.objectId === 'string' && /^[\w-]{8,96}$/u.test(value.objectId)) && target(value.target);
}

/** One live room and one native intention. Rewards enter RAM only from durable server replies. */
export class WorldClient {
  private actorState: ActorSnapshot | null = null;
  private craftWaiter: { intent: number; operationId: string | null; resolve(): void; reject(error: Error): void } | null = null;
  private failCraft(message: string): void {
    const waiter = this.craftWaiter;
    if (!waiter) return;
    this.craftWaiter = null;
    if (!waiter.operationId) this.options.native.worldCraftCancel(waiter.intent);
    waiter.reject(new Error(message));
  }
  craftingState(): { learned: boolean; apples: number; ready: boolean } {
    const state = this.options.native.worldCrafting();
    return { learned: !!this.actorState?.learnedRecipes.includes(BARREL_RECIPE.id), apples: state.apples,
      ready: this.options.townId === this.options.ownTownId && this.isReady() && !this.intention && !this.craftWaiter && state.ready };
  }
  craftRecipe(kind: 'learn_recipe' | 'craft_recipe', recipeId: typeof BARREL_RECIPE.id): Promise<void> {
    if ((kind !== 'learn_recipe' && kind !== 'craft_recipe') || recipeId !== BARREL_RECIPE.id || !this.craftingState().ready) return Promise.reject(new Error('Espere a conexão e volte ao campo da sua vila.'));
    if (kind === 'craft_recipe' && !this.actorState?.learnedRecipes.includes(recipeId)) return Promise.reject(new Error('Aprenda a receita antes de criar.'));
    const intent = this.options.native.worldCraftRequest(kind);
    if (!Number.isSafeInteger(intent) || intent <= 0) return Promise.reject(new Error('O morador ainda não está pronto para criar.'));
    return new Promise<void>((resolve, reject) => { this.craftWaiter = { intent, operationId: null, resolve, reject }; this.tick(); });
  }
  private socket: WorldSocket | null = null;
  private unsubscribe: (() => void)[] = [];
  private epoch = 0;
  private identity: WorldIdentity | null = null;
  private bound = false;
  private nativeBound = false;
  private changingTown = false;
  private ready = false;
  private version = 0;
  private sequence = 0;
  private furniture: WorldFurniture[] = [];
  private ownRevision = 0;
  private deliveries: Delivery[] = [];
  private pendingSnapshot: Delivery & { kind: 'snapshot' } | null = null;
  private noLiveSnapshot = false;
  private intention: Intention | null = null;
  private fishing: FishingWorldPort | null = null;
  private planting: PlantingWorldPort | null = null;
  private intentionSent = false;
  private recovering = false;
  private paused = false;
  private applyFailed = false;
  private freshCaptureNeeded = false;
  private reconcilingOwn = false;
  private work: Promise<void> | null = null;
  private awaitingCheckpoint: { context: CheckpointProviderState; revision: number; token: number; canonicalMatches: boolean } | null = null;

  constructor(private readonly options: WorldClientOptions) { this.ownRevision = options.ownRevision(); }

  private nativeIdentity(): WorldIdentity | null {
    return this.options.native.worldIdentity() ?? this.options.native.checkpointContinuation();
  }
  context(): CheckpointProviderState | null {
    if (this.changingTown) return null;
    const activeTownId = this.options.activeTownId();
    const liveIdentity = this.nativeIdentity();
    if (liveIdentity && liveIdentity.visitor !== (activeTownId !== this.options.ownTownId)) return null;
    if (liveIdentity && this.identity && (liveIdentity.pid !== this.identity.pid || liveIdentity.townIdentity !== this.identity.townIdentity)) return null;
    return { gameInstance: this.options.gameInstance(), ramBaselineRevision: this.options.baselineRevision(), activeWorldTownId: activeTownId,
      appliedSequence: activeTownId === this.options.townId ? this.sequence : 0, currentOwnRevision: Math.max(this.ownRevision, this.options.ownRevision()) };
  }
  isReady(): boolean { return this.isGameplayReady() && !this.deliveries.length; }
  /** A verified live binding can keep moving while a directed canonical pair arrives.
   * Resource requests and captures still require the stricter isReady(). */
  isGameplayReady(): boolean {
    if (!this.socket || !this.ready || !this.bound || !this.nativeBound || this.changingTown || this.options.activeTownId() !== this.options.townId
      || this.paused || this.recovering || this.reconcilingOwn || this.awaitingCheckpoint) return false;
    const liveIdentity = this.nativeIdentity();
    return !!liveIdentity && !!this.identity && liveIdentity.pid === this.identity.pid
      && liveIdentity.townIdentity === this.identity.townIdentity && liveIdentity.gameInstance === this.identity.gameInstance
      && liveIdentity.visitor === (this.options.townId !== this.options.ownTownId);
  }
  hasPendingOperation(): boolean { return this.intention !== null; }
  townId(): string { return this.options.townId; }
  async settled(): Promise<void> { while (this.work) await this.work; }
  attachFishing(port: FishingWorldPort): void { this.fishing = port; }
  attachPlanting(port: PlantingWorldPort): void { this.planting = port; }
  versions(): { expectedWorldVersion: number; expectedOwnRevision: number; appliedSequence: number } {
    return { expectedWorldVersion: this.version, expectedOwnRevision: Math.max(this.ownRevision, this.options.ownRevision()), appliedSequence: this.sequence };
  }

  /** A train return changes the room, never the runtime or a previous town's command. */
  retarget(townId: string): void {
    if (townId === this.options.townId) return;
    this.disconnect();
    if (this.intention) this.rejectIntention(this.intention);
    this.intention = null;
    this.intentionSent = false;
    this.options.townId = townId;
    this.bound = false;
    this.nativeBound = false;
    this.version = 0;
    this.sequence = 0;
    this.furniture = [];
    this.actorState = null;
    this.changingTown = true;
    this.changed();
  }

  connect(socket: WorldSocket): void {
    this.disconnect();
    // Each new server member starts without a PID, even when gameplay RAM survives.
    this.bound = false;
    this.nativeBound = false;
    this.socket = socket;
    this.paused = false;
    this.applyFailed = false;
    const epoch = this.epoch;
    const listen = <T>(type: string, callback: (data: T) => void) => this.unsubscribe.push(socket.onMessage<T>(type, data => {
      if (this.socket === socket && this.epoch === epoch) callback(data);
    }));
    listen<WorldSnapshot>('world_snapshot', data => this.receiveSnapshot(data));
    listen<ActorSnapshot>('actor_snapshot', data => this.receiveActorSnapshot(data));
    listen<WorldCommit>('world_commit', data => this.receiveCommit(data));
    listen<ActorCommit>('actor_commit', data => this.receiveActorCommit(data));
    listen<WorldError>('world_error', data => this.receiveError(data));
    this.tick();
  }

  disconnect(): void {
    this.failCraft('A conexão foi interrompida. Confira os bolsos após sincronizar antes de tentar novamente.');
    this.epoch++;
    for (const unsubscribe of this.unsubscribe.splice(0)) unsubscribe();
    this.socket = null;
    this.options.native.worldEnabled(false);
    this.ready = false;
    this.deliveries = [];
    this.pendingSnapshot = null;
    this.noLiveSnapshot = false;
    this.recovering = false;
    this.intentionSent = false;
    // The existing bound context still describes RAM after a socket drop.
    this.changed();
  }

  tick(): void {
    if (!this.socket || this.paused) return;
    const liveIdentity = this.nativeIdentity();
    if (!liveIdentity) {
      this.failCraft('O morador saiu do campo. Confira o progresso quando voltar.');
      if (this.ready) { this.ready = false; this.options.native.worldEnabled(false); this.changed(); }
      return;
    }
    if (this.identity && liveIdentity.pid !== this.identity.pid) {
      this.failCraft('O morador mudou. Reabra a cidade antes de criar.');
      this.paused = true;
      this.ready = false;
      this.options.native.worldEnabled(false);
      this.changed();
      this.options.onError('O morador mudou durante a sessão. Reabra a cidade para vincular o novo morador.', 'resident_changed');
      return;
    }
    if (liveIdentity.visitor !== (this.options.townId !== this.options.ownTownId) || this.options.activeTownId() !== this.options.townId
      || !this.changingTown && this.identity && liveIdentity.townIdentity !== this.identity.townIdentity) {
      this.failCraft('A receita aguarda o campo da sua vila. Confira o progresso quando voltar.');
      this.ready = false; this.options.native.worldEnabled(false); this.changed();
      return; // A native train arrival requires the parent's room retarget, not a guessed binding.
    }
    if (this.nativeBound && this.identity && liveIdentity.gameInstance !== this.identity.gameInstance) {
      this.identity = { ...liveIdentity };
      this.nativeBound = false;
      this.requestSnapshot(); // A native scene allocation changed; the runtime boot and captured RAM labels do not.
      return;
    }
    if (!this.bound || !this.ready && !this.recovering && !this.pendingSnapshot && !this.deliveries.length) {
      const identity = liveIdentity;
      const revision = this.options.ownRevision();
      if (!identity || !/^[a-f0-9]{40}$/.test(identity.pid) || !identity.townIdentity || !integer(identity.gameInstance) || revision < 1) return;
      this.identity = { ...identity };
      this.ownRevision = Math.max(this.ownRevision, revision);
      this.bound = true;
      this.recovering = true;
      this.options.native.worldEnabled(false);
      this.changed(); // Context becomes mandatory from this bind, including sequence zero.
      this.socket.send('world_bind', { pid: identity.pid });
      return;
    }
    if (!this.isReady()) return;
    if (this.intention) { this.sendIntention(); return; }
    const admission = this.options.native.worldResumeAdmission();
    if (admission === 2) { this.changed(true); return; }
    if (admission === 3) { this.failCraft('A receita foi cancelada porque a cidade ou o contexto mudou.'); this.options.onError('A interação foi cancelada porque o alvo ou a cidade mudou. Tente novamente quando chegar.', 'admission_cancelled'); return; }
    const request = this.options.native.worldRequest();
    if (request) this.operation(request);
  }

  operation(value: unknown): void {
    if (!validOperation(value)) { this.failCraft('O pedido da receita está incompleto.'); this.options.onError('O pedido nativo de interação está incompleto.', 'invalid_operation'); return; }
    if (this.intention?.id === value.id) return;
    if (value.kind === 'plant_fruit') {
      // Associate this exact native request before a prequeue terminal rejection.
      // A foreign envelope must not cancel the actual C request sharing its ID.
      const admission = this.planting?.prepare(value) ?? 'foreign';
      if (admission !== 'accepted') {
        if (admission === 'rejected') {
          this.options.native.worldComplete(value.id);
          this.planting!.reject(value.id);
        }
        this.options.onError('O plantio aguarda a cópia confirmada do morador.', 'planting_unconfirmed');
        return;
      }
    }
    if (!this.isReady() || !this.socket || this.intention) {
      this.options.native.worldComplete(value.id);
      if (isCrafting(value)) this.failCraft('Espere a confirmação da interação anterior.');
      if (value.kind === 'plant_fruit') this.planting?.reject(value.id);
      this.options.onError('Espere a conexão e a confirmação da interação anterior para tentar novamente.', 'world_unavailable');
      return;
    }
    // Preserve the native intention's original CAS and ID; never retag a stale request.
    if (value.expectedWorldVersion !== this.version || value.appliedSequence !== this.sequence
      || value.expectedOwnRevision !== Math.max(this.ownRevision, this.options.ownRevision())) {
      this.options.native.worldComplete(value.id);
      if (value.kind === 'plant_fruit') this.planting?.reject(value.id);
      if (isCrafting(value)) this.failCraft('Os bolsos mudaram. Aguarde sincronização antes de criar.');
      this.options.onError('A interação não foi enviada porque a cidade ou seus bolsos mudaram. Aguarde a sincronização e tente novamente.', 'stale_world');
      this.requestSnapshot();
      return;
    }
    this.intention = { id: value.id, expectedWorldVersion: value.expectedWorldVersion, expectedOwnRevision: value.expectedOwnRevision,
      appliedSequence: value.appliedSequence, target: { x: value.target.x, z: value.target.z },
      ...(value.kind === 'plant_fruit' ? { kind: value.kind, pocketSlot: value.pocketSlot }
        : value.kind === 'place_furniture' ? { kind: value.kind, pocketSlot: value.pocketSlot, rotation: value.rotation }
        : value.kind === 'remove_furniture' ? { kind: value.kind, objectId: value.objectId }
        : isCrafting(value) ? { kind: value.kind, recipeId: value.recipeId } : { kind: value.kind }) };
    if (isCrafting(value) && this.craftWaiter) this.craftWaiter.operationId = value.id;
    this.options.native.worldEnabled(false);
    this.sendIntention();
  }
  fishingOperation(value: FishingOperation): boolean {
    if (!this.fishing || !this.isReady() || !this.socket || this.intention) return false;
    if (value.expectedWorldVersion !== this.version || value.appliedSequence !== this.sequence
      || value.expectedOwnRevision !== Math.max(this.ownRevision, this.options.ownRevision())) return false;
    this.intention = structuredClone(value);
    this.options.native.worldEnabled(false);
    this.sendIntention();
    return true;
  }
  fishingError(value: WorldError): void { this.receiveError(value); }
  private rejectIntention(value: Intention): void {
    if (isCrafting(value)) this.failCraft('A receita não foi confirmada. Confira a conexão e os materiais.');
    if (isFishing(value)) this.fishing?.reject(value.id);
    else {
      this.options.native.worldComplete(value.id);
      if (value.kind === 'plant_fruit') this.planting?.reject(value.id);
    }
  }

  requestSnapshot(): void {
    if (!this.socket || this.recovering) return;
    this.ready = false;
    this.recovering = true;
    this.intentionSent = false;
    this.options.native.worldEnabled(false);
    this.deliveries = [];
    this.pendingSnapshot = null;
    this.changed();
    this.socket.send('world_snapshot', {});
  }

  pauseForCheckpoint(): void {
    this.ready = false;
    this.options.native.worldEnabled(false);
    this.changed();
  }

  /** The CAS revision can advance independently of the captured RAM's baseline. */
  acceptOwnRevision(revision: number): void {
    if (!integer(revision) || revision < this.ownRevision) return;
    this.ownRevision = revision;
    this.changed();
  }

  async acknowledgeCheckpoint(physicalCommit: boolean, context: CheckpointProviderState, revision: number, canonicalMatches: boolean, capturedToken: number,
    canonical: { checkpoint: NativeCheckpoint; revision: number } | null, pendingExitToken: number | null = null): Promise<boolean> {
    if (!integer(revision) || revision < 1) return false;
    this.acceptOwnRevision(revision);
    this.options.onOwnRevision(revision);
    if (context.gameInstance !== this.options.gameInstance()) return false;
    const hasToken = integer(capturedToken) && capturedToken > 0;
    const confirmation = hasToken ? this.options.native.worldRevision(revision, capturedToken, canonicalMatches) : 0;
    // Original Save & Quit can finish before HTTP acknowledgement. With no
    // gameplay RAM, an authenticated canonical GET proves durability, including
    // a legal server merge. It does not prove equality or any native rebase.
    if (!this.nativeIdentity()) {
      this.ready = false; this.options.native.worldEnabled(false);
      const confirmedCanonical = !!canonical && integer(canonical.revision) && canonical.revision >= revision
        && canonical.revision >= this.ownRevision && isCheckpoint(canonical.checkpoint);
      // DEMO/entry and ordinary scene allocation also lack a world identity.
      // Their exact COMMIT candidate must survive until bind/Own proves the
      // accepted RAM origin. Original SaveQuit also needs its final Continue:
      // the exact candidate carries a native producer/actor/phase proof, while
      // lifecycle remains playing. Neither case claims a gameplay RAM rebase.
      const lineage = hasToken ? this.options.native.checkpointLineage(capturedToken) : null;
      const exit = !physicalCommit && integer(pendingExitToken) && pendingExitToken > 0 && pendingExitToken !== capturedToken
        ? this.options.native.checkpointLineage(pendingExitToken) : null;
      const endedLive = !physicalCommit && canonicalMatches && confirmedCanonical && canonical!.checkpoint.passport === null
        && this.options.townId === this.options.ownTownId && context.activeWorldTownId === this.options.ownTownId
        && this.identity && !this.identity.visitor && lineage?.acknowledged && lineage.acceptedRevision === revision
        && lineage.pid === this.identity.pid && lineage.ownTownIdentity === this.identity.townIdentity
        && lineage.gameInstance > 0 && lineage.gameInstance === this.identity.gameInstance
        && lineage.currentGameInstance === lineage.gameInstance
        && exit?.pendingExitCommit && !exit.acknowledged && !exit.exitCommit && !exit.continueCommit
        && exit.pid === lineage.pid && exit.ownTownIdentity === lineage.ownTownIdentity
        && exit.gameInstance === lineage.gameInstance && exit.currentGameInstance === lineage.currentGameInstance;
      const pendingExit = lineage?.exitCommit === true && lineage.acknowledged && lineage.acceptedRevision === revision
        && lineage.gameInstance > 0 && lineage.gameInstance === lineage.currentGameInstance;
      const pendingContinue = lineage?.continueCommit === true && lineage.acknowledged && lineage.acceptedRevision === revision
        && lineage.gameInstance > 0 && lineage.gameInstance === lineage.currentGameInstance;
      if (physicalCommit && confirmation !== 0 && pendingContinue && confirmedCanonical
        && !this.reconcilingOwn && !this.work && !this.intention && !this.deliveries.length) {
        // Save & Continue has completed its original item IO. This exact
        // native dialogue admits Own reconciliation before its final Continue;
        // releasing only durability would lose the next gameplay RAM origin.
        this.reconcilingOwn = true;
        let applied: boolean;
        try { applied = await this.options.native.worldOwnCheckpoint(capturedToken, canonical!.revision, canonical!.checkpoint); }
        finally { this.reconcilingOwn = false; }
        const proof = this.options.native.checkpointLineage(capturedToken);
        if (!applied || !proof?.acknowledged || proof.acceptedRevision !== revision || proof.pid !== lineage.pid
          || proof.ownTownIdentity !== lineage.ownTownIdentity || proof.gameInstance !== lineage.gameInstance
          || proof.currentGameInstance !== lineage.currentGameInstance || proof.reconciledInstance !== proof.currentGameInstance
          || proof.reconciledRevision < canonical!.revision) return false;
        this.acceptOwnRevision(canonical!.revision); this.options.onOwnRevision(this.ownRevision);
        if (this.options.baselineRevision() < canonical!.revision) this.options.onBaselineRevision(canonical!.revision);
        this.awaitingCheckpoint = null; this.changed();
        return true;
      }
      // A LIVE may finish its GET after original Own Save & Quit wrote a
      // newer physical COMMIT. The exact pending Native phase proves there is
      // no gameplay RAM to rebase; keep that final COMMIT queued unchanged.
      const durable = confirmation !== 0 && (endedLive || physicalCommit && (this.options.native.lifecycle() === 'exited' || pendingExit)
        && (confirmedCanonical || canonicalMatches && revision >= this.ownRevision));
      if (durable) {
        if (confirmedCanonical) {
          this.acceptOwnRevision(canonical!.revision); this.options.onOwnRevision(this.ownRevision);
        }
        this.awaitingCheckpoint = null;
      }
      this.changed();
      return durable;
    }
    if (confirmation === 0) return false;
    // C may have rebased this exact candidate before returning 1. JS must record
    // that proof even if a later world sequence arrived before the HTTP ACK.
    // A repeated ACK cannot move an already newer baseline backwards.
    if (confirmation === 1 && this.options.baselineRevision() < revision) this.options.onBaselineRevision(revision);
    const current = this.context();
    if (!current) return false;
    if (context.gameInstance !== current.gameInstance || current.currentOwnRevision > (canonical?.revision ?? revision)
      || this.intention || this.deliveries.length || this.work || this.reconcilingOwn) return false;
    if (confirmation === 2 && canonicalMatches && (!this.nativeBound
      || this.identity?.gameInstance !== this.nativeIdentity()?.gameInstance)) {
      // First entry/scene allocation can be in TALK while inputs await this
      // checkpoint. The original bind consumes its exact confirmed seed;
      // snapshot supplies RAM proof without waiting for TALK to end.
      this.awaitingCheckpoint = { context: { ...context }, revision, token: capturedToken, canonicalMatches };
      this.tick(); this.requestSnapshot();
      return false;
    }
    if (!canonicalMatches || confirmation === 2 && canonical || this.options.native.checkpointContinuation() && canonical) {
      // An exact self-publication can change the Native generation before HTTP
      // ACK. Preserve its bound world only after Own and the exact token prove
      // reconciliation; a scene, peer sequence or pending delivery still resyncs.
      const stableIdentity = canonicalMatches && canonical?.revision === revision && this.isReady()
        && this.bound && this.nativeBound && this.options.townId === this.options.ownTownId
        && context.appliedSequence === this.sequence && this.identity && !this.identity.visitor
        ? { ...this.identity } : null;
      this.pauseForCheckpoint();
      if (!canonical || !integer(canonical.revision) || canonical.revision < revision || !isCheckpoint(canonical.checkpoint)) return false;
      this.reconcilingOwn = true;
      const epoch = this.epoch;
      let applied: boolean;
      try { applied = await this.options.native.worldOwnCheckpoint(capturedToken, canonical.revision, canonical.checkpoint); }
      catch (error) { this.reconcilingOwn = false; this.pump(); throw error; }
      this.reconcilingOwn = false;
      if (!applied) { this.pump(); return false; }
      this.ownRevision = Math.max(this.ownRevision, canonical.revision);
      this.options.onOwnRevision(this.ownRevision);
      if (this.options.baselineRevision() < canonical.revision) this.options.onBaselineRevision(canonical.revision);
      if (this.options.townId === this.options.ownTownId) this.version = Math.max(this.version, canonical.revision);
      this.awaitingCheckpoint = null;
      const liveIdentity = this.nativeIdentity();
      if (liveIdentity && this.identity && liveIdentity.pid === this.identity.pid
        && (liveIdentity.gameInstance !== this.identity.gameInstance || liveIdentity.townIdentity !== this.identity.townIdentity)) {
        this.identity = { ...liveIdentity };
        this.nativeBound = false;
      }
      if (this.epoch !== epoch) { this.pump(); this.tick(); return true; }
      const lineage = stableIdentity ? this.options.native.checkpointLineage(capturedToken) : null;
      if (stableIdentity && liveIdentity && this.identity && this.bound && this.nativeBound
        && this.options.activeTownId() === this.options.townId && this.ownRevision === canonical.revision
        && context.appliedSequence === this.sequence && !this.intention && !this.deliveries.length
        && !this.pendingSnapshot && !this.work && !this.recovering && !this.paused
        && liveIdentity.pid === stableIdentity.pid && liveIdentity.townIdentity === stableIdentity.townIdentity
        && liveIdentity.gameInstance === stableIdentity.gameInstance && !liveIdentity.visitor
        && this.identity.pid === stableIdentity.pid && this.identity.townIdentity === stableIdentity.townIdentity
        && this.identity.gameInstance === stableIdentity.gameInstance
        && lineage?.acknowledged && lineage.pid === stableIdentity.pid && lineage.ownTownIdentity === stableIdentity.townIdentity
        && lineage.acceptedRevision === revision && lineage.gameInstance > 0
        && lineage.gameInstance === liveIdentity.gameInstance && lineage.currentGameInstance === liveIdentity.gameInstance
        && lineage.reconciledInstance === liveIdentity.gameInstance && lineage.reconciledRevision >= canonical.revision
        && this.options.native.worldRevision(revision, capturedToken, true) === 1) {
        this.ready = true;
        this.options.native.worldEnabled(this.isReady());
        this.changed(); this.tick();
        return true;
      }
      if (!this.bound) this.tick();
      if (this.recovering) this.pump(); else this.requestSnapshot();
      return true;
    }
    if (confirmation === 2) {
      this.awaitingCheckpoint = { context: { ...context }, revision, token: capturedToken, canonicalMatches };
      this.tick(); // A first durably saved PID must bind before requesting its actor snapshot.
      this.requestSnapshot();
      return false;
    }
    // The native token rebases to the captured bytes, preserving later native delta.
    if (this.options.townId === this.options.ownTownId) this.version = Math.max(this.version, revision);
    this.awaitingCheckpoint = null;
    this.paused = false;
    this.changed();
    this.tick(); // The first persisted resident can now bind.
    return true;
  }

  private sendIntention(): void {
    if (!this.socket || !this.isReady() || !this.intention || this.intentionSent) return;
    this.intentionSent = true;
    try { this.socket.send(isFishing(this.intention) ? 'fishing_operation' : 'world_operation', this.intention); }
    catch { this.intentionSent = false; this.disconnect(); this.options.onError('A interação aguarda reconexão; nenhum ganho local foi antecipado.', 'world_disconnected'); }
  }
  private changed(requestFreshCapture = false): void { this.options.onChange?.(this.context(), this.isReady(), requestFreshCapture); }
  private invalidDelivery(): void {
    this.failCraft('A confirmação da receita está incompleta. Aguarde sincronização.');
    this.options.onError('O estado recebido do mundo está incompleto. A interação aguarda sincronização.', 'invalid_world_state');
    this.requestSnapshot();
  }
  private receiveSnapshot(value: WorldSnapshot): void {
    if (!validSnapshot(value, this.options.townId) || !this.identity) { this.invalidDelivery(); return; }
    if (!this.nativeIdentity()) { this.noLiveSnapshot = true; this.ready = false; this.options.native.worldEnabled(false); this.changed(); return; }
    this.noLiveSnapshot = false;
    const previouslyAuthorized = this.isGameplayReady();
    const delivery: Delivery & { kind: 'snapshot' } = { kind: 'snapshot', world: structuredClone(value), actor: null };
    this.pendingSnapshot = delivery;
    this.deliveries.push(delivery);
    this.options.native.worldEnabled(false);
    this.ready = previouslyAuthorized; // An unsolicited publication does not revoke a verified binding.
    this.changed();
  }
  private receiveActorSnapshot(value: ActorSnapshot): void {
    if (!validActor(value) || value.pid !== this.identity?.pid) { this.invalidDelivery(); return; }
    if (this.noLiveSnapshot) {
      this.noLiveSnapshot = false;
      this.recovering = false;
      this.pendingSnapshot = null;
      this.deliveries = [];
      this.acceptOwnRevision(value.ownRevision);
      this.options.onOwnRevision(this.ownRevision);
      return;
    }
    if (!this.pendingSnapshot) { this.invalidDelivery(); return; }
    this.pendingSnapshot.actor = structuredClone(value);
    this.pendingSnapshot = null;
    this.pump();
  }
  private receiveCommit(value: WorldCommit): void {
    if (!validCommit(value, this.options.townId)) { this.invalidDelivery(); return; }
    if (!this.nativeIdentity()) {
      this.ready = false;
      this.options.native.worldEnabled(false);
      if (this.options.townId === this.options.ownTownId) {
        this.acceptOwnRevision(value.version);
        this.options.onOwnRevision(this.ownRevision);
      }
      return;
    }
    if (this.recovering && !this.deliveries.some(delivery => delivery.kind === 'snapshot')) return;
    const own = this.intention?.id === value.operationId;
    if (own && value.kind !== (isFishing(this.intention!) ? 'fishing' : isCrafting(this.intention!) ? 'crafting' : 'world')) { this.invalidDelivery(); return; }
    if (value.sequence <= this.sequence && !own) return;
    if (this.deliveries.some(delivery => delivery.kind === 'commit' && delivery.world.operationId === value.operationId)) return;
    this.deliveries.push({ kind: 'commit', world: structuredClone(value), actor: null, own });
    this.options.native.worldEnabled(false);
    this.pump();
  }
  private receiveActorCommit(value: ActorCommit): void {
    if (!validActor(value) || typeof value.operationId !== 'string' || value.pid !== this.identity?.pid) { this.invalidDelivery(); return; }
    const delivery = this.deliveries.find((item): item is Delivery & { kind: 'commit' } => item.kind === 'commit' && item.world.operationId === value.operationId && item.own);
    if (!delivery) { if (value.ownRevision > this.ownRevision) this.requestSnapshot(); return; }
    const intention = this.intention!;
    if (isFishing(intention)) {
      // A cast/release changes only the shared ledger; catches also publish one paired save.
      const ownDelta = value.ownRevision - intention.expectedOwnRevision;
      const worldDelta = delivery.world.version - intention.expectedWorldVersion;
      if (delivery.world.kind !== 'fishing' || delivery.world.sequence !== intention.appliedSequence + 1 || delivery.world.tiles.length !== 0
        || (ownDelta !== 0 && ownDelta !== 1) || worldDelta !== (this.options.townId === this.options.ownTownId ? ownDelta : 0)) {
        this.invalidDelivery(); return;
      }
      delivery.actor = structuredClone(value); this.pump(); return;
    }
    const actorIncrement = intention.kind === 'shake_tree' && this.options.townId !== this.options.ownTownId ? 0 : 1;
    if (delivery.world.kind !== (isCrafting(intention) ? 'crafting' : 'world') || delivery.world.sequence !== intention.appliedSequence + 1 || delivery.world.version !== intention.expectedWorldVersion + 1
      || value.ownRevision !== intention.expectedOwnRevision + actorIncrement
      || (isCrafting(intention)
        ? delivery.world.tiles.length !== 0 || !sameFurniture(delivery.world.furniture, this.furniture) || !value.learnedRecipes.includes(BARREL_RECIPE.id)
        : intention.kind === 'place_furniture'
        ? !delivery.world.furniture.some(item => item.id === intention.id && item.x === intention.target.x && item.z === intention.target.z && item.rotation === intention.rotation)
        : intention.kind === 'remove_furniture'
          ? delivery.world.furniture.some(item => item.id === intention.objectId)
          : !delivery.world.tiles.some(tile => tile.x === intention.target.x && tile.z === intention.target.z))) { this.invalidDelivery(); return; }
    delivery.actor = structuredClone(value);
    this.pump();
  }
  private receiveError(value: WorldError): void {
    if (!object(value) || typeof value.code !== 'string' || typeof value.message !== 'string') { this.invalidDelivery(); return; }
    const rejectedIntention = !!value.operationId && this.intention?.id === value.operationId;
    if (rejectedIntention) {
      this.failCraft(value.message);
      this.rejectIntention(this.intention!);
      this.intention = null;
      this.intentionSent = false;
    }
    this.options.onError(value.message, value.code);
    // An obsolete receipt cannot confirm this operation. Cancel its local UI
    // request and read current canonical state; never manufacture or resend it.
    // A repeated error for that finished request must not start a resync loop.
    if (value.code === 'operation_receipt_incomplete' && value.operationId) {
      if (rejectedIntention) this.requestSnapshot();
      return;
    }
    if (value.code === 'stale_world' || value.code === 'target_changed') this.requestSnapshot();
    else if (!value.operationId) { this.failCraft(value.message); this.ready = false; this.recovering = false; this.paused = true; this.options.native.worldEnabled(false); this.changed(); }
    else this.options.native.worldEnabled(this.ready && !this.intention && !this.deliveries.length);
  }
  private pump(): void {
    if (this.work || this.paused || this.reconcilingOwn) return;
    const epoch = this.epoch;
    const task = this.applyDeliveries(epoch);
    this.work = task;
    void task.finally(() => {
      if (this.work === task) this.work = null;
      const next = this.deliveries[0];
      if (next && (next.actor || next.kind === 'commit' && !next.own)) this.pump();
    }).catch(() => {});
  }
  private async applyDeliveries(epoch: number): Promise<void> {
    while (this.epoch === epoch && this.socket && this.deliveries.length) {
      const delivery = this.deliveries[0]!;
      if ((delivery.kind === 'snapshot' || delivery.own) && !delivery.actor) return;
      if (delivery.kind === 'commit' && delivery.world.sequence > this.sequence + 1) { this.requestSnapshot(); return; }
      if (delivery.kind === 'commit' && (delivery.world.kind === 'fishing' || delivery.world.kind === 'crafting'
        ? !sameFurniture(delivery.world.furniture, this.furniture)
        : delivery.world.tiles.length === 0 && sameFurniture(delivery.world.furniture, this.furniture))) { this.invalidDelivery(); return; }
      const liveIdentity = this.nativeIdentity();
      if (!liveIdentity || liveIdentity.visitor !== (this.options.townId !== this.options.ownTownId) || this.options.activeTownId() !== this.options.townId
        || this.identity && (liveIdentity.pid !== this.identity.pid || liveIdentity.townIdentity !== this.identity.townIdentity)) {
        this.failCraft('O morador mudou de contexto. Confira o progresso quando voltar.');
        this.deliveries = []; this.pendingSnapshot = null; this.recovering = false; this.ready = false;
        this.options.native.worldEnabled(false);
        if (liveIdentity && this.identity && liveIdentity.pid !== this.identity.pid) this.tick();
        else if (liveIdentity) this.changingTown = true; // A train arrival awaits the parent's authenticated town retarget.
        else {
          const revision = Math.max(delivery.actor?.ownRevision ?? 0, this.options.townId === this.options.ownTownId ? delivery.world.version : 0);
          this.acceptOwnRevision(revision); this.options.onOwnRevision(this.ownRevision);
        }
        this.changed();
        return;
      }
      if (this.identity && liveIdentity.gameInstance !== this.identity.gameInstance) {
        this.identity = { ...liveIdentity }; this.nativeBound = false;
        if (delivery.kind === 'commit') { this.requestSnapshot(); return; }
      }
      try {
        if (delivery.kind === 'commit' && delivery.own && this.intention && isFishing(this.intention)) {
          if (!this.fishing || !delivery.actor) throw new Error('O recibo de pesca está incompleto.');
          const baseline = await this.fishing.beforeCommit(delivery.world.operationId, delivery.actor, delivery.world);
          if (baseline !== null && this.options.baselineRevision() < baseline) this.options.onBaselineRevision(baseline);
        }
        if (delivery.kind === 'snapshot') {
          if (delivery.world.sequence < this.sequence || delivery.world.version < this.version) { this.deliveries.shift(); continue; }
          const actor = delivery.actor!;
          if (!this.nativeBound) {
            this.options.native.worldBind({ ...this.identity!, townId: this.options.townId, version: delivery.world.version,
              sequence: delivery.world.sequence, ownRevision: actor.ownRevision });
            this.nativeBound = true;
          }
          await this.options.native.worldSnapshot(delivery.world, actor);
        } else if (delivery.world.sequence > this.sequence || delivery.actor && delivery.actor.ownRevision > this.ownRevision) {
          await this.options.native.worldCommit(delivery.world, delivery.actor);
        }
      } catch (error) {
        if (this.epoch !== epoch) return;
        this.failCraft('A receita aguarda sincronização. Confira os bolsos antes de repetir.');
        this.options.onError(errorMessage(error, 'O jogo não aplicou o estado confirmado. A interação aguarda sincronização.'), 'world_apply_failed');
        this.recovering = false;
        if (this.applyFailed) {
          this.paused = true;
          this.ready = false;
          this.options.native.worldEnabled(false);
          this.changed();
        } else {
          this.applyFailed = true;
          this.requestSnapshot();
        }
        return;
      }
      if (this.epoch !== epoch || !this.socket) return;
      const requestFreshCapture = delivery.kind === 'commit' || this.recovering || this.changingTown;
      this.freshCaptureNeeded ||= requestFreshCapture;
      this.version = Math.max(this.version, delivery.world.version);
      this.sequence = Math.max(this.sequence, delivery.world.sequence); // Only native success advances appliedSequence.
      this.furniture = structuredClone(delivery.world.furniture);
      if (delivery.actor && delivery.actor.ownRevision >= this.ownRevision) {
        this.actorState = structuredClone(delivery.actor);
        this.ownRevision = delivery.actor.ownRevision;
        this.options.onOwnRevision(this.ownRevision);
      } else if (this.options.townId === this.options.ownTownId && delivery.world.version > this.ownRevision) {
        this.ownRevision = delivery.world.version;
        this.options.onOwnRevision(this.ownRevision);
      }
      if (delivery.kind === 'commit' && delivery.own && this.intention?.id === delivery.world.operationId) {
        try {
          if (isFishing(this.intention)) this.fishing!.complete(this.intention.id);
          else {
            const receipt = { sequence: delivery.world.sequence, ownRevision: delivery.actor!.ownRevision };
            this.options.native.worldComplete(this.intention.id, receipt);
            if (this.intention.kind === 'plant_fruit') this.planting!.complete(this.intention.id, receipt);
            if (isCrafting(this.intention) && this.craftWaiter?.operationId === this.intention.id) {
              const waiter = this.craftWaiter; this.craftWaiter = null; waiter.resolve();
            }
          }
        }
        catch (error) {
          this.paused = true; this.ready = false;
          this.deliveries = []; this.pendingSnapshot = null;
          this.options.native.worldEnabled(false);
          this.failCraft('A receita confirmada aguarda sincronização. Confira os bolsos antes de repetir.');
          this.options.onError(errorMessage(error, 'A interação confirmada aguarda sincronização.'), 'world_apply_failed');
          this.changed();
          return; // The durable ID remains available for reconnect, without an unbounded replay loop.
        }
        this.intention = null;
        this.intentionSent = false;
      }
      if (this.deliveries[0] === delivery) this.deliveries.shift();
      if (delivery.kind === 'snapshot') { this.ready = true; this.recovering = false; this.changingTown = false; }
      this.applyFailed = false;
      const checkpoint = this.awaitingCheckpoint;
      if (delivery.kind === 'snapshot' && checkpoint?.canonicalMatches && this.context()?.gameInstance === checkpoint.context.gameInstance
        && this.options.townId === checkpoint.context.activeWorldTownId && this.options.baselineRevision() === checkpoint.context.ramBaselineRevision
        && delivery.actor!.ownRevision >= checkpoint.revision && this.options.native.worldRevision(checkpoint.revision, checkpoint.token, checkpoint.canonicalMatches) === 1) {
        if (this.options.baselineRevision() < checkpoint.revision) this.options.onBaselineRevision(checkpoint.revision);
        this.awaitingCheckpoint = null;
      }
      this.changed(this.freshCaptureNeeded);
      if (this.isReady()) this.freshCaptureNeeded = false;
    }
    if (this.epoch === epoch && this.socket) {
      this.options.native.worldEnabled(this.isReady() && !this.intention);
      this.sendIntention(); // Reconnect retries the original ID; server receipts prevent a second credit.
    }
  }
}
