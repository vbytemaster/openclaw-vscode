import { GatewayWsClient, type GatewayFrame, type GatewayWsConfig } from './ws';
import type { ChatSessionOptions } from '../chat/transport';
import { logger } from '../shared/logger';
import {
  GatewayRawAgentEventDtoSchema,
} from '../dto/gateway/tool';
import {
  GatewayRawChatEventDtoSchema,
} from '../dto/gateway/chat';
import {
  extractContentTypesFromGatewayPayload,
  extractModelFromGatewayPayload,
  extractThinkingTextFromGatewayPayload,
  normalizeGatewayChatEvent,
  normalizeGatewayToolEvent,
} from '../chat/events/normalize';

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type WsChatHandlers = {
  onDelta?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onModel?: (model: string) => void;
  onAgentEvent?: (event: {
    stream?: string;
    text?: string;
    toolId?: string;
    toolName?: string;
    status?: string;
    title?: string;
    detail?: string;
  }) => void;
};

export class GatewayWsRuntime {
  private client: GatewayWsClient;
  private connected = false;
  private activeRunId: string | null = null;
  private activeSessionKey: string | null = null;
  private textBuffer = '';
  private activeModel: string | null = null;
  private lastDeltaLogAt = 0;

  constructor(config: GatewayWsConfig) {
    this.client = new GatewayWsClient(config);
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    logger.info(`[ws-runtime] connect requested`);
    await this.client.connect();
    this.connected = true;
    logger.info(`[ws-runtime] connected`);
  }

