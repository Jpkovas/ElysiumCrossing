import type { ActorCommit, WorldCommit } from './world';

export type FishingPhase = 'waiting' | 'approaching' | 'touch' | 'bite' | 'caught' | 'released' | 'escaped';
export type FishingPoint = { x: number; y: number; z: number };
/** Species and generation are server decisions; angle uses the original unsigned short. */
export type FishingEntity = FishingPoint & { id: string; generation: number; fishType: number; angle: number; expiresAt: number;
  reservation: { actorId: string; pid: string; castId: string } | null };
export type FishingCast = { id: string; actorId: string; pid: string; townId: string; townIdentity: string;
  fishId: string | null; generation: number | null; fishType: number | null; phase: FishingPhase; bobber: FishingPoint;
  touches: number[]; biteAt: number | null; biteUntil: number | null; createdAt: number; rodType: 0 | 1; landedAt: number | null; pending: boolean; credited: boolean };
export type FishingCredit = { fishType: number; item: number; slot: number | null; collectionWordIndex: number | null;
  collectionWordBefore: number | null; collectionWordAfter: number | null; completesCollection: boolean };
export type FishingOperation = { id: string; expectedWorldVersion: number; expectedOwnRevision: number; appliedSequence: number } & (
  { kind: 'cast' } | { kind: 'land' | 'reel' | 'release' | 'cancel'; castId: string } | { kind: 'keep'; castId: string; slot: number });
export type FishingPendingOrigin = { townId: string; townIdentity: string; operationId: string };
export type FishingPending = { origin: FishingPendingOrigin; cast: FishingCast };
export type FishingSnapshot = { townId: string; townIdentity: string; sequence: number; version: number; serverTime: number;
  entities: FishingEntity[]; cast: FishingCast | null; pendingOrigin: FishingPendingOrigin | null };
export type FishingReceipt = { operationId: string; actorId: string; pid: string; cast: FishingCast; credit: FishingCredit | null; intent: string };
export type FishingOperationResult = { world: WorldCommit; actor: ActorCommit; fishing: FishingSnapshot; receipt: FishingReceipt; replayed: boolean };
/** Pure native intention. Versions are read only after the existing save admission has settled. */
export type NativeFishingRequest = { id: string; token: number; kind: 1 | 2 | 3 | 4 | 5; castId: string; slot: number; gameInstance: number };
