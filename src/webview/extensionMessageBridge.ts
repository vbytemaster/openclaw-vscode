import { handleIncoming } from './messages.js';
import type { AssistantTurnStateByChat } from './state/assistantTurnStore.js';
import { handleIncomingBridgeMessage } from './incomingBridge.js';
import type { ExtensionToWebviewMessage, WebviewDebugRequest } from './bridgeTypes.js';
import type { ActivityEntry, ChangeSetPayload } from './messageTypes.js';

type ExtensionMessageBridgeContext = {
  msgsEl: HTMLElement;
  editorEl: HTMLElement;
  agentSel: HTMLSelectElement | null;
  modelSel: HTMLSelectElement;
  transientThinkingEl: HTMLElement;
  curElByChat: Record<string, HTMLDivElement | null>;
  assistantTurnByChat: AssistantTurnStateByChat;
  activityStateByChat: Record<string, Record<string, ActivityEntry>>;
  activityStartedAtByChat: Record<string, number>;
  activityCollapsedByChat: Record<string, boolean>;
  activityDisclosureOpenByChat: Record<string, Record<string, boolean>>;
  latestChangeSetByChat: Record<string, ChangeSetPayload | null>;
  modelLabelByValue: () => Record<string, string>;
  setModelLabelByValue: (value: Record<string, string>) => void;
  msgIndexRef: {
    get value(): number;
    set value(v: number);
  };
  activeChatId: () => string;
  setStreaming: (chatId: string, on: boolean) => void;
  renderAssistant: (text: string) => string;
  esc: (value: string) => string;
  prettyModelName: (value: string, labels?: Record<string, string>) => string;
  saveState: () => void;
  refreshModelPicker: () => void;
  getAgentForChat: (chatId: string) => string;
  persistAssistantToChat: (
    chatId: string,
    raw: string,
    model: string,
    idx: number,
    changeSet?: ChangeSetPayload | null,
    canRevert?: boolean,
  ) => void;
  insertChip: (refId: string, label: string) => void;
  restoreSelection: (range: Range | null) => void;
  getSavedRange: () => Range | null;
  setSavedRange: (range: Range | null) => void;
  addMsg: (role: string, text: string) => void;
  clearActiveMessages: () => void;
  streamLifecycleHandle: (message: ExtensionToWebviewMessage) => void;
  parseMessage: (raw: unknown) => ExtensionToWebviewMessage;
  debug: (event: string, payload?: Record<string, unknown>) => void;
};

export type { ExtensionMessageBridgeContext };

export function createExtensionMessageHandler(ctx: ExtensionMessageBridgeContext) {
  return (event: MessageEvent): void => {
    let message: ExtensionToWebviewMessage;
    try {
      message = ctx.parseMessage(event.data);
    } catch {
      ctx.debug('invalid.extension.message', {
        rawType: typeof event.data,
      });
      return;
    }

    ctx.streamLifecycleHandle(message);

    if (handleIncoming({
      msgsEl: ctx.msgsEl,
      editorEl: ctx.editorEl,
      agentSel: ctx.agentSel,
      debug: ctx.debug,
      renderAssistant: ctx.renderAssistant,
      esc: ctx.esc,
      prettyModelName: ctx.prettyModelName,
      modelLabelByValue: ctx.modelLabelByValue(),
      setStreaming: ctx.setStreaming,
      activeChatId: ctx.activeChatId,
      transientThinkingEl: ctx.transientThinkingEl,
      curElByChat: ctx.curElByChat,
      assistantTurnByChat: ctx.assistantTurnByChat,
      activityStateByChat: ctx.activityStateByChat,
      activityStartedAtByChat: ctx.activityStartedAtByChat,
      activityCollapsedByChat: ctx.activityCollapsedByChat,
      activityDisclosureOpenByChat: ctx.activityDisclosureOpenByChat,
      latestChangeSetByChat: ctx.latestChangeSetByChat,
      msgIndexRef: ctx.msgIndexRef,
      saveState: ctx.saveState,
      getAgentForChat: ctx.getAgentForChat,
      persistAssistantToChat: ctx.persistAssistantToChat,
    }, message)) {
      return;
    }

    handleIncomingBridgeMessage({
      editorEl: ctx.editorEl,
      agentSel: ctx.agentSel,
      modelSel: ctx.modelSel,
      activeChatId: ctx.activeChatId,
      modelLabelByValue: ctx.modelLabelByValue,
      setModelLabelByValue: ctx.setModelLabelByValue,
      refreshModelPicker: ctx.refreshModelPicker,
      saveState: ctx.saveState,
      addMsg: ctx.addMsg,
      clearActiveMessages: ctx.clearActiveMessages,
      insertChip: ctx.insertChip,
      restoreSelection: ctx.restoreSelection,
      getSavedRange: ctx.getSavedRange,
      setSavedRange: ctx.setSavedRange,
    }, message);
  };
}
