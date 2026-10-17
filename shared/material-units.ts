import { MATERIALS, MATERIAL_RESERVATION } from './material-definitions.ts';
import type { WorldInventory } from './world.ts';
export type MaterialUnits = { base: number; quantity: number };
export function materialReserved(item: number): boolean { return Number.isInteger(item) && item >= MATERIAL_RESERVATION[0] && item <= MATERIAL_RESERVATION[1]; }
export function decodeMaterial(item: number): MaterialUnits | null {
 if (!Number.isInteger(item)) return null;
 const type=MATERIALS.find(t=>item>=t.base&&item<t.base+t.limit);
 return type?{base:type.base,quantity:item-type.base+1}:null;
}
export function encodeMaterial(base: number, quantity: number): number | null {
 const type=MATERIALS.find(t=>t.base===base);
 return !type||!Number.isInteger(quantity)||quantity<0||quantity>type.limit?null:quantity===0?0:base+quantity-1;
}
export function materialCount(pockets: readonly number[],conditions:number,base:number): number {
 return pockets.reduce((sum,item,slot)=>{const units=decodeMaterial(item);return sum+(((conditions>>>(slot*2))&3)===0&&units?.base===base?units.quantity:0);},0);
}
function validMaterialPockets(inventory:WorldInventory):boolean {
 return inventory.pockets.length===15&&inventory.pockets.every((item,slot)=>!materialReserved(item)||(decodeMaterial(item)!==null&&((inventory.conditions>>>(slot*2))&3)===0));
}
export function consumeMaterial(inventory: WorldInventory,base:number,amount:number): WorldInventory | null {
 if(!validMaterialPockets(inventory)||encodeMaterial(base,1)===null||!Number.isSafeInteger(amount)||amount<1||amount>450||materialCount(inventory.pockets,inventory.conditions,base)<amount)return null;
 const pockets=[...inventory.pockets];
 for(let slot=0;slot<15&&amount;slot++){const units=decodeMaterial(pockets[slot]!);if(((inventory.conditions>>>(slot*2))&3)!==0||units?.base!==base)continue;const taken=Math.min(amount,units.quantity);pockets[slot]=encodeMaterial(base,units.quantity-taken)!;amount-=taken;}
 return {...inventory,pockets};
}
export function creditMaterial(inventory: WorldInventory,base:number): WorldInventory | null {
 if(!validMaterialPockets(inventory)||encodeMaterial(base,1)===null)return null;
 let slot=inventory.pockets.findIndex((item,i)=>{const u=decodeMaterial(item);return ((inventory.conditions>>>(i*2))&3)===0&&u?.base===base&&u.quantity<30;});
 if(slot<0)slot=inventory.pockets.findIndex((item,i)=>item===0&&((inventory.conditions>>>(i*2))&3)===0);
 if(slot<0)return null;const pockets=[...inventory.pockets];pockets[slot]=encodeMaterial(base,(decodeMaterial(pockets[slot]!)?.quantity??0)+1)!;return {...inventory,pockets};
}
