import type { ChatMessage, ChatTab } from '../types.js';
import { migrateLegacyChats } from './migration.js';

function findChat(chats: ChatTab[], chatId: string): ChatTab | null {
  for (const chat of chats) {
    if (chat.id === chatId) return chat;
  }
  return null;
}

export function normalizeChats(chats: ChatTab[]): ChatTab[] {
  return migrateLegacyChats(chats);
}

export function getAgentForChat(chats: ChatTab[], chatId: string): string {
  return findChat(chats, chatId)?.agentId || 'main';
}

export function pruneStaleAssistantPlaceholders(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((message) => message.role !== 'assistant' || Boolean(String(message.rawText || '').trim()));
}

export function appendMessageToChat(chats: ChatTab[], chatId: string, message: ChatMessage): void {
  const target = findChat(chats, chatId);
  if (!target) return;
  target.messages = pruneStaleAssistantPlaceholders(target.messages);
  target.messages.push(message);
}

export function appendUserMessage(params: {
  chats: ChatTab[];
  chatId: string;
  text: string;
  chipLabels?: string[];
  imgPreviews?: string[];
}): void {
  appendMessageToChat(params.chats, params.chatId, {
    role: 'user',
    rawText: params.text,
    ...(params.chipLabels?.length ? { chipLabels: params.chipLabels } : {}),
    ...(params.imgPreviews?.length ? { imgPreviews: params.imgPreviews } : {}),
  });
}

export function appendErrorMessage(chats: ChatTab[], chatId: string, text: string): void {
  appendMessageToChat(chats, chatId, {
    role: 'error',
    rawText: text,
  });
}

export function clearChatMessages(chats: ChatTab[], chatId: string): void {
  const target = findChat(chats, chatId);
  if (!target) return;
  target.messages = [];
  target.msgIndex = 0;
}

export function persistAssistantToChat(params: {
  chats: ChatTab[];
  chatId: string;
  raw: string;
  model: string;
  msgIndex: number;
  changeSet?: ChatMessage['changeSet'];
  canRevert?: boolean;
}): void {
  const target = findChat(params.chats, params.chatId);
  if (!target) return;
  target.messages = pruneStaleAssistantPlaceholders(target.messages);
  target.messages.push({
    role: 'assistant',
    rawText: params.raw,
    msgIdx: String(params.msgIndex),
    model: params.model,
    ...(params.changeSet ? { changeSet: params.changeSet } : {}),
    ...(typeof params.canRevert === 'boolean' ? { canRevert: params.canRevert } : {}),
  });
  target.msgIndex = params.msgIndex;
}