  async chatSend(params: {
    sessionKey: string;
    message: string;
    thinking?: string;
    timeoutMs?: number;
    handlers?: WsChatHandlers;
  }): Promise<string> {
    await this.connect();
    this.textBuffer = '';
    this.activeModel = null;
    this.lastDeltaLogAt = 0;
    this.activeRunId = randomId();
    this.activeSessionKey = params.sessionKey;
    const toolCallStateById = new Map<string, ReturnType<typeof mergeToolPayload>>();
    logger.info(
      `[ws-runtime] chat.send start runId=${this.activeRunId} sessionKey=${params.sessionKey} textChars=${params.message.length} timeoutMs=${params.timeoutMs ?? 600000}`,
    );

    const offAgent = this.client.onEvent((frame) => {
      if (frame.type !== 'event') return;
      const payload = frame.payload;
      const eventName = frame.event;
      const sessionKey = typeof payload === 'object' && payload ? (payload as { sessionKey?: string }).sessionKey : undefined;
      const runId = typeof payload === 'object' && payload ? (payload as { runId?: string }).runId : undefined;
      if (sessionKey && sessionKey !== params.sessionKey) return;
      if (runId && this.activeRunId && runId !== this.activeRunId) return;

      if (eventName === 'agent') {
        const parsed = safeParseGatewayRawAgentEventDto(payload);
        if (!parsed) {
          logger.warn('[ws-runtime] invalid agent event payload');
          return;
        }
        const stream = parsed.stream;
        if (stream === 'assistant') {
          const text = parsed.data?.text;
          if (typeof text === 'string' && text.trim()) {
            logger.info(`[ws-runtime] agent assistant event runId=${this.activeRunId} textChars=${text.length}`);
            params.handlers?.onAgentEvent?.({ stream, text });
          }
        } else if (stream === 'tool') {
          const merged = mergeToolPayload(toolCallStateById.get(resolveToolCallId(parsed)), parsed);
          toolCallStateById.set(merged.toolCallId || resolveToolCallId(parsed), merged);
          const toolEvent = normalizeGatewayToolEvent(merged, frame.seq);
          logger.info(`[ws-tool] agent tool=${toolEvent.toolName} status=${toolEvent.status}`);
          params.handlers?.onAgentEvent?.({ stream, ...toolEvent });
        }
        return;
      }

      if (eventName === 'session.tool') {
        const parsed = safeParseGatewayRawAgentEventDto(payload);
        if (!parsed) {
          logger.warn('[ws-runtime] invalid session.tool payload');
          return;
        }
        const merged = mergeToolPayload(toolCallStateById.get(resolveToolCallId(parsed)), parsed);
        toolCallStateById.set(merged.toolCallId || resolveToolCallId(parsed), merged);
        const toolEvent = normalizeGatewayToolEvent(merged, frame.seq);
        logger.info(`[ws-tool] session tool=${toolEvent.toolName} status=${toolEvent.status}`);
        params.handlers?.onAgentEvent?.({ stream: 'tool', ...toolEvent });
      }
    });

    try {
      return await this.client.requestWithEvents<string>({
      method: 'chat.send',
      params: {
        sessionKey: params.sessionKey,
        message: params.message,
        thinking: params.thinking,
        timeoutMs: params.timeoutMs,
        idempotencyKey: this.activeRunId,
      },
      matchEvent: (frame: GatewayFrame) => {
        if (frame.type !== 'event' || frame.event !== 'chat') return false;
        const payload = frame.payload as any;
        return payload?.runId === this.activeRunId && payload?.sessionKey === params.sessionKey;
      },
      onEvent: (frame: GatewayFrame) => {
        const payload = safeParseGatewayRawChatEventDto((frame as { payload?: unknown }).payload);
        if (!payload) {
          logger.warn('[ws-runtime] invalid chat event payload');
          return;
        }
        const state = payload.state;
        const normalizedEvent = normalizeGatewayChatEvent(payload);
        const text =
          normalizedEvent?.kind === 'answer_delta' || normalizedEvent?.kind === 'answer_final'
            ? normalizedEvent.text
            : '';
        const thinkingText = extractThinkingTextFromGatewayPayload(payload);
        const contentTypes = extractContentTypesFromGatewayPayload(payload);
        const actualModel =
          normalizedEvent?.kind === 'answer_delta' || normalizedEvent?.kind === 'answer_final'
            ? normalizedEvent.model
            : extractModelFromGatewayPayload(payload);
        if (actualModel && actualModel !== this.activeModel) {
          this.activeModel = actualModel;
          logger.info(`[ws-runtime] model observed runId=${payload.runId || this.activeRunId || '-'} model=${actualModel}`);
          params.handlers?.onModel?.(actualModel);
        }
        const now = Date.now();
        const shouldLogChatEvent =
          state !== 'delta' ||
          now - this.lastDeltaLogAt >= 1500 ||
          Boolean(thinkingText);
        if (shouldLogChatEvent) {
          logger.info(
            `[ws-runtime] chat event state=${state || 'unknown'} runId=${payload.runId || '-'} sessionKey=${payload.sessionKey || '-'} textChars=${text.length} thinkingChars=${thinkingText?.length || 0} contentTypes=${contentTypes}`,
          );
          if (state === 'delta') this.lastDeltaLogAt = now;
        }
        if (thinkingText) {
          logger.info(
            `[ws-runtime] thinking observed runId=${payload.runId || this.activeRunId || '-'} chars=${thinkingText.length}`,
          );
          params.handlers?.onAgentEvent?.({
            stream: 'thinking',
            title: 'Думаю',
            text: thinkingText,
            detail: thinkingText,
          });
        }
        if (normalizedEvent?.kind === 'answer_delta') {
          this.textBuffer = normalizedEvent.text;
          params.handlers?.onDelta?.(normalizedEvent.text);
        } else if (normalizedEvent?.kind === 'answer_final') {
          const finalText = normalizedEvent.text || this.textBuffer;
          this.textBuffer = finalText;
          params.handlers?.onFinal?.(finalText);
        } else if (normalizedEvent?.kind === 'error') {
          params.handlers?.onError?.(normalizedEvent.message);
        }
      },
      resolveFinal: (frame: GatewayFrame) => {
        const payload = (frame as any).payload as any;
        const parsed = safeParseGatewayRawChatEventDto(payload);
        if (!parsed) return undefined;
        const normalizedEvent = normalizeGatewayChatEvent(parsed);
        if (normalizedEvent?.kind === 'answer_final') {
          logger.info(`[ws-runtime] chat.send final runId=${parsed.runId || this.activeRunId || '-'} chars=${(normalizedEvent.text || this.textBuffer || '').length}`);
          return normalizedEvent.text || this.textBuffer || '';
        }
        if (normalizedEvent?.kind === 'error') {
          logger.warn(`[ws-runtime] chat.send error runId=${parsed.runId || this.activeRunId || '-'} message=${normalizedEvent.message}`);
          throw new Error(normalizedEvent.message);
        }
        return undefined;
      },
      timeoutMs: params.timeoutMs ?? 600000,
    });
    } finally {
      logger.info(`[ws-runtime] chat.send cleanup runId=${this.activeRunId || '-'}`);
      offAgent();
    }
  }

