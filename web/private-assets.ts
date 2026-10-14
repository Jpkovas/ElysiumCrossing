export type AssetDigest = { size: number; sha256: string };
export const PRIVATE_ASSET_BUDGETS = { core: 64 * 1024 * 1024, hd: 96 * 1024 * 1024 } as const;
export const PRIVATE_ASSET_DATABASE = 'elysium-private-assets';
type Group = keyof typeof PRIVATE_ASSET_BUDGETS;
export type AssetAccess = { prefix: '/game' | '/presentation/assets'; gate: '/api/session' | '/presentation/bootstrap' };
export type PrivateAssetState = { budgetBytes: number; bytes: number; hits: number; downloads: number; evicted: number; storageError: string | null };
type Metadata = { key: string; size: number; used: number };
const corePaths = new Set(['/index.js', '/index.wasm', '/index.data', '/nipplejs.min.js', '/rom.ciso', '/mods/forest_1st.arc', '/mods/forest_2nd.arc', '/mods/item-names.bin']);
const itemIconPaths = new Set(['/item-icons/8704.png', '/item-icons/8705.png', '/item-icons/8706.png', '/item-icons/8707.png', '/item-icons/8761.png', '/item-icons/8762.png', '/item-icons/8763.png', '/item-icons/8764.png', '/item-icons/8765.png', '/item-icons/8766.png', '/item-icons/8767.png', '/item-icons/8768.png', '/item-icons/8769.png', '/item-icons/8770.png', '/item-icons/8771.png', '/item-icons/10240.png', '/item-icons/10241.png', '/item-icons/10242.png', '/item-icons/10243.png', '/item-icons/10244.png', '/item-icons/10247.png', '/item-icons/4696.png']);
const uiFontPaths = new Set(['/ui-font/atlas.png']);
const uiHandPaths = new Set(['/ui-hand/atlas-1.png', '/ui-hand/atlas-2.png', '/ui-hand/atlas-3.png']);
const hdPath = /^\/textures\/[a-zA-Z0-9-]{1,80}\/tex1_\d+x\d+_(?:m_)?[a-f0-9]{16}(?:_(?:[a-f0-9]{16}|\$))?_\d+\.dds$/;
export async function assetSHA256(bytes: ArrayBuffer): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
}
function abort(signal?: AbortSignal): void { signal?.throwIfAborted(); }

