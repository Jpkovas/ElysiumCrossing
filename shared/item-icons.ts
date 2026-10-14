import { decodeFruit } from './fruit-stack.ts';
/** Finite original pocket sprites. Common furniture uses the original green leaf. */
export const ORIGINAL_ITEM_ICON_IDS = [8704, 8705, 8706, 8707, 8761, 8762, 8763, 8764, 8765, 8766, 8767, 8768, 8769, 8770, 8771, 10240, 10241, 10242, 10243, 10244, 10247, 4696] as const;
export type OriginalItemIconId = typeof ORIGINAL_ITEM_ICON_IDS[number];
export type ItemIconManifest = { version: string; private: true; format: 'png-rgba8'; width: 32; height: 32;
  files: Record<string, { size: number; sha256: string; width: 32; height: 32 }> };
export function originalItemIconId(item: number): OriginalItemIconId | null {
  if (!Number.isInteger(item) || item < 1 || item > 0xffff) return null;
  const base = decodeFruit(item)?.base ?? item;
  return (ORIGINAL_ITEM_ICON_IDS as readonly number[]).includes(base) ? base as OriginalItemIconId : null;
}
