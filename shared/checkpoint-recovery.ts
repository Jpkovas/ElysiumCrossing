import type { CheckpointProviderState, CheckpointProducer } from './contracts.ts';

/** Original preserved capture identity; retry CAS is deliberately separate. */
export type CheckpointRecoveryIntent = {
  id: string;
  source: 'live' | 'commit';
  gameInstance: string;
  nativeToken: number;
  producer: CheckpointProducer;
  context: CheckpointProviderState;
  baselineRevision: number;
  baselineSHA256: string;
  checkpointSHA256: string;
};

export type CheckpointRecoveryRequest = {
  intent: CheckpointRecoveryIntent;
  expectedOwnRevision: number;
};

/** Paired canonical bytes are proved by a private GET of this exact revision. */
export type CheckpointRecoveryReceipt = {
  captureId: string;
  intentSHA256: string;
  baselineRevision: number;
  baselineSHA256: string;
  submittedSHA256: string;
  previousOwnRevision: number;
  worldSequence: number;
  revision: number;
  checkpointSHA256: string;
};

/** One canonical intent representation for server receipts and client proof. */
export function checkpointRecoveryIntentJSON(intent: CheckpointRecoveryIntent): string {
  return JSON.stringify({
    id: intent.id, source: intent.source, gameInstance: intent.gameInstance, nativeToken: intent.nativeToken,
    producer: { pid: intent.producer.pid, ownTownIdentity: intent.producer.ownTownIdentity },
    context: { gameInstance: intent.context.gameInstance, ramBaselineRevision: intent.context.ramBaselineRevision,
      activeWorldTownId: intent.context.activeWorldTownId, appliedSequence: intent.context.appliedSequence,
      currentOwnRevision: intent.context.currentOwnRevision },
    baselineRevision: intent.baselineRevision, baselineSHA256: intent.baselineSHA256,
    checkpointSHA256: intent.checkpointSHA256,
  });
}
