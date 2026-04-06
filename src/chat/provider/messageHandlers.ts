import type { WebviewMessageHandlers } from '../webviewBridge';

type MessageHandlersDeps = {
  onSend: WebviewMessageHandlers['onSend'];
  onClear: WebviewMessageHandlers['onClear'];
  onDeleteChat: WebviewMessageHandlers['onDeleteChat'];
  onInsertCode: WebviewMessageHandlers['onInsertCode'];
  onAttachFile: WebviewMessageHandlers['onAttachFile'];
  onPasteCheck: WebviewMessageHandlers['onPasteCheck'];
  onOpenResponseInEditor: WebviewMessageHandlers['onOpenResponseInEditor'];
  onSaveChatState: WebviewMessageHandlers['onSaveChatState'];
  onFetchModels: WebviewMessageHandlers['onFetchModels'];
  onFetchAgents: WebviewMessageHandlers['onFetchAgents'];
  onSetAgent: WebviewMessageHandlers['onSetAgent'];
  onCancel: WebviewMessageHandlers['onCancel'];
  onRevertLatestChange: WebviewMessageHandlers['onRevertLatestChange'];
  onDebug: WebviewMessageHandlers['onDebug'];
};

export function createWebviewMessageHandlers(
  deps: MessageHandlersDeps,
): WebviewMessageHandlers {
  return {
    onSend: deps.onSend,
    onClear: deps.onClear,
    onDeleteChat: deps.onDeleteChat,
    onInsertCode: deps.onInsertCode,
    onAttachFile: deps.onAttachFile,
    onPasteCheck: deps.onPasteCheck,
    onOpenResponseInEditor: deps.onOpenResponseInEditor,
    onSaveChatState: deps.onSaveChatState,
    onFetchModels: deps.onFetchModels,
    onFetchAgents: deps.onFetchAgents,
    onSetAgent: deps.onSetAgent,
    onCancel: deps.onCancel,
    onRevertLatestChange: deps.onRevertLatestChange,
    onDebug: deps.onDebug,
  };
}
