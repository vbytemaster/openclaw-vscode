import * as http from 'http';
import { logger } from '../shared/logger';
import { ChatMessage } from '../shared/types';
import { ChatTransport } from './transport';
import { ChatSession } from './chatSession';
import {
  WorkspaceSnapshot,
  computeChangeSet,
  isChangeSetRevertible,
} from './changeTracking';
import {
  buildStreamEndMessage,
  buildStreamModelMessage,
  buildStreamStartMessage,
} from './webviewMessages';
import { toExtensionMessage } from './chatEventBridge';
import type { AnswerDeltaEvent, AnswerFinalEvent, ErrorEvent, ToolEvent } from './events/types';

type PostMessage = (message: {
  type: string;
  chatId?: string;
  agentId?: string;
  text?: string;
  model?: string;
  changeSet?: unknown;
  canRevert?: boolean;
}) => void;

export type ExecuteChatRunParams = {
  transport: ChatTransport;
  session: ChatSession;
  chatId: string;
  agentId: string;
  transportKind: 'http' | 'ws';
  host: string;
  port: number;
  sessionUser: string;
  sessionKey: string;
  effectiveModel: string;
  effectiveThinkingLevel: string | null;
  messageContent: string;
  apiMessages: ChatMessage[];
  priorTurnsCount: number;
  workspaceRoot: string | null;
  takeWorkspaceSnapshot: () => WorkspaceSnapshot;
  cleanupImages: (messageContent: string) => void;
  postMessage: PostMessage;
  formatTransportError: (error: unknown, host: string, port: number) => string;
};

