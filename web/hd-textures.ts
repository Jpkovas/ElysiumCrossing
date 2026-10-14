import type { HDTextureManifest, HDTextureStats } from '../shared/contracts';
import { PrivateAssets } from './private-assets';

export type HDModule = {
  FS: { writeFile(path: string, bytes: Uint8Array): void; mkdirTree(path: string): void };
  ccall(name: string, result: string | null, types: string[], args: unknown[]): any;
  ecRequestHdTexture?: (name: string, requestId: number) => boolean;
};
const textureName = /^tex1_\d+x\d+_(?:m_)?[a-f0-9]{16}(?:_(?:[a-f0-9]{16}|\$))?_\d+\.dds$/;

/** Only requested DDS files enter MEMFS. Native code owns decoding and residency. */
export class HDTextures {
  private manifest: HDTextureManifest | null = null;
  private preparing: Promise<void> | null = null;
  private requests = new Map<number, AbortController>();
  private readonly lifetime = new AbortController();
  private enabled = false;
  error: string | null = null;
  constructor(private module: HDModule, private assets = new PrivateAssets('hd')) {
    module.ecRequestHdTexture = (name, requestId) => {
      if (this.lifetime.signal.aborted || !this.enabled || !this.manifest?.files[name]) return false;
      void this.request(name, requestId);
      return true;
    };
  }
  private async prepare(): Promise<void> {
    if (this.manifest) return;
    if (this.preparing) return this.preparing;
    this.preparing = (async () => {
      const manifest = await this.assets.manifest<HDTextureManifest>(`${this.assets.access.prefix}/textures/manifest`, this.lifetime.signal);
      this.lifetime.signal.throwIfAborted();
      if (!/^[a-zA-Z0-9-]{1,80}$/.test(manifest.version) || !manifest.files || typeof manifest.files !== 'object') throw new Error('O catálogo das texturas HD está inválido.');
      const entries = Object.entries(manifest.files);
      if (entries.length === 0 || entries.length > 30_000) throw new Error('O catálogo das texturas HD está incompleto.');
      // Validate all entries before registering any of them in the native index.
      for (const [name, file] of entries) {
        if (!textureName.test(name) || !Number.isSafeInteger(file.size) || file.size <= 128 || file.size > 32 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('O catálogo das texturas HD contém um arquivo inválido.');
      }
      this.module.FS.mkdirTree('/texture_pack');
      for (let offset = 0; offset < entries.length; offset += 256) {
        this.lifetime.signal.throwIfAborted();
        for (const [name] of entries.slice(offset, offset + 256)) this.module.ccall('pc_hd_register_texture', 'number', ['string'], [name]);
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
      this.lifetime.signal.throwIfAborted();
      if (this.stats().indexed !== entries.length) throw new Error('O jogo não conseguiu indexar todas as texturas HD.');
      this.manifest = manifest;
    })().finally(() => { this.preparing = null; });
    return this.preparing;
  }
  async setEnabled(enabled: boolean): Promise<boolean> {
    if (this.lifetime.signal.aborted) return false;
    this.error = null;
    try {
      if (enabled) await this.prepare();
      this.lifetime.signal.throwIfAborted();
      if (this.enabled !== enabled) {
        this.enabled = enabled;
        if (!enabled) {
          for (const controller of this.requests.values()) controller.abort();
          this.requests.clear();
        }
        this.module.ccall('pc_hd_set_enabled', null, ['number'], [enabled ? 1 : 0]);
      }
      return this.enabled;
    } catch (error) {
      if (this.lifetime.signal.aborted) return false;
      this.error = error instanceof Error ? error.message : 'Não foi possível ativar as texturas HD.';
      return this.enabled;
    }
  }
  /** Terminal graphics failure: preserve files and skip native completions. */
  stop(): void {
    if (this.lifetime.signal.aborted) return;
    this.lifetime.abort();
    this.enabled = false;
    for (const controller of this.requests.values()) controller.abort();
    this.requests.clear();
  }
  private async request(name: string, requestId: number): Promise<void> {
    const controller = new AbortController();
    this.requests.set(requestId, controller);
    const complete = (status: number) => this.lifetime.signal.aborted ? 0
      : this.module.ccall('pc_hd_texture_complete', 'number', ['string', 'number', 'number'], [name, requestId, status]);
    try {
      const expected = this.manifest?.files[name];
      if (!this.enabled || !expected || !textureName.test(name)) { complete(0); return; }
      const bytes = await this.assets.load(`${this.assets.access.prefix}/textures/${encodeURIComponent(this.manifest!.version)}/${encodeURIComponent(name)}`, expected, controller.signal);
      if (this.lifetime.signal.aborted) return;
      if (controller.signal.aborted || !this.enabled) { complete(0); return; }
      this.module.FS.writeFile(`/texture_pack/${name}`, new Uint8Array(bytes));
      if (!complete(1)) throw new Error('Uma textura HD não pôde ser preparada para este aparelho.');
    } catch (error) {
      if (this.lifetime.signal.aborted) return;
      complete(0);
      if (!controller.signal.aborted) this.error = error instanceof Error ? error.message : 'Não foi possível carregar uma textura HD.';
    } finally {
      if (this.requests.get(requestId) === controller) this.requests.delete(requestId);
    }
  }
  process(): void { if (!this.lifetime.signal.aborted) this.module.ccall('pc_hd_process', null, [], []); }
  stats(): HDTextureStats { return JSON.parse(this.module.ccall('pc_hd_stats_json', 'string', [], [])) as HDTextureStats; }
  cacheState() { return this.assets.state(); }
}
