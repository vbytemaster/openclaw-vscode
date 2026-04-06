import { esc, prettyModelName } from './utils.js';
import { renderAssistantMessage } from './render.js';
import { isChatStreaming, setStreaming as setStreamingState } from './stream.js';
import { getActiveChat as getActiveChatFromState, updateComposerVisibility as updateComposerVisibilityState } from './state.js';
import { renderTabs as renderTabsView } from './tabs.js';
import { renderTransientThinking } from './messageRendering.js';
import { createWebviewRuntimeState } from './state/uiRuntimeState.js';
import { bootstrapWebview, type BootstrapResult } from './bootstrap.js';
import { saveChatState } from './chatPersistence.js';
import { renderActiveChatView } from './chatView.js';
import {
  getAgentForChat as getAgentForChatFromStore,
  persistAssistantToChat as persistAssistantToChatStore,
} from './state/chatStore.js';
import type { ChatTab, ChatChangeSet, VsCodeApi } from './types.js';
import type { WebviewDebugRequest } from './bridgeTypes.js';
import { getWebviewDomRefs } from './domRefs.js';
import { parseChatRuntimeConfig } from './runtimeConfig.js';
import { createActivityDisclosureController } from './controllers/activityDisclosure.js';
import { createComposerActions } from './controllers/composerActions.js';
import { createMessagesContextFactory } from './controllers/messageContextFactory.js';

const vsc = acquireVsCodeApi() as VsCodeApi;
const dom = getWebviewDomRefs();
const runtimeConfig = parseChatRuntimeConfig(dom.runtimeConfigEl);

const STREAM_START_TIMEOUT_MS = Math.max(15000, Number(runtimeConfig.streamStartTimeoutMs || 60000));
const STREAM_INACTIVITY_TIMEOUT_MS = Math.max(45000, Number(runtimeConfig.streamInactivityTimeoutMs || 600000));

const runtimeState = createWebviewRuntimeState(dom.agentSel?.value || 'main');
const {
  streamStateByChat,
  curElByChat,
  assistantTurnByChat,
  activityStateByChat,
  activityStartedAtByChat,
  activityCollapsedByChat,
  activityDisclosureOpenByChat,
  latestChangeSetByChat,
} = runtimeState;
let modelLabelByValue = runtimeState.modelLabelByValue;
let imgCounter = runtimeState.imgCounter;
let imageStore = runtimeState.imageStore;
let savedRange = runtimeState.savedRange;
let msgIndex = runtimeState.msgIndex;
let chats = runtimeState.chats;
let activeChatId = runtimeState.activeChatId;

function ensureTransientContainerPlacement(): void {
  if (dom.transientThinkingEl.parentElement !== dom.msgsEl) {
    dom.msgsEl.appendChild(dom.transientThinkingEl);
  }
}

function showBootstrapError(phase: string, error: unknown): void {
  const text = error instanceof Error ? (error.stack || error.message) : String(error);
  const escaped = esc(text || 'Unknown bootstrap error');
  dom.msgsEl.innerHTML = `<div class="msg error">Webview bootstrap failed at ${esc(phase)}<br><br><code>${escaped}</code></div>`;
  dom.msgsEl.style.display = 'flex';
  dom.msgsEl.style.paddingBottom = '8px';
  dom.transientThinkingEl.classList.remove('show');
  if (dom.composerEl instanceof HTMLElement) {
    dom.composerEl.style.display = 'none';
  }
  postWebviewDebug('bootstrap.error', { phase, error: text });
}

function postWebviewDebug(event: string, payload?: Record<string, unknown>): void {
  const message: WebviewDebugRequest = {
    type: 'webviewDebug',
    event,
    payload: payload || {},
    activeChatId,
    ts: Date.now(),
  };
  vsc.postMessage(message);
}

function getActiveChat(): ChatTab | null {
  return getActiveChatFromState(chats, activeChatId);
}

function getAgentForChat(chatId: string): string {
  return getAgentForChatFromStore(chats, chatId);
}

function updateComposerVisibility(): void {
  updateComposerVisibilityState(dom.composerEl, chats);
}

function renderTransient(chatId: string): void {
  renderTransientThinking(createMessagesContext(), chatId);
}

function setStreaming(chatId: string, on: boolean): void {
  setStreamingState(streamStateByChat, chatId, on, {
    renderTabs,
    activeChatId: () => activeChatId,
    actionBtn: dom.actionBtn,
    sendIcon: dom.sendIcon,
    stopIcon: dom.stopIcon,
    statusText: dom.statusText,
  });
}

