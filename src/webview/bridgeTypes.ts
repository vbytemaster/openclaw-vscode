import type {
  ChangedFileDto,
  ExtensionToWebviewMessage,
  TurnChangeSetDto,
} from '../dto/webview/outgoing.js';
import type { WebviewDebugRequest } from '../dto/webview/incoming.js';
import { ExtensionToWebviewMessageSchema } from '../dto/webview/outgoing.js';

export type {
  ChangedFileDto,
  ExtensionToWebviewMessage,
  TurnChangeSetDto,
  WebviewDebugRequest,
};

export function parseExtensionToWebviewMessage(raw: unknown): ExtensionToWebviewMessage {
  return ExtensionToWebviewMessageSchema.parse(raw);
}
