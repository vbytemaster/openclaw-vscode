import { logger } from '../shared/logger';
import {
  WebviewToExtensionMessageSchema,
  type WebviewToExtensionMessage,
} from '../dto/webview/incoming';

export type WebviewMessageHandlers = {
  onSend: (msg: Extract<WebviewToExtensionMessage, { type: 'send' }>) => void | Promise<void>;
  onClear: (msg: Extract<WebviewToExtensionMessage, { type: 'clear' }>) => void | Promise<void>;
  onDeleteChat: (msg: Extract<WebviewToExtensionMessage, { type: 'deleteChat' }>) => void | Promise<void>;
  onInsertCode: () => void | Promise<void>;
  onAttachFile: () => void | Promise<void>;
  onPasteCheck: (msg: Extract<WebviewToExtensionMessage, { type: 'pasteCheck' }>) => void | Promise<void>;
  onOpenResponseInEditor: (msg: Extract<WebviewToExtensionMessage, { type: 'openResponseInEditor' }>) => void | Promise<void>;
  onSaveChatState: (msg: Extract<WebviewToExtensionMessage, { type: 'saveChatState' }>) => void | Promise<void>;
  onFetchModels: () => void | Promise<void>;
  onFetchAgents: () => void | Promise<void>;
  onSetAgent: (msg: Extract<WebviewToExtensionMessage, { type: 'setAgent' }>) => void | Promise<void>;
  onCancel: (msg: Extract<WebviewToExtensionMessage, { type: 'cancel' }>) => void | Promise<void>;
  onRevertLatestChange: (msg: Extract<WebviewToExtensionMessage, { type: 'revertLatestChange' }>) => void | Promise<void>;
  onDebug: (msg: Extract<WebviewToExtensionMessage, { type: 'webviewDebug' }>) => void | Promise<void>;
};

export async function handleWebviewMessage(
  input: unknown,
  handlers: WebviewMessageHandlers,
): Promise<void> {
  let msg: WebviewToExtensionMessage;
  try {
    msg = WebviewToExtensionMessageSchema.parse(input);
  } catch (error) {
    logger.warn(`[webviewBridge] invalid message payload: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  switch (msg.type) {
    case 'send':
      await handlers.onSend(msg);
      return;
    case 'clear':
      await handlers.onClear(msg);
      return;
    case 'deleteChat':
      await handlers.onDeleteChat(msg);
      return;
    case 'insertCode':
      await handlers.onInsertCode();
      return;
    case 'attachFile':
      await handlers.onAttachFile();
      return;
    case 'pasteCheck':
      await handlers.onPasteCheck(msg);
      return;
    case 'openResponseInEditor':
      await handlers.onOpenResponseInEditor(msg);
      return;
    case 'saveChatState':
      await handlers.onSaveChatState(msg);
      return;
    case 'fetchModels':
      await handlers.onFetchModels();
      return;
    case 'fetchAgents':
      await handlers.onFetchAgents();
      return;
    case 'setAgent':
      await handlers.onSetAgent(msg);
      return;
    case 'cancel':
      await handlers.onCancel(msg);
      return;
    case 'revertLatestChange':
      await handlers.onRevertLatestChange(msg);
      return;
    case 'webviewDebug':
      await handlers.onDebug(msg);
      return;
    default:
      logger.warn(`[webviewBridge] unhandled message type=${(msg as { type?: string }).type || 'unknown'}`);
  }
}