let closePickers: () => void = () => {};
let syncPickerLabels: () => void = () => {};
let refreshModelPicker: () => void = () => {};
let refreshThinkingPicker: () => void = () => {};
let togglePicker: (which: 'model' | 'thinking') => void = () => {};

let editorRichInput: BootstrapResult['editorRichInput'];
let streamLifecycle: BootstrapResult['streamLifecycle'];

const activityDisclosure = createActivityDisclosureController({
  activeChatId: () => activeChatId,
  activityCollapsedByChat,
  activityDisclosureOpenByChat,
  rerenderTransient: renderTransient,
});

const composerActions = createComposerActions({
  vsc,
  editorEl: dom.editorEl,
  imgStripEl: dom.imgStripEl,
  modelSel: dom.modelSel,
  thinkingSel: dom.thinkingSel,
  agentSel: dom.agentSel,
  msgsEl: dom.msgsEl,
  esc,
  isChatStreaming: (chatId) => isChatStreaming(streamStateByChat, chatId),
  setStreaming,
  getActiveChat,
  activeChatId: () => activeChatId,
  imageStore: () => imageStore,
  resetImageStore: () => { imageStore = {}; },
  clearChatInEditorRichInput: () => editorRichInput.clearChat(),
  attachFileInEditorRichInput: () => editorRichInput.attachFile(),
  armStreamStartWatchdog: (chatId) => streamLifecycle.armStreamStartWatchdog(chatId, STREAM_START_TIMEOUT_MS),
  chats: () => chats,
});

const createMessagesContext = createMessagesContextFactory({
  msgsEl: dom.msgsEl,
  editorEl: dom.editorEl,
  agentSel: dom.agentSel,
  transientThinkingEl: dom.transientThinkingEl,
  curElByChat,
  assistantTurnByChat,
  activityStateByChat,
  activityStartedAtByChat,
  activityCollapsedByChat,
  activityDisclosureOpenByChat,
  latestChangeSetByChat,
  modelLabelByValue: () => modelLabelByValue,
  msgIndexRef: {
    get value() { return msgIndex; },
    set value(v: number) { msgIndex = v; },
  },
  activeChatId: () => activeChatId,
  setStreaming,
  renderAssistant: renderAssistantMessage,
  esc,
  prettyModelName: (value, labels) => prettyModelName(value, labels || modelLabelByValue),
  saveState,
  refreshModelPicker: () => refreshModelPicker(),
  getAgentForChat,
  persistAssistantToChat: (
    chatId: string,
    raw: string,
    model: string,
    idx: number,
    changeSet?: ChatChangeSet | null,
    canRevert?: boolean,
  ) => {
    persistAssistantToChatStore({
      chats,
      chatId,
      raw,
      model,
      msgIndex: idx,
      ...(changeSet ? { changeSet } : {}),
      ...(typeof canRevert === 'boolean' ? { canRevert } : {}),
    });
  },
  insertChip: (refId, label) => editorRichInput.insertChip(refId, label),
  restoreSelection: (range) => editorRichInput.restoreSelection(range),
  getSavedRange: () => savedRange,
  setSavedRange: (range) => { savedRange = range; },
  addMsg: (role, text) => { composerActions.addMsg(role, text); },
  clearActiveMessages: () => { dom.msgsEl.innerHTML = ''; },
  streamLifecycleHandle: (message) => { streamLifecycle.handleStreamMessage(message); },
  debug: postWebviewDebug,
});

function renderTabs(): void {
  renderTabsView({
    vsc,
    tabsEl: dom.tabsEl,
    msgsEl: dom.msgsEl,
    agentSel: dom.agentSel,
    chats,
    activeChatId,
    isChatStreaming: (chatId) => isChatStreaming(streamStateByChat, chatId),
    renderActiveChat,
    saveState,
    updateComposerVisibility,
    getChats: () => chats,
    getActiveChatId: () => activeChatId,
    setActiveChatId: (value) => { activeChatId = value; },
    setChats: (value) => { chats = value; },
    renderTabs,
  });
}

function renderActiveChat(): void {
  renderActiveChatView({
    msgsEl: dom.msgsEl,
    transientThinkingEl: dom.transientThinkingEl,
    agentSel: dom.agentSel,
    chats,
    activeChatId,
    modelLabelByValue,
    getActiveChat,
    getAgentForChat,
    renderAssistant: renderAssistantMessage,
    esc,
    prettyModelName: (value, labels) => prettyModelName(value, labels || modelLabelByValue),
    refreshModelPicker,
    refreshThinkingPicker,
    updateComposerVisibility,
    isChatStreaming: (chatId) => isChatStreaming(streamStateByChat, chatId),
    setStreaming,
    hasTransientActivity: (chatId) => Object.keys(activityStateByChat[chatId] || {}).length > 0,
    renderTransient,
    msgIndexRef: {
      get value() { return msgIndex; },
      set value(v: number) { msgIndex = v; },
    },
  });
}

