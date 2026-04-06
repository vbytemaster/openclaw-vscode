import { parseExtensionToWebviewMessage } from '../bridgeTypes.js';
import type { ExtensionMessageBridgeContext } from '../extensionMessageBridge.js';
import type { ChangeSetPayload, MessagesContext } from '../messageTypes.js';
import type { AssistantTurnStateByChat } from '../state/assistantTurnStore.js';
import type { ChatChangeSet } from '../types.js';

type MessageContextFactoryDeps = {
  msgsEl: HTMLElement;
  editorEl: HTMLElement;
  agentSel: HTMLSelectElement | null;
  transientThinkingEl: HTMLElement;
  curElByChat: Record<string, HTMLDivElement | null>;
  assistantTurnByChat: AssistantTurnStateByChat;
  activityStateByChat: Record<string, Record<string, any>>;
  activityStartedAtByChat: Record<string, number>;
  activityCollapsedByChat: Record<string, boolean>;
  activityDisclosureOpenByChat: Record<string, Record<string, boolean>>;
  latestChangeSetByChat: Record<string, ChatChangeSet | null>;
  modelLabelByValue: () => Record<string, string>;
  msgIndexRef: {
    get value(): number;
    set value(v: number);
  };
  activeChatId: () => string;
  setStreaming: (chatId: string, on: boolean) => void;
  renderAssistant: (text: string) => string;
  esc: (text: string) => string;
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
  streamLifecycleHandle: (message: { type: string; chatId?: string }) => void;
  debug: (event: string, payload?: Record<string, unknown>) => void;
};

type MessageBridgeContextBase = Omit<
  ExtensionMessageBridgeContext,
  'modelSel' | 'modelLabelByValue' | 'setModelLabelByValue'
>;

export function createMessagesContextFactory(
  deps: MessageContextFactoryDeps,
): () => MessageBridgeContextBase & MessagesContext {
  return () => ({
    msgsEl: deps.msgsEl,
    editorEl: deps.editorEl,
    agentSel: deps.agentSel,
    transientThinkingEl: deps.transientThinkingEl,
    curElByChat: deps.curElByChat,
    assistantTurnByChat: deps.assistantTurnByChat,
    activityStateByChat: deps.activityStateByChat,
    activityStartedAtByChat: deps.activityStartedAtByChat,
    activityCollapsedByChat: deps.activityCollapsedByChat,
    activityDisclosureOpenByChat: deps.activityDisclosureOpenByChat,
    latestChangeSetByChat: deps.latestChangeSetByChat,
    modelLabelByValue: deps.modelLabelByValue(),
    msgIndexRef: deps.msgIndexRef,
    activeChatId: deps.activeChatId,
    setStreaming: deps.setStreaming,
    renderAssistant: deps.renderAssistant,
    esc: deps.esc,
    prettyModelName: deps.prettyModelName,
    saveState: deps.saveState,
    refreshModelPicker: deps.refreshModelPicker,
    getAgentForChat: deps.getAgentForChat,
    persistAssistantToChat: deps.persistAssistantToChat,
    insertChip: deps.insertChip,
    restoreSelection: deps.restoreSelection,
    getSavedRange: deps.getSavedRange,
    setSavedRange: deps.setSavedRange,
    addMsg: deps.addMsg,
    clearActiveMessages: deps.clearActiveMessages,
    streamLifecycleHandle: deps.streamLifecycleHandle,
    parseMessage: parseExtensionToWebviewMessage,
    debug: deps.debug,
  });
}
