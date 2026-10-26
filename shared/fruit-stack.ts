/** Stable u16 pocket codec; world foreground still carries unit fruit IDs. */
export const FRUIT_STACK_FIRST = 0x2810;
export const FRUIT_STACK_LAST = 0x2845;
const bases = [0x2800, 0x2801, 0x2802, 0x2803, 0x2804, 0x2807] as const;
export type FruitUnits = { base: number; quantity: number };
export function decodeFruit(item: number): FruitUnits | null {
  if (!Number.isInteger(item)) return null;
  if (bases.some(base => base === item)) return { base: item, quantity: 1 };
  if (item < FRUIT_STACK_FIRST || item > FRUIT_STACK_LAST) return null;
  const offset = item - FRUIT_STACK_FIRST;
  return { base: bases[Math.floor(offset / 9)]!, quantity: offset % 9 + 2 };
}

