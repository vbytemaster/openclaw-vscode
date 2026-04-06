import type { AnswerDeltaEvent, AnswerFinalEvent } from '../../chat/events/types.js';
import type { AssistantTurnState } from '../state/assistantTurnStore.js';
import type { ChangeSetPayload } from '../messageTypes.js';

export type AssistantTurnViewModel = {
  chatId: string;
  rawText: string;
  model?: string;
  streaming: boolean;
  changeSet: ChangeSetPayload | null;
};

export function fromAssistantTurnState(
  chatId: string,
  state: AssistantTurnState,
  streaming: boolean,
): AssistantTurnViewModel {
  return {
    chatId,
    rawText: state.rawText,
    model: state.model || undefined,
    streaming,
    changeSet: !streaming ? state.changeSet : null,
  };
}

export function fromAnswerEvent(
  event: AnswerDeltaEvent | AnswerFinalEvent,
  changeSet: ChangeSetPayload | null,
): AssistantTurnViewModel {
  return {
    chatId: event.chatId || '',
    rawText: event.text,
    model: event.model,
    streaming: event.kind === 'answer_delta',
    changeSet: event.kind === 'answer_final' ? changeSet : null,
  };
}
