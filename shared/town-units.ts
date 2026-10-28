/** Ghost multiplayer: the few save ranges every copy of a town shares.
 * Each player keeps playing a whole card of its own; only these units travel.
 * A replace unit accepts a change when the server still holds the value the
 * player changed (the semantic precondition of that unit); a counter unit adds
 * the player's delta; a board unit adds the player's new posts; a mailbox unit
 * takes letters for its house (server/gifts.ts); a museum unit only adds donations;
 * a tiles unit (an acre of ground) takes each tile the player changed and the server still holds as the player saw it;
 * a server unit is written only by the server; a unit with a house belongs to that house's owner.
 * Offsets are wasm32 Save_t fields measured with offsetof (emcc, client headers):
 * homes, mHm_hs_c.mailbox/haniwa, Haniwa_c.message/bells, Shop_c, kabu_price_schedule, noticeboard, museum_display,
 * fg, deposit, watered_flowers, all_grow_renew_time, event_save_data, event_save_common (and its dates[BIRTHDAY]), event_year, animals (Animal_c),
 * now_npc_max, remove_animal_idx, last_removed_animal_id, npc_used_tbl, return_animal, last_grow_time, force_remove_date,
 * private_data (Private_c), police_box, num_statues, bridge, melody, needlework, snowmen and their date, LightHouse,
 * mask_cat and _241A8 (the ordinances). A unit with a profile is that player slot's public face, written only by its resident. */
export type TownUnit = { key: string; ranges: [offset: number, length: number][]; kind: 'replace' | 'counter' | 'board' | 'mailbox' | 'museum' | 'tiles' | 'server'; house?: number; profile?: number };

export const UNIT_SAVE = { saveSize: 149536, homes: 40552, homeSize: 9904, kabu: 132608, kabuSize: 24, board: 37548, boardSize: 3000, museum: 136488, museumSize: 63,
  fg: 80168, deposit: 135324, watered: 148540, growth: 133132, acres: 30,
  events: 132632, eventsSize: 188, eventsCommon: 132820, eventsCommonSize: 308, eventsBirthday: 132828, eventYear: 136472,
  animals: 95672, animalSize: 2440, animalCount: 15, privates: 32, privateSize: 9376, ordinance: 148264 } as const;
/** An acre's bytes in a tiles unit: 256 u16 items, then the 16 u16 rows of buried and of watered bits (row z, bit x). */
export const ACRE = { items: 512, rows: 32 } as const;
const HOME_ROOMS = 6704, MAILBOX = 2980, HANIWA = 9684, HANIWA_MESSAGE = 32, HANIWA_BELLS = 160;
const SHOP = 132288, SHOP_ITEMS = 206, SHOP_ITEM_COUNT = 39, SHOP_RARE = 284, SHOP_LOTTERY = 286, SHOP_LOTTERY_COUNT = 3, SHOP_SALES = 296;

const units: TownUnit[] = [];
for (let house = 0; house < 4; house++) {
  const home = UNIT_SAVE.homes + house * UNIT_SAVE.homeSize, haniwa = home + HANIWA;
  // Rooms, size and outlook; the cockroaches stay with each copy.
  units.push({ key: `home:${house}`, ranges: [[home, HOME_ROOMS]], kind: 'replace', house });
  units.push({ key: `mailbox:${house}`, ranges: [[home + HOME_ROOMS, MAILBOX]], kind: 'mailbox', house });
  for (let slot = 0; slot < 4; slot++) units.push({ key: `haniwa:${house}:${slot}`, ranges: [[haniwa + slot * 8, 8]], kind: 'replace' });
  units.push({ key: `haniwa:${house}:message`, ranges: [[haniwa + HANIWA_MESSAGE, 128]], kind: 'replace', house });
  units.push({ key: `haniwa:${house}:bells`, ranges: [[haniwa + HANIWA_BELLS, 4]], kind: 'counter' });
}
for (let slot = 0; slot < SHOP_ITEM_COUNT; slot++) units.push({ key: `shop:item:${slot}`, ranges: [[SHOP + SHOP_ITEMS + slot * 2, 2]], kind: 'replace' });
units.push({ key: 'shop:rare', ranges: [[SHOP + SHOP_RARE, 2]], kind: 'replace' });
for (let slot = 0; slot < SHOP_LOTTERY_COUNT; slot++) units.push({ key: `shop:lottery:${slot}`, ranges: [[SHOP + SHOP_LOTTERY + slot * 2, 2]], kind: 'replace' });
units.push({ key: 'shop:sales', ranges: [[SHOP + SHOP_SALES, 4]], kind: 'counter' });
// Lists, level, renewal dates and the foreign-visitor flag: one unit, so a day's lineup arrives whole.
units.push({ key: 'shop:meta', ranges: [[SHOP, SHOP_ITEMS], [SHOP + 292, 4], [SHOP + 300, 20]], kind: 'replace' });
// The week's turnip prices: the server draws them on Sunday (server/turnips.ts).
units.push({ key: 'turnips', ranges: [[UNIT_SAVE.kabu, UNIT_SAVE.kabuSize]], kind: 'server' });
// The notice board: residents' posts and friends' graffiti (server/graffiti.ts).
units.push({ key: 'board', ranges: [[UNIT_SAVE.board, UNIT_SAVE.boardSize]], kind: 'board' });
// The museum: what anyone donated stays donated for every copy, with the first donor (server/town-units.ts).
units.push({ key: 'museum', ranges: [[UNIT_SAVE.museum, UNIT_SAVE.museumSize]], kind: 'museum' });
// The day's growth: the first copy to grow a day sends its renewal time; the others then receive the grown ground.
units.push({ key: 'growth', ranges: [[UNIT_SAVE.growth, 8]], kind: 'replace' });
// The town's events: the special visitor (Saharah, Wendell, Katrina, Redd...), the week's (Gulliver, Joan, K.K.),
// their dates and places, and the event year. Each copy draws them at its scene changes (mEv init_event); the first
// draw of a day to reach the town stays, and a copy that receives it keeps it at its next scene change. The
// residents' own event bits (event_save_data.flags, the last 4 bytes) and the birthday date each copy writes for
// its own resident at every scene change (event_save_common.dates[BIRTHDAY]) stay with each card.
units.push({ key: 'events', kind: 'replace', ranges: [[UNIT_SAVE.events, UNIT_SAVE.eventsSize - 4],
  [UNIT_SAVE.eventsCommon, UNIT_SAVE.eventsBirthday - UNIT_SAVE.eventsCommon],
  [UNIT_SAVE.eventsBirthday + 2, UNIT_SAVE.eventsCommon + UNIT_SAVE.eventsCommonSize - UNIT_SAVE.eventsBirthday - 2],
  [UNIT_SAVE.eventYear, 2]] });
