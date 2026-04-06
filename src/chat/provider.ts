import * as path from 'path';
import * as vscode from 'vscode';
import type { WebviewToExtensionMessage } from '../dto/webview/incoming';
import type { ExtensionToWebviewMessage } from '../dto/webview/outgoing';
import type { CodeReference } from '../shared/types';
import { logger } from '../shared/logger';
import { loadChatState, saveChatState } from './chatStateStorage';
import { takeWorkspaceSnapshot } from './changeTracking';
import {
  attachFileFromDialog,
  checkPasteAgainstVisibleSelections,
  cleanupAttachedImages,
  insertActiveEditorContext,
  openResponseInEditor,
} from './editorBridge';
import { ChatSession } from './chatSession';
import type { ChatTransport } from './transport';
import { ChatTransportManager } from './transportManager';
import { handleWebviewMessage } from './webviewBridge';
import { startOpenClawConfigWatcher } from './provider/configWatcher';
import {
  rehydrateLatestSessionChangeSets,
  revertLatestSessionChange,
} from './provider/changeSetCoordinator';
import { createWebviewMessageHandlers } from './provider/messageHandlers';
import { executeProviderSendFlow } from './provider/sendFlow';
import {
  buildChatWebviewHtml,
  configureChatWebview,
  postToChatWebview,
} from './provider/webviewHost';
import { buildWebviewBootstrapErrorHtml } from './provider/webviewHtml';
import { loadAgentIds, loadModelsForAgent } from './agentCatalog';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'openclawChat';

  private _view?: vscode.WebviewView;
  private _sessions = new Map<string, ChatSession>();
  private _codeRefs = new Map<string, CodeReference>();
  private _refCounter = 0;
  private _activeAgentId = vscode.workspace.getConfiguration('openclaw-vscode').get<string>('chat.agentId', 'main');
  private readonly _configWatcher;
  private readonly _transportManager = new ChatTransportManager();

  constructor(private readonly _extensionUri: vscode.Uri) {
    this._configWatcher = startOpenClawConfigWatcher({
      onConfigChange: () => {
        this._fetchAndSendModels();
        this._fetchAndSendAgents();
      },
    });
  }

  dispose(): void {
    this._configWatcher.dispose();
    this._transportManager.dispose();
  }

  private _session(chatId: string): ChatSession {
    let session = this._sessions.get(chatId);
    if (!session) {
      session = new ChatSession(chatId);
      this._sessions.set(chatId, session);
    }
    return session;
  }

  private _workspaceRoot(): string | null {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || null;
  }

  private _registerCodeReference(ref: CodeReference) {
    const refId = `ref_${++this._refCounter}`;
    this._codeRefs.set(refId, ref);
    return {
      refId,
      label: `${path.basename(ref.file)} (${ref.startLine}-${ref.endLine})`,
      file: ref.file,
      startLine: ref.startLine,
      endLine: ref.endLine,
    };
  }

  private _postMessage(message: ExtensionToWebviewMessage): void {
    postToChatWebview(this._view, message);
  }

  private _getTransport(
    kind: 'http' | 'ws',
    host: string,
    port: number,
    token: string,
    timeoutMs?: number,
  ): ChatTransport {
    return this._transportManager.getTransport(kind, host, port, token, timeoutMs);
  }

  checkPaste(text: string): void {
    checkPasteAgainstVisibleSelections(
      text,
      (ref) => this._registerCodeReference(ref),
      (message) => this._postMessage(message),
    );
  }

  private _saveChatState(messages: unknown): void {
    try {
      saveChatState(this._workspaceRoot(), messages);
    } catch (error) {
      logger.error('Failed to save chat state', error);
    }
  }

  private _loadChatState(): unknown {
    try {
      return loadChatState(this._workspaceRoot());
    } catch (error) {
      logger.warn('Failed to load chat-state.json, using empty history');
      logger.error('Load chat state error', error);
      return [];
    }
  }

  private _rehydrateChangeTracking(state: unknown): void {
    rehydrateLatestSessionChangeSets(state, (chatId) => this._session(chatId));
  }

  private _cleanupImages(messageContent: string): void {
    cleanupAttachedImages(this._workspaceRoot(), messageContent);
  }

  private async _openResponseInEditor(text: string, msgIndex: number): Promise<void> {
    await openResponseInEditor(this._workspaceRoot(), text, msgIndex);
  }

  private _cancelRequest(chatId: string): void {
    const session = this._session(chatId);
    const req = session.activeRequest;
    if (!req) {
      logger.warn(`[chat:${chatId}] cancel requested but no active request found`);
      return;
    }

    logger.info(`[chat:${chatId}] cancel requested`);
    req.destroy();
    session.clearActiveRequest();
    this._postMessage({ type: 'streamEnd', chatId });
  }

  private _setActiveAgent(agentIdRaw: string, chatIdRaw?: string): void {
    const next = (agentIdRaw || '').trim().toLowerCase() || 'main';
    const chatId = (chatIdRaw || 'chat-1').trim();
    this._activeAgentId = next;
    this._postMessage({ type: 'agentChanged', agentId: next, chatId });
  }

  private async _fetchAndSendAgents(): Promise<void> {
    const filtered = loadAgentIds(this._workspaceRoot(), this._activeAgentId);
    this._postMessage({ type: 'agentsLoaded', agents: filtered, activeAgent: this._activeAgentId });
  }

  private async _fetchAndSendModels(): Promise<void> {
    const config = vscode.workspace.getConfiguration('openclaw-vscode');
    const agentId = this._activeAgentId || config.get<string>('chat.agentId', 'main');
    try {
      const models = loadModelsForAgent(this._workspaceRoot(), agentId);
      if (models.length > 0) {
        this._postMessage({ type: 'modelsLoaded', models });
      }
    } catch {
      // Keep fallback behavior silent, as before.
    }
  }

  private _insertEditorContext(): void {
    insertActiveEditorContext(
      (ref) => this._registerCodeReference(ref),
      (message) => this._postMessage(message),
    );
  }

  private async _attachFile(): Promise<void> {
    await attachFileFromDialog(
      (ref) => this._registerCodeReference(ref),
      (message) => this._postMessage(message),
    );
  }

  private _buildWebviewHtml(fileState?: any[]): string {
    return buildChatWebviewHtml(this._view, this._extensionUri, fileState, this._activeAgentId);
  }

  private async _handleSend(
    text: string,
    refIds: string[],
    model?: string,
    images?: string[],
    chatIdRaw?: string,
    silentUser?: boolean,
    agentIdOverride?: string,
    thinkingLevelRaw?: string | null,
  ): Promise<void> {
    await executeProviderSendFlow({
      text,
      refIds,
      model,
      images,
      chatIdRaw,
      silentUser,
      agentIdOverride,
      thinkingLevelRaw,
    }, {
      activeAgentId: this._activeAgentId,
      codeRefs: this._codeRefs,
      workspaceRoot: this._workspaceRoot(),
      getSession: (chatId) => this._session(chatId),
      getTransport: (kind, host, port, token, timeoutMs) => this._getTransport(kind, host, port, token, timeoutMs),
      takeWorkspaceSnapshot: () => takeWorkspaceSnapshot(this._workspaceRoot()),
      cleanupImages: (messageContent) => this._cleanupImages(messageContent),
      postMessage: (message) => this._postMessage(message),
    });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;
    configureChatWebview(webviewView, this._extensionUri);

    try {
      const savedFromFile = this._loadChatState();
      this._rehydrateChangeTracking(savedFromFile);
      webviewView.webview.html = this._buildWebviewHtml(savedFromFile as any[]);
    } catch (error) {
      const detail = error instanceof Error ? (error.stack || error.message) : String(error);
      logger.error('[resolveWebviewView] failed', error);
      webviewView.webview.html = buildWebviewBootstrapErrorHtml(detail);
    }

    vscode.commands.executeCommand('setContext', 'openclaw-vscode.chatVisible', true);
    webviewView.onDidChangeVisibility(() => {
      vscode.commands.executeCommand('setContext', 'openclaw-vscode.chatVisible', webviewView.visible);
    });

    webviewView.webview.onDidReceiveMessage(async (msg: WebviewToExtensionMessage) => {
      await handleWebviewMessage(msg, createWebviewMessageHandlers({
        onSend: (message) => this._handleSend(
          message.text,
          message.refs || [],
          message.model,
          message.images,
          message.chatId,
          false,
          message.agentId,
          message.thinkingLevel,
        ),
        onClear: (message) => {
          const chatId = String(message.chatId || 'chat-1');
          this._session(chatId).clearHistory();
          this._codeRefs.clear();
          this._refCounter = 0;
          this._postMessage({ type: 'cleared', chatId });
        },
        onDeleteChat: (message) => {
          const chatId = String(message.chatId || '');
          if (chatId) this._sessions.delete(chatId);
        },
        onInsertCode: () => this._insertEditorContext(),
        onAttachFile: () => this._attachFile(),
        onPasteCheck: (message) => this.checkPaste(message.text),
        onOpenResponseInEditor: (message) => this._openResponseInEditor(message.text, message.msgIndex),
        onSaveChatState: (message) => this._saveChatState(message.messages),
        onFetchModels: () => this._fetchAndSendModels(),
        onFetchAgents: () => this._fetchAndSendAgents(),
        onSetAgent: (message) => this._setActiveAgent(String(message.agentId || 'main'), String(message.chatId || 'chat-1')),
        onCancel: (message) => this._cancelRequest(String(message.chatId || 'chat-1')),
        onRevertLatestChange: (message) => {
          revertLatestSessionChange({
            chatId: String(message.chatId || 'chat-1'),
            changeId: String(message.changeId || ''),
            workspaceRoot: this._workspaceRoot(),
            getSession: (chatId) => this._session(chatId),
            postMessage: (response) => this._postMessage(response),
          });
        },
        onDebug: (message) => {
          const event = String(message.event || 'unknown');
          const payload = message.payload && typeof message.payload === 'object' ? message.payload : {};
          const activeChatId = String(message.activeChatId || '');
          logger.info(`[webview] ${event} activeChatId=${activeChatId} payload=${JSON.stringify(payload)}`);
        },
      }));
    });
  }
}
