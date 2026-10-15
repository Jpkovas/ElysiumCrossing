/** One native options row: a raster label and its values as lavender circles
 * (radio inputs kept for focus, keyboard and screen readers; hud-surface paints them). */
export function optionRow<T extends string>(label: string, name: string, values: readonly (readonly [T, string])[],
  onChoose: (value: T) => void): { row: HTMLElement; inputs: HTMLInputElement[] } {
  const row = document.createElement('div'); row.className = 'option-row'; row.setAttribute('role', 'radiogroup'); row.setAttribute('aria-label', label);
  const legend = document.createElement('span'); legend.dataset.raster = 'label'; legend.textContent = label; legend.setAttribute('aria-hidden', 'true');
  const choices = document.createElement('div'); choices.className = 'option-choices';
  const inputs = values.map(([value, text]) => {
    const choice = document.createElement('label'); choice.dataset.raster = 'choice'; choice.dataset.rasterText = text;
    const input = document.createElement('input'); input.type = 'radio'; input.name = name; input.value = value; input.className = 'raster-input';
    const caption = document.createElement('span'); caption.textContent = text;
    input.addEventListener('change', () => { if (input.checked) onChoose(value); });
    choice.append(input, caption); choices.append(choice);
    return input;
  });
  row.append(legend, choices);
  return { row, inputs };
}
