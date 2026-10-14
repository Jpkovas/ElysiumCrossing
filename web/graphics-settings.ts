import { DEFAULT_GRAPHICS, type GraphicsSettings, type GraphicsState, type NativeGame } from '../shared/contracts';
import { pulseHaptic } from './haptics';

const storageKey = 'elysium.graphics';

export function readGraphicsSettings(): GraphicsSettings {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (stored && typeof stored === 'object' && 'resolution' in stored && 'hdTextures' in stored &&
        [1, 2, 3].includes(stored.resolution as number) && typeof stored.hdTextures === 'boolean') {
      return { resolution: stored.resolution as 1 | 2 | 3, hdTextures: stored.hdTextures };
    }
  } catch { /* Storage can be unavailable in a private browsing context. */ }
  return { ...DEFAULT_GRAPHICS };
}

export type GraphicsPanel = { element: HTMLDetailsElement; refresh(remember?: boolean): void };

/** Preferences are stored only after the native renderer reports its result. */
export function createGraphicsPanel(getNative: () => NativeGame | null): GraphicsPanel {
  const element = document.createElement('details');
  element.className = 'graphics-settings';
  const summary = document.createElement('summary');
  summary.textContent = 'Visual do jogo';
  const content = document.createElement('div');
  content.className = 'graphics-content';
  const resolution = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = 'Resolução';
  const resolutions = document.createElement('div');
  resolutions.className = 'resolution-options';
  const radios = ([1, 2, 3] as const).map(value => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'graphics-resolution'; input.value = String(value);
    const text = document.createElement('span');
    text.textContent = `${value}x`;
    label.append(input, text); resolutions.append(label);
    input.addEventListener('change', () => {
      if (!input.checked) return;
      const native = getNative();
      if (native) void apply({ ...native.graphicsState().settings, resolution: value });
    });
    return input;
  });
  resolution.append(legend, resolutions);
  const hdLabel = document.createElement('label');
  hdLabel.className = 'hd-toggle';
  const hdText = document.createElement('span'); hdText.textContent = 'Texturas HD';
  const hd = document.createElement('input'); hd.type = 'checkbox'; hd.setAttribute('role', 'switch');
  hd.addEventListener('change', () => {
    const native = getNative();
    if (native) void apply({ ...native.graphicsState().settings, hdTextures: hd.checked });
  });
  hdLabel.append(hdText, hd);
  const explanation = document.createElement('p');
  explanation.className = 'small muted';
  explanation.textContent = 'A imagem muda; os controles mantêm o tamanho. Suas escolhas ficam neste aparelho.';
  const status = document.createElement('p');
  status.className = 'graphics-status'; status.setAttribute('role', 'status');
  const stats = document.createElement('dl'); stats.className = 'graphics-stats'; stats.hidden = true;
  content.append(resolution, hdLabel, explanation, status, stats);
  element.append(summary, content);
  let pending = false;
  let settingsKey = '';
  let statsKey = '';
  let storageError = false;
  let available: boolean | null = null;
  const controls = [...radios, hd];

  function remember(settings: GraphicsSettings): void {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); storageError = false; }
    catch { storageError = true; }
  }
  function render(state: GraphicsState): void {
    const key = JSON.stringify([state.ready, state.settings, state.resolutionError, state.hdError, storageError]);
    if (key !== settingsKey) {
      settingsKey = key;
      radios.forEach(radio => { radio.checked = Number(radio.value) === state.settings.resolution; });
      hd.checked = state.settings.hdTextures;
      const errors = [state.resolutionError, state.hdError].filter(Boolean);
      const applied = `${state.ready ? 'Em uso' : 'Preparado'}: ${state.settings.resolution}x · texturas ${state.settings.hdTextures ? 'HD' : 'originais'}.`;
      status.textContent = [applied, ...errors, storageError ? 'Aplicado nesta aba. O navegador não permitiu guardar a preferência neste aparelho.' : ''].filter(Boolean).join(' ');
      status.classList.toggle('error', errors.length > 0 || storageError);
      if (errors.length) element.open = true;
    }
    const nextStats = JSON.stringify(state.hd);
    if (nextStats !== statsKey) {
      statsKey = nextStats;
      stats.hidden = !state.hd || !state.settings.hdTextures;
      const data = state.hd;
      if (data) {
        const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        const values = [
          ['Carregadas', String(data.loaded)], ['Aguardando', String(data.pending)],
          ['Preparando', String(data.decoding)], ['Falhas', String(data.failed)],
          ['Reduzidas', String(data.downscaled)], ['Memória gráfica', `${mb(data.gpuBytes)} / ${mb(data.budgetBytes)}`],
        ];
        stats.replaceChildren(...values.flatMap(([name, value]) => {
          const term = document.createElement('dt'); term.textContent = name;
          const detail = document.createElement('dd'); detail.textContent = value;
          return [term, detail];
        }));
      } else stats.replaceChildren();
    }
  }
  function refresh(rememberEffective = false): void {
    if (pending) return;
    const native = getNative();
    const state = native?.graphicsState();
    const ready = !!state?.ready;
    if (available !== ready) {
      available = ready;
      controls.forEach(control => { control.disabled = !ready; });
    }
    if (!state || !ready) {
      if (status.textContent !== 'As opções ficam disponíveis quando o jogo abrir.') status.textContent = 'As opções ficam disponíveis quando o jogo abrir.';
      return;
    }
    render(state);
    if (rememberEffective) {
      if (state.ready) remember(state.settings);
      render(state);
    }
  }
  async function apply(settings: GraphicsSettings): Promise<void> {
    const native = getNative();
    if (!native || !native.graphicsState().ready || pending) return;
    pending = true;
    element.setAttribute('aria-busy', 'true');
    controls.forEach(control => { control.disabled = true; });
    status.textContent = 'Aplicando o visual…';
    settingsKey = '';
    try {
      const state = await native.configureGraphics(settings);
      if (!element.isConnected) return;
      render(state);
      if (state.ready) remember(state.settings);
      render(state);
      if (state.ready && !state.resolutionError && !state.hdError) pulseHaptic('confirm');
    } catch (error) {
      if (!element.isConnected) return;
      render(native.graphicsState());
      status.textContent += ` ${error instanceof Error ? error.message : 'Não foi possível aplicar o visual.'}`;
      status.classList.add('error');
    } finally {
      pending = false;
      element.removeAttribute('aria-busy');
      controls.forEach(control => { control.disabled = !getNative()?.graphicsState().ready; });
    }
  }
  element.addEventListener('toggle', () => { if (element.open) refresh(); });
  refresh();
  return { element, refresh };
}
