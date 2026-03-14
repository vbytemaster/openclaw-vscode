import { esc, md, prettyModelName } from './utils.js';
import { isChatStreaming, setStreaming as setStreamingState } from './stream.js';
import { getActiveChat as getActiveChatFromState, updateComposerVisibility as updateComposerVisibilityState } from './state.js';
import { renderTabs as renderTabsView } from './tabs.js';
import { doSend as doSendComposer, handleAction as handleActionComposer } from './composer.js';
import { addMsg as addMessage, handleIncoming } from './messages.js';
import { restoreInitialState } from './init.js';
import { wireInput } from './input.js';
import type { ChatTab, ChatMessage, VsCodeApi } from './types';

const vsc = acquireVsCodeApi() as VsCodeApi;
const tabsEl = document.getElementById('chatTabs') as HTMLElement;
const msgsEl = document.getElementById('messages') as HTMLElement;
const composerEl = document.querySelector('.composer');
const editorEl = document.getElementById('editor') as HTMLElement;
const agentSel = document.getElementById('agentSelect') as HTMLSelectElement | null;
const modelSel = document.getElementById('modelSelect') as HTMLSelectElement;
const imgStripEl = document.getElementById('imgStrip') as HTMLElement;
const actionBtn = document.getElementById('actionBtn');
const sendIcon = document.getElementById('sendIcon');
const stopIcon = document.getElementById('stopIcon');
const statusText = document.getElementById('statusText');

const streamStateByChat: Record<string, boolean> = {};
const streamWatchdogByChat: Record<string, number> = {};
const streamStartWatchdogByChat: Record<string, number> = {};
const curElByChat: Record<string, HTMLDivElement | null> = {};
const curTextByChat: Record<string, string> = {};
const curModelByChat: Record<string, string> = {};
let modelLabelByValue: Record<string, string> = {};
let imgCounter = 0;
let imageStore: Record<string, string> = {};
let savedRange: Range | null = null;
let msgIndex = 0;
let chats: ChatTab[] = [{ id: 'chat-1', title: 'Chat 1', messages: [], msgIndex: 0, agentId: agentSel?.value || 'main' }];
let activeChatId = 'chat-1';

function getActiveChat(): ChatTab | null {
  return getActiveChatFromState(chats, activeChatId);
}

function getAgentForChat(chatId: string): string {
  return chats.find((c) => c.id === chatId)?.agentId || 'main';
}

function updateComposerVisibility(): void {
  updateComposerVisibilityState(composerEl, chats);
}

function setStreaming(chatId: string, on: boolean): void {
  setStreamingState(streamStateByChat, chatId, on, {
    renderTabs,
    activeChatId: () => activeChatId,
    actionBtn,
    sendIcon,
    stopIcon,
    statusText
  });
}

function renderTabs(): void {
  renderTabsView({
    vsc,
    tabsEl,
    msgsEl,
    agentSel,
    chats,
    activeChatId,
    isChatStreaming: (chatId) => isChatStreaming(streamStateByChat, chatId),
    snapshotDomToActiveChat,
    renderActiveChat,
    saveState,
    updateComposerVisibility,
    setActiveChatId: (v) => { activeChatId = v; },
    setChats: (v) => { chats = v; },
    renderTabs,
  });
}

