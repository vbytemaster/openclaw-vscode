type PickerControlsDeps = {
  modelSel: HTMLSelectElement;
  thinkingSel: HTMLSelectElement | null;
  modelPickerWrap: HTMLElement | null;
  modelPickerLabel: HTMLElement | null;
  modelMenu: HTMLElement | null;
  thinkingPickerWrap: HTMLElement | null;
  thinkingPickerLabel: HTMLElement | null;
  thinkingMenu: HTMLElement | null;
  esc: (value: string) => string;
};

export function createPickerControls(deps: PickerControlsDeps) {
  const closePickers = (): void => {
    deps.modelPickerWrap?.classList.remove('open');
    deps.thinkingPickerWrap?.classList.remove('open');
  };

  const syncPickerLabels = (): void => {
    if (deps.modelPickerLabel) {
      const current = deps.modelSel.options[deps.modelSel.selectedIndex] || deps.modelSel.options[0];
      if (current) {
        deps.modelPickerLabel.textContent = current.textContent || current.value || 'Choose model';
      }
    }
    if (deps.thinkingPickerLabel && deps.thinkingSel) {
      const current = deps.thinkingSel.options[deps.thinkingSel.selectedIndex] || deps.thinkingSel.options[0];
      if (current) {
        deps.thinkingPickerLabel.textContent = current.textContent || current.value || 'Thinking';
      }
    }
  };

  const renderPickerOptions = (
    selectEl: HTMLSelectElement | null,
    menuEl: HTMLElement | null,
    selectedValue: string,
    onPick: (value: string) => void
  ): void => {
    if (!selectEl || !menuEl) return;
    menuEl.innerHTML = '';
    Array.from(selectEl.options).forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'picker-option' + (option.value === selectedValue ? ' is-selected' : '');
      button.innerHTML = `<span>${deps.esc(option.textContent || option.value)}</span><span class="picker-option-check">✓</span>`;
      button.addEventListener('click', () => {
        onPick(option.value);
        closePickers();
      });
      menuEl.appendChild(button);
    });
  };

  const refreshModelPicker = (): void => {
    syncPickerLabels();
    renderPickerOptions(deps.modelSel, deps.modelMenu, deps.modelSel.value, (value) => {
      deps.modelSel.value = value;
      syncPickerLabels();
    });
  };

  const refreshThinkingPicker = (): void => {
    syncPickerLabels();
    renderPickerOptions(deps.thinkingSel, deps.thinkingMenu, deps.thinkingSel?.value || 'auto', (value) => {
      if (!deps.thinkingSel) return;
      deps.thinkingSel.value = value;
      syncPickerLabels();
    });
  };

  const togglePicker = (which: 'model' | 'thinking'): void => {
    const targetWrap = which === 'model' ? deps.modelPickerWrap : deps.thinkingPickerWrap;
    const otherWrap = which === 'model' ? deps.thinkingPickerWrap : deps.modelPickerWrap;
    if (!targetWrap) return;
    const next = !targetWrap.classList.contains('open');
    otherWrap?.classList.remove('open');
    targetWrap.classList.toggle('open', next);
  };

  return {
    closePickers,
    syncPickerLabels,
    refreshModelPicker,
    refreshThinkingPicker,
    togglePicker,
  };
}
