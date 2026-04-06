import type { ChatTab, VsCodeApi } from './types.js';
import { closeChat, createChat, switchToChat } from './chatTabsController.js';

type TabsContext = {
  vsc: VsCodeApi;
  tabsEl: HTMLElement;
  msgsEl: HTMLElement;
  agentSel: HTMLSelectElement | null;
  chats: ChatTab[];
  activeChatId: string;
  isChatStreaming: (chatId: string) => boolean;
  renderActiveChat: () => void;
  saveState: () => void;
  updateComposerVisibility: () => void;
  getChats: () => ChatTab[];
  getActiveChatId: () => string;
  setActiveChatId: (v: string) => void;
  setChats: (v: ChatTab[]) => void;
  renderTabs: () => void;
};

export function renderTabs(ctx: TabsContext): void {
  ctx.tabsEl.innerHTML = '';

  ctx.chats.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'chat-tab' + (c.id === ctx.activeChatId ? ' is-active' : '');
    const dot = ctx.isChatStreaming(c.id) ? '<span class="chat-tab-dot"></span>' : '';
    b.innerHTML = `<span class="chat-tab-label">${c.title}</span>${dot}`;
    b.onclick = () => switchToChat(ctx, c.id);

    const x = document.createElement('span');
    x.className = 'chat-tab-close';
    x.textContent = '×';
    x.onclick = (e) => {
      e.stopPropagation();
      closeChat(ctx, c.id);
    };

    b.appendChild(x);
    ctx.tabsEl.appendChild(b);
  });

  const add = document.createElement('button');
  add.className = 'chat-tab-add';
  add.textContent = '+';
  add.onclick = () => createChat(ctx);
  ctx.tabsEl.appendChild(add);

  ctx.updateComposerVisibility();
}
