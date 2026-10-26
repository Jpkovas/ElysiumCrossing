import type { CheckpointProviderState, NativeCheckpoint, NativeGame, WorldIdentity } from '../shared/contracts';
import type { CheckpointContext } from '../shared/world';
import { isCheckpoint } from './checkpoint';

type CheckpointNative = Pick<NativeGame, 'lifecycle' | 'checkpointLineage' | 'worldIdentity' | 'checkpointContinuation' | 'checkpointRevision' | 'checkpointOwn'>;
type CheckpointLinkOptions = {
  townId: string;
  ownTownId: string;
  native: CheckpointNative;
  /** Exact prefix from the authenticated, hash-checked imported checkpoint. */
  importContext?: CheckpointContext | null;
  gameInstance(): string;
  activeTownId(): string;
  baselineRevision(): number;
  ownRevision(): number;
  onOwnRevision(revision: number): void;
  onBaselineRevision(revision: number): void;
  onChange?(): void;
};
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/** Ghost multiplayer: each player's card is their own, so a published checkpoint only has to
 * be tied to the RAM that produced it and, when the server kept other bytes, applied back. */
export class CheckpointLink {
  private ownRevision: number;
  private sequence = 0;
  private importedOwnSequence = 0;
  private reconcilingOwn = false;
  /** Last gameplay identity seen; Original Save & Quit ends it before a LIVE ACK can return. */
  private identity: WorldIdentity | null = null;

  constructor(private readonly options: CheckpointLinkOptions) {
    this.ownRevision = options.ownRevision();
    const seed = options.importContext;
    if (seed) {
      if (seed.worldTownId !== options.ownTownId || seed.baselineRevision !== options.baselineRevision()
        || !integer(seed.appliedSequence)) throw new Error('O contexto importado não corresponde à cópia da sua vila.');
      this.importedOwnSequence = seed.appliedSequence;
      if (options.townId === options.ownTownId) this.sequence = seed.appliedSequence;
    }
  }

  private nativeIdentity(): WorldIdentity | null {
    const identity = this.options.native.worldIdentity() ?? this.options.native.checkpointContinuation();
    if (identity) this.identity = { ...identity };
    return identity;
  }
  context(): CheckpointProviderState | null {
    const liveIdentity = this.nativeIdentity();
    // Between towns (train, scene loads) the Native can only commit Card A, the player's own card.
    const activeTownId = liveIdentity ? this.options.activeTownId() : this.options.ownTownId;
    if (liveIdentity && liveIdentity.visitor !== (activeTownId !== this.options.ownTownId)) return null;
    return { gameInstance: this.options.gameInstance(), ramBaselineRevision: this.options.baselineRevision(), activeWorldTownId: activeTownId,
      appliedSequence: activeTownId === this.options.townId ? this.sequence : activeTownId === this.options.ownTownId ? this.importedOwnSequence : 0,
      currentOwnRevision: Math.max(this.ownRevision, this.options.ownRevision()) };
  }
  townId(): string { return this.options.townId; }

  /** A train changes the active town; the own checkpoint context continues there at once. */
  retarget(townId: string): void {
    if (townId === this.options.townId) return;
    this.options.townId = townId;
    this.sequence = 0;
    this.options.onChange?.();
  }

  /** The CAS revision can advance independently of the captured RAM's baseline. */
  acceptOwnRevision(revision: number): void {
    if (!integer(revision) || revision < this.ownRevision) return;
    this.ownRevision = revision;
    this.options.onChange?.();
  }
  private ownApplied(revision: number): void {
    this.acceptOwnRevision(revision);
    this.options.onOwnRevision(this.ownRevision);
    if (this.options.baselineRevision() < revision) this.options.onBaselineRevision(revision);
  }
  private async applyOwn(token: number, canonical: { checkpoint: NativeCheckpoint; revision: number }): Promise<boolean> {
    this.reconcilingOwn = true;
    try { return await this.options.native.checkpointOwn(token, canonical.revision, canonical.checkpoint); }
    finally { this.reconcilingOwn = false; }
  }