export async function executeChatRun(params: ExecuteChatRunParams): Promise<void> {
  const {
    transport,
    session,
    chatId,
    agentId,
    transportKind,
    host,
    port,
    sessionUser,
    sessionKey,
    effectiveModel,
    effectiveThinkingLevel,
    messageContent,
    apiMessages,
    priorTurnsCount,
    workspaceRoot,
    takeWorkspaceSnapshot,
    cleanupImages,
    postMessage,
    formatTransportError,
  } = params;

  logger.info(
    `[chat:${chatId}] send agent=${agentId} model=${effectiveModel} thinkingLevel=${effectiveThinkingLevel ?? 'auto'} transport=${transportKind} priorTurns=${priorTurnsCount} sessionKey=${sessionKey} textChars=${messageContent.length}`,
  );

  try {
    logger.info(
      `[chat:${chatId}] sessions.patch requested model=${effectiveModel} reasoningLevel=stream thinkingLevel=${effectiveThinkingLevel ?? 'auto'} sessionKey=${sessionKey} firstTurn=${priorTurnsCount === 0 ? 'yes' : 'no'}`,
    );
    const resolvedModel = await transport.setSessionOptions(sessionKey, {
      model: effectiveModel,
      reasoningLevel: 'stream',
      thinkingLevel: effectiveThinkingLevel,
    });
    const displayModel = (resolvedModel || effectiveModel).trim();
    if (displayModel) {
      session.resolvedModel = displayModel;
    }
    logger.info(
      `[chat:${chatId}] sessions.patch applied model=${displayModel || effectiveModel} reasoningLevel=stream thinkingLevel=${effectiveThinkingLevel ?? 'auto'} sessionKey=${sessionKey}`,
    );
  } catch (error) {
    logger.warn(`[chat:${chatId}] model override skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  postMessage(buildStreamStartMessage(chatId, agentId));
  logger.info(`[chat:${chatId}] streamStart sent agent=${agentId} transport=${transportKind}`);

  try {
    let fullResponse = await streamChatRequest(transport, {
      model: effectiveModel,
      user: sessionUser,
      messages: apiMessages,
      agentId,
      sessionKey,
    }, chatId, session, postMessage);
    session.clearActiveRequest();
    logger.info(`[chat:${chatId}] stream completed, chars=${fullResponse.length}`);

    for (let attempt = 1; attempt <= 2 && (!fullResponse || fullResponse.trim().length === 0); attempt++) {
      logger.warn(`[chat:${chatId}] empty assistant response from agent=${agentId}, retry attempt=${attempt}`);
      await new Promise((r) => setTimeout(r, 350 * attempt));

      const retryMessages: ChatMessage[] = [
        { role: 'system', content: 'Return a concise non-empty plain-text answer.' },
        { role: 'user', content: messageContent },
      ];

      fullResponse = await streamChatRequest(transport, {
        model: effectiveModel,
        user: sessionUser,
        messages: retryMessages,
        agentId,
        sessionKey,
      }, chatId, session, postMessage);
      session.clearActiveRequest();
      logger.info(`[chat:${chatId}] retry stream completed, attempt=${attempt}, chars=${fullResponse.length}`);
    }

    if (!fullResponse || fullResponse.trim().length === 0) {
      logger.warn(`[chat:${chatId}] empty assistant response from agent=${agentId}`);
      const errorEvent: ErrorEvent = {
        kind: 'error',
        chatId,
        message: `Agent '${agentId}' returned an empty response. Try 'main' or 'backend-dev'.`,
      };
      postMessage(toExtensionMessage(errorEvent));
      postMessage(buildStreamEndMessage(chatId));
      session.clearSnapshot();
      cleanupImages(messageContent);
      return;
    }

    session.append({ role: 'assistant', content: fullResponse });
    const changeSet = computeChangeSet(session.snapshotBeforeRun, takeWorkspaceSnapshot());
    const canRevert = Boolean(changeSet && isChangeSetRevertible(workspaceRoot, changeSet));
    if (changeSet && canRevert) {
      session.latestChangeSet = changeSet;
    }
    const finalEvent: AnswerFinalEvent = {
      kind: 'answer_final',
      chatId,
      text: fullResponse,
      ...(session.resolvedModel ? { model: session.resolvedModel } : {}),
    };
    postMessage(toExtensionMessage(finalEvent));
    postMessage(buildStreamEndMessage(chatId, changeSet, canRevert));
    session.clearSnapshot();
    cleanupImages(messageContent);
  } catch (error) {
    session.clearActiveRequest();
    logger.error(`[chat:${chatId}] stream failed`, error);
    const errorEvent: ErrorEvent = {
      kind: 'error',
      chatId,
      message: formatTransportError(error, host, port),
    };
    postMessage(toExtensionMessage(errorEvent));
    postMessage(buildStreamEndMessage(chatId));
    session.clearSnapshot();
    cleanupImages(messageContent);
  }
}

function streamChatRequest(
  transport: ChatTransport,
  request: { model: string; user: string; messages: ChatMessage[]; agentId?: string; sessionKey?: string },
  chatId: string,
  session: ChatSession,
  postMessage: PostMessage,
): Promise<string> {
  let sawFirstDelta = false;
  const { request: activeRequest, done } = transport.stream(request, {
    onModel: (model) => postMessage(buildStreamModelMessage(chatId, model)),
    onDelta: (text) => {
      if (!sawFirstDelta) {
        sawFirstDelta = true;
        logger.info(`[chat:${chatId}] first delta chars=${text.length}`);
      }
      const deltaEvent: AnswerDeltaEvent = {
        kind: 'answer_delta',
        chatId,
        text,
      };
      postMessage(toExtensionMessage(deltaEvent));
    },
    onAgentEvent: (event) => {
      if (event.stream === 'tool' && event.kind) {
        postMessage(toExtensionMessage(event as ToolEvent));
        logger.info(
          `[chat:${chatId}] agentEvent forwarded stream=tool tool=${event.toolName || '-'} toolId=${event.toolId || '-'} kind=${event.kind}`,
        );
        return;
      }
      logger.info(
        `[chat:${chatId}] agentEvent ignoredForUi stream=${event.stream || 'unknown'} tool=${event.toolName || '-'} toolId=${event.toolId || '-'} status=${event.status || '-'} textChars=${event.text?.length || 0}`,
      );
    },
  });

  session.setActiveRequest(activeRequest as http.ClientRequest);

  return done.then((result) => {
    logger.info(`[chat:${chatId}] stream promise resolved chars=${result.length}`);
    return result;
  }).catch((error) => {
    logger.error(`[chat:${chatId}] stream promise rejected`, error);
    throw error;
  });
}
