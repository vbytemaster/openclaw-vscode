import type { ChatTab } from './types';

export function getActiveChat(chats: ChatTab[], activeChatId: string): ChatTab | null {
  for (const chat of chats) {
    if (chat.id === activeChatId) return chat;
  }
  return null;
}

export function updateComposerVisibility(composerEl: Element | null, chats: ChatTab[]): void {
  if (!composerEl) return;
  (composerEl as HTMLElement).style.display = chats.length ? '' : 'none';
}
