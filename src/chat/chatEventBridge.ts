import type { AnswerDeltaEvent, AnswerFinalEvent, ErrorEvent, ToolEvent } from './events/types';
import {
  ExtensionToWebviewMessageSchema,
  type ExtensionErrorMessage,
  type ExtensionStreamDeltaMessage,
  type ExtensionStreamFinalMessage,
  type ExtensionToolEventMessage,
  type ExtensionToWebviewMessage,
} from '../dto/webview/outgoing';

function parseExtensionToWebviewMessage(input: unknown): ExtensionToWebviewMessage {
  return ExtensionToWebviewMessageSchema.parse(input);
}

export function toExtensionMessage(
  event: AnswerDeltaEvent | AnswerFinalEvent | ErrorEvent | ToolEvent,
): ExtensionToWebviewMessage {
  switch (event.kind) {
    case 'answer_delta':
      return parseExtensionToWebviewMessage({
        type: 'streamDelta',
        chatId: event.chatId,
        text: event.text,
      }) as ExtensionStreamDeltaMessage;
    case 'answer_final':
      return parseExtensionToWebviewMessage({
        type: 'streamFinal',
        chatId: event.chatId,
        text: event.text,
        ...(event.model ? { model: event.model } : {}),
      }) as ExtensionStreamFinalMessage;
    case 'error':
      return parseExtensionToWebviewMessage({
        type: 'error',
        text: event.message,
        ...(event.chatId ? { chatId: event.chatId } : {}),
      }) as ExtensionErrorMessage;
    default:
      return parseExtensionToWebviewMessage({
        type: 'toolEvent',
        event,
      }) as ExtensionToolEventMessage;
  }
}
