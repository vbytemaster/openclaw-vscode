type SuggestedActionPayload = { prompt?: string; mode?: 'fill' | 'send'; label?: string };
type CopyPayload = { content?: string };

type EditorRichInputDeps = {
  editorEl: HTMLElement;
  imgStripEl: HTMLElement;
  esc: (value: string) => string;
  imageStore: () => Record<string, string>;
  setImageStore: (value: Record<string, string>) => void;
  nextImageId: () => string;
  doSend: () => void;
  postOpenInEditor: (text: string, msgIndex: number) => void;
  postRevertLatestChange: (chatId: string, changeId: string) => void;
  postClearChat: (chatId: string) => void;
  postAttachFile: () => void;
  getActiveChatId: () => string;
  getCurrentRawResponse: (btn: HTMLElement) => { text: string; msgIndex: number } | null;
};

export function createEditorRichInput(deps: EditorRichInputDeps) {
  const saveSelection = (): Range | null => {
    const sel = window.getSelection();
    return sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  };

  const restoreSelection = (range: Range | null): void => {
    if (!range) return;
    deps.editorEl.focus();
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const removeEl = (el: HTMLElement): void => {
    el.remove();
    deps.editorEl.focus();
  };

  const insertNodeAtCursor = (node: Node): void => {
    deps.editorEl.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(node);
      const space = document.createTextNode('\u00A0');
      if (node.nextSibling) node.parentNode?.insertBefore(space, node.nextSibling);
      else node.parentNode?.appendChild(space);
      range.setStartAfter(space);
      range.setEndAfter(space);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      deps.editorEl.appendChild(node);
      deps.editorEl.appendChild(document.createTextNode('\u00A0'));
    }
  };

  const insertChip = (refId: string, label: string): void => {
    const chip = document.createElement('span');
    chip.className = 'inline-chip';
    chip.contentEditable = 'false';
    chip.dataset.refId = refId;
    chip.innerHTML = '<span class="ci">≡</span> ' + deps.esc(label) + ' <button type="button" class="cx" data-action="remove-element">✕</button>';
    insertNodeAtCursor(chip);
  };

  const addImageToStrip = (dataUrl: string): void => {
    const store = { ...deps.imageStore() };
    const id = deps.nextImageId();
    store[id] = dataUrl;
    deps.setImageStore(store);
    const wrap = document.createElement('div');
    wrap.className = 'strip-img';
    wrap.dataset.imgId = id;
    wrap.innerHTML = '<img src="' + dataUrl + '"><button type="button" class="sx" data-action="remove-image">✕</button>';
    deps.imgStripEl.appendChild(wrap);
    deps.imgStripEl.className = 'show';
  };

  const removeImage = (el: HTMLElement): void => {
    const id = el.dataset.imgId;
    const store = { ...deps.imageStore() };
    if (id) delete store[id];
    deps.setImageStore(store);
    el.remove();
    if (!deps.imgStripEl.children.length) deps.imgStripEl.className = '';
    deps.editorEl.focus();
  };

  const applySuggestedAction = (btn: HTMLElement): void => {
    try {
      const raw = btn.dataset.ocAction || '';
      if (!raw) return;
      const action = JSON.parse(raw) as SuggestedActionPayload;
      const prompt = String(action.prompt || '').trim();
      if (!prompt) return;
      deps.editorEl.focus();
      deps.editorEl.textContent = prompt;
      if (action.mode === 'send') deps.doSend();
    } catch {
      // ignore malformed action payloads
    }
  };

  const copyCodeBlock = async (btn: HTMLElement): Promise<void> => {
    try {
      const raw = btn.dataset.ocCopy || '';
      if (!raw) return;
      const payload = JSON.parse(raw) as CopyPayload;
      const content = String(payload.content || '');
      if (!content) return;
      await navigator.clipboard.writeText(content);
      const prev = btn.textContent || 'Copy';
      btn.textContent = 'Copied';
      window.setTimeout(() => { btn.textContent = prev; }, 1200);
    } catch {
      const prev = btn.textContent || 'Copy';
      btn.textContent = 'Failed';
      window.setTimeout(() => { btn.textContent = prev; }, 1200);
    }
  };

  const copyAssistantResponse = async (btn: HTMLElement): Promise<void> => {
    try {
      const response = deps.getCurrentRawResponse(btn);
      if (!response || !response.text.trim()) return;
      await navigator.clipboard.writeText(response.text);
      const prev = btn.textContent || 'Copy';
      btn.textContent = 'Copied';
      window.setTimeout(() => { btn.textContent = prev; }, 1200);
    } catch {
      const prev = btn.textContent || 'Copy';
      btn.textContent = 'Failed';
      window.setTimeout(() => { btn.textContent = prev; }, 1200);
    }
  };

  const openInEditor = (btn: HTMLElement): void => {
    const response = deps.getCurrentRawResponse(btn);
    if (!response) return;
    deps.postOpenInEditor(response.text, response.msgIndex);
  };

  const revertLatestChange = (btn: HTMLElement): void => {
    const chatId = btn.dataset.chatId || deps.getActiveChatId();
    const changeId = btn.dataset.changeId || '';
    deps.postRevertLatestChange(chatId, changeId);
  };

  const clearChat = (): void => {
    deps.postClearChat(deps.getActiveChatId());
  };

  const attachFile = (): void => {
    deps.postAttachFile();
  };

  return {
    saveSelection,
    restoreSelection,
    insertChip,
    addImageToStrip,
    removeImage,
    removeEl,
    applySuggestedAction,
    copyCodeBlock,
    copyAssistantResponse,
    openInEditor,
    revertLatestChange,
    clearChat,
    attachFile,
  };
}