  /** True when the server's revision is now the origin of the RAM (or there is no RAM left to rebase). */
  async acknowledgeCheckpoint(physicalCommit: boolean, context: CheckpointProviderState, revision: number, canonicalMatches: boolean, capturedToken: number,
    canonical: { checkpoint: NativeCheckpoint; revision: number } | null, pendingExitToken: number | null = null): Promise<boolean> {
    if (!integer(revision) || revision < 1) return false;
    this.acceptOwnRevision(revision);
    this.options.onOwnRevision(revision);
    if (context.gameInstance !== this.options.gameInstance()) return false;
    const hasToken = integer(capturedToken) && capturedToken > 0;
    const confirmation = hasToken ? this.options.native.checkpointRevision(revision, capturedToken, canonicalMatches) : 0;
    const validCanonical = !!canonical && integer(canonical.revision) && canonical.revision >= revision && isCheckpoint(canonical.checkpoint);
    const confirmedCanonical = validCanonical && canonical!.revision >= this.ownRevision;
    if (!this.nativeIdentity()) {
      // Original Save & Quit can finish before the HTTP acknowledgement. With no gameplay RAM, an
      // authenticated canonical GET proves durability; it does not prove a native rebase.
      const lineage = hasToken ? this.options.native.checkpointLineage(capturedToken) : null;
      const exact = (flag: 'exitCommit' | 'continueCommit') => lineage?.[flag] === true && lineage.acknowledged
        && lineage.acceptedRevision === revision && lineage.gameInstance > 0 && lineage.gameInstance === lineage.currentGameInstance;
      if (physicalCommit && confirmation !== 0 && exact('continueCommit') && confirmedCanonical && !this.reconcilingOwn) {
        // Save & Continue finished its item IO: the next gameplay RAM starts from the confirmed copy.
        const applied = await this.applyOwn(capturedToken, canonical!);
        const proof = this.options.native.checkpointLineage(capturedToken);
        if (!applied || !proof?.acknowledged || proof.acceptedRevision !== revision || proof.pid !== lineage!.pid
          || proof.ownTownIdentity !== lineage!.ownTownIdentity || proof.gameInstance !== lineage!.gameInstance
          || proof.currentGameInstance !== lineage!.currentGameInstance || proof.reconciledInstance !== proof.currentGameInstance
          || proof.reconciledRevision < canonical!.revision) return false;
        this.ownApplied(canonical!.revision);
        return true;
      }
      // A LIVE may finish its GET after an Original own Save & Quit wrote a newer physical COMMIT.
      // The exact pending native exit proves there is no gameplay RAM left; that COMMIT stays queued.
      const exit = !physicalCommit && integer(pendingExitToken) && pendingExitToken > 0 && pendingExitToken !== capturedToken
        ? this.options.native.checkpointLineage(pendingExitToken) : null;
      const identity = this.identity;
      const endedLive = !physicalCommit && canonicalMatches && confirmedCanonical && canonical!.checkpoint.passport === null
        && this.options.townId === this.options.ownTownId && context.activeWorldTownId === this.options.ownTownId
        && !!identity && !identity.visitor && !!lineage?.acknowledged && lineage.acceptedRevision === revision
        && lineage.pid === identity.pid && lineage.ownTownIdentity === identity.townIdentity
        && lineage.gameInstance > 0 && lineage.gameInstance === identity.gameInstance && lineage.currentGameInstance === lineage.gameInstance
        && !!exit?.pendingExitCommit && !exit.acknowledged && !exit.exitCommit && !exit.continueCommit
        && exit.pid === lineage.pid && exit.ownTownIdentity === lineage.ownTownIdentity
        && exit.gameInstance === lineage.gameInstance && exit.currentGameInstance === lineage.currentGameInstance;
      const durable = confirmation !== 0 && (endedLive || physicalCommit && (this.options.native.lifecycle() === 'exited' || exact('exitCommit'))
        && (confirmedCanonical || canonicalMatches && revision >= this.ownRevision));
      if (durable && confirmedCanonical) { this.acceptOwnRevision(canonical!.revision); this.options.onOwnRevision(this.ownRevision); }
      return durable;
    }
    if (confirmation === 0) return false;
    // C may have rebased this exact candidate before returning 1; a repeated ACK never moves it back.
    if (confirmation === 1 && this.options.baselineRevision() < revision) this.options.onBaselineRevision(revision);
    const current = this.context();
    if (!current || context.gameInstance !== current.gameInstance || current.currentOwnRevision > (canonical?.revision ?? revision) || this.reconcilingOwn) return false;
    // The server stored these exact bytes as this player's own card: no RAM rebase remains.
    if (canonicalMatches) {
      if (this.options.baselineRevision() < revision) this.options.onBaselineRevision(revision);
      return true;
    }
    // The server kept other bytes (a newer revision of the same card): apply them through the same token.
    if (!validCanonical || !(await this.applyOwn(capturedToken, canonical!))) return false;
    this.ownApplied(canonical!.revision);
    return true;
  }
}
