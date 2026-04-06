import type { GatewayRawChatEventDto } from '../../dto/gateway/chat';
import type {
  AnswerDeltaEvent,
  AnswerFinalEvent,
  ErrorEvent,
} from './types';

function firstStringFromObject(obj: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function extractChatText(payload: GatewayRawChatEventDto): string {
  const content = Array.isArray(payload?.message?.content) ? payload.message.content : [];
  for (const block of content) {
    if (typeof block?.text === 'string' && block.text.length > 0) return block.text;
  }
  return '';
}

export function extractModelFromGatewayPayload(payload: GatewayRawChatEventDto): string | undefined {
  const message = payload?.message && typeof payload.message === 'object' ? payload.message : undefined;
  const response = (payload as Record<string, unknown>)?.response;
  const data = (payload as Record<string, unknown>)?.data;
  const candidates = [
    payload?.model,
    firstStringFromObject(payload as Record<string, unknown>, ['modelId']),
    firstStringFromObject(message as Record<string, unknown>, ['model', 'modelId']),
    firstStringFromObject((message as Record<string, unknown>)?.meta as Record<string, unknown>, ['model']),
    firstStringFromObject((message as Record<string, unknown>)?.metadata as Record<string, unknown>, ['model']),
    firstStringFromObject(response as Record<string, unknown>, ['model']),
    firstStringFromObject(data as Record<string, unknown>, ['model']),
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function extractThinkingTextFromGatewayPayload(payload: GatewayRawChatEventDto): string | undefined {
  const content = Array.isArray(payload?.message?.content) ? payload.message.content : [];
  const parts = content
    .filter((block: any) => block?.type === 'thinking' && typeof block?.thinking === 'string' && block.thinking.trim())
    .map((block: any) => String(block.thinking).trim());
  return parts.length ? parts.join('\n').trim() : undefined;
}

export function extractContentTypesFromGatewayPayload(payload: GatewayRawChatEventDto): string {
  const content = Array.isArray(payload?.message?.content) ? payload.message.content : [];
  const types = content
    .map((block: any) => (typeof block?.type === 'string' && block.type.trim() ? block.type.trim() : 'unknown'))
    .filter(Boolean);
  return types.length ? types.join(',') : '-';
}

export function normalizeGatewayChatEvent(
  payload: GatewayRawChatEventDto,
  chatId?: string,
): AnswerDeltaEvent | AnswerFinalEvent | ErrorEvent | null {
  const state = typeof payload?.state === 'string' ? payload.state : undefined;
  const model = extractModelFromGatewayPayload(payload);
  const text = extractChatText(payload);

  if (state === 'delta') {
    return {
      kind: 'answer_delta',
      chatId,
      text,
      model,
    };
  }

  if (state === 'final') {
    return {
      kind: 'answer_final',
      chatId: chatId || '',
      text,
      model,
    };
  }

  if (state === 'error') {
    return {
      kind: 'error',
      chatId,
      message: payload?.errorMessage || 'WS chat error',
    };
  }

  return null;
}
