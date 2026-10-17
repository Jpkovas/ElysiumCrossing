import type { CraftingOperation } from './crafting.ts';
/** Server-authoritative foreground operations. Coordinates exclude the native border acre. */
export const WORLD_WIDTH = 80;
export const WORLD_HEIGHT = 96;
export const WORLD_SCENE = 7 << 8; // SCENE_FG, field room 0.
export const WORLD_TILE_SIZE = 40;
export const WORLD_BORDER_TILES = 16;
export const WORLD_FURNITURE_ITEM = 4696;
export const WORLD_FURNITURE_LIMIT = 16;
export type QuarterTurn = 0 | 1 | 2 | 3;
export type WorldTarget = { x: number; z: number };
export type WorldFurniture = WorldTarget & {
  id: string;
  ownerId: string;
  item: typeof WORLD_FURNITURE_ITEM;
  rotation: QuarterTurn;
  revision: number;
};
type WorldOperationBase = {
  id: string;
  expectedWorldVersion: number;
  expectedOwnRevision: number;
  appliedSequence: number;
  target: WorldTarget;
};
export type WorldOperation = WorldOperationBase & (
  | { kind: 'shake_tree' | 'pickup' | 'water_flowers' }
  | CraftingOperation
  | { kind: 'plant_fruit'; pocketSlot: number }
  | { kind: 'gather_material' }
  | { kind: 'drop_material'; pocketSlot: number }
  | { kind: 'place_furniture'; pocketSlot: number; rotation: QuarterTurn }
  | { kind: 'remove_furniture'; objectId: string }
);
export type WorldTile = WorldTarget & { before: number; after: number };
export type WorldEntity = WorldTarget & ({id:string;kind:'fruit';item:number}|{id:string;kind:'material';item:number;quantity:number});
export type WorldInventory = { pockets: number[]; conditions: number; wallet: number };
export type WorldSnapshot = {
  townId: string;
  version: number;
  sequence: number;
  foreground: number[];
  entities: WorldEntity[];
  furniture: WorldFurniture[];
  watered: WorldTarget[];
};
export type WorldCommit = {
  kind: 'world' | 'fishing' | 'crafting';
  townId: string;
  operationId: string;
  sequence: number;
  version: number;
  tiles: WorldTile[];
  entities: WorldEntity[];
  furniture: WorldFurniture[];
  watered: WorldTarget[];
};
export type ActorCommit = WorldInventory & { gardeningReward?: { kind: 'first_plant'; bells: 100 }; learnedRecipes: string[]; operationId: string; ownRevision: number; pid: string };
export type ActorSnapshot = WorldInventory & { learnedRecipes: string[]; ownRevision: number; pid: string };
/** Baseline belongs to the captured RAM buffer; never retag an older buffer after a commit. */
export type CheckpointContext = { baselineRevision: number; worldTownId: string; appliedSequence: number };
export type WorldOperationResult = { world: WorldCommit; actor: ActorCommit; replayed: boolean };
