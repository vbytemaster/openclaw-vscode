import { isChatStreaming } from './stream.js';
import { clearAssistantTurnState, type AssistantTurnStateByChat } from './state/assistantTurnStore.js';
import type { ChatTab } from './types.js';
import { appendErrorMessage } from './state/chatStore.js';

type StreamState = Record<string, boolean>;

type StreamLifecycleDeps = {
  streamStartTimeoutMs: number;
  streamInactivityTimeoutMs: number;
  streamStateByChat: StreamState;
  curElByChat: Record<string, HTMLDivElement | null>;
  assistantTurnByChat: AssistantTurnStateByChat;
  activityStateByChat: Record<string, Record<string, unknown>>;
  activityStartedAtByChat: Record<string, number>;
  msgsEl: HTMLElement;
  chats: () => ChatTab[];
  activeChatId: () => string;
  setStreaming: (chatId: string, on: boolean) => void;
  addErrorMessage: (text: string) => void;
  saveState: () => void;
};

export function createStreamLifecycle(deps: StreamLifecycleDeps) {
  const streamWatchdogByChat: Record<string, number> = {};
  const streamStartWatchdogByChat: Record<string, number> = {};
  const streamTickerByChat: Record<string, number> = {};

  function clearStreamWatchdog(chatId: string): void {
    const timer = streamWatchdogByChat[chatId];
    if (!timer) return;
    window.clearTimeout(timer);
    delete streamWatchdogByChat[chatId];
  }

  function clearStreamStartWatchdog(chatId: string): void {
    const timer = streamStartWatchdogByChat[chatId];
    if (!timer) return;
    window.clearTimeout(timer);
    delete streamStartWatchdogByChat[chatId];
  }

  function clearStreamTicker(chatId: string): void {
    const timer = streamTickerByChat[chatId];
    if (!timer) return;
    window.clearInterval(timer);
    delete streamTickerByChat[chatId];
  }

  function armStreamTicker(chatId: string): void {
    clearStreamTicker(chatId);
    if (!isChatStreaming(deps.streamStateByChat, chatId)) return;
  }

  function armStreamStartWatchdog(chatId: string, timeoutMs: number): void {
    clearStreamStartWatchdog(chatId);
    streamStartWatchdogByChat[chatId] = window.setTimeout(() => {
      deps.setStreaming(chatId, false);
      if (chatId === deps.activeChatId()) {
        deps.addErrorMessage('⚠️ Запрос отправлен, но стрим не стартовал. Попробуй отправить ещё раз.');
      } else {
        appendErrorMessage(deps.chats(), chatId, '⚠️ Стрим не стартовал.');
      }
      deps.saveState();
    }, timeoutMs);
  }

  function armStreamWatchdog(chatId: string, timeoutMs: number): void {
    clearStreamWatchdog(chatId);
    streamWatchdogByChat[chatId] = window.setTimeout(() => {
      deps.setStreaming(chatId, false);
      const element = deps.curElByChat[chatId];
      if (element) element.remove();
      if (chatId === deps.activeChatId()) {
        const orphanEls = Array.from(deps.msgsEl.querySelectorAll('.msg.assistant[data-streaming="true"]'));
        orphanEls.forEach((node) => node.remove());
      }
      deps.curElByChat[chatId] = null;
      clearAssistantTurnState(deps.assistantTurnByChat, chatId);
      delete deps.activityStateByChat[chatId];
      delete deps.activityStartedAtByChat[chatId];

      if (chatId === deps.activeChatId()) {
        deps.addErrorMessage('⚠️ Ответ не получен (таймаут). Попробуй отправить ещё раз.');
      } else {
        appendErrorMessage(deps.chats(), chatId, '⚠️ Ответ не получен (таймаут).');
      }
      deps.saveState();
    }, timeoutMs);
  }

  function handleStreamMessage(message: { type: string; chatId?: string }): void {
    const chatId = message.chatId || deps.activeChatId();
    if (message.type === 'streamStart') {
      clearStreamStartWatchdog(chatId);
      armStreamWatchdog(chatId, deps.streamInactivityTimeoutMs);
      armStreamTicker(chatId);
      return;
    }
    if (message.type === 'streamDelta') {
      armStreamWatchdog(chatId, deps.streamInactivityTimeoutMs);
      return;
    }
    if (message.type === 'streamEnd') {
      clearStreamStartWatchdog(chatId);
      clearStreamWatchdog(chatId);
      clearStreamTicker(chatId);
    }
  }

  return {
    clearStreamWatchdog,
    clearStreamStartWatchdog,
    clearStreamTicker,
    armStreamTicker,
    armStreamStartWatchdog,
    armStreamWatchdog,
    handleStreamMessage,
  };
}