/** One IndexedDB backend: immutable verified assets, fresh online gates, never saves or tokens. */
export class PrivateAssets {
  private authorized = false;
  private sessionTask: Promise<void> | null = null;
  private databaseTask: Promise<IDBDatabase> | null = null;
  private readonly info: PrivateAssetState;
  constructor(private group: Group, private factory?: IDBFactory, readonly access: AssetAccess = { prefix: '/game', gate: '/api/session' }) {
    this.info = { budgetBytes: PRIVATE_ASSET_BUDGETS[group], bytes: 0, hits: 0, downloads: 0, evicted: 0, storageError: null };
  }
  state(): PrivateAssetState { return { ...this.info }; }
  async manifest<T>(path: string, signal?: AbortSignal): Promise<T> {
    const root = this.access.prefix;
    if (![`${root}${root === '/game' ? '/assets' : ''}/manifest`, `${root}/mods/manifest`, `${root}/textures/manifest`, ...(root === '/game' ? ['/game/item-icons/manifest', '/game/ui-font/manifest', '/game/ui-hand/manifest'] : [])].includes(path)) throw new Error('Catálogo de arquivos não permitido.');
    this.authorized = false;
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal });
    if (!response.ok) throw new Error(response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : 'O catálogo de arquivos não está disponível.');
    const manifest = await response.json() as T;
    this.authorized = true;
    return manifest;
  }
  private async session(signal?: AbortSignal): Promise<void> {
    abort(signal);
    if (!this.authorized) throw new Error('Entre novamente para carregar os arquivos do jogo.');
    if (!this.sessionTask) {
      this.sessionTask = (async () => {
        // Each caller can cancel its asset without cancelling another waiting load.
        const response = await fetch(this.access.gate, { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) this.authorized = false;
          throw new Error(response.status === 401 || response.status === 403
            ? 'Sua sessão expirou. Entre novamente.'
            : 'Não foi possível autorizar os arquivos agora. Aguarde um pouco e tente novamente.');
        }
      })().finally(() => { this.sessionTask = null; });
    }
    await this.sessionTask;
    abort(signal);
  }
  private storageFailed(error: unknown): void {
    this.info.storageError = error instanceof Error ? error.message : 'Os arquivos não puderam ser guardados neste navegador.';
  }
  private database(): Promise<IDBDatabase> {
    if (!this.databaseTask) this.databaseTask = new Promise<IDBDatabase>((resolve, reject) => {
      const factory = this.factory ?? globalThis.indexedDB;
      if (!factory) throw new Error('Este navegador não oferece armazenamento de arquivos.');
      const request = factory.open(PRIVATE_ASSET_DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('core', { keyPath: 'key' });
        request.result.createObjectStore('hd', { keyPath: 'key' });
        request.result.createObjectStore('bytes');
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); this.databaseTask = null; };
        resolve(db);
      };
      request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o armazenamento de arquivos.'));
      request.onblocked = () => reject(new Error('O armazenamento de arquivos está ocupado.'));
    }).catch(error => { this.databaseTask = null; throw error; });
    return this.databaseTask;
  }
  private transaction<T>(db: IDBDatabase, mode: IDBTransactionMode, work: (tx: IDBTransaction) => () => T, signal?: AbortSignal): Promise<T> {
    abort(signal);
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction([this.group, 'bytes'], mode);
      const cancelled = () => { try { tx.abort(); } catch { /* Already settled. */ } };
      signal?.addEventListener('abort', cancelled, { once: true });
      const cleanup = () => signal?.removeEventListener('abort', cancelled);
      tx.onabort = () => { cleanup(); reject(tx.error ?? new DOMException('A gravação foi cancelada.', 'AbortError')); };
      try {
        const result = work(tx);
        tx.oncomplete = () => { cleanup(); resolve(result()); };
      } catch (error) { cleanup(); cancelled(); reject(error); }
    });
  }
  private key(expected: AssetDigest): string { return `${expected.sha256}-${expected.size}`; }
  private payloadKey(key: string): string { return `${this.group}:${key}`; }
  private valid(entry: Metadata): boolean {
    return !!entry && typeof entry.key === 'string' && /^[a-f0-9]{64}-[1-9]\d*$/.test(entry.key)
      && Number(entry.key.slice(65)) === entry.size && Number.isSafeInteger(entry.size) && entry.size <= this.info.budgetBytes
      && Number.isFinite(entry.used);
  }
  private remove(tx: IDBTransaction, key: string): void {
    tx.objectStore(this.group).delete(key); tx.objectStore('bytes').delete(this.payloadKey(key));
  }
  private async read(expected: AssetDigest, signal?: AbortSignal): Promise<ArrayBuffer | null> {
    try {
      const db = await this.database(); const key = this.key(expected);
      const found = await this.transaction(db, 'readonly', tx => {
        const metadata = tx.objectStore(this.group).get(key);
        const bytes = tx.objectStore('bytes').get(this.payloadKey(key));
        return () => ({ metadata: metadata.result as Metadata | undefined, bytes: bytes.result as unknown });
      }, signal);
      if (!found.metadata && found.bytes === undefined) return null;
      if (!found.metadata || !this.valid(found.metadata) || found.metadata.size !== expected.size
        || !(found.bytes instanceof ArrayBuffer) || found.bytes.byteLength !== expected.size || await assetSHA256(found.bytes) !== expected.sha256) {
        await this.transaction(db, 'readwrite', tx => { this.remove(tx, key); return () => {}; }, signal);
        return null;
      }
      abort(signal); const bytes = found.bytes;
      // Touch only metadata: a hit never rewrites the CISO/DDS payload.
      try {
        const size = await this.transaction(db, 'readwrite', tx => {
          const store = tx.objectStore(this.group); const all = store.getAll(); let total = 0;
          all.onsuccess = () => {
            for (const entry of all.result as Metadata[]) {
              if (!this.valid(entry)) { this.remove(tx, entry.key); continue; }
              total += entry.size;
              if (entry.key === key) store.put({ ...entry, used: Date.now() });
            }
          };
          return () => total;
        }, signal);
        this.info.bytes = size;
      } catch (error) { abort(signal); this.storageFailed(error); }
      this.info.hits++;
      return bytes;
    } catch (error) { abort(signal); this.storageFailed(error); return null; }
  }
  private async store(expected: AssetDigest, bytes: ArrayBuffer, signal?: AbortSignal): Promise<void> {
    try {
      const db = await this.database(); const key = this.key(expected);
      const result = await this.transaction(db, 'readwrite', tx => {
        const store = tx.objectStore(this.group); const all = store.getAll(); let total = 0; let evicted = 0;
        all.onsuccess = () => {
          const entries: Metadata[] = [];
          for (const entry of all.result as Metadata[]) {
            if (!this.valid(entry)) { this.remove(tx, entry.key); continue; }
            if (entry.key !== key) { total += entry.size; entries.push(entry); }
          }
          entries.sort((a, b) => a.used - b.used);
          for (const entry of entries) {
            if (total + bytes.byteLength <= this.info.budgetBytes) break;
            this.remove(tx, entry.key); total -= entry.size; evicted++;
          }
          tx.objectStore('bytes').put(bytes, this.payloadKey(key));
          store.put({ key, size: bytes.byteLength, used: Date.now() });
          total += bytes.byteLength;
        };
        return () => ({ total, evicted });
      }, signal);
      this.info.bytes = result.total; this.info.evicted += result.evicted; this.info.storageError = null;
    } catch (error) { abort(signal); this.storageFailed(error); }
  }
  async load(path: string, expected: AssetDigest, signal?: AbortSignal): Promise<ArrayBuffer> {
    let relative = path.startsWith(`${this.access.prefix}/`) ? path.slice(this.access.prefix.length) : '';
    if (this.group === 'hd') {
      const parts = /^\/textures\/([^/]+)\/([^/]+)$/.exec(relative);
      relative = '';
      if (parts) try {
        const version = decodeURIComponent(parts[1]!);
        const name = decodeURIComponent(parts[2]!);
        // Validate the decoded basename, but accept only the canonical URL
        // produced by HDTextures. Slashes/traversal/double encoding stay invalid.
        if (encodeURIComponent(version) === parts[1] && encodeURIComponent(name) === parts[2])
          relative = `/textures/${version}/${name}`;
      } catch { /* Malformed percent escapes fail the same whitelist below. */ }
    }
    if (!(this.group === 'core' ? corePaths.has(relative) || this.access.prefix === '/game' && (itemIconPaths.has(relative) || uiFontPaths.has(relative) || uiHandPaths.has(relative)) : hdPath.test(relative))
      || !Number.isSafeInteger(expected?.size) || expected.size < 1 || expected.size > this.info.budgetBytes
      || !/^[a-f0-9]{64}$/.test(expected.sha256)) throw new Error('Arquivo do jogo não permitido.');
    await this.session(signal);
    const cached = await this.read(expected, signal);
    if (cached) return cached;
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal });
    if (!response.ok) throw new Error(response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : 'Um arquivo do jogo não pôde ser baixado.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== expected.size || await assetSHA256(bytes) !== expected.sha256) throw new Error('O arquivo recebido está incompleto. Reabra o jogo para baixar novamente.');
    abort(signal); this.info.downloads++;
    await this.store(expected, bytes, signal);
    abort(signal);
    return bytes;
  }
}
