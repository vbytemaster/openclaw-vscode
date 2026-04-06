import type { ChatChangeSet, ChatTab } from '../types.js';
import type { AssistantTurnStateByChat } from './assistantTurnStore.js';
import type { ActivityEntry } from '../messageTypes.js';

export type WebviewRuntimeState = {
  streamStateByChat: Record<string, boolean>;
  curElByChat: Record<string, HTMLDivElement | null>;
  assistantTurnByChat: AssistantTurnStateByChat;
  activityStateByChat: Record<string, Record<string, ActivityEntry>>;
  activityStartedAtByChat: Record<string, number>;
  activityCollapsedByChat: Record<string, boolean>;
  activityDisclosureOpenByChat: Record<string, Record<string, boolean>>;
  latestChangeSetByChat: Record<string, ChatChangeSet | null>;
  modelLabelByValue: Record<string, string>;
  imgCounter: number;
  imageStore: Record<string, string>;
  savedRange: Range | null;
  msgIndex: number;
  chats: ChatTab[];
  activeChatId: string;
};

export function createWebviewRuntimeState(initialAgentId: string): WebviewRuntimeState {
  return {
    streamStateByChat: {},
    curElByChat: {},
    assistantTurnByChat: {},
    activityStateByChat: {},
    activityStartedAtByChat: {},
    activityCollapsedByChat: {},
    activityDisclosureOpenByChat: {},
    latestChangeSetByChat: {},
    modelLabelByValue: {},
    imgCounter: 0,
    imageStore: {},
    savedRange: null,
    msgIndex: 0,
    chats: [{ id: 'chat-1', title: 'Chat 1', messages: [], msgIndex: 0, agentId: initialAgentId }],
    activeChatId: 'chat-1',
  };
}