function renderActiveChat(): void {
  const c = getActiveChat();
  msgsEl.innerHTML = '';
  if (!c) {
    msgIndex = 0;
    updateComposerVisibility();
    return;
  }

  // Defensive cleanup: drop stale typing placeholders in stored state.
  c.messages = (c.messages || []).filter((m: ChatMessage) => {
    if (m.role !== 'assistant') return true;
    const html = String(m.html || '').trim();
    const raw = String(m.rawText || '').trim();
    const looksTyping = html.includes('typing') || html === '...' || html === '<span class="typing">...</span>';
    return raw.length > 0 || !looksTyping;
  });

  msgIndex = c.msgIndex || 0;
  (c.messages || []).forEach((msg: ChatMessage) => {
    const d = document.createElement('div');
    d.className = 'msg ' + msg.role;
    d.innerHTML = msg.html;
    if (msg.role === 'assistant') {
      d.dataset.rawText = msg.rawText || '';
      d.dataset.msgIndex = msg.msgIdx || '0';
      d.dataset.model = msg.model || '';

      // Ensure metadata bar exists for restored assistant messages too (without duplicates).
      const actionBars = d.querySelectorAll('.msg-actions');
      if (actionBars.length > 1) {
        for (let i = 1; i < actionBars.length; i++) actionBars[i].remove();
      }
      if (msg.rawText && actionBars.length === 0) {
        const pinBar = document.createElement('div');
        pinBar.className = 'msg-actions';
        const modelPart = msg.model ? ('<span class="model-inline">' + esc(prettyModelName(msg.model, modelLabelByValue)) + '</span>') : '';
        const agentPart = '<span class="model-inline">' + esc(getAgentForChat(c.id)) + '</span>';
        pinBar.innerHTML = '<button class="pin-btn" onclick="openInEditor(this)" title="Open in editor for reference">📌 Open in Editor</button>' + agentPart + modelPart;
        d.appendChild(pinBar);
      }
    }
    msgsEl.appendChild(d);
  });
  msgsEl.scrollTop = msgsEl.scrollHeight;
  if (agentSel && c.agentId) agentSel.value = c.agentId;
  updateComposerVisibility();
  // Sync send/stop/status controls to currently active tab stream state.
  setStreaming(activeChatId, isChatStreaming(streamStateByChat, activeChatId));
}

function saveSelection(): Range | null {
  const sel = window.getSelection();
  return sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
}

function restoreSelection(range: Range | null): void {
  if (!range) return;
  editorEl.focus();
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

function insertNodeAtCursor(node: Node): void {
  editorEl.focus();
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
    editorEl.appendChild(node);
    editorEl.appendChild(document.createTextNode('\u00A0'));
  }
}

function insertChip(refId: string, label: string): void {
  const chip = document.createElement('span');
  chip.className = 'inline-chip';
  chip.contentEditable = 'false';
  chip.dataset.refId = refId;
  chip.innerHTML = '<span class="ci">≡</span> ' + esc(label) + ' <span class="cx" onclick="removeEl(this.parentElement)">✕</span>';
  insertNodeAtCursor(chip);
}

function addImageToStrip(dataUrl: string): void {
  const id = 'img_' + (++imgCounter);
  imageStore[id] = dataUrl;
  const wrap = document.createElement('div');
  wrap.className = 'strip-img';
  wrap.dataset.imgId = id;
  wrap.innerHTML = '<img src="' + dataUrl + '"><button class="sx" onclick="removeImage(this.parentElement)">✕</button>';
  imgStripEl.appendChild(wrap);
  imgStripEl.className = 'show';
}

function removeImage(el: HTMLElement): void {
  const id = el.dataset.imgId;
  if (id) delete imageStore[id];
  el.remove();
  if (!imgStripEl.children.length) imgStripEl.className = '';
  editorEl.focus();
}

function removeEl(el: HTMLElement): void {
  el.remove();
  editorEl.focus();
}

function doSend(): void {
  const chatId = activeChatId;
  armStreamStartWatchdog(chatId);
  doSendComposer({
    vsc,
    editorEl,
    imgStripEl,
    modelSel,
    agentSel,
    isChatStreaming: (chatId) => isChatStreaming(streamStateByChat, chatId),
    setStreaming,
    getActiveChat,
    activeChatId: () => activeChatId,
    imageStore: () => imageStore,
    resetImageStore: () => { imageStore = {}; },
    addMsg,
  });
}

function handleAction(): void {
  handleActionComposer({
    vsc,
    editorEl,
    imgStripEl,
    modelSel,
    agentSel,
    isChatStreaming: (chatId) => isChatStreaming(streamStateByChat, chatId),
    setStreaming,
    getActiveChat,
    activeChatId: () => activeChatId,
    imageStore: () => imageStore,
    resetImageStore: () => { imageStore = {}; },
    addMsg,
  });
}

function addMsg(role: string, text: string, chipLabels?: string[], imgPreviews?: string[]): HTMLDivElement {
  return addMessage({ msgsEl, esc }, role, text, chipLabels, imgPreviews);
}

