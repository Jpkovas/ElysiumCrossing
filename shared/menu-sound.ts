/** Menu events that play an original GameCube system sound (see web/menu-sound.ts). */
export const MENU_SOUNDS = ['open', 'close', 'cursor', 'confirm', 'tag', 'back', 'error', 'page', 'grab', 'place'] as const;
export type MenuSound = typeof MENU_SOUNDS[number];
