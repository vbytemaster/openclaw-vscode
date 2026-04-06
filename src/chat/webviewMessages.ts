import {
  ExtensionToWebviewMessageSchema,
  type ExtensionErrorMessage,
  type ExtensionStreamDeltaMessage,
  type ExtensionStreamEndMessage,
  type ExtensionStreamFinalMessage,
  type ExtensionStreamModelMessage,
  type ExtensionStreamStartMessage,
  type ExtensionToWebviewMessage,
} from '../dto/webview/outgoing';

import type { TurnChangeSet } from './changeTracking';

function parseExtensionToWebviewMessage(input: unknown): ExtensionToWebviewMessage {
  return ExtensionToWebviewMessageSchema.parse(input);
}

export function buildStreamStartMessage(chatId: string, agentId?: string): ExtensionStreamStartMessage {
  return parseExtensionToWebviewMessage({
    type: 'streamStart',
    chatId,
    agentId,
  }) as ExtensionStreamStartMessage;
}

export function buildStreamModelMessage(chatId: string, model: string): ExtensionStreamModelMessage {
  return parseExtensionToWebviewMessage({
    type: 'streamModel',
    chatId,
    model,
  }) as ExtensionStreamModelMessage;
}

export function buildStreamDeltaMessage(chatId: string, text: string): ExtensionStreamDeltaMessage {
  return parseExtensionToWebviewMessage({
    type: 'streamDelta',
    chatId,
    text,
  }) as ExtensionStreamDeltaMessage;
}

export function buildStreamFinalMessage(chatId: string, text: string, model?: string): ExtensionStreamFinalMessage {
  return parseExtensionToWebviewMessage({
    type: 'streamFinal',
    chatId,
    text,
    model,
  }) as ExtensionStreamFinalMessage;
}

export function buildStreamEndMessage(
  chatId: string,
  changeSet?: TurnChangeSet | null,
  canRevert?: boolean,
): ExtensionStreamEndMessage {
  return parseExtensionToWebviewMessage({
    type: 'streamEnd',
    chatId,
    ...(changeSet ? { changeSet } : {}),
    ...(canRevert !== undefined ? { canRevert } : {}),
  }) as ExtensionStreamEndMessage;
}

export function buildErrorMessage(text: string, chatId?: string): ExtensionErrorMessage {
  return parseExtensionToWebviewMessage({
    type: 'error',
    text,
    ...(chatId ? { chatId } : {}),
  }) as ExtensionErrorMessage;
}

export function asExtensionMessage(message: ExtensionToWebviewMessage): ExtensionToWebviewMessage {
  return parseExtensionToWebviewMessage(message);
}
