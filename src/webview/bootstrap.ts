import { createEditorRichInput } from './editorRichInput.js';
import { createExtensionMessageHandler, type ExtensionMessageBridgeContext } from './extensionMessageBridge.js';
import { restoreInitialState } from './init.js';
import { wireInput } from './input.js';
import { createPickerControls } from './pickerControls.js';
import { createStreamLifecycle } from './streamLifecycle.js';
import type { AssistantTurnStateByChat } from './state/assistantTurnStore.js';
import type { ActivityEntry } from './messageTypes.js';
import type { ChatTab, VsCodeApi } from './types.js';

type BootstrapDeps = {
  vsc: Pick<VsCodeApi, 'postMessage' | 'getState'>;
  esc: (value: string) => string;
  modelSel: HTMLSelectElement;
  thinkingSel: HTMLSelectElement | null;
  agentSel: HTMLSelectElement | null;
  modelPickerWrap: HTMLElement | null;
  modelPickerBtn: HTMLButtonElement | null;
  modelPickerLabel: HTMLElement | null;
  modelMenu: HTMLElement | null;
  thinkingPickerWrap: HTMLElement | null;
  thinkingPickerBtn: HTMLButtonElement | null;
  thinkingPickerLabel: HTMLElement | null;
  thinkingMenu: HTMLElement | null;
  editorEl: HTMLElement;
  imgStripEl: HTMLElement;
  fileStateEl: HTMLElement | null;
  streamStartTimeoutMs: number;
  streamInactivityTimeoutMs: number;
  streamStateByChat: Record<string, boolean>;
  curElByChat: Record<string, HTMLDivElement | null>;
  assistantTurnByChat: AssistantTurnStateByChat;
  activityStateByChat: Record<string, Record<string, ActivityEntry>>;
  activityStartedAtByChat: Record<string, number>;
  msgsEl: HTMLElement;
  chats: () => ChatTab[];
  activeChatId: () => string;
  setStreaming: (chatId: string, on: boolean) => void;
  addErrorMessage: (text: string) => void;
  saveState: () => void;
  createMessagesContext: () => Omit<ExtensionMessageBridgeContext, 'modelSel' | 'modelLabelByValue' | 'setModelLabelByValue'>;
  modelLabelByValue: () => Record<string, string>;
  setModelLabelByValue: (value: Record<string, string>) => void;
  closePickersRef: { current: () => void };
  syncPickerLabelsRef: { current: () => void };
  refreshModelPickerRef: { current: () => void };
  refreshThinkingPickerRef: { current: () => void };
  togglePickerRef: { current: (which: 'model' | 'thinking') => void };
  imageStore: () => Record<string, string>;
  setImageStore: (value: Record<string, string>) => void;
  nextImageId: () => string;
  doSend: () => void;
  getCurrentRawResponse: (btn: HTMLElement) => { text: string; msgIndex: number } | null;
  getActiveChatId: () => string;
  setChats: (value: ChatTab[]) => void;
  setActiveChatId: (value: string) => void;
  renderTabs: () => void;
  renderActiveChat: () => void;
  saveSelection: () => Range | null;
  setSavedRange: (range: Range | null) => void;
  addImageToStrip: (dataUrl: string) => void;
  attachFile: () => void;
  handleAction: () => void;
  openInEditor: (btn: HTMLElement) => void;
  removeImage: (el: HTMLElement) => void;
  removeEl: (el: HTMLElement) => void;
  clearChat: () => void;
  toggleActivityGroup: (btn: HTMLElement) => void;
  toggleExecCard: (btn: HTMLElement) => void;
  syncDisclosureState: (el: HTMLElement) => void;
  applySuggestedAction: (btn: HTMLElement) => void;
  copyCodeBlock: (btn: HTMLElement) => Promise<void>;
  copyAssistantResponse: (btn: HTMLElement) => Promise<void>;
  revertLatestChange: (btn: HTMLElement) => void;
};

export type BootstrapResult = {
  closePickers: () => void;
  syncPickerLabels: () => void;
  refreshModelPicker: () => void;
  refreshThinkingPicker: () => void;
  togglePicker: (which: 'model' | 'thinking') => void;
  streamLifecycle: ReturnType<typeof createStreamLifecycle>;
  editorRichInput: ReturnType<typeof createEditorRichInput>;
};

