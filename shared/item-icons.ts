import {decodeMaterial} from './material-units.ts';
import {CRAFTING_RECIPES} from './crafting.ts';
import { decodeFruit } from './fruit-stack.ts';
/** Private pocket-icon catalog (tools/extract_pocket_icons.py): every sprite the pocket draws, once,
 * and the item ranges that use it, as the port's mSM_draw_item tables map them. Original sprites carry
 * the pocket disc; `m<id>` keys are new item art in their style. */
export const POCKET_ICON_KEY = /^(?:s\d{1,3}|m[1-9]\d{3,4})$/;
export type ItemIconManifest = { version: string; private: true; format: 'png-rgba8'; width: 32; height: 32;
  icons: Record<string, { size: number; sha256: string }>; items: [first: number, last: number, icon: string][] };
const ICON_LIMIT = 512, RANGE_LIMIT = 4_096;
export function isItemIconManifest(value: unknown): value is ItemIconManifest {
  const manifest = value as ItemIconManifest;
  if (!manifest || manifest.private !== true || manifest.format !== 'png-rgba8' || manifest.width !== 32 || manifest.height !== 32
    || typeof manifest.version !== 'string' || !/^gc-pocket-icons-[a-f0-9]{16}$/.test(manifest.version)
    || !manifest.icons || typeof manifest.icons !== 'object' || !Array.isArray(manifest.items)) return false;
  const keys = Object.keys(manifest.icons);
  if (!keys.length || keys.length > ICON_LIMIT
    || !keys.every(key => POCKET_ICON_KEY.test(key) && Number.isSafeInteger(manifest.icons[key]!.size) && manifest.icons[key]!.size > 0
      && manifest.icons[key]!.size <= 16_384 && /^[a-f0-9]{64}$/.test(manifest.icons[key]!.sha256))) return false;
  if (!manifest.items.length || manifest.items.length > RANGE_LIMIT) return false;
  let previous = 0;
  return manifest.items.every(range => Array.isArray(range) && range.length === 3 && Number.isInteger(range[0]) && Number.isInteger(range[1])
    && range[0] > previous && range[1] >= range[0] && range[1] <= 0xffff && Object.hasOwn(manifest.icons, range[2]) && (previous = range[1], true));
}
/** The base item whose sprite the pocket draws: stacks and crafted items share their base's icon. */
export function pocketIconItem(item: number): number | null {
  if (!Number.isInteger(item) || item < 1 || item > 0xffff) return null;
  return decodeMaterial(item)?.base ?? decodeFruit(item)?.base ?? (CRAFTING_RECIPES.some(recipe => recipe.output.item === item) ? 4696 : item);
}
/** The catalog key for an item, or null when the pocket has no sprite for it (never a stand-in). */
export function pocketIconKey(manifest: ItemIconManifest, item: number): string | null {
  const base = pocketIconItem(item); if (base === null) return null;
  let low = 0, high = manifest.items.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1, [first, last, icon] = manifest.items[middle]!;
    if (base < first) high = middle - 1; else if (base > last) low = middle + 1; else return icon;
  }
  return null;
}
