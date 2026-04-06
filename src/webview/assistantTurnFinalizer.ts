import type { MessagesContext, StreamEndMessage } from './messageTypes.js';
import {
  applyAssistantTurnChangeSet,
  clearAssistantTurnState,
  getAssistantTurnState,
} from './state/assistantTurnStore.js';
import { lockPreviousReverts } from './changeSet.js';
import {
  cancelTransientRender,
  clearTransientThinking,
  removeStreamingTurn,
  rerenderCurrentTurn,
} from './messageRendering.js';
import { renderAssistantActionsBar } from './components/content/messageContent.js';

export function finalizeAssistantTurn(ctx: MessagesContext, message: StreamEndMessage): void {
  const chatId = message.chatId || ctx.activeChatId();
  ctx.debug?.('streamEnd.received', {
    chatId,
    activeChatId: ctx.activeChatId(),
    totalChars: getAssistantTurnState(ctx.assistantTurnByChat, chatId).rawText.length,
    activityCount: Object.keys(ctx.activityStateByChat[chatId] || {}).length,
    hasChangeSet: Boolean(message.changeSet),
    canRevert: Boolean(message.canRevert),
  });

  ctx.setStreaming(chatId, false);

  const assistantTurn = getAssistantTurnState(ctx.assistantTurnByChat, chatId);
  const raw = assistantTurn.rawText || '';
  const model = assistantTurn.model || '';
  const changeSet = message.changeSet || null;

  if (changeSet) {
    ctx.latestChangeSetByChat[chatId] = changeSet;
    applyAssistantTurnChangeSet(ctx.assistantTurnByChat, chatId, changeSet);
  }

  if (chatId !== ctx.activeChatId()) {
    if (raw && ctx.persistAssistantToChat) {
      const msgIndex = ++ctx.msgIndexRef.value;
      ctx.persistAssistantToChat(chatId, raw, model, msgIndex, changeSet, Boolean(message.canRevert));
    }
    removeStreamingTurn(ctx, chatId);
    clearAssistantTurnState(ctx.assistantTurnByChat, chatId);
    ctx.saveState();
    return;
  }

  cancelTransientRender(chatId);
  let element = ctx.curElByChat[chatId];
  if (!element && raw) {
    element = document.createElement('div');
    element.className = 'msg assistant';
    ctx.msgsEl.appendChild(element);
    ctx.curElByChat[chatId] = element;
  }

  if (element && !raw) {
    element.remove();
    ctx.curElByChat[chatId] = null;
    clearTransientThinking(ctx, chatId);
  } else if (element) {
    if (changeSet && message.canRevert) {
      lockPreviousReverts(ctx);
    }
    rerenderCurrentTurn(ctx, chatId, false);
    const msgIndex = ++ctx.msgIndexRef.value;
    element.dataset.rawText = raw;
    element.dataset.msgIndex = String(msgIndex);
    element.dataset.model = model;
    if (changeSet) {
      element.dataset.changeSet = JSON.stringify(changeSet);
    } else {
      delete element.dataset.changeSet;
    }
    element.dataset.canRevert = changeSet && message.canRevert ? 'true' : 'false';
    element.insertAdjacentHTML('beforeend', renderAssistantActionsBar({
      message: {
        role: 'assistant',
        rawText: raw,
        msgIdx: String(msgIndex),
        model,
      },
      chatId,
      prettyModelName: (value, labels) => ctx.prettyModelName(value, labels || {}),
      modelLabelByValue: ctx.modelLabelByValue,
      getAgentForChat: (targetChatId) => (ctx.getAgentForChat?.(targetChatId)) || (ctx.agentSel?.value) || 'main',
      esc: ctx.esc,
    }));
  } else if (raw && ctx.persistAssistantToChat) {
    const msgIndex = ++ctx.msgIndexRef.value;
    ctx.persistAssistantToChat(chatId, raw, model, msgIndex, changeSet, Boolean(message.canRevert));
  }

  ctx.debug?.('streamEnd.finalRendered', {
    chatId,
    renderedChars: raw.length,
    model,
  });

  ctx.curElByChat[chatId] = null;
  clearAssistantTurnState(ctx.assistantTurnByChat, chatId);
  delete ctx.activityStateByChat[chatId];
  delete ctx.activityStartedAtByChat[chatId];
  ctx.editorEl.focus();
  ctx.saveState();
}
