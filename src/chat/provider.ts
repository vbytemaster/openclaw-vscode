import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { execSync } from 'child_process';
import { ChatMessage, CodeReference } from '../shared/types';
import { logger } from '../shared/logger';
import { setSessionModelOverride, streamChatCompletion } from './api';
import { getChatHtml } from './html';

// ═══════════════════════════════════════════════════════════════════
// Chat: WebView Provider
// ═══════════════════════════════════════════════════════════════════

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'openclawChat';
  private _view?: vscode.WebviewView;
  private _history: ChatMessage[] = [];
  private _chatHistories: Map<string, ChatMessage[]> = new Map();
  private _codeRefs: Map<string, CodeReference> = new Map();
  private _refCounter = 0;
  private _activeRequests: Map<string, http.ClientRequest> = new Map();
  private _activeAgentId = vscode.workspace.getConfiguration('openclaw-vscode').get<string>('chat.agentId', 'main');

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /** Check if pasted text matches an editor selection → return code ref */
  checkPaste(text: string) {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.selection.isEmpty) continue;
      const selected = editor.document.getText(editor.selection);
      if (selected === text) {
        const fileName = vscode.workspace.asRelativePath(editor.document.uri);
        const startLine = editor.selection.start.line + 1;
        const endLine = editor.selection.end.line + 1;
        const refId = `ref_${++this._refCounter}`;
        this._codeRefs.set(refId, { file: fileName, startLine, endLine, content: text });
        this._postMessage({
          type: 'pasteResult', isCode: true, refId,
          label: `${path.basename(fileName)} (${startLine}-${endLine})`
        });
        return;
      }
    }
    this._postMessage({ type: 'pasteResult', isCode: false, text });
  }

  /** Get chat state file path */
  private _chatStatePath(): string | null {
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!wsFolder) return null;
    return path.join(wsFolder, '.openclaw', 'chat-state.json');
  }

  /** Save chat state to file (called from webview via postMessage) */
  private _saveChatState(messages: any) {
    const filePath = this._chatStatePath();
    if (!filePath) return;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try { fs.writeFileSync(filePath, JSON.stringify(messages), 'utf8'); } catch (e) { logger.error('Failed to save chat state', e); }
  }

  /** Load chat state from file */
  private _loadChatState(): any {
    const filePath = this._chatStatePath();
    if (!filePath || !fs.existsSync(filePath)) return [];
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { logger.warn('Failed to load chat-state.json, using empty history'); logger.error('Load chat state error', e); return []; }
  }

  /** Delete image files after agent has processed them */
  private _cleanupImages(messageContent: string) {
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!wsFolder) return;
    const regex = /\[Attached image: ([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(messageContent)) !== null) {
      const relPath = match[1];
      const absPath = path.join(wsFolder, relPath);
      try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (e) { logger.warn(`Failed to cleanup attached image: ${absPath}`); logger.error('Image cleanup error', e); }
    }
  }

  /** Save assistant response to a file and open in editor with text selected */
  async _openResponseInEditor(text: string, msgIndex: number) {
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!wsFolder) return;

    const responsesDir = path.join(wsFolder, '.openclaw', 'responses');
    if (!fs.existsSync(responsesDir)) fs.mkdirSync(responsesDir, { recursive: true });

    const fileName = `response-${msgIndex}.md`;
    const filePath = path.join(responsesDir, fileName);
    fs.writeFileSync(filePath, text, 'utf8');

    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.One,
      preview: true
    });

    // Select all text so user can immediately Cmd+C → paste as chip
    const lastLine = doc.lineCount - 1;
    const lastChar = doc.lineAt(lastLine).text.length;
    editor.selection = new vscode.Selection(0, 0, lastLine, lastChar);
    editor.revealRange(editor.selection);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
    const savedFromFile = this._loadChatState();
    webviewView.webview.html = this._getHtml(savedFromFile);

    // Track visibility for Cmd+C keybinding
    vscode.commands.executeCommand('setContext', 'openclaw-vscode.chatVisible', true);
    webviewView.onDidChangeVisibility(() => {
      vscode.commands.executeCommand('setContext', 'openclaw-vscode.chatVisible', webviewView.visible);
    });

    webviewView.webview.onDidReceiveMessage(async (msg: any) => {
      switch (msg.type) {
        case 'send': this._handleSend(msg.text, msg.refs || [], msg.model, msg.images, msg.chatId, false, msg.agentId); break;
        case 'clear': {
          const chatId = String(msg.chatId || 'chat-1');
          this._chatHistories.set(chatId, []);
          this._codeRefs.clear(); this._refCounter = 0; this._postMessage({ type: 'cleared', chatId });
          break;
        }
        case 'deleteChat': {
          const chatId = String(msg.chatId || '');
          if (chatId) this._chatHistories.delete(chatId);
          break;
        }
        case 'insertCode': this._insertEditorContext(); break;
        case 'attachFile': await this._attachFile(); break;
        case 'pasteCheck': this.checkPaste(msg.text); break;
        case 'openResponseInEditor': await this._openResponseInEditor(msg.text, msg.msgIndex); break;
        case 'saveChatState': this._saveChatState(msg.messages); break;
        case 'fetchModels': await this._fetchAndSendModels(); break;
        case 'fetchAgents': await this._fetchAndSendAgents(); break;
        case 'setAgent': this._setActiveAgent(String(msg.agentId || 'main'), String(msg.chatId || 'chat-1')); break;
        case 'cancel': this._cancelRequest(String(msg.chatId || 'chat-1')); break;
      }
    });
  }

  private _buildSessionKey(agentId: string, sessionUser: string, chatId: string): string {
    const chat = (chatId || 'chat-1').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const agent = (agentId || 'main').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const user = (sessionUser || 'vscode-chat').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    // IMPORTANT: Gateway resolves active agent from sessionKey prefix `agent:<id>:...`.
    // Keep one stable session per (chat, agent).
    return `agent:${agent}:openai-user:${user}:chat:${chat}`;
  }

  private _setSessionModelOverride(host: string, port: number, token: string, sessionKey: string, model: string): Promise<void> {
    return setSessionModelOverride(host, port, token, sessionKey, model);
  }

  private _buildAgentPersonaPrompt(agentId: string): string {
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!wsFolder) return '';
    if (!agentId || agentId === 'main') return '';

    const soulPath = path.join(wsFolder, 'agents', agentId, 'SOUL.md');
    const agentsPath = path.join(wsFolder, 'agents', agentId, 'AGENTS.md');
    const parts: string[] = [];

    try {
      if (fs.existsSync(soulPath)) {
        const soul = fs.readFileSync(soulPath, 'utf8').slice(0, 3500);
        parts.push(`SOUL profile for '${agentId}':\n${soul}`);
      }
    } catch {}

    try {
      if (fs.existsSync(agentsPath)) {
        const ag = fs.readFileSync(agentsPath, 'utf8').slice(0, 2500);
        parts.push(`AGENTS profile for '${agentId}':\n${ag}`);
      }
    } catch {}

    if (!parts.length) return '';

    return [
      `Act strictly as agent '${agentId}' (not as main).`,
      'Use the following local profile as authority for voice/role/rules:',
      ...parts,
    ].join('\n\n');
  }

  private _runGit(cwd: string, command: string): string {
    try {
      return execSync(command, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
    } catch {
      return '';
    }
  }

  private _detectWorkspaceContext(agentId: string, chatId: string): string {
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!wsFolder) return '';

    const gitRoot = this._runGit(wsFolder, 'git rev-parse --show-toplevel') || wsFolder;
    const repoName = path.basename(gitRoot);
    const branch = this._runGit(gitRoot, 'git branch --show-current');
    const origin = this._runGit(gitRoot, 'git remote get-url origin');

    const reviewPolicyPath = path.join(wsFolder, 'review-policy.json');
    let reviewMode = 'unknown';
    if (fs.existsSync(reviewPolicyPath)) {
      try {
        const policy = JSON.parse(fs.readFileSync(reviewPolicyPath, 'utf8'));
        const rel = path.relative(wsFolder, gitRoot).replace(/\\/g, '/');
        const normRel = rel === '' ? '.' : rel;
        const req = Array.isArray(policy?.reviewRequired) ? policy.reviewRequired : [];
        const direct = Array.isArray(policy?.directEditAllowed) ? policy.directEditAllowed : [];
        const inRequired = req.some((x: any) => String(x?.path || '').replace(/\\/g, '/') === normRel || String(x?.path || '').replace(/\\/g, '/') === repoName);
        const inDirect = direct.some((x: any) => String(x?.path || '').replace(/\\/g, '/') === normRel || String(x?.path || '').replace(/\\/g, '/') === repoName);
        if (inRequired) reviewMode = 'review-required';
        else if (inDirect) reviewMode = 'direct-edit-allowed';
        else reviewMode = 'not-listed';
      } catch {
        reviewMode = 'invalid-policy';
      }
    }

    const skillHints: string[] = [];
    const skillLocal = path.join(gitRoot, 'SKILL.md');
    if (fs.existsSync(skillLocal)) skillHints.push(`local:${path.relative(wsFolder, skillLocal).replace(/\\/g, '/') || 'SKILL.md'}`);
    const extensionSkill = path.join(wsFolder, 'SKILL.md');
    if (fs.existsSync(extensionSkill) && extensionSkill !== skillLocal) {
      skillHints.push(`workspace:${path.relative(wsFolder, extensionSkill).replace(/\\/g, '/')}`);
    }

    const lines = [
      'OpenClaw VS Code startup context (auto-injected):',
      `- agentId: ${agentId}`,
      `- chatId: ${chatId}`,
      `- workspaceRoot: ${wsFolder}`,
      `- repoRoot: ${gitRoot}`,
      `- repoName: ${repoName}`,
      `- gitBranch: ${branch || 'unknown'}`,
      `- gitOrigin: ${origin || 'unknown'}`,
      `- reviewPolicyMode: ${reviewMode}`,
      `- openclawSkill: ${skillHints.length ? skillHints.join(', ') : 'not-detected'}`,
      '',
      'Instruction: Use this repository/skill context as ground truth for this chat session.'
    ];

    return lines.join('\n');
  }

  private async _handleSend(text: string, refIds: string[], model?: string, images?: string[], chatIdRaw?: string, silentUser?: boolean, agentIdOverride?: string) {
    const config = vscode.workspace.getConfiguration('openclaw-vscode');
    const host = config.get<string>('chat.host', '127.0.0.1');
    const port = config.get<number>('chat.port', 18789);
    const token = config.get<string>('chat.token', '');
    const agentId = (agentIdOverride || this._activeAgentId || config.get<string>('chat.agentId', 'main')).trim();
    const sessionUser = config.get<string>('chat.sessionUser', 'vscode-chat');

    if (!token) {
      this._postMessage({ type: 'error', text: 'Set openclaw-vscode.chat.token in settings (Gateway auth token)' });
      return;
    }

    // Expand code references into the actual message sent to API
    // Strip inline chip placeholders (⌘ref:N⌘) from text
    let expandedText = text.replace(/\u2318ref:\d+\u2318/g, '');
    if (refIds.length > 0) {
      let refBlock = '';
      for (const rid of refIds) {
        const ref = this._codeRefs.get(rid);
        if (ref) {
          refBlock += `\n\n[${ref.file}:${ref.startLine}-${ref.endLine}]\n\`\`\`\n${ref.content}\n\`\`\``;
        }
      }
      expandedText = text + refBlock;
    }

    // Save images to workspace and reference by path (OpenClaw Chat Completions doesn't support multimodal)
    let messageContent: string;
    if (images && images.length > 0) {
      const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (wsFolder) {
        const imagesDir = path.join(wsFolder, '.openclaw', 'images');
        if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
        for (const img of images) {
          const match = img.match(/^data:image\/(\w+);base64,(.+)$/);
          if (match) {
            const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
            const filePath = path.join(imagesDir, fileName);
            fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
            const relPath = `.openclaw/images/${fileName}`;
            expandedText += `\n\n[Attached image: ${relPath}]`;
          }
        }
      }
      messageContent = expandedText;
    } else {
      messageContent = expandedText;
    }


    const chatId = (chatIdRaw || 'chat-1').trim();
    const history = this._chatHistories.get(chatId) ?? [];

    const injectContext = vscode.workspace.getConfiguration('openclaw-vscode').get<boolean>('chat.injectStartupContext', true);
    if (history.length === 0 && injectContext) {
      const startupContext = this._detectWorkspaceContext(agentId, chatId);
      if (startupContext) {
        history.push({ role: 'system', content: startupContext });
      }
    }

    history.push({ role: 'user', content: messageContent });
    this._chatHistories.set(chatId, history);
    if (!silentUser) this._postMessage({ type: 'userMessage', text, chatId });

    const modelField = (model || '').trim();
    const effectiveModel = modelField || 'opus';
    const sessionKey = this._buildSessionKey(agentId, sessionUser, chatId);

    // Deterministic model switch (same mechanism as /model): set session override first.
    try {
      await this._setSessionModelOverride(host, port, token, sessionKey, effectiveModel);
    } catch (err: any) {
      const msg = String(err?.message || '');
      // Fresh chat/session may not exist yet for session_status override; continue anyway.
      if (!msg.includes('Unknown sessionKey') && !msg.includes('Unknown sessionId')) {
        this._postMessage({ type: 'error', text: err.message || 'Failed to switch model', chatId });
      }
    }

    const turnMessages = [...history];
    // Enforce selected agent persona for this turn even when chat history is shared.
    turnMessages.splice(Math.max(0, turnMessages.length - 1), 0, {
      role: 'system',
      content: `For this reply, act strictly as agent '${agentId}'. Do not answer as 'main' unless agentId is 'main'.`
    });

    const personaPrompt = this._buildAgentPersonaPrompt(agentId);
    if (personaPrompt) {
      turnMessages.splice(Math.max(0, turnMessages.length - 1), 0, {
        role: 'system',
        content: personaPrompt,
      });
    }

    const body = JSON.stringify({
      model: effectiveModel,
      stream: true,
      user: sessionUser,
      messages: turnMessages
    });

    this._postMessage({ type: 'streamStart', chatId, agentId });
    logger.info(`[chat:${chatId}] streamStart sent agent=${agentId}`);

    try {
      let fullResponse = await this._streamRequest(host, port, token, body, chatId, agentId, sessionKey);
      this._activeRequests.delete(chatId);
      logger.info(`[chat:${chatId}] stream completed, chars=${fullResponse.length}`);

      // Empty-response stabilization: up to 2 retries with short backoff.
      for (let attempt = 1; attempt <= 2 && (!fullResponse || fullResponse.trim().length === 0); attempt++) {
        logger.warn(`[chat:${chatId}] empty assistant response from agent=${agentId}, retry attempt=${attempt}`);
        await new Promise((r) => setTimeout(r, 350 * attempt));

        const retryMessages = [...history];
        retryMessages.splice(Math.max(0, retryMessages.length - 1), 0,
          { role: 'system', content: `For this reply, act strictly as agent '${agentId}'. Do not answer as 'main' unless agentId is 'main'.` },
          { role: 'system', content: 'Return a concise non-empty plain-text answer.' }
        );

        const retryPersonaPrompt = this._buildAgentPersonaPrompt(agentId);
        if (retryPersonaPrompt) {
          retryMessages.splice(Math.max(0, retryMessages.length - 1), 0, { role: 'system', content: retryPersonaPrompt });
        }

        const retryBody = JSON.stringify({
          model: effectiveModel,
          stream: true,
          user: sessionUser,
          messages: retryMessages
        });
        fullResponse = await this._streamRequest(host, port, token, retryBody, chatId, agentId, sessionKey);
        this._activeRequests.delete(chatId);
        logger.info(`[chat:${chatId}] retry stream completed, attempt=${attempt}, chars=${fullResponse.length}`);
      }

      if (!fullResponse || fullResponse.trim().length === 0) {
        logger.warn(`[chat:${chatId}] empty assistant response from agent=${agentId}`);
        this._postMessage({ type: 'error', text: `Agent '${agentId}' returned an empty response. Try 'main' or 'backend-dev'.`, chatId });
        this._postMessage({ type: 'streamEnd', chatId });
        this._cleanupImages(messageContent);
        return;
      }

      history.push({ role: 'assistant', content: fullResponse });
      this._chatHistories.set(chatId, history);
      this._postMessage({ type: 'streamEnd', chatId });
      this._cleanupImages(messageContent);
    } catch (err: any) {
      this._activeRequests.delete(chatId);
      logger.error(`[chat:${chatId}] stream failed`, err);
      this._postMessage({ type: 'error', text: err.message || 'Connection failed', chatId });
      this._postMessage({ type: 'streamEnd', chatId });
      this._cleanupImages(messageContent);
    }
  }

  private _cancelRequest(chatId: string) {
    const req = this._activeRequests.get(chatId);
    if (req) {
      req.destroy();
      this._activeRequests.delete(chatId);
      this._postMessage({ type: 'streamEnd', chatId });
    }
  }

  private _setActiveAgent(agentIdRaw: string, chatIdRaw?: string) {
    const next = (agentIdRaw || '').trim().toLowerCase() || 'main';
    const chatId = (chatIdRaw || 'chat-1').trim();
    this._activeAgentId = next;

    // Keep chat history, but add a routing/persona pivot marker so next turns follow selected agent.
    const history = this._chatHistories.get(chatId) ?? [];
    history.push({ role: 'system', content: `Agent switch: continue this chat as '${next}'.` });
    this._chatHistories.set(chatId, history);

    this._postMessage({ type: 'agentChanged', agentId: next, chatId });
  }

  private async _fetchAndSendAgents() {
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const homedir = process.env.HOME || process.env.USERPROFILE || '';

    // Primary source (portable for all users): ~/.openclaw/openclaw.json -> agents.list
    const configCandidates = [
      path.join(homedir, '.openclaw', 'openclaw.json'),
      ...(wsFolder ? [path.join(wsFolder, '.openclaw', 'openclaw.json')] : []),
    ];

    const ordered: string[] = [];
    const pushUnique = (idRaw: unknown) => {
      const id = String(idRaw || '').trim();
      if (!id) return;
      if (!ordered.includes(id)) ordered.push(id);
    };

    for (const p of configCandidates) {
      try {
        if (!fs.existsSync(p)) continue;
        const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
        const agents = cfg?.agents?.list;
        if (Array.isArray(agents)) {
          for (const a of agents) pushUnique((a as any)?.id);
        }
        if (ordered.length > 0) break;
      } catch { /* ignore */ }
    }

    // Optional override/append source in workspace (skill-level customization)
    const listCandidates = wsFolder
      ? [
          path.join(wsFolder, 'agents-list.json'),
          path.join(wsFolder, 'openclaw-vscode', 'agents-list.json'),
        ]
      : [];

    for (const p of listCandidates) {
      try {
        if (!fs.existsSync(p)) continue;
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
        const agents = Array.isArray(parsed) ? parsed : parsed?.agents;
        if (Array.isArray(agents)) {
          for (const a of agents) pushUnique(a);
        }
      } catch { /* ignore */ }
    }

    // Hide service/sandbox agents from VS Code picker
    const filtered = ordered.filter((id) => id !== 'workroom');

    if (!filtered.length) filtered.push(this._activeAgentId || 'main');
    this._postMessage({ type: 'agentsLoaded', agents: filtered, activeAgent: this._activeAgentId });
  }

  private async _fetchAndSendModels() {
    const config = vscode.workspace.getConfiguration('openclaw-vscode');
    const agentId = this._activeAgentId || config.get<string>('chat.agentId', 'main');

    try {
      const models = this._extractModelsFromConfig(agentId);
      if (models.length > 0) {
        this._postMessage({ type: 'modelsLoaded', models });
      }
    } catch { /* silently fail — keep fallback */ }
  }

  private _extractModelsFromConfig(agentId: string): Array<{value: string; label: string}> {
    // Try to find openclaw.json: ~/.openclaw/openclaw.json or workspace/.openclaw/openclaw.json
    const homedir = process.env.HOME || process.env.USERPROFILE || '';
    const candidates = [
      path.join(homedir, '.openclaw', 'openclaw.json'),
    ];
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (wsFolder) {
      candidates.unshift(path.join(wsFolder, '.openclaw', 'openclaw.json'));
    }

    let cfg: any = null;
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) { cfg = JSON.parse(fs.readFileSync(p, 'utf8')); break; }
      } catch { continue; }
    }
    if (!cfg) return [];

    const models: Array<{value: string; label: string}> = [];
    const pretty = (raw: string, alias?: string): string => {
      const r = (raw || '').trim();
      if (!r) return raw;
      if (r === 'anthropic/claude-opus-4-6') return 'Claude Opus 4.6';
      if (r === 'anthropic/claude-sonnet-4-5') return 'Claude Sonnet 4.5';
      if (r === 'openai/gpt-5.3-codex') return 'GPT-5.3 Codex';
      if (r === 'openai/gpt-5.2') return 'GPT-5.2';
      if (r === 'openai/gpt-5.1-codex') return 'GPT-5.1 Codex';
      if (r === 'openai/o3-pro') return 'GPT o3-pro';
      if (r === 'google/gemini-2.5-pro') return 'Gemini 2.5 Pro';
      if (alias && alias.trim()) return alias.trim();
      const idx = r.indexOf('/');
      return idx >= 0 ? r.slice(idx + 1) : r;
    };

    // From agents.defaults.models (this aligns with /model allowlist behavior best)
    const agentModels = cfg?.agents?.defaults?.models;
    if (agentModels && typeof agentModels === 'object') {
      for (const [modelId, modelCfg] of Object.entries(agentModels)) {
        const alias = (modelCfg as any)?.alias;
        const friendly = pretty(modelId, alias);
        const label = friendly;
        models.push({ value: modelId, label });
      }
    }

    // From agents.defaults.model.fallbacks (add any not already present)
    const fallbacks = cfg?.agents?.defaults?.model?.fallbacks;
    if (Array.isArray(fallbacks)) {
      for (const fb of fallbacks) {
        if (typeof fb === 'string' && !models.some(m => m.value === fb)) {
          const friendly = pretty(fb);
          models.push({ value: fb, label: friendly });
        }
      }
    }

    return models;
  }

  private _streamRequest(host: string, port: number, token: string, body: string, chatId?: string, agentId?: string, sessionKey?: string): Promise<string> {
    const { request, done } = streamChatCompletion(host, port, token, body, {
      agentId,
      sessionKey,
      onModel: (model) => this._postMessage({ type: 'streamModel', model, chatId }),
      onDelta: (text) => this._postMessage({ type: 'streamDelta', text, chatId })
    });
    if (chatId) this._activeRequests.set(chatId, request);
    return done;
  }

  private _insertEditorContext() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { this._postMessage({ type: 'error', text: 'No active editor' }); return; }

    const selection = editor.selection;
    const fileName = vscode.workspace.asRelativePath(editor.document.uri);
    let startLine: number, endLine: number, content: string;

    if (!selection.isEmpty) {
      startLine = selection.start.line + 1;
      endLine = selection.end.line + 1;
      content = editor.document.getText(selection);
    } else {
      const range = editor.visibleRanges[0];
      startLine = range.start.line + 1;
      endLine = range.end.line + 1;
      content = editor.document.getText(range);
    }

    const refId = `ref_${++this._refCounter}`;
    this._codeRefs.set(refId, { file: fileName, startLine, endLine, content });

    this._postMessage({
      type: 'codeRef',
      refId,
      label: `${path.basename(fileName)} (${startLine}-${endLine})`,
      file: fileName,
      startLine,
      endLine
    });
  }

  private async _attachFile() {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Attach',
      filters: { 'All files': ['*'] }
    });
    if (!uris || uris.length === 0) return;
    const uri = uris[0];
    const fileName = vscode.workspace.asRelativePath(uri);
    const stat = await vscode.workspace.fs.stat(uri);

    // For images, read as base64
    const ext = path.extname(uri.fsPath).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext);

    if (isImage) {
      const data = await vscode.workspace.fs.readFile(uri);
      const b64 = Buffer.from(data).toString('base64');
      const mime = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const refId = `ref_${++this._refCounter}`;
      this._codeRefs.set(refId, { file: fileName, startLine: 0, endLine: 0, content: `[image: ${fileName}]` });
      this._postMessage({ type: 'codeRef', refId, label: fileName, file: fileName, startLine: 0, endLine: 0 });
    } else if (stat.size < 100000) {
      // Text file — read content
      const data = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(data).toString('utf8');
      const lines = content.split('\n').length;
      const refId = `ref_${++this._refCounter}`;
      this._codeRefs.set(refId, { file: fileName, startLine: 1, endLine: lines, content });
      this._postMessage({ type: 'codeRef', refId, label: fileName, file: fileName, startLine: 1, endLine: lines });
    } else {
      this._postMessage({ type: 'error', text: `File too large: ${fileName} (${Math.round(stat.size/1024)}KB)` });
    }
  }

  private _postMessage(msg: any) { this._view?.webview.postMessage(msg); }


  private _getHtml(fileState?: any[]): string {
    const scriptUri = this._view
      ? this._view.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'chat.js')).toString()
      : '';
    return getChatHtml(fileState, this._activeAgentId, scriptUri);
  }

}

