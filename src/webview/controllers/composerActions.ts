import { doSend as doSendComposer, handleAction as handleActionComposer } from '../composer.js';
import { addMsg as addMessage } from '../messageRendering.js';
import { appendErrorMessage, appendUserMessage, clearChatMessages } from '../state/chatStore.js';
import type { ChatTab, VsCodeApi } from '../types.js';

type ComposerActionsDeps = {
  vsc: VsCodeApi;
  editorEl: HTMLElement;
  imgStripEl: HTMLElement;
  modelSel: HTMLSelectElement;
  thinkingSel: HTMLSelectElement | null;
  agentSel: HTMLSelectElement | null;
  msgsEl: HTMLElement;
  esc: (value: string) => string;
  isChatStreaming: (chatId: string) => boolean;
  setStreaming: (chatId: string, on: boolean) => void;
  getActiveChat: () => ChatTab | null;
  activeChatId: () => string;
  imageStore: () => Record<string, string>;
  resetImageStore: () => void;
  clearChatInEditorRichInput: () => void;
  attachFileInEditorRichInput: () => void;
  armStreamStartWatchdog: (chatId: string) => void;
  chats: () => ChatTab[];
};

export function createComposerActions(deps: ComposerActionsDeps) {
  function addMsg(role: string, text: string, chipLabels?: string[], imgPreviews?: string[]): HTMLDivElement {
    if (role === 'user') {
      appendUserMessage({
        chats: deps.chats(),
        chatId: deps.activeChatId(),
        text,
        chipLabels,
        imgPreviews,
      });
    } else if (role === 'error') {
      appendErrorMessage(deps.chats(), deps.activeChatId(), text);
    }
    return addMessage({ msgsEl: deps.msgsEl, esc: deps.esc }, role, text, chipLabels, imgPreviews);
  }

  function doSend(): void {
    const chatId = deps.activeChatId();
    deps.armStreamStartWatchdog(chatId);
    doSendComposer({
      vsc: deps.vsc,
      editorEl: deps.editorEl,
      imgStripEl: deps.imgStripEl,
      modelSel: deps.modelSel,
      thinkingSel: deps.thinkingSel,
      agentSel: deps.agentSel,
      isChatStreaming: deps.isChatStreaming,
      setStreaming: deps.setStreaming,
      getActiveChat: deps.getActiveChat,
      activeChatId: deps.activeChatId,
      imageStore: deps.imageStore,
      resetImageStore: deps.resetImageStore,
      addMsg,
    });
  }

  function handleAction(): void {
    handleActionComposer({
      vsc: deps.vsc,
      editorEl: deps.editorEl,
      imgStripEl: deps.imgStripEl,
      modelSel: deps.modelSel,
      thinkingSel: deps.thinkingSel,
      agentSel: deps.agentSel,
      isChatStreaming: deps.isChatStreaming,
      setStreaming: deps.setStreaming,
      getActiveChat: deps.getActiveChat,
      activeChatId: deps.activeChatId,
      imageStore: deps.imageStore,
      resetImageStore: deps.resetImageStore,
      addMsg,
    });
  }

  function clearChat(): void {
    deps.clearChatInEditorRichInput();
    deps.msgsEl.innerHTML = '';
    clearChatMessages(deps.chats(), deps.activeChatId());
  }

  function attachFile(): void {
    deps.attachFileInEditorRichInput();
  }

  return {
    addMsg,
    doSend,
    handleAction,
    clearChat,
    attachFile,
  };
}
