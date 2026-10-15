/** The single browser / API / room / C-bridge contract. WhatsApp is deferred. */
import type { ActorCommit, ActorSnapshot, WorldCommit, WorldOperation, WorldSnapshot } from './world';
import type { FishingSnapshot, FishingCast, FishingReceipt, NativeFishingRequest } from './fishing';
export const ROOM_NAME = 'town';
export const MAX_PLAYERS = 4;
export const POSITION_RATE_MS = 100;
/** Ordered native emote IDs: 0 clears; these six use IDs 1 through 6. */
export const EMOTES = ['wave', 'happy', 'laugh', 'sad', 'surprised', 'angry'] as const;
export type Emote = typeof EMOTES[number];
export const EMOTE_LABELS: Record<Emote, string> = { wave: 'Oi!', happy: 'Viva!', laugh: 'Ha, ha!', sad: 'Poxa', surprised: 'Uau!', angry: 'Ei!' };
export function isEmote(value: unknown): value is Emote { return typeof value === 'string' && (EMOTES as readonly string[]).includes(value); }
export const SAVE_LIMIT = 4 * 1024 * 1024;
/** Fixed original GAFE01 town GCI and the original BE mCD_foreigner_c body. */
export const CHECKPOINT_TOWN_BYTES = 467008;
export const PASSPORT_BYTES = 11808;
export const NES_SAVE_BYTES = 6592;
export const NES_HEADER_BYTES = 64;
export const NES_RESIDENT_BYTES = 1632;
export const CHECKPOINT_HEADER_BYTES = 16;
export const CHECKPOINT_MAX_BYTES = CHECKPOINT_HEADER_BYTES + CHECKPOINT_TOWN_BYTES + PASSPORT_BYTES + NES_SAVE_BYTES;
export type NativeCheckpoint = { town: ArrayBuffer; passport: ArrayBuffer | null; nes: ArrayBuffer | null };
/** Current PC native format. Bound every region before inspecting checksums. */
export function validNES(bytes: Uint8Array): boolean {
  if (bytes.byteLength !== NES_SAVE_BYTES) return false;
  const name = [71, 65, 70, 69, 70, 83, 67, 26];
  if (name.some((value, i) => bytes[i] !== value) || bytes[8] !== 1 || bytes[9] !== 0
    || bytes[10] !== NES_HEADER_BYTES || bytes[12] !== 0x60 || bytes[13] !== 6
    || bytes[14]! > 1) return false;
  const sum = (start: number, size: number): number => {
    let value = 0; for (let i = start; i < start + size; i++) value = (value + bytes[i]!) & 255; return value;
  };
  if (sum(0, NES_HEADER_BYTES) !== 0) return false;
  for (let slot = 0; slot < 4; slot++) {
    const offset = NES_HEADER_BYTES + slot * NES_RESIDENT_BYTES;
    if (bytes[offset] !== 68 || bytes[offset + 1] !== 49 || bytes[offset + 3] !== slot
      || sum(offset, NES_RESIDENT_BYTES) !== 0) return false;
  }
  return true;
}
/** One current envelope; raw GCI and older packets are deliberately rejected. */
export function checkpointPacket(town: Uint8Array, passport: Uint8Array | null, nes: Uint8Array | null): Uint8Array {
  if (town.byteLength !== CHECKPOINT_TOWN_BYTES || passport !== null && passport.byteLength !== PASSPORT_BYTES
    || nes !== null && !validNES(nes)) throw new Error('O checkpoint está incompleto ou contém dados NES inválidos.');
  const bytes = new Uint8Array(CHECKPOINT_HEADER_BYTES + town.byteLength + (passport?.byteLength ?? 0) + (nes?.byteLength ?? 0));
  bytes.set([69, 67, 67, 72, 75, 80, 84, 49]); // ECCHKPT1
  bytes[8] = (passport ? 1 : 0) | (nes ? 2 : 0);
  let offset = CHECKPOINT_HEADER_BYTES; bytes.set(town, offset); offset += town.byteLength;
  if (passport) { bytes.set(passport, offset); offset += passport.byteLength; }
  if (nes) bytes.set(nes, offset);
  return bytes;
}
export function checkpointPayloads(bytes: Uint8Array): { town: Uint8Array; passport: Uint8Array | null; nes: Uint8Array | null } {
  const magic = [69, 67, 67, 72, 75, 80, 84, 49];
  if (bytes.byteLength < CHECKPOINT_HEADER_BYTES || magic.some((value, i) => bytes[i] !== value)
    || bytes[8]! > 3 || bytes.subarray(9, CHECKPOINT_HEADER_BYTES).some(value => value !== 0)) throw new Error('O envelope do checkpoint é inválido.');
  const passport = (bytes[8]! & 1) !== 0, nes = (bytes[8]! & 2) !== 0;
  if (bytes.byteLength !== CHECKPOINT_HEADER_BYTES + CHECKPOINT_TOWN_BYTES + (passport ? PASSPORT_BYTES : 0) + (nes ? NES_SAVE_BYTES : 0)) throw new Error('O checkpoint não foi recebido por inteiro.');
  let offset = CHECKPOINT_HEADER_BYTES;
  const town = bytes.subarray(offset, offset += CHECKPOINT_TOWN_BYTES);
  const travel = passport ? bytes.subarray(offset, offset += PASSPORT_BYTES) : null;
  const personalNES = nes ? bytes.subarray(offset) : null;
  if (personalNES && !validNES(personalNES)) throw new Error('O save NES está danificado. A cópia original foi preservada.');
  return { town, passport: travel, nes: personalNES };
}
export type CheckpointProducer = { pid: string; ownTownIdentity: string };
export type CheckpointLineage = CheckpointProducer & {
  gameInstance: number; currentGameInstance: number; acknowledged: boolean; acceptedRevision: number;
  reconciledInstance: number; reconciledRevision: number;
  /** Exact physical Save & Quit candidate, now waiting for its final Continue. */
  exitCommit: boolean;
  /** Exact Own Save & Quit IO, still awaiting its authenticated receipt. */
  pendingExitCommit: boolean;
  continueCommit: boolean;
};
export type GameConnectionState = 'offline' | 'recovering' | 'ready';
export type GameLifecycle = 'boot' | 'playing' | 'exited';
export type NativeLiveCheckpoint = { checkpoint: NativeCheckpoint; token: number; producer: CheckpointProducer; repaymentWitness?: true; context?: CheckpointProviderState };
export type WorldIdentity = { pid: string; townIdentity: string; gameInstance: number; visitor: boolean };
export type WorldAdmission = Pick<WorldOperation, 'kind' | 'target'> & { intent: number; gameInstance: number };
export type PlantingAdmission = { intent: number; gameInstance: number; kind: 'plant_fruit'; pocketSlot: number; target: { x: number; z: number } };
export type NativeFishingState = { castId: string; phase: number; fishType: number; pending: boolean; result: boolean;
  gameInstance: number; checkpointToken: number };