  async chatAbort(): Promise<void> {
    if (!this.connected || !this.activeSessionKey) return;
    logger.info(`[ws-runtime] chat.abort runId=${this.activeRunId || '-'} sessionKey=${this.activeSessionKey}`);
    await this.client.request('chat.abort', {
      sessionKey: this.activeSessionKey,
      ...(this.activeRunId ? { runId: this.activeRunId } : {}),
    });
  }

  async setSessionOptions(sessionKey: string, options: ChatSessionOptions): Promise<string | undefined> {
    await this.connect();
    logger.info(
      `[ws-runtime] sessions.patch sessionKey=${sessionKey} model=${options.model} reasoningLevel=${options.reasoningLevel || '-'} thinkingLevel=${options.thinkingLevel ?? '-'}`,
    );
    const response = await this.client.request<any>('sessions.patch', {
      key: sessionKey,
      model: options.model,
      ...(options.reasoningLevel ? { reasoningLevel: options.reasoningLevel } : {}),
      ...(options.thinkingLevel !== undefined ? { thinkingLevel: options.thinkingLevel } : {}),
    });
    logger.info(`[ws-runtime] sessions.patch response=${JSON.stringify(response)}`);
    const resolvedModel = response?.resolved?.model;
    const resolvedProvider = response?.resolved?.modelProvider;
    if (typeof resolvedModel === 'string' && resolvedModel.trim()) {
      return resolvedProvider ? `${resolvedProvider}/${resolvedModel}` : resolvedModel;
    }
    return undefined;
  }
  disconnect(): void {
    logger.info(`[ws-runtime] disconnect`);
    this.client.disconnect();
    this.connected = false;
    this.activeRunId = null;
    this.activeSessionKey = null;
    this.textBuffer = '';
    this.activeModel = null;
  }
}

function safeParseGatewayRawAgentEventDto(input: unknown) {
  const parsed = GatewayRawAgentEventDtoSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function safeParseGatewayRawChatEventDto(input: unknown) {
  const parsed = GatewayRawChatEventDtoSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function mergeRecords(
  previous?: Record<string, unknown>,
  next?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!previous && !next) return undefined;
  return {
    ...(previous || {}),
    ...(next || {}),
  };
}

function resolveToolCallId(payload: { toolCallId?: string; data?: unknown; payload?: unknown; result?: unknown }): string {
  const direct = payload.toolCallId;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const data = asRecord(payload.data);
  const nested = data?.toolCallId ?? data?.callId;
  if (typeof nested === 'string' && nested.trim()) return nested.trim();
  return 'tool:unknown';
}

function mergeToolPayload(previous: any, incoming: any): any {
  const prevData = asRecord(previous?.data);
  const nextData = asRecord(incoming?.data);
  return {
    ...(previous || {}),
    ...incoming,
    toolCallId: incoming?.toolCallId || previous?.toolCallId,
    toolName: incoming?.toolName || previous?.toolName,
    tool: incoming?.tool || previous?.tool,
    status: incoming?.status || previous?.status,
    title: incoming?.title || previous?.title,
    detail: incoming?.detail || previous?.detail,
    data: mergeRecords(prevData, nextData),
    payload: mergeRecords(asRecord(previous?.payload), asRecord(incoming?.payload)),
    result: mergeRecords(asRecord(previous?.result), asRecord(incoming?.result)),
    output: mergeRecords(asRecord(previous?.output), asRecord(incoming?.output)),
  };
}
