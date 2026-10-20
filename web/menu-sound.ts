/**
 * The web menus play the original GameCube system SEs. Over the game they go
 * through its own mixer, so the in-game mute applies. On the site, where no
 * game runs, the same SEs recorded from that mixer come from the game server
 * (with a session) and follow the site's own sound switch. Ids are from
 * client/include/audio_defs.h, each chosen from the native menu that plays it
 * for the same action.
 */
import { MENU_SOUNDS, type MenuSound } from '../shared/menu-sound.ts';
export type { MenuSound };
const SE: Record<MenuSound, number> = {
  open: 0x30,      // NA_SE_MENU_PAUSE: pockets opening (m_inventory_ovl)
  close: 0x02,     // NA_SE_MENU_EXIT: leaving storage, ordinance, bank
  cursor: 0x01,    // NA_SE_CURSOL: catalog, map and choice cursor
  confirm: 0x0D,   // NA_SE_SENTAKU_KETTEI: choice decided
  tag: 0x33,       // NA_SE_33: an item's option tag opening (m_tag_ovl)
  back: 0x1003,    // MONO(NA_SE_3): B one level up (calendar, address, score)
  error: 0x100A,   // MONO(NA_SE_A): the tag refusing an action
  page: 0x5F,      // NA_SE_5F: calendar month and notice page turn
  grab: 0x60,      // NA_SE_60: the hand picks an item up
  place: 0x41C,    // NA_SE_41C: the hand puts an item down
};
let target: () => { menuSound(id: number): void } | null = () => null;
/** The page owning the game frame says where the sounds go while a game runs. */
export function setMenuSoundTarget(next: typeof target): void { target = next; }
export function menuSound(kind: MenuSound): void {
  let game: ReturnType<typeof target> = null;
  try { game = target(); } catch { /* A closing game frame drops the sound. */ }
  if (game) { try { game.menuSound(SE[kind]); } catch { /* idem */ } return; }
  site.play(kind);
}

const MUTED_KEY = 'elysium.site.sound.muted';
/** Recorded SEs for the site, loaded once a signed-in page first needs them. */
const site = (() => {
  let context: AudioContext | null = null, enabled = false;
  const buffers = new Map<MenuSound, Promise<AudioBuffer | null>>();
  const load = (kind: MenuSound) => {
    if (!buffers.has(kind)) buffers.set(kind, fetch(`/game/menu-sound/${kind}.wav`, { credentials: 'same-origin' })
      .then(response => response.ok ? response.arrayBuffer() : null)
      .then(bytes => bytes && context ? context.decodeAudioData(bytes) : null)
      .catch(() => null));
    return buffers.get(kind)!;
  };
  return {
    /** Only a signed-in page may fetch them; the login stays silent. */
    enable(on: boolean) { enabled = on; if (!on) buffers.clear(); },
    play(kind: MenuSound) {
      if (!enabled || siteSoundMuted() || typeof AudioContext === 'undefined') return;
      context ??= new AudioContext();
      if (context.state === 'suspended') void context.resume().catch(() => {});
      if (!buffers.size) for (const value of MENU_SOUNDS) void load(value);
      void load(kind).then(buffer => {
        if (!buffer || !context || siteSoundMuted()) return;
        const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); source.start();
      });
    },
  };
})();
export const enableSiteSounds = (on: boolean) => site.enable(on);
let muted = (() => { try { return localStorage.getItem(MUTED_KEY) === 'true'; } catch { return false; } })();
/** The site's own switch: a device preference, apart from each resident's in-game "Som". */
export function siteSoundMuted(): boolean { return muted; }
export function setSiteSoundMuted(value: boolean): void {
  muted = value;
  try { localStorage.setItem(MUTED_KEY, String(value)); } catch { /* The switch still holds on this page. */ }
}
