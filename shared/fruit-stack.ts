/** Stable u16 pocket codec; world foreground still carries unit fruit IDs. */
import type { WorldInventory } from './world.ts';
export const FRUIT_STACK_FIRST = 0x2810;
export const FRUIT_STACK_LAST = 0x2845;
export const FRUIT_STACK_LIMIT = 10;
const bases = [0x2800, 0x2801, 0x2802, 0x2803, 0x2804, 0x2807] as const;
export type FruitUnits = { base: number; quantity: number };
export function decodeFruit(item: number): FruitUnits | null {
  if (!Number.isInteger(item)) return null;
  if (bases.some(base => base === item)) return { base: item, quantity: 1 };
  if (item < FRUIT_STACK_FIRST || item > FRUIT_STACK_LAST) return null;
  const offset = item - FRUIT_STACK_FIRST;
  return { base: bases[Math.floor(offset / 9)]!, quantity: offset % 9 + 2 };
}
export function encodeFruit(base: number, quantity: number): number | null {
  const ordinal = bases.findIndex(item => item === base);
  if (ordinal < 0 || !Number.isInteger(quantity) || quantity < 0 || quantity > FRUIT_STACK_LIMIT) return null;
  return quantity === 0 ? 0 : quantity === 1 ? base : FRUIT_STACK_FIRST + ordinal * 9 + quantity - 2;
}
export function countFruitUnits(pockets: readonly number[], base: number): number {
  return pockets.reduce((total, item) => {
    const fruit = decodeFruit(item);
    return total + (fruit?.base === base ? fruit.quantity : 0);
  }, 0);
}
/** Conditions retain their complete bitset; reserve flagged empty slots. */
export function creditFruitUnit(inventory: WorldInventory, base: number): WorldInventory | null {
  if (encodeFruit(base, 1) !== base || inventory.pockets.length !== 15) return null;
  let slot = inventory.pockets.findIndex((item, index) => {
    const fruit = decodeFruit(item);
    return ((inventory.conditions >>> (index * 2)) & 3) === 0 && fruit?.base === base && fruit.quantity < FRUIT_STACK_LIMIT;
  });
  if (slot < 0) slot = inventory.pockets.findIndex((item, index) => item === 0 && ((inventory.conditions >>> (index * 2)) & 3) === 0);
  if (slot < 0) return null;
  const pockets = [...inventory.pockets];
  pockets[slot] = encodeFruit(base, (decodeFruit(pockets[slot]!)?.quantity ?? 0) + 1)!;
  return { ...inventory, pockets };
}
/** Debit one unit after caller's original admission. No write on rejection. */
export function debitFruitUnit(inventory: WorldInventory, slot: number): { inventory: WorldInventory; base: number } | null {
  if (!Number.isInteger(slot) || slot < 0 || slot >= 15 || inventory.pockets.length !== 15 ||
      ((inventory.conditions >>> (slot * 2)) & 3) !== 0) return null;
  const fruit = decodeFruit(inventory.pockets[slot]!);
  if (!fruit) return null;
  const pockets = [...inventory.pockets]; pockets[slot] = encodeFruit(fruit.base, fruit.quantity - 1)!;
  return { inventory: { ...inventory, pockets }, base: fruit.base };
}

/** Plan ingredients in ascending NORMAL slots. Caller checks output capacity
 * on this copy before committing the entire craft; source inventory is intact. */
export function consumeFruitUnits(inventory: WorldInventory, base: number, quantity: number): WorldInventory | null {
  if (inventory.pockets.length !== 15 || encodeFruit(base, 1) !== base ||
      !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 150) return null;
  let total = 0;
  for (let slot = 0; slot < 15; slot++) {
    const fruit = decodeFruit(inventory.pockets[slot]!);
    if (((inventory.conditions >>> (slot * 2)) & 3) === 0 && fruit?.base === base) total += fruit.quantity;
  }
  if (total < quantity) return null;
  const pockets = [...inventory.pockets];
  let remaining = quantity;
  for (let slot = 0; slot < 15 && remaining; slot++) {
    const fruit = decodeFruit(pockets[slot]!);
    if (((inventory.conditions >>> (slot * 2)) & 3) !== 0 || fruit?.base !== base) continue;
    const taken = Math.min(remaining, fruit.quantity);
    pockets[slot] = encodeFruit(base, fruit.quantity - taken)!;
    remaining -= taken;
  }
  return { ...inventory, pockets };
}
