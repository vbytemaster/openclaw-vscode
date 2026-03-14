import type { ChatTab, VsCodeApi } from './types';

type TabsContext = {
  vsc: VsCodeApi;
  tabsEl: HTMLElement;
  msgsEl: HTMLElement;
  agentSel: HTMLSelectElement | null;
  chats: ChatTab[];
  activeChatId: string;
  isChatStreaming: (chatId: string) => boolean;
  snapshotDomToActiveChat: () => void;
  renderActiveChat: () => void;
  saveState: () => void;
  updateComposerVisibility: () => void;
  setActiveChatId: (v: string) => void;
  setChats: (v: ChatTab[]) => void;
  renderTabs: () => void;
};

export function renderTabs(ctx: TabsContext): void {
  ctx.tabsEl.innerHTML = '';

  ctx.chats.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'pill';
    b.style.opacity = c.id === ctx.activeChatId ? '1' : '0.75';
    const dot = ctx.isChatStreaming(c.id) ? ' ●' : '';
    b.textContent = c.title + dot;
    b.onclick = () => {
      ctx.snapshotDomToActiveChat();
      ctx.setActiveChatId(c.id);
      ctx.renderTabs();
      ctx.renderActiveChat();
      ctx.saveState();
    };

    const x = document.createElement('span');
    x.textContent = ' ×';
    x.style.opacity = '0.7';
    x.onclick = (e) => {
      e.stopPropagation();
      ctx.snapshotDomToActiveChat();
      ctx.setChats(ctx.chats.filter((it) => it.id !== c.id));
      ctx.vsc.postMessage({ type: 'deleteChat', chatId: c.id });

      if (!ctx.chats.length) {
        ctx.setActiveChatId('');
        ctx.msgsEl.innerHTML = '';
      } else if (ctx.activeChatId === c.id) {
        ctx.setActiveChatId(ctx.chats[0].id);
        ctx.renderActiveChat();
      }

      ctx.renderTabs();
      ctx.updateComposerVisibility();
      ctx.saveState();
    };

    b.appendChild(x);
    ctx.tabsEl.appendChild(b);
  });

  const add = document.createElement('button');
  add.className = 'pill';
  add.textContent = '+';
  add.onclick = () => {
    ctx.snapshotDomToActiveChat();
    const id = 'chat-' + (globalThis.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random().toString(36).slice(2, 8)));
    const n: ChatTab = {
      id,
      title: 'Chat ' + (ctx.chats.length + 1),
      messages: [],
      msgIndex: 0,
      agentId: (ctx.agentSel && ctx.agentSel.value) || 'main'
    };
    ctx.setChats(ctx.chats.concat([n]));
    ctx.setActiveChatId(id);
    ctx.renderTabs();
    ctx.renderActiveChat();
    ctx.saveState();
  };
  ctx.tabsEl.appendChild(add);

  ctx.updateComposerVisibility();
}
