import * as fs from 'fs';
import * as path from 'path';
import { TurnChangeSet } from './changeTracking';

export function getChatStatePath(workspaceRoot: string | null): string | null {
  if (!workspaceRoot) return null;
  return path.join(workspaceRoot, '.openclaw', 'chat-state.json');
}

export function saveChatState(workspaceRoot: string | null, messages: unknown): void {
  const filePath = getChatStatePath(workspaceRoot);
  if (!filePath) return;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(messages), 'utf8');
}

export function loadChatState(workspaceRoot: string | null): any {
  const filePath = getChatStatePath(workspaceRoot);
  if (!filePath || !fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function rehydrateLatestChangeSets(state: any): Map<string, TurnChangeSet> {
  const latestChangeSetByChat = new Map<string, TurnChangeSet>();
  const chats = Array.isArray(state?.chats) ? state.chats : [];
  for (const chat of chats) {
    const chatId = String(chat?.id || '');
    if (!chatId) continue;
    const messages = Array.isArray(chat?.messages) ? chat.messages : [];
    for (const message of messages) {
      if (message?.canRevert && message?.changeSet?.id) {
        latestChangeSetByChat.set(chatId, message.changeSet as TurnChangeSet);
      }
    }
  }
  return latestChangeSetByChat;
}
