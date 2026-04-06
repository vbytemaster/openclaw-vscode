import type { ChangeSetPayload } from '../messageTypes.js';

export type AssistantTurnState = {
  rawText: string;
  model: string;
  changeSet: ChangeSetPayload | null;
};

export type AssistantTurnStateByChat = Record<string, AssistantTurnState>;

function createEmptyAssistantTurnState(): AssistantTurnState {
  return {
    rawText: '',
    model: '',
    changeSet: null,
  };
}

export function getAssistantTurnState(
  stateByChat: AssistantTurnStateByChat,
  chatId: string,
): AssistantTurnState {
  if (!stateByChat[chatId]) {
    stateByChat[chatId] = createEmptyAssistantTurnState();
  }
  return stateByChat[chatId];
}

export function resetAssistantTurnState(
  stateByChat: AssistantTurnStateByChat,
  chatId: string,
): AssistantTurnState {
  stateByChat[chatId] = createEmptyAssistantTurnState();
  return stateByChat[chatId];
}

export function clearAssistantTurnState(
  stateByChat: AssistantTurnStateByChat,
  chatId: string,
): void {
  stateByChat[chatId] = createEmptyAssistantTurnState();
}

export function applyAssistantTurnModel(
  stateByChat: AssistantTurnStateByChat,
  chatId: string,
  model: string,
): void {
  getAssistantTurnState(stateByChat, chatId).model = model;
}

export function applyAssistantTurnDelta(
  stateByChat: AssistantTurnStateByChat,
  chatId: string,
  nextText: string,
): void {
  const state = getAssistantTurnState(stateByChat, chatId);
  state.rawText = nextText.startsWith(state.rawText) ? nextText : state.rawText + nextText;
}

export function applyAssistantTurnFinal(
  stateByChat: AssistantTurnStateByChat,
  chatId: string,
  text: string,
  model?: string,
): void {
  const state = getAssistantTurnState(stateByChat, chatId);
  state.rawText = text;
  if (model) state.model = model;
}

export function applyAssistantTurnChangeSet(
  stateByChat: AssistantTurnStateByChat,
  chatId: string,
  changeSet: ChangeSetPayload | null,
): void {
  getAssistantTurnState(stateByChat, chatId).changeSet = changeSet;
}
