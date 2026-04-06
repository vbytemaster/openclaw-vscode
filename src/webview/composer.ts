import type { VsCodeApi } from './types.js';

type ComposerContext = {
  vsc: VsCodeApi;
  editorEl: HTMLElement;
  imgStripEl: HTMLElement;
  modelSel: HTMLSelectElement;
  thinkingSel: HTMLSelectElement | null;
  agentSel: HTMLSelectElement | null;
  isChatStreaming: (chatId: string) => boolean;
  setStreaming: (chatId: string, on: boolean) => void;
  getActiveChat: () => { agentId?: string } | null;
  activeChatId: () => string;
  imageStore: () => Record<string, string>;
  resetImageStore: () => void;
  addMsg: (role: string, text: string, chipLabels?: string[], imgPreviews?: string[]) => unknown;
};

export function handleAction(ctx: ComposerContext): void {
  const currentChatId = ctx.activeChatId();
  if (ctx.isChatStreaming(currentChatId)) {
    ctx.vsc.postMessage({ type: 'cancel', chatId: currentChatId });
    ctx.setStreaming(currentChatId, false);
  } else {
    doSend(ctx);
  }
}

export function doSend(ctx: ComposerContext): void {
  const currentChatId = ctx.activeChatId();
  if (ctx.isChatStreaming(currentChatId)) return;

  const chat = ctx.getActiveChat();
  if (!chat) return;

  const refs: string[] = [];
  const images: string[] = [];
  let text = '';

  const imageStore = ctx.imageStore();
  const stripImgs = ctx.imgStripEl.querySelectorAll('.strip-img');
  stripImgs.forEach((el) => {
    const id = (el as HTMLElement).dataset.imgId;
    if (id && imageStore[id]) images.push(imageStore[id]);
  });

  function walk(node: ChildNode): void {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node instanceof HTMLElement && node.classList.contains('inline-chip')) {
      const rid = node.dataset.refId;
      if (rid) {
        text += String.fromCharCode(8984) + 'ref:' + refs.length + String.fromCharCode(8984);
        refs.push(rid);
      }
    } else if (node instanceof HTMLElement && node.tagName === 'BR') {
      text += '\n';
    } else if (node instanceof HTMLElement && node.tagName === 'DIV' && node !== ctx.editorEl) {
      text += '\n';
      for (let c = 0; c < node.childNodes.length; c++) walk(node.childNodes[c]);
    } else {
      for (let c = 0; c < node.childNodes.length; c++) walk(node.childNodes[c]);
    }
  }

  walk(ctx.editorEl);
  text = text.replace(/\u00A0/g, ' ').trim();
  if (!text && !refs.length && !images.length) return;

  const labels: string[] = [];
  ctx.editorEl.querySelectorAll('.inline-chip').forEach((c) => {
    labels.push((c.textContent || '').replace('\u2715', '').replace('\u2261', '').trim());
  });

  const imgPreviews: string[] = [];
  stripImgs.forEach((el) => {
    const img = (el as HTMLElement).querySelector('img') as HTMLImageElement | null;
    if (img) imgPreviews.push(img.src);
  });

  ctx.editorEl.innerHTML = '';
  ctx.imgStripEl.innerHTML = '';
  ctx.imgStripEl.className = '';
  ctx.resetImageStore();

  ctx.vsc.postMessage({
    type: 'send',
    text,
    refs,
    images,
    model: ctx.modelSel.value,
    thinkingLevel: ctx.thinkingSel?.value || 'auto',
    chatId: currentChatId,
    agentId: chat.agentId || (ctx.agentSel && ctx.agentSel.value) || 'main'
  });

  ctx.addMsg('user', text, labels, imgPreviews);
}
