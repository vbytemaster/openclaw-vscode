import { logger } from '../../shared/logger';
import type { ExtensionToWebviewMessage } from '../../dto/webview/outgoing';
import {
  isChangeSetRevertible,
  revertChangeSet,
  type TurnChangeSet,
} from '../changeTracking';
import { rehydrateLatestChangeSets } from '../chatStateStorage';
import type { ChatSession } from '../chatSession';

type SessionLookup = (chatId: string) => ChatSession;

export function rehydrateLatestSessionChangeSets(
  state: unknown,
  getSession: SessionLookup,
): void {
  const latestByChat = rehydrateLatestChangeSets(state);
  for (const [chatId, changeSet] of latestByChat.entries()) {
    getSession(chatId).latestChangeSet = changeSet;
  }
}

type RevertLatestChangeParams = {
  chatId: string;
  changeId: string;
  workspaceRoot: string | null;
  getSession: SessionLookup;
  postMessage: (message: ExtensionToWebviewMessage) => void;
};

function postRevertInvalid(
  postMessage: (message: ExtensionToWebviewMessage) => void,
  chatId: string,
  changeId: string,
): void {
  postMessage({ type: 'revertInvalid', chatId, changeId });
}

export function revertLatestSessionChange(params: RevertLatestChangeParams): void {
  const session = params.getSession(params.chatId);
  const changeSet = session.latestChangeSet;
  if (!changeSet || (params.changeId && changeSet.id !== params.changeId)) {
    postRevertInvalid(params.postMessage, params.chatId, params.changeId);
    return;
  }
  if (!isChangeSetRevertible(params.workspaceRoot, changeSet)) {
    postRevertInvalid(params.postMessage, params.chatId, changeSet.id);
    return;
  }

  try {
    const reverted = revertChangeSet(params.workspaceRoot, changeSet);
    if (!reverted) throw new Error('revert failed');
    session.clearLatestChangeSet();
    params.postMessage({ type: 'revertApplied', chatId: params.chatId, changeId: changeSet.id });
  } catch (error) {
    logger.error(`[chat:${params.chatId}] revert failed`, error);
    postRevertInvalid(params.postMessage, params.chatId, changeSet.id);
  }
}

export function getLatestChangeSet(
  chatId: string,
  getSession: SessionLookup,
): TurnChangeSet | undefined {
  return getSession(chatId).latestChangeSet;
}
