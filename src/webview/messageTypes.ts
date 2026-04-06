import type {
  ExtensionStreamEndMessage,
  ExtensionToWebviewMessage,
  TurnChangeSetDto,
} from '../dto/webview/outgoing.js';
import type { ToolEventKind, ToolRunState } from '../chat/events/types.js';
import type { AssistantTurnStateByChat } from './state/assistantTurnStore.js';

export type MsgIndexRef = { value: number };
export type ChangeSetPayload = TurnChangeSetDto;
export type StreamTickMessage = {
  type: 'streamTick';
  chatId?: string;
};
export type IncomingMessage = ExtensionToWebviewMessage | StreamTickMessage;
export type StreamEndMessage = ExtensionStreamEndMessage;

export type ActivityEntry = {
  toolId: string;
  title: string;
  status: string;
  runState: ToolRunState;
  detail?: string;
  eventKind?: ToolEventKind;
  file?: string;
  query?: string;
  scope?: string;
  command?: string;
  cwd?: string;
  exitCode?: number;
  added?: number;
  removed?: number;
  kind?: 'tool' | 'thinking' | 'note' | 'compact';
  count?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type MessagesContext = {
  msgsEl: HTMLElement;
  editorEl: HTMLElement;
  agentSel: HTMLSelectElement | null;
  transientThinkingEl: HTMLElement;
  debug?: (event: string, payload?: Record<string, unknown>) => void;
  renderAssistant: (text: string) => string;
  esc: (text: string) => string;
  prettyModelName: (raw: string, labels: Record<string, string>) => string;
  modelLabelByValue: Record<string, string>;
  setStreaming: (chatId: string, on: boolean) => void;
  activeChatId: () => string;
  curElByChat: Record<string, HTMLDivElement | null>;
  assistantTurnByChat: AssistantTurnStateByChat;
  msgIndexRef: MsgIndexRef;
  saveState: () => void;
  persistAssistantToChat?: (
    chatId: string,
    raw: string,
    model: string,
    msgIndex: number,
    changeSet?: ChangeSetPayload | null,
    canRevert?: boolean,
  ) => void;
  getAgentForChat?: (chatId: string) => string;
  activityStateByChat: Record<string, Record<string, ActivityEntry>>;
  activityStartedAtByChat: Record<string, number>;
  activityCollapsedByChat: Record<string, boolean>;
  activityDisclosureOpenByChat: Record<string, Record<string, boolean>>;
  latestChangeSetByChat: Record<string, ChangeSetPayload | null>;
};