function openInEditor(btn: HTMLElement): void {
  const msgEl = btn.closest('.msg') as HTMLElement | null;
  if (!msgEl) return;
  const rawText = msgEl.dataset.rawText || msgEl.textContent || '';
  const idx = msgEl.dataset.msgIndex || '0';
  vsc.postMessage({ type: 'openResponseInEditor', text: rawText, msgIndex: parseInt(idx, 10) });
}

function clearChat(): void {
  vsc.postMessage({ type: 'clear', chatId: activeChatId });
  msgsEl.innerHTML = '';
  const c = getActiveChat();
  if (c) {
    c.messages = [];
    c.msgIndex = 0;
  }
}

function attachFile(): void {
  vsc.postMessage({ type: 'attachFile' });
}

function onAgentChange(): void {
  if (!agentSel) return;
  const next = agentSel.value;
  const c = getActiveChat();
  if (c) c.agentId = next;
  vsc.postMessage({ type: 'setAgent', agentId: next, chatId: activeChatId });
  vsc.postMessage({ type: 'fetchModels' });
  saveState();
}

function snapshotDomToActiveChat(): void {
  const c = getActiveChat();
  if (!c) return;

  const rendered: ChatMessage[] = [];
  const messageEls = msgsEl.querySelectorAll('.msg');
  messageEls.forEach((el) => {
    const d = el as HTMLDivElement;
    const role = d.classList.contains('assistant') ? 'assistant' : d.classList.contains('error') ? 'error' : 'user';
    rendered.push({
      role,
      html: d.innerHTML,
      rawText: d.dataset.rawText || undefined,
      msgIdx: d.dataset.msgIndex || undefined,
      model: d.dataset.model || undefined,
    });
  });

  c.messages = rendered;
  c.msgIndex = msgIndex;
}

function saveState(): void {
  snapshotDomToActiveChat();
  const state = { chats, activeChatId };
  vsc.setState(state);
  vsc.postMessage({ type: 'saveChatState', messages: state });
}

function clearStreamWatchdog(chatId: string): void {
  const t = streamWatchdogByChat[chatId];
  if (t) {
    window.clearTimeout(t);
    delete streamWatchdogByChat[chatId];
  }
}

function clearStreamStartWatchdog(chatId: string): void {
  const t = streamStartWatchdogByChat[chatId];
  if (t) {
    window.clearTimeout(t);
    delete streamStartWatchdogByChat[chatId];
  }
}

function armStreamStartWatchdog(chatId: string): void {
  clearStreamStartWatchdog(chatId);
  streamStartWatchdogByChat[chatId] = window.setTimeout(() => {
    // No streamStart arrived: mark request as failed for this chat.
    setStreaming(chatId, false);
    if (chatId === activeChatId) {
      addMsg('error', '⚠️ Запрос отправлен, но стрим не стартовал. Попробуй отправить ещё раз.');
    } else {
      const target = chats.find((c) => c.id === chatId);
      if (target) target.messages.push({ role: 'error', html: '⚠️ Стрим не стартовал.' });
    }
    saveState();
  }, 15000);
}

function armStreamWatchdog(chatId: string): void {
  clearStreamWatchdog(chatId);
  streamWatchdogByChat[chatId] = window.setTimeout(() => {
    setStreaming(chatId, false);
    const el = curElByChat[chatId];
    if (el) el.remove();
    curElByChat[chatId] = null;
    curTextByChat[chatId] = '';
    curModelByChat[chatId] = '';

    if (chatId === activeChatId) {
      addMsg('error', '⚠️ Ответ не получен (таймаут). Попробуй отправить ещё раз.');
    } else {
      const target = chats.find((c) => c.id === chatId);
      if (target) {
        target.messages.push({ role: 'error', html: '⚠️ Ответ не получен (таймаут).' });
      }
    }
    saveState();
  }, 45000);
}