/** RAM proof and server CAS are distinct; a capture keeps this entire context unchanged. */
export type CheckpointProviderState = {
  gameInstance: string;
  ramBaselineRevision: number;
  activeWorldTownId: string;
  appliedSequence: number;
  currentOwnRevision: number;
};
export type User = { id: string; name: string; phone: string; townName: string };
export type Town = { id: string; ownerName: string; name: string; revision: number; online: boolean; hasSave: boolean; landId?: number; identity?: string };
export type Session = { user: User; serverTime: number };
export type SaveVersion = { revision: number; sha256: string; size: number; createdAt: number };
/** Visible avatar pose only: animation layers, frame, loop and the drawable tool in hand (-1 none). Grants nothing. */
export type Position = { x: number; y: number; z: number; rotation: number; animation: number; animation1: number; partTable: number; frame: number; speed: number; loop: boolean; item: number; rootMotionFlags: 0 | 2 | 4 | 6; scene: number; character: number; town?: number; townIdentity?: string; visitor?: boolean };
export type Ghost = Position & { id: string; name: string; emote: Emote | '' };
/** Revision of the town's last server-confirmed GCI; no save bytes travel through the room. */
export type TownSnapshot = { players: Ghost[]; revision: number };
/** Read-only presentation snapshot; it grants no play lease, room or save-writing capability. */
export type PresentationBootstrap = { serverTime: number; save: { url: string; size: number; sha256: string } };
/** Native hooks only request a canonical capture. Their JSON is never a fact. */
export const NATIVE_EVENT_KINDS = ['rare_fish', 'rare_insect', 'fossil_donated', 'debt_paid', 'house_expanded', 'neighbor_arrived', 'neighbor_left', 'first_plant'] as const;
export type NativeEventKind = typeof NATIVE_EVENT_KINDS[number];
export function isNativeEventKind(value: unknown): value is NativeEventKind {
  return typeof value === 'string' && (NATIVE_EVENT_KINDS as readonly string[]).includes(value);
}
export type NativeEventReceipt = { id: string; sequence: number; kind: NativeEventKind; townId: string; pid: string | null;
  details: Record<string, number | string | boolean>; createdAt: number;
  source: { kind: 'checkpoint'; previousRevision: number; revision: number } |
    { kind: 'fishing'; operationId: string; castId: string; revision: number } |
    { kind: 'world'; operationId: string; revision: number } };
