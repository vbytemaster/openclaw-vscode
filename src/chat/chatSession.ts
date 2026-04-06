import * as http from 'http';
import { ChatMessage } from '../shared/types';
import { WorkspaceSnapshot, TurnChangeSet } from './changeTracking';

export class ChatSession {
  public readonly history: ChatMessage[] = [];
  public resolvedModel?: string;
  public snapshotBeforeRun?: WorkspaceSnapshot;
  public latestChangeSet?: TurnChangeSet;
  public activeRequest?: http.ClientRequest;

  constructor(public readonly chatId: string) {}

  clearHistory() {
    this.history.length = 0;
  }

  append(message: ChatMessage) {
    this.history.push(message);
  }

  setActiveRequest(request?: http.ClientRequest) {
    this.activeRequest = request;
  }

  clearActiveRequest() {
    this.activeRequest = undefined;
  }

  clearSnapshot() {
    this.snapshotBeforeRun = undefined;
  }

  clearLatestChangeSet() {
    this.latestChangeSet = undefined;
  }
}