// Who lives where and the moves: each villager's id, home, catchphrase, request, clothes and move state, with the
// town's count, the one who wants to leave, the last to leave, who has lived here and the dates of the last move-in
// and move-out. One unit, so a move arrives whole. Each villager's memories of each player (friendship, letters),
// mood, relations and HP mail stay with each card (Animal_c.memories, mood, is_home, animal_relations, hp_mail).
units.push({ key: 'villagers', kind: 'replace', ranges: [
  ...Array.from({ length: UNIT_SAVE.animalCount }, (_, slot) => UNIT_SAVE.animals + slot * UNIT_SAVE.animalSize).flatMap(animal =>
    [[animal, 14], [animal + 2200, 74], [animal + 2276, 4], [animal + 2281, 7]] as [number, number][]),
  [24, 2], [132272, 14], [136398, 32], [148192, 12], [136284, 8], [136484, 4]] });
// Each resident's public face for the other copies: name and ids, looks, clothes, birthday and designs (door, statue, signs).
// Pockets, letters, debts and the rest of Private_c stay with each card.
for (let slot = 0; slot < 4; slot++) {
  const at = UNIT_SAVE.privates + slot * UNIT_SAVE.privateSize;
  units.push({ key: `profile:${slot}`, kind: 'replace', profile: slot, ranges: [[at, 22], [at + 4230, 1], [at + 4232, 4], [at + 4260, 4], [at + 4672, 4352 + 8]] });
}
// The police box's lost and found: one slot each, so the same item is claimed once.
for (let slot = 0; slot < 20; slot++) units.push({ key: `police:${slot}`, kind: 'replace', ranges: [[135248 + slot * 2, 2]] });
// Able's designs on display: a slot each.
for (let slot = 0; slot < 8; slot++) units.push({ key: `needlework:${slot}`, kind: 'replace', ranges: [[136576 + slot * 544, 544]] });
// The town's ordinance, its tune, the bridge Tortimer built, the gold statues, the snowmen and their day,
// the lighthouse quest and the cat mask's face.
units.push({ key: 'ordinance', kind: 'replace', ranges: [[UNIT_SAVE.ordinance, 1]] });
units.push({ key: 'melody', kind: 'replace', ranges: [[135304, 8]] });
units.push({ key: 'bridge', kind: 'replace', ranges: [[136560, 8]] });
units.push({ key: 'statues', kind: 'replace', ranges: [[133131, 1]] });
units.push({ key: 'snowmen', kind: 'replace', ranges: [[135288, 12], [136463, 4]] });
units.push({ key: 'lighthouse', kind: 'replace', ranges: [[148204, 8]] });
units.push({ key: 'mask', kind: 'replace', ranges: [[147616, 576]] });
// The ground, an acre each: items, buried items and watered flowers.
for (let acre = 0; acre < UNIT_SAVE.acres; acre++) units.push({ key: `ground:${acre}`, kind: 'tiles', ranges: [
  [UNIT_SAVE.fg + acre * ACRE.items, ACRE.items], [UNIT_SAVE.deposit + acre * ACRE.rows, ACRE.rows], [UNIT_SAVE.watered + acre * ACRE.rows, ACRE.rows]] });

export const TOWN_UNITS: readonly TownUnit[] = units;
/** A barrel placed or taken back by a resident, carried by the next units round. The page names the
 * request once, so a round sent again finds the barrel already placed or taken and answers the same. */
export type FurnitureAsk = { op: 'place'; id: string; x: number; z: number; rotation: number } | { op: 'remove'; id: string };
export const TOWN_UNIT = new Map(units.map(unit => [unit.key, unit]));
export const unitSize = (unit: TownUnit) => unit.ranges.reduce((sum, [, length]) => sum + length, 0);
/** The unit's bytes in a big-endian save image that starts at `base`. */
export function readUnit(save: Uint8Array, unit: TownUnit, base = 0): Uint8Array {
  const value = new Uint8Array(unitSize(unit));
  let at = 0;
  for (const [offset, length] of unit.ranges) { value.set(save.subarray(base + offset, base + offset + length), at); at += length; }
  return value;
}
/** Writes a unit value into a big-endian save image that starts at `base`. */
export function writeUnit(save: Uint8Array, unit: TownUnit, value: Uint8Array, base = 0): void {
  let at = 0;
  for (const [offset, length] of unit.ranges) { save.set(value.subarray(at, at + length), base + offset); at += length; }
}
