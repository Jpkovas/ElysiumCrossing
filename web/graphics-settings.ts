import { DEFAULT_GRAPHICS, type GraphicsSettings, type GraphicsState, type NativeGame } from '../shared/contracts';
import { pulseHaptic } from './haptics';
import { optionRow } from './option-rows';

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

export type GraphicsPanel = { element: HTMLElement; refresh(remember?: boolean): void };

/** Preferences are stored only after the native renderer reports its result. */
export function createGraphicsPanel(getNative: () => NativeGame | null): GraphicsPanel {
  const element = document.createElement('div'); element.className = 'graphics-settings';
  const current = () => getNative()?.graphicsState().settings;
  const resolution = optionRow('Resolução', 'graphics-resolution', [['1', '1x'], ['2', '2x'], ['3', '3x']] as const, value => {
    const settings = current(); if (settings) void apply({ ...settings, resolution: Number(value) as 1 | 2 | 3 });
  });
  const hdRow = optionRow('Texturas HD', 'graphics-hd', [['on', 'Sim'], ['off', 'Não']] as const, value => {
    const settings = current(); if (settings) void apply({ ...settings, hdTextures: value === 'on' });
  });
  const radios = resolution.inputs, hdInputs = hdRow.inputs;
  const status = document.createElement('p');
  status.className = 'graphics-status'; status.dataset.raster = 'note'; status.setAttribute('role', 'status');
  element.append(resolution.row, hdRow.row, status);
  let pending = false;
  let settingsKey = '';
  let storageError = false;
  let available: boolean | null = null;
  const controls = [...radios, ...hdInputs];

  function remember(settings: GraphicsSettings): void {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); storageError = false; }
    catch { storageError = true; }
  }
  function render(state: GraphicsState): void {
    const key = JSON.stringify([state.ready, state.settings, state.resolutionError, state.hdError, storageError]);
    if (key !== settingsKey) {
      settingsKey = key;
      radios.forEach(radio => { radio.checked = Number(radio.value) === state.settings.resolution; });
      hdInputs.forEach(input => { input.checked = (input.value === 'on') === state.settings.hdTextures; });
      const errors = [state.resolutionError, state.hdError].filter(Boolean);
      status.textContent = [...errors, storageError ? 'Aplicado nesta aba. O navegador não permitiu guardar a preferência neste aparelho.' : ''].filter(Boolean).join(' ');
      status.classList.toggle('error', errors.length > 0 || storageError);
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
      if (status.textContent !== 'Disponível quando o jogo abrir.') status.textContent = 'Disponível quando o jogo abrir.';
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
    status.textContent = 'Aplicando...';
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
      status.textContent = `${error instanceof Error ? error.message : 'Não foi possível aplicar o visual.'}`;
      status.classList.add('error');
    } finally {
      pending = false;
      element.removeAttribute('aria-busy');
      controls.forEach(control => { control.disabled = !getNative()?.graphicsState().ready; });
    }
  }
  refresh();
  return { element, refresh };
}
