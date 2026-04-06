import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage } from '../../dto/webview/outgoing';
import type { ChatMessage, CodeReference } from '../../shared/types';
import { detectWorkspaceContext } from '../workspaceContext';
import type { WorkspaceSnapshot } from '../changeTracking';
import { executeChatRun } from '../chatRunLifecycle';
import type { ChatSession } from '../chatSession';
import type { ChatTransport } from '../transport';
import { buildSessionKey, formatTransportError } from '../transportManager';
import { buildMessageContent, normalizeThinkingLevel } from './sendFlowHelpers';

export type SendFlowInput = {
  text: string;
  refIds: string[];
  model?: string;
  images?: string[];
  chatIdRaw?: string;
  silentUser?: boolean;
  agentIdOverride?: string;
  thinkingLevelRaw?: string | null;
};

type SendFlowDeps = {
  activeAgentId: string;
  codeRefs: Map<string, CodeReference>;
  workspaceRoot: string | null;
  getSession: (chatId: string) => ChatSession;
  getTransport: (
    kind: 'http' | 'ws',
    host: string,
    port: number,
    token: string,
    timeoutMs?: number,
  ) => ChatTransport;
  takeWorkspaceSnapshot: () => WorkspaceSnapshot;
  cleanupImages: (messageContent: string) => void;
  postMessage: (message: ExtensionToWebviewMessage) => void;
};

function detectStartupContext(
  workspaceRoot: string | null,
  agentId: string,
  chatId: string,
): string {
  if (!workspaceRoot) return '';
  const activeDocPath = vscode.window.activeTextEditor?.document?.uri?.fsPath;
  const openedProjectPath = activeDocPath || workspaceRoot;
  return detectWorkspaceContext(workspaceRoot, openedProjectPath, agentId, chatId);
}

export async function executeProviderSendFlow(
  input: SendFlowInput,
  deps: SendFlowDeps,
): Promise<void> {
  const config = vscode.workspace.getConfiguration('openclaw-vscode');
  const host = config.get<string>('chat.host', '127.0.0.1');
  const port = config.get<number>('chat.port', 18789);
  const token = config.get<string>('chat.token', '');
  const requestTimeoutMs = config.get<number>('chat.requestTimeoutMs', 600000);
  const transportKind = config.get<'http' | 'ws'>('chat.transport', 'http');
  const agentId = (input.agentIdOverride || deps.activeAgentId || config.get<string>('chat.agentId', 'main')).trim();
  const sessionUser = config.get<string>('chat.sessionUser', 'vscode-chat');
  const transport = deps.getTransport(transportKind, host, port, token, requestTimeoutMs);

  if (!token) {
    deps.postMessage({ type: 'error', text: 'Set openclaw-vscode.chat.token in settings (Gateway auth token)' });
    return;
  }

  const messageContent = buildMessageContent(
    input.text,
    input.refIds,
    input.images,
    deps.codeRefs,
    deps.workspaceRoot,
  );

  const chatId = (input.chatIdRaw || 'chat-1').trim();
  const session = deps.getSession(chatId);
  session.snapshotBeforeRun = deps.takeWorkspaceSnapshot();
  const history = session.history;

  const injectContext = config.get<boolean>('chat.injectStartupContext', true);
  const hasStartupContext = history.some(
    (m) => m.role === 'system' && typeof m.content === 'string' && m.content.includes('OpenClaw VS Code startup context (auto-injected):'),
  );
  const hasConversationTurns = history.some((m) => m.role === 'user' || m.role === 'assistant');

  if (injectContext && !hasStartupContext && !hasConversationTurns) {
    const startupContext = detectStartupContext(deps.workspaceRoot, agentId, chatId);
    if (startupContext) {
      history.push({ role: 'system', content: startupContext });
    }
  }

  session.append({ role: 'user', content: messageContent });
  if (!input.silentUser) deps.postMessage({ type: 'userMessage', text: input.text, chatId });
  const apiMessages: ChatMessage[] = [...history];

  const modelField = (input.model || '').trim();
  const effectiveModel = modelField || 'opus';
  const effectiveThinkingLevel = normalizeThinkingLevel(input.thinkingLevelRaw);
  const sessionKey = buildSessionKey(agentId, sessionUser, chatId);
  const priorTurnsCount = history.filter((m) => m.role === 'user' || m.role === 'assistant').length - 1;

  await executeChatRun({
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
    workspaceRoot: deps.workspaceRoot,
    takeWorkspaceSnapshot: deps.takeWorkspaceSnapshot,
    cleanupImages: deps.cleanupImages,
    postMessage: (message) => deps.postMessage(message as ExtensionToWebviewMessage),
    formatTransportError,
  });
}
