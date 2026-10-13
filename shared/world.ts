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
  | { kind: 'shake_tree' | 'pickup' }
  | { kind: 'plant_fruit'; pocketSlot: number }
  | { kind: 'place_furniture'; pocketSlot: number; rotation: QuarterTurn }
  | { kind: 'remove_furniture'; objectId: string }
);
export type WorldTile = WorldTarget & { before: number; after: number };
export type WorldEntity = WorldTarget & { id: string; kind: 'fruit'; item: number };
export type WorldInventory = { pockets: number[]; conditions: number; wallet: number };
export type WorldSnapshot = {
  townId: string;
  version: number;
  sequence: number;
  foreground: number[];
  entities: WorldEntity[];
  furniture: WorldFurniture[];
};
export type WorldCommit = {
  kind: 'world' | 'fishing';
  townId: string;
  operationId: string;
  sequence: number;
  version: number;
  tiles: WorldTile[];
  entities: WorldEntity[];
  furniture: WorldFurniture[];
};
export type ActorCommit = WorldInventory & { operationId: string; ownRevision: number; pid: string };
export type ActorSnapshot = WorldInventory & { ownRevision: number; pid: string };
/** Baseline belongs to the captured RAM buffer; never retag an older buffer after a commit. */
export type CheckpointContext = { baselineRevision: number; worldTownId: string; appliedSequence: number };
export type WorldOperationResult = { world: WorldCommit; actor: ActorCommit; replayed: boolean };