function saveState(): void {
  saveChatState({
    vsc,
    chats,
    activeChatId,
  });
}

try {
  ensureTransientContainerPlacement();

  const closePickersRef = { current: closePickers };
  const syncPickerLabelsRef = { current: syncPickerLabels };
  const refreshModelPickerRef = { current: refreshModelPicker };
  const refreshThinkingPickerRef = { current: refreshThinkingPicker };
  const togglePickerRef = { current: togglePicker };

  const bootstrap = bootstrapWebview({
    vsc,
    esc,
    modelSel: dom.modelSel,
    thinkingSel: dom.thinkingSel,
    agentSel: dom.agentSel,
    modelPickerWrap: dom.modelPickerWrap,
    modelPickerBtn: dom.modelPickerBtn,
    modelPickerLabel: dom.modelPickerLabel,
    modelMenu: dom.modelMenu,
    thinkingPickerWrap: dom.thinkingPickerWrap,
    thinkingPickerBtn: dom.thinkingPickerBtn,
    thinkingPickerLabel: dom.thinkingPickerLabel,
    thinkingMenu: dom.thinkingMenu,
    editorEl: dom.editorEl,
    imgStripEl: dom.imgStripEl,
    fileStateEl: dom.fileStateEl,
    streamStartTimeoutMs: STREAM_START_TIMEOUT_MS,
    streamInactivityTimeoutMs: STREAM_INACTIVITY_TIMEOUT_MS,
    streamStateByChat,
    curElByChat,
    assistantTurnByChat,
    activityStateByChat,
    activityStartedAtByChat,
    msgsEl: dom.msgsEl,
    chats: () => chats,
    activeChatId: () => activeChatId,
    setStreaming,
    addErrorMessage: (text) => composerActions.addMsg('error', text),
    saveState,
    createMessagesContext,
    modelLabelByValue: () => modelLabelByValue,
    setModelLabelByValue: (value) => { modelLabelByValue = value; },
    closePickersRef,
    syncPickerLabelsRef,
    refreshModelPickerRef,
    refreshThinkingPickerRef,
    togglePickerRef,
    imageStore: () => imageStore,
    setImageStore: (value) => { imageStore = value; },
    nextImageId: () => `img_${++imgCounter}`,
    doSend: () => composerActions.doSend(),
    getCurrentRawResponse: (btn) => {
      const msgEl = btn.closest('.msg') as HTMLElement | null;
      if (!msgEl) return null;
      return {
        text: msgEl.dataset.rawText || msgEl.textContent || '',
        msgIndex: parseInt(msgEl.dataset.msgIndex || '0', 10),
      };
    },
    getActiveChatId: () => activeChatId,
    setChats: (value) => { chats = value as ChatTab[]; },
    setActiveChatId: (value) => { activeChatId = value; },
    renderTabs,
    renderActiveChat,
    saveSelection: () => editorRichInput.saveSelection(),
    setSavedRange: (range) => { savedRange = range; },
    addImageToStrip: (dataUrl) => editorRichInput.addImageToStrip(dataUrl),
    attachFile: () => composerActions.attachFile(),
    handleAction: () => composerActions.handleAction(),
    openInEditor: (btn) => editorRichInput.openInEditor(btn),
    removeImage: (el) => editorRichInput.removeImage(el),
    removeEl: (el) => editorRichInput.removeEl(el),
    clearChat: () => composerActions.clearChat(),
    toggleActivityGroup: activityDisclosure.toggleActivityGroup,
    toggleExecCard: activityDisclosure.toggleExecCard,
    syncDisclosureState: activityDisclosure.syncDisclosureState,
    applySuggestedAction: (btn) => editorRichInput.applySuggestedAction(btn),
    copyCodeBlock: (btn) => editorRichInput.copyCodeBlock(btn),
    copyAssistantResponse: (btn) => editorRichInput.copyAssistantResponse(btn),
    revertLatestChange: (btn) => editorRichInput.revertLatestChange(btn),
  });

  closePickers = closePickersRef.current;
  syncPickerLabels = syncPickerLabelsRef.current;
  refreshModelPicker = refreshModelPickerRef.current;
  refreshThinkingPicker = refreshThinkingPickerRef.current;
  togglePicker = togglePickerRef.current;
  streamLifecycle = bootstrap.streamLifecycle;
  editorRichInput = bootstrap.editorRichInput;
} catch (error) {
  showBootstrapError('startup', error);
}