export function bootstrapWebview(deps: BootstrapDeps): BootstrapResult {
  const pickerControls = createPickerControls({
    modelSel: deps.modelSel,
    thinkingSel: deps.thinkingSel,
    modelPickerWrap: deps.modelPickerWrap,
    modelPickerLabel: deps.modelPickerLabel,
    modelMenu: deps.modelMenu,
    thinkingPickerWrap: deps.thinkingPickerWrap,
    thinkingPickerLabel: deps.thinkingPickerLabel,
    thinkingMenu: deps.thinkingMenu,
    esc: deps.esc,
  });

  deps.closePickersRef.current = pickerControls.closePickers;
  deps.syncPickerLabelsRef.current = pickerControls.syncPickerLabels;
  deps.refreshModelPickerRef.current = pickerControls.refreshModelPicker;
  deps.refreshThinkingPickerRef.current = pickerControls.refreshThinkingPicker;
  deps.togglePickerRef.current = pickerControls.togglePicker;

  const streamLifecycle = createStreamLifecycle({
    streamStartTimeoutMs: deps.streamStartTimeoutMs,
    streamInactivityTimeoutMs: deps.streamInactivityTimeoutMs,
    streamStateByChat: deps.streamStateByChat,
    curElByChat: deps.curElByChat,
    assistantTurnByChat: deps.assistantTurnByChat,
    activityStateByChat: deps.activityStateByChat,
    activityStartedAtByChat: deps.activityStartedAtByChat,
    msgsEl: deps.msgsEl,
    chats: deps.chats,
    activeChatId: deps.activeChatId,
    setStreaming: deps.setStreaming,
    addErrorMessage: deps.addErrorMessage,
    saveState: deps.saveState,
  });

  const editorRichInput = createEditorRichInput({
    editorEl: deps.editorEl,
    imgStripEl: deps.imgStripEl,
    esc: deps.esc,
    imageStore: deps.imageStore,
    setImageStore: deps.setImageStore,
    nextImageId: deps.nextImageId,
    doSend: deps.doSend,
    postOpenInEditor: (text, msgIndex) => deps.vsc.postMessage({ type: 'openResponseInEditor', text, msgIndex }),
    postRevertLatestChange: (chatId, changeId) => deps.vsc.postMessage({ type: 'revertLatestChange', chatId, changeId }),
    postClearChat: (chatId) => deps.vsc.postMessage({ type: 'clear', chatId }),
    postAttachFile: () => deps.vsc.postMessage({ type: 'attachFile' }),
    getActiveChatId: deps.getActiveChatId,
    getCurrentRawResponse: deps.getCurrentRawResponse,
  });

  window.addEventListener('message', createExtensionMessageHandler({
    ...deps.createMessagesContext(),
    modelSel: deps.modelSel,
    modelLabelByValue: deps.modelLabelByValue,
    setModelLabelByValue: deps.setModelLabelByValue,
  }));

  deps.modelPickerBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    pickerControls.refreshModelPicker();
    pickerControls.togglePicker('model');
  });

  deps.thinkingPickerBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    pickerControls.refreshThinkingPicker();
    pickerControls.togglePicker('thinking');
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node | null;
    if (deps.modelPickerWrap && target && deps.modelPickerWrap.contains(target)) return;
    if (deps.thinkingPickerWrap && target && deps.thinkingPickerWrap.contains(target)) return;
    pickerControls.closePickers();
  });

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const actionEl = target?.closest<HTMLElement>('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (!action) return;

    switch (action) {
      case 'attach-file':
        deps.attachFile();
        break;
      case 'composer-submit':
        deps.handleAction();
        break;
      case 'open-response':
        deps.openInEditor(actionEl);
        break;
      case 'remove-image':
        if (actionEl.parentElement) deps.removeImage(actionEl.parentElement);
        break;
      case 'remove-element':
        if (actionEl.parentElement) deps.removeEl(actionEl.parentElement);
        break;
      case 'apply-suggested':
        deps.applySuggestedAction(actionEl);
        break;
      case 'copy-code':
        void deps.copyCodeBlock(actionEl);
        break;
      case 'copy-response':
        void deps.copyAssistantResponse(actionEl);
        break;
      case 'revert-latest-change':
        deps.revertLatestChange(actionEl);
        break;
      default:
        break;
    }
  });

  document.addEventListener('toggle', (event) => {
    const target = event.target as HTMLElement | null;
    if (target instanceof HTMLDetailsElement && target.dataset.disclosureId) {
      deps.syncDisclosureState(target);
    }
  }, true);

  deps.editorEl.focus();
  wireInput({
    vsc: deps.vsc,
    editorEl: deps.editorEl,
    saveSelection: deps.saveSelection,
    setSavedRange: deps.setSavedRange,
    addImageToStrip: deps.addImageToStrip,
    doSend: deps.doSend,
  });

  deps.vsc.postMessage({ type: 'fetchModels' });
  restoreInitialState({
    vsc: deps.vsc,
    fileStateEl: deps.fileStateEl,
    agentSel: deps.agentSel,
    setChats: deps.setChats,
    getChats: deps.chats,
    setActiveChatId: deps.setActiveChatId,
    renderTabs: deps.renderTabs,
    renderActiveChat: deps.renderActiveChat,
  });

  return {
    closePickers: pickerControls.closePickers,
    syncPickerLabels: pickerControls.syncPickerLabels,
    refreshModelPicker: pickerControls.refreshModelPicker,
    refreshThinkingPicker: pickerControls.refreshThinkingPicker,
    togglePicker: pickerControls.togglePicker,
    streamLifecycle,
    editorRichInput,
  };
}
