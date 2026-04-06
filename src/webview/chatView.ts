import { pruneStaleAssistantPlaceholders } from './state/chatStore.js';
import type { ChatMessage, ChatTab } from './types.js';
import { renderAssistantActionsBar, renderPersistedChatMessage } from './components/content/messageContent.js';

type RenderActiveChatContext = {
  msgsEl: HTMLElement;
  transientThinkingEl: HTMLElement;
  agentSel: HTMLSelectElement | null;
  chats: ChatTab[];
  activeChatId: string;
  modelLabelByValue: Record<string, string>;
  getActiveChat: () => ChatTab | null;
  getAgentForChat: (chatId: string) => string;
  renderAssistant: (text: string) => string;
  esc: (value: string) => string;
  prettyModelName: (value: string, labels?: Record<string, string>) => string;
  refreshModelPicker: () => void;
  refreshThinkingPicker: () => void;
  updateComposerVisibility: () => void;
  isChatStreaming: (chatId: string) => boolean;
  setStreaming: (chatId: string, on: boolean) => void;
  hasTransientActivity: (chatId: string) => boolean;
  renderTransient: (chatId: string) => void;
  msgIndexRef: {
    get value(): number;
    set value(v: number);
  };
};

export function renderActiveChatView(ctx: RenderActiveChatContext): void {
  const chat = ctx.getActiveChat();
  ctx.msgsEl.innerHTML = '';
  ctx.msgsEl.appendChild(ctx.transientThinkingEl);

  if (!chat) {
    ctx.msgIndexRef.value = 0;
    ctx.updateComposerVisibility();
    return;
  }

  chat.messages = pruneStaleAssistantPlaceholders(chat.messages || []);
  ctx.msgIndexRef.value = chat.msgIndex || 0;

  (chat.messages || []).forEach((msg: ChatMessage) => {
    const element = document.createElement('div');
    element.className = 'msg ' + msg.role;
    const rendered = renderPersistedChatMessage({
      message: msg,
      renderAssistant: ctx.renderAssistant,
      renderAssistantActions: (message, renderedChatId) => renderAssistantActionsBar({
        message,
        chatId: renderedChatId,
        prettyModelName: ctx.prettyModelName,
        modelLabelByValue: ctx.modelLabelByValue,
        getAgentForChat: ctx.getAgentForChat,
        esc: ctx.esc,
      }),
      chatId: chat.id,
      esc: ctx.esc,
    });
    element.innerHTML = rendered;

    if (msg.role === 'assistant') {
      element.dataset.rawText = msg.rawText || '';
      element.dataset.msgIndex = msg.msgIdx || '0';
      element.dataset.model = msg.model || '';
      if (msg.changeSet) element.dataset.changeSet = JSON.stringify(msg.changeSet);
      element.dataset.canRevert = msg.canRevert ? 'true' : 'false';
    }

    ctx.msgsEl.appendChild(element);
  });

  ctx.msgsEl.scrollTop = ctx.msgsEl.scrollHeight;
  if (ctx.agentSel && chat.agentId) ctx.agentSel.value = chat.agentId;
  ctx.refreshModelPicker();
  ctx.refreshThinkingPicker();
  ctx.updateComposerVisibility();
  ctx.setStreaming(ctx.activeChatId, ctx.isChatStreaming(ctx.activeChatId));
  if (ctx.hasTransientActivity(ctx.activeChatId)) {
    ctx.renderTransient(ctx.activeChatId);
  }
}
