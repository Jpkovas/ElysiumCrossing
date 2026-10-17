/** Account identity and Native village/resident identity are separate. A slot
 * may be reserved before the game creates its PersonalID or claims a house. */
export type Residence = {
  townId: string;
  playerSlot: number | null;
  pid: string | null;
  houseSlot: number | null;
  arriving: boolean;
};
export type ResidenceTown = { townId: string; townName: string; code: string; ownerId: string | null };
export type ResidenceRequest = {
  id: string; userId: string; name: string; friendCode: string;
  townId: string; townName: string; kind: 'join' | 'move';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'expired';
  createdAt: number; decidedAt: number | null;
};
export type ResidenceState = { town: ResidenceTown; incoming: ResidenceRequest[]; outgoing: ResidenceRequest[] };
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
