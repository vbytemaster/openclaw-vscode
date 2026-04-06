import type { VsCodeApi } from './types.js';

type InputContext = {
  vsc: Pick<VsCodeApi, 'postMessage'>;
  editorEl: HTMLElement;
  saveSelection: () => Range | null;
  setSavedRange: (r: Range | null) => void;
  addImageToStrip: (dataUrl: string) => void;
  doSend: () => void;
};

export function wireInput(ctx: InputContext): void {
  ctx.editorEl.addEventListener('paste', (e: ClipboardEvent) => {
    e.preventDefault();
    const items = e.clipboardData?.items;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) {
          const blob = items[i].getAsFile();
          if (!blob) return;
          const reader = new FileReader();
          reader.onload = () => ctx.addImageToStrip(String(reader.result || ''));
          reader.readAsDataURL(blob);
          return;
        }
      }
    }

    const text = e.clipboardData?.getData('text/plain') || '';
    if (text) {
      ctx.setSavedRange(ctx.saveSelection());
      ctx.vsc.postMessage({ type: 'pasteCheck', text });
    }
  });

  ctx.editorEl.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ctx.doSend();
    }
  });
}
