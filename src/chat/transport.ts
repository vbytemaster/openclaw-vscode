import * as http from 'http';
import { setSessionModelOverride, streamChatCompletion } from './api';
import { ChatMessage } from '../shared/types';
import { GatewayWsRuntime } from '../gateway/wsRuntime';
import { logger } from '../shared/logger';
import type { ToolEvent } from './events/types';

export type ChatTransportKind = 'http' | 'ws';

export type ChatTransportConfig = {
  kind?: ChatTransportKind;
  host: string;
  port: number;
  token: string;
  timeoutMs?: number;
};

export type ChatSessionOptions = {
  model: string;
  reasoningLevel?: 'off' | 'on' | 'stream';
  thinkingLevel?: string | null;
};

export type ChatSendRequest = {
  model: string;
  user: string;
  messages: ChatMessage[];
  agentId?: string;
  sessionKey?: string;
};

export type ChatStreamHandlers = {
  onModel?: (model: string) => void;
  onDelta?: (text: string) => void;
  onAgentEvent?: (event: {
    stream?: string;
    text?: string;
  } & Partial<ToolEvent>) => void;
};

export type ChatStreamResult = {
  request: http.ClientRequest;
  done: Promise<string>;
};

export interface ChatTransport {
  stream(request: ChatSendRequest, handlers?: ChatStreamHandlers): ChatStreamResult;
  setSessionOptions(sessionKey: string, options: ChatSessionOptions): Promise<string | undefined>;
  dispose(): void;
}

export class HttpChatTransport implements ChatTransport {
  constructor(private readonly config: ChatTransportConfig) {}

  stream(request: ChatSendRequest, handlers?: ChatStreamHandlers): ChatStreamResult {
    logger.info(
      `[transport:http] stream agent=${request.agentId || '-'} sessionKey=${request.sessionKey || '-'} model=${request.model} messages=${request.messages.length}`,
    );
    const body = JSON.stringify({
      model: request.model,
      stream: true,
      user: request.user,
      messages: request.messages,
    });

    return streamChatCompletion(this.config.host, this.config.port, this.config.token, body, {
      agentId: request.agentId,
      sessionKey: request.sessionKey,
      timeoutMs: this.config.timeoutMs,
      onModel: handlers?.onModel,
      onDelta: handlers?.onDelta,
    });
  }

  setSessionOptions(sessionKey: string, options: ChatSessionOptions): Promise<string | undefined> {
    logger.info(
      `[transport:http] sessions.patch sessionKey=${sessionKey} model=${options.model} reasoningLevel=${options.reasoningLevel || '-'} thinkingLevel=${options.thinkingLevel ?? '-'}`,
    );
    return setSessionModelOverride(this.config.host, this.config.port, this.config.token, sessionKey, options.model).then(() => options.model);
  }

  dispose(): void {
    logger.info('[transport:http] dispose');
  }
}

export class WsChatTransport implements ChatTransport {
  private runtime: GatewayWsRuntime;

  constructor(private readonly config: ChatTransportConfig) {
    const scheme = this.config.port === 443 ? 'wss' : 'ws';
    const url = `${scheme}://${this.config.host}:${this.config.port}`;
    logger.info(`[transport:ws] runtime init url=${url}`);
    this.runtime = new GatewayWsRuntime({
      url,
      token: this.config.token,
      clientId: 'cli',
      clientMode: 'cli',
      clientVersion: '4.0.0-dev',
      role: 'operator',
      scopes: ['operator.read', 'operator.write', 'operator.admin'],
      deviceFamily: 'desktop',
      userAgent: 'openclaw-vscode/4.0.0-dev',
    });
  }

  stream(request: ChatSendRequest, handlers?: ChatStreamHandlers): ChatStreamResult {
    const composedMessage = composeWsMessage(request.messages);
    logger.info(
      `[transport:ws] stream agent=${request.agentId || '-'} sessionKey=${request.sessionKey || '-'} model=${request.model} messages=${request.messages.length} composedChars=${composedMessage.length}`,
    );
    const done = this.runtime.chatSend({
      sessionKey: request.sessionKey || 'main',
      message: composedMessage,
      timeoutMs: this.config.timeoutMs,
      handlers: {
        onModel: handlers?.onModel,
        onDelta: handlers?.onDelta,
        onFinal: () => {},
        onError: (message) => { throw new Error(message); },
        onAgentEvent: handlers?.onAgentEvent,
      },
    });

    return {
      request: { destroy: () => { void this.runtime.chatAbort(); } } as http.ClientRequest,
      done,
    };
  }

  async setSessionOptions(sessionKey: string, options: ChatSessionOptions): Promise<string | undefined> {
    logger.info(
      `[transport:ws] sessions.patch sessionKey=${sessionKey} model=${options.model} reasoningLevel=${options.reasoningLevel || '-'} thinkingLevel=${options.thinkingLevel ?? '-'}`,
    );
    return await this.runtime.setSessionOptions(sessionKey, options);
  }

  dispose(): void {
    logger.info('[transport:ws] dispose');
    this.runtime.disconnect();
  }
}

export function createChatTransport(config: ChatTransportConfig): ChatTransport {
  if (config.kind === 'ws') return new WsChatTransport(config);
  return new HttpChatTransport(config);
}

function composeWsMessage(messages: ChatMessage[]): string {
  if (messages.length <= 1) return String(messages.at(-1)?.content || '');

  const last = messages.at(-1);
  if (!last || last.role !== 'user') return String(last?.content || '');

  const priorTurns = messages.slice(0, -1).filter((message) => message.role === 'user' || message.role === 'assistant');
  if (priorTurns.length > 0) {
    return String(last.content || '');
  }

  const systemPrefix = messages
    .slice(0, -1)
    .filter((message) => message.role === 'system' && typeof message.content === 'string' && message.content.trim())
    .map((message) => String(message.content).trim())
    .join('\n\n');

  if (!systemPrefix) return String(last.content || '');
  return `${systemPrefix}\n\n---\n\n${String(last.content || '')}`;
}
