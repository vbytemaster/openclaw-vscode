import type { ChatTab, VsCodeApi } from './types';

type InitContext = {
  vsc: Pick<VsCodeApi, 'getState'>;
  fileStateEl: HTMLElement | null;
  agentSel: HTMLSelectElement | null;
  setChats: (v: ChatTab[]) => void;
  getChats: () => ChatTab[];
  setActiveChatId: (v: string) => void;
  renderTabs: () => void;
  renderActiveChat: () => void;
};

function normalizeChatIds(chats: ChatTab[]): ChatTab[] {
  const seen = new Set<string>();
  return (chats || []).map((c, i) => {
    let id = String(c?.id || '').trim();
    if (!id || seen.has(id)) {
      id = 'chat-' + (globalThis.crypto?.randomUUID?.() || (Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 8)));
    }
    seen.add(id);
    return { ...c, id };
  });
}

export function restoreInitialState(ctx: InitContext): void {
  const state = ctx.vsc.getState() as { chats?: ChatTab[]; activeChatId?: string } | undefined;
  const fileData = ctx.fileStateEl ? JSON.parse(ctx.fileStateEl.textContent || '[]') : [];

  if (state && Array.isArray(state.chats)) {
    ctx.setChats(normalizeChatIds(state.chats));
    const chats = ctx.getChats();
    ctx.setActiveChatId(state.activeChatId || chats[0]?.id || '');
  } else if (fileData && fileData.chats && Array.isArray(fileData.chats)) {
    ctx.setChats(normalizeChatIds(fileData.chats));
    const chats = ctx.getChats();
    ctx.setActiveChatId(fileData.activeChatId || chats[0]?.id || '');
  } else if (Array.isArray(fileData) && fileData.length) {
    ctx.setChats([{ id: 'chat-1', title: 'Chat 1', messages: fileData, msgIndex: fileData.length, agentId: ctx.agentSel?.value || 'main' }]);
    ctx.setActiveChatId('chat-1');
  }

  ctx.renderTabs();
  ctx.renderActiveChat();
}