export type Activity = { id: string; userName: string; townName: string; kind: string; description: string; createdAt: number };
export type RoomTicket = { token: string; townId: string; userId: string; expiresAt: number; serverTime: number };
/** Server-internal live grant; never exposed in browser snapshots. */
export type RoomAuthorization = { userId: string; sessionDigest: string; leaseDigest: string };
export type PlayLease = { token: string; revision: number; expiresAt: number; nativeTownId: number; serverTime: number };

export type GraphicsSettings = { resolution: 1 | 2 | 3; hdTextures: boolean };
export const DEFAULT_GRAPHICS: GraphicsSettings = { resolution: 1, hdTextures: false };
export type HDTextureStats = {
  enabled: boolean; indexed: number; pending: number; decoding: number;
  loaded: number; failed: number; evicted: number; downscaled: number;
  resident: number; rejected: number; gpuBytes: number; budgetBytes: number;
  transientBytes: number; transientBudgetBytes: number; maxTextureSize: number;
  bc7: boolean; s3tc: boolean;
  lastSourceWidth: number; lastSourceHeight: number; lastWidth: number; lastHeight: number;
};
/** Accepted Native raster dimensions; ephemeral and independent of display DPR. */
export type UIRasterBudget = { cssWidth: number; cssHeight: number; pixelWidth: number; pixelHeight: number; factor: 1 | 2 | 3 };
export type GraphicsState = { ready: boolean; settings: GraphicsSettings; raster: UIRasterBudget | null; resolutionError: string | null; hdError: string | null; hd: HDTextureStats | null };
export type HDTextureManifest = { version: string; source: { title: string; url: string }; files: Record<string, { size: number; sha256: string }> };
export type ControlMode = 'touch' | 'joystick';
export type GameBootstrap = { ownTownId: string; targetTownId: string; ownRevision: number; nativeTownId: number; residentName: string; serverTime: number; ownSave: ArrayBuffer | null; targetSave: ArrayBuffer | null; passport: ArrayBuffer | null; nes: ArrayBuffer | null; graphics: GraphicsSettings; controlMode: ControlMode };
export const NES_BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'select', 'start', 'turboA', 'turboB'] as const;
export type NESButton = typeof NES_BUTTONS[number];
export type TouchInput = { kind: 'stick'; x: number; y: number; run: boolean } | { kind: 'pointer'; phase: 'start' | 'move' | 'end' | 'cancel'; id: number; x: number; y: number } | { kind: 'nes-button'; button: NESButton; pressed: boolean };
export type TouchAction = 'primary' | 'map' | 'pocket' | 'back' | 'text' | 'arrange' | 'putAway' | 'light' | 'cameraLeft' | 'cameraRight' | 'cameraNear' | 'cameraFar' | 'musicPlay' | 'musicReset' | 'musicUp' | 'musicDown' | 'calendarPrevious' | 'calendarNext' | 'mark' | 'addressPrevious' | 'addressNext' | 'editorHeader' | 'editorAfterRecipient' | 'editorBody' | 'editorSignature' | 'designEyedropper';
/** Menu HUD corner in canvas-local CSS pixels; (-1, -1) means no occupied corner. */
export type NativeUIInsets = { dialogueBottom: number; dialogueSafeBottom: number; clockTop: number; clockRight: number; reducedMotion: boolean; menuHudLeft: number; menuHudTop: number; safeLeft: number };
export type TouchUI = {
  ready: boolean; busy: boolean;
  mode: 'boot' | 'world' | 'dialogue' | 'menu' | 'map' | 'editor' | 'design' | 'nes' | 'melody';
  nesPhase?: 'loading' | 'playing' | 'leaving';
  actionLabel: string; actionEnabled: boolean;
  canMap: boolean; canPocket: boolean; canBack: boolean;
  canArrange: boolean; arranging: boolean; canPutAway: boolean; furnitureContext: boolean; canMove: boolean; canRun: boolean;
  roomControls?: { lightOn: boolean; lightAvailable: boolean; canLight: boolean; camera: number };
  melody?: number;
  calendarEvents?: number;
  addressPages?: boolean;
  inventorySelection?: boolean;
  /** Current native pockets only; no client-owned tool registry. */
  tools?: { equipped: number; equippedLabel: string; storeSlot: number | null; items: { slot: number; item: number; label: string }[] };
  toolPending?: boolean;
  /** Transient native touch instruction; no gameplay state or input action. */
  touchNotice?: 'tree_tool' | 'pockets_full';
  /** Native placement preview; it never consumes or persists an item. */
  exteriorPreview?: { x: number; z: number; rotation: 0 | 1 | 2 | 3; valid: boolean; pending: boolean };
  /** Present only when the native drawing editor can sample a canvas color. */
  designEyedropper?: boolean;
  choicePrompt?: string;
  choices?: { index: number; text: string; selected: boolean }[];
  actionAt?: { x: number; y: number };
  editor?: { text: string; prompt: string; maxLength: number; multiline: boolean; error?: string;
    letterField?: 'header' | 'afterRecipient' | 'body' | 'signature'; canEditAfterRecipient?: boolean };
};
/** Browser interface implemented by the native game runtime. */
export interface NativeGame {
  start(config: GameBootstrap): Promise<void>;
  position(): Position | null;
  setGhost(slot: number, ghost: Ghost): void;
  /** Server-confirmed transient reaction; zero/empty cancels, never saved. */
  reaction(emote: Emote | ''): void;
  removeGhost(slot: number): void;
  serverTime(epochSeconds: number): void;
  /** Copies current RAM at a native safepoint; never substitutes a physical Card A read. */
  checkpoint(): Promise<NativeLiveCheckpoint | null>;
  /** Pure JS metadata getter, also sampled synchronously at an original COMMIT callback. */
  checkpointContext(provider: () => CheckpointProviderState | null): void;
  checkpointLineage(token: number): CheckpointLineage | null;
  checkpointRelease(token: number): boolean;
  /** Retires only a capture that was never submitted; in-flight candidates remain protected. */
  checkpointDiscard(token: number): boolean;
  /** Offline stops simulation; recovery permits native reconciliation with all inputs blocked. */
  connectionState(state: GameConnectionState): void;
  /** Original lifecycle only, ignoring the bootstrap title until a real game has run. */
  lifecycle(): GameLifecycle;
  worldIdentity(): WorldIdentity | null;
  /** Frozen city bound to the actual NES GAME; does not grant world actions. */
  checkpointContinuation(): WorldIdentity | null;
  worldEnabled(enabled: boolean): void;
  worldBind(binding: WorldIdentity & { townId: string; version: number; sequence: number; ownRevision: number }): void;
  worldSnapshot(world: WorldSnapshot, actor: ActorSnapshot): Promise<void>;
  worldCommit(world: WorldCommit, actor: ActorCommit | null): Promise<void>;
  worldComplete(operationId: string, receipt?: { sequence: number; ownRevision: number }): void;
  /** Starts a native admission; no network or inventory mutation. */
  worldCraftMenu(): boolean;
  worldCraftRequest(kind: 'learn_recipe' | 'craft_recipe'): number;
  worldCraftCancel(intent: number): boolean;
  worldCrafting(): { ready: boolean; apples: number };
  worldRequest(): WorldOperation | null;
  worldAdmission(): WorldAdmission | null;
  worldResumeAdmission(): 0 | 1 | 2 | 3;
  worldOwnCheckpoint(checkpointToken: number, revision: number, checkpoint: NativeCheckpoint): Promise<boolean>;
  /** 1 rebases the current canonical baseline; 2 only records an exact older candidate's ACK. */
  worldRevision(revision: number, checkpointToken: number, canonicalMatches: boolean): 0 | 1 | 2;
  fishingBind(identity: WorldIdentity & { townId: string }): void;
  fishingEnabled(enabled: boolean): void;
  fishingSnapshot(snapshot: FishingSnapshot): void;
  fishingCast(cast: FishingCast, sequence: number, serverTime: number): void;
  fishingRequest(): NativeFishingRequest | null;
  fishingAdmit(request: NativeFishingRequest, versions: { expectedWorldVersion: number; expectedOwnRevision: number; appliedSequence: number }): boolean;
  fishingState(): NativeFishingState | null;
  fishingResumeCast(token: number): void;
  fishingAdmissionValid(): boolean;
  fishingRestorePending(castId: string, fishType: number): void;
  fishingTerminal(castId: string, ownRevision: number): void;
  fishingResolvePendingTerminal(castId: string, operationId: string, sequence: number, ownRevision: number): void;
  fishingResult(receipt: FishingReceipt, ownRevision: number): void;
  fishingReject(operationId: string): void;
  plantingAdmission(): PlantingAdmission | null;
  plantingAdmissionValid(): boolean;
  plantingCaptureBind(intent: number, token: number): boolean;
  plantingResume(intent: number, token: number, ownRevision: number): boolean;
  plantingReject(intent: number): boolean;
  plantingVisualStart(intent: number): boolean;
  /** 0 awaits native proof; 1 awaits the original animation; 2 is fully settled. */
  plantingReceiptFinish(operationId: string, sequence: number, ownRevision: number): 0 | 1 | 2;
  /** Capture all gameplay inputs; release waits for neutral hardware state. */
  inputModal(held: boolean): void;
  focus(): void;
  touch(input: TouchInput): void;
  action(name: TouchAction, text?: string): void;
  /** Queues one native equipment selection; settlement belongs to its animation. */
  equipTool(slot: number, item: number): boolean;
  choose(index: number): void;
  uiInsets(insets: NativeUIInsets): void;
  uiSnapshot(): TouchUI;
  /** m_banti.c: the clock alpha drawn this frame, 0 when banti_draw skips it. */
  uiClockAlpha(): number;
  configureGraphics(settings: GraphicsSettings): Promise<GraphicsState>;
  graphicsState(): GraphicsState;
  controlMode(mode: ControlMode): void;
  selectedControlMode(): ControlMode;
}

