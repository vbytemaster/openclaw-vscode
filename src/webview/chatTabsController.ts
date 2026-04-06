import type { ChatTab, VsCodeApi } from './types.js';

type ChatTabsControllerContext = {
  vsc: VsCodeApi;
  msgsEl: HTMLElement;
  agentSel: HTMLSelectElement | null;
  getChats: () => ChatTab[];
  setChats: (v: ChatTab[]) => void;
  getActiveChatId: () => string;
  setActiveChatId: (v: string) => void;
  renderTabs: () => void;
  renderActiveChat: () => void;
  saveState: () => void;
  updateComposerVisibility: () => void;
};

export function switchToChat(ctx: ChatTabsControllerContext, chatId: string): void {
  ctx.setActiveChatId(chatId);
  ctx.renderTabs();
  ctx.renderActiveChat();
  ctx.saveState();
}

export function closeChat(ctx: ChatTabsControllerContext, chatId: string): void {
  const remainingChats = ctx.getChats().filter((it) => it.id !== chatId);
  ctx.setChats(remainingChats);
  ctx.vsc.postMessage({ type: 'deleteChat', chatId });

  if (!remainingChats.length) {
    ctx.setActiveChatId('');
    ctx.msgsEl.innerHTML = '';
  } else if (ctx.getActiveChatId() === chatId) {
    ctx.setActiveChatId(remainingChats[0].id);
    ctx.renderActiveChat();
  }

  ctx.renderTabs();
  ctx.updateComposerVisibility();
  ctx.saveState();
}

export function createChat(ctx: ChatTabsControllerContext): void {
  const chats = ctx.getChats();
  const id = 'chat-' + (globalThis.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random().toString(36).slice(2, 8)));
  const chat: ChatTab = {
    id,
    title: 'Chat ' + (chats.length + 1),
    messages: [],
    msgIndex: 0,
    agentId: (ctx.agentSel && ctx.agentSel.value) || 'main',
  };
  ctx.setChats(chats.concat([chat]));
  ctx.setActiveChatId(id);
  ctx.renderTabs();
  ctx.renderActiveChat();
  ctx.saveState();
}
