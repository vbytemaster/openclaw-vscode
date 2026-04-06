import type {
  ExtensionRevertAppliedMessage,
  ExtensionStreamDeltaMessage,
  ExtensionStreamFinalMessage,
  ExtensionStreamModelMessage,
  ExtensionStreamStartMessage,
} from '../dto/webview/outgoing.js';
import {
  applyAssistantTurnChangeSet,
  applyAssistantTurnDelta,
  applyAssistantTurnFinal,
  applyAssistantTurnModel,
  resetAssistantTurnState,
} from './state/assistantTurnStore.js';
import type { MessagesContext } from './messageTypes.js';

export function applyStreamStart(
  ctx: MessagesContext,
  message: ExtensionStreamStartMessage,
): string {
  const chatId = message.chatId || ctx.activeChatId();
  resetAssistantTurnState(ctx.assistantTurnByChat, chatId);
  ctx.activityStateByChat[chatId] = {};
  ctx.activityStartedAtByChat[chatId] = Date.now();
  ctx.latestChangeSetByChat[chatId] = null;
  return chatId;
}

export function applyStreamModel(
  ctx: MessagesContext,
  message: ExtensionStreamModelMessage,
): string {
  const chatId = message.chatId || ctx.activeChatId();
  applyAssistantTurnModel(ctx.assistantTurnByChat, chatId, message.model || '');
  return chatId;
}

export function applyStreamDelta(
  ctx: MessagesContext,
  message: ExtensionStreamDeltaMessage,
): string {
  const chatId = message.chatId || ctx.activeChatId();
  applyAssistantTurnDelta(ctx.assistantTurnByChat, chatId, String(message.text || ''));
  return chatId;
}

export function applyStreamFinal(
  ctx: MessagesContext,
  message: ExtensionStreamFinalMessage,
): string {
  const chatId = message.chatId || ctx.activeChatId();
  if (typeof message.text === 'string' && message.text.length > 0) {
    applyAssistantTurnFinal(
      ctx.assistantTurnByChat,
      chatId,
      message.text,
      typeof message.model === 'string' ? message.model : undefined,
    );
  }
  return chatId;
}

export function applyRevertApplied(
  ctx: MessagesContext,
  message: ExtensionRevertAppliedMessage,
): string {
  const chatId = message.chatId || ctx.activeChatId();
  ctx.latestChangeSetByChat[chatId] = null;
  applyAssistantTurnChangeSet(ctx.assistantTurnByChat, chatId, null);
  return chatId;
}
