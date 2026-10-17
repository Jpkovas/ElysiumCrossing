import {decodeMaterial} from './material-units.ts';
import {CRAFTING_RECIPES} from './crafting.ts';
import { decodeFruit } from './fruit-stack.ts';
/** Finite original pocket sprites. Common furniture uses the original green leaf. */
export const ORIGINAL_ITEM_ICON_IDS = [8704, 8705, 8706, 8707, 8761, 8762, 8763, 8764, 8765, 8766, 8767, 8768, 8769, 8770, 8771, 8796, 8797, 10240, 10241, 10242, 10243, 10244, 10247, 4696, 9536, 9568, 10498, 10499, 10500, 10501, 10502, 10503, 10504, 10505, 10506, 10538, 10539, 10540] as const;
export type OriginalItemIconId = typeof ORIGINAL_ITEM_ICON_IDS[number];
export type ItemIconManifest = { version: string; private: true; format: 'png-rgba8'; width: 32; height: 32;
  files: Record<string, { size: number; sha256: string; width: 32; height: 32 }> };
export function originalItemIconId(item: number): OriginalItemIconId | null {
  if (!Number.isInteger(item) || item < 1 || item > 0xffff) return null;
  const base = decodeMaterial(item)?.base ?? decodeFruit(item)?.base ?? (CRAFTING_RECIPES.some(recipe=>recipe.output.item===item) ? 4696 : item);
  return (ORIGINAL_ITEM_ICON_IDS as readonly number[]).includes(base) ? base as OriginalItemIconId : null;
}
