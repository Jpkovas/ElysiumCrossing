import { MATERIALS, MATERIAL_BLOCK } from './material-definitions.ts';
export type MaterialUnits = { base: number; quantity: number };
/** Each material owns a 32-ID block; the two IDs past the limit stay invalid. */
export function materialReserved(item: number): boolean { return Number.isInteger(item) && MATERIALS.some(t => item >= t.base && item < t.base + MATERIAL_BLOCK); }
export function decodeMaterial(item: number): MaterialUnits | null {
 if (!Number.isInteger(item)) return null;
 const type=MATERIALS.find(t=>item>=t.base&&item<t.base+t.limit);
 return type?{base:type.base,quantity:item-type.base+1}:null;
}
