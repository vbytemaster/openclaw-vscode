import type { AnswerDeltaEvent, AnswerFinalEvent, ChatEvent } from './types';

export {
  extractContentTypesFromGatewayPayload,
  extractModelFromGatewayPayload,
  extractThinkingTextFromGatewayPayload,
  normalizeGatewayChatEvent,
} from './chatNormalizer';
export { normalizeGatewayToolEvent } from './toolNormalizer';

export function isAnswerEvent(
  event: ChatEvent | null | undefined,
): event is AnswerDeltaEvent | AnswerFinalEvent {
  return Boolean(event && (event.kind === 'answer_delta' || event.kind === 'answer_final'));
}
