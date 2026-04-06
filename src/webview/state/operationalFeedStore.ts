import type { ActivityEntry } from '../messageTypes.js';

export type OperationalFeedStateByChat = Record<string, Record<string, ActivityEntry>>;

export function getOperationalFeedState(
  stateByChat: OperationalFeedStateByChat,
  chatId: string,
): Record<string, ActivityEntry> {
  if (!stateByChat[chatId]) {
    stateByChat[chatId] = {};
  }
  return stateByChat[chatId];
}

export function clearOperationalFeedState(
  stateByChat: OperationalFeedStateByChat,
  chatId: string,
): void {
  delete stateByChat[chatId];
}
