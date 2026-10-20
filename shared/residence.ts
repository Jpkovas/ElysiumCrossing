/** Account identity and Native village/resident identity are separate. A slot
 * may be reserved before the game creates its PersonalID or claims a house. */
export type Residence = {
  townId: string;
  playerSlot: number | null;
  pid: string | null;
  houseSlot: number | null;
  arriving: boolean;
};
/** `ownerId` is null while the town is dormant: nobody lives there and its code admits the next arrival. */
export type ResidenceTown = { townId: string; townName: string; code: string; ownerId: string | null; residents: { userId: string; name: string }[] };
export type ResidenceRequest = {
  id: string; userId: string; name: string; friendCode: string;
  townId: string; townName: string; kind: 'join' | 'move';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'expired';
  createdAt: number; decidedAt: number | null;
};
/** `home` is the account's own town when it waits for it (never started, or founded and now dormant);
 * `vacancy` tells an account without a resident whether its current town still has a free slot. */
export type ResidenceHome = { townId: string; townName: string; code: string; hasSave: boolean };
export type ResidenceState = { town: ResidenceTown; home: ResidenceHome | null; vacancy: boolean; incoming: ResidenceRequest[]; outgoing: ResidenceRequest[] };
export function residenceCode(value: unknown): string | null {
  if(typeof value!=='string')return null;
  const code=value.trim().replace(/-/g,'').toUpperCase();
  return /^[A-F0-9]{10}$/.test(code)?code:null;
}

export type MovePlan={id:string;sourceTownId:string;sourceIdentity:string;sourcePID:string;sourceSlot:number;sourceHouse:number;townId:string;townName:string;playerSlot:number;expiresAt:number};
export type MoveReceipt={id:string;sourceTownId:string;sourceRevision:number;sourceFinalRevision:number;townId:string;revision:number;pid:string;playerSlot:number;checkpointSHA256:string};
/** Native station state. A checkpoint ACK alone never commits a move. */
export type NativeMoveState = {
  id:string;
  phase:'armed'|'warning'|'saving'|'checkpoint'|'committed'|'cancelled'|'failed';
  sourceTownId:string; sourceIdentity:string; pid:string;
  gameInstance:number; checkpointToken:number; acceptedRevision:number;
};