/* HTTP endpoints (all private except signup, login and health; JSON errors {error, code}):
 * POST /api/signup/invite {invite, name} -> {user, options} + enrollment cookie (no session)
 * POST /api/signup/passkey {credential} -> Session; POST /api/login/options -> {options}
 * POST /api/login {credential} -> Session (passkey only); POST /api/logout -> 204
 * GET /api/session -> Session; GET /api/towns -> {towns: Town[]}
 * POST /api/play/lease -> PlayLease; PUT /api/play/lease {token} renews
 * DELETE /api/play/lease {token} releases
 * GET /api/saves/:townId -> town-only GCI bytes with X-Save-Revision (404 if new)
 * GET /api/play/checkpoint?revision=<revision> -> exact own checkpoint, current revision when omitted
 * PUT /api/saves -> checkpoint envelope; X-Save-Revision + X-Play-Lease; returns SaveVersion
 * X-Save-Source is required: 'game' for native commits, 'import' for a first import.
 * POST /api/rooms/ticket {townId} -> RoomTicket
 * GET /api/play/events?after=<sequence> -> {receipts: NativeEventReceipt[]} (max 100)
 * GET /api/activity -> {activity: Activity[]}
 * GET /game/* -> authenticated compiled port + local disc (never publicly cached)
 * Colyseus joinOrCreate('town', {token, townId}); messages: position(Position), chat({text}),
 * emote({emote}), snapshot(TownSnapshot), chat({id,name,text}), error({code,message}).
 * Room delegates verifyTicket, getTown, setPresence(townId,userId,online) to API service.
 * C bridge exports ec_position_json, ec_set_ghost(slot,x,y,z,rot,anim,anim1,partTable,frame,speed,loop,item,rootMotionFlags,scene,char,nameUtf8,emoteId),
 * ec_remove_ghost(slot), ec_set_server_time(seconds), ec_set_visitor(bool).
 * ec_set_new_town_id(id) receives the server reservation before new-town creation.
 * callMain(['--direct-start', residentName]) enters through original native title
 * readiness/selection routines; an ambiguous resident still requires native choice.
 * Browser global window.ElysiumNativeEvent(json) and Module.onElysiumSave(detail)
 * are called by native hooks. ec_passport_capture refreshes the original BE body in MEMFS.
 * Every checkpoint contains Card A + its passport; Card B town bytes never enter the API.
 */