window.addEventListener('message', (e: MessageEvent) => {
  const m = e.data as any;

  if (m?.type === 'streamStart') {
    clearStreamStartWatchdog(m.chatId || activeChatId);
    armStreamWatchdog(m.chatId || activeChatId);
  } else if (m?.type === 'streamDelta') {
    armStreamWatchdog(m.chatId || activeChatId);
  } else if (m?.type === 'streamEnd') {
    clearStreamStartWatchdog(m.chatId || activeChatId);
    clearStreamWatchdog(m.chatId || activeChatId);
  }

  if (handleIncoming({
    msgsEl,
    editorEl,
    agentSel,
    md,
    esc,
    prettyModelName,
    modelLabelByValue,
    setStreaming,
    activeChatId: () => activeChatId,
    curElByChat,
    curTextByChat,
    curModelByChat,
    msgIndexRef: {
      get value() { return msgIndex; },
      set value(v: number) { msgIndex = v; }
    },
    saveState,
    getAgentForChat,
    persistAssistantToChat: (chatId: string, raw: string, model: string, idx: number) => {
      const target = chats.find((c) => c.id === chatId);
      if (!target) return;
      // Drop stale typing placeholders captured on tab switch.
      target.messages = target.messages.filter((m) => {
        if (m.role !== 'assistant') return true;
        const html = String(m.html || '').trim();
        const hasRealText = Boolean((m.rawText || '').trim());
        const looksTyping = html.includes('typing') || html === '...' || html === '<span class="typing">...</span>';
        return hasRealText || !looksTyping;
      });
      const html = md(raw);
      target.messages.push({
        role: 'assistant',
        html,
        rawText: raw,
        msgIdx: String(idx),
        model,
      });
      target.msgIndex = idx;
    }
  }, m)) {
    return;
  }

  switch (m.type) {
    case 'userMessage':
      saveState();
      break;
    case 'modelsLoaded': {
      if (m.models && m.models.length) {
        const curVal = modelSel.value;
        modelSel.innerHTML = '';
        modelLabelByValue = {};
        m.models.forEach((mod: { value: string; label: string }) => {
          const opt = document.createElement('option');
          opt.value = mod.value;
          opt.textContent = mod.label;
          opt.title = mod.value;
          modelLabelByValue[mod.value] = mod.label;
          modelSel.appendChild(opt);
        });
        let found = false;
        for (let i = 0; i < modelSel.options.length; i++) {
          if (modelSel.options[i].value === curVal) {
            modelSel.value = curVal;
            found = true;
            break;
          }
        }
        if (!found && modelSel.options.length) modelSel.selectedIndex = 0;
      }
      break;
    }
    case 'agentsLoaded': {
      if (m.agents && m.agents.length && agentSel) {
        const curAgent = agentSel.value;
        agentSel.innerHTML = '';
        m.agents.forEach((a: string) => {
          const opt = document.createElement('option');
          opt.value = a;
          opt.textContent = a;
          agentSel.appendChild(opt);
        });
        const targetAgent = m.activeAgent || curAgent;
        let foundAgent = false;
        for (let i = 0; i < agentSel.options.length; i++) {
          if (agentSel.options[i].value === targetAgent) {
            agentSel.value = targetAgent;
            foundAgent = true;
            break;
          }
        }
        if (!foundAgent && agentSel.options.length) agentSel.selectedIndex = 0;
      }
      break;
    }
    case 'agentChanged':
      if (agentSel && m.agentId) agentSel.value = m.agentId;
      break;
    case 'error':
      addMsg('error', m.text || 'Unknown error');
      break;
    case 'cleared':
      if (m.chatId && m.chatId !== activeChatId) break;
      msgsEl.innerHTML = '';
      saveState();
      break;
    case 'codeRef':
      insertChip(m.refId, m.label);
      break;
    case 'pasteResult':
      restoreSelection(savedRange);
      savedRange = null;
      if (m.isCode) insertChip(m.refId, m.label);
      else document.execCommand('insertText', false, m.text);
      break;
  }
});

Object.assign(window, {
  onAgentChange,
  attachFile,
  handleAction,
  openInEditor,
  removeImage,
  removeEl,
  clearChat,
});

editorEl.focus();
wireInput({
  vsc,
  editorEl,
  saveSelection,
  setSavedRange: (r) => { savedRange = r; },
  addImageToStrip,
  doSend,
});
vsc.postMessage({ type: 'fetchAgents' });
vsc.postMessage({ type: 'fetchModels' });
restoreInitialState({
  vsc,
  fileStateEl: document.getElementById('_fileState'),
  agentSel,
  setChats: (v) => { chats = v; },
  getChats: () => chats,
  setActiveChatId: (v) => { activeChatId = v; },
  renderTabs,
  renderActiveChat,
});
