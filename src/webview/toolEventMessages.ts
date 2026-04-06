import type { ExtensionToolEventMessage } from '../dto/webview/outgoing.js';
import type { ActivityEntry, MessagesContext } from './messageTypes.js';

function hasMeaningfulChange(
  existing: MessagesContext['activityStateByChat'][string][string] | undefined,
  next: MessagesContext['activityStateByChat'][string][string]
): boolean {
  if (!existing) return true;
  return (
    existing.title !== next.title ||
    existing.status !== next.status ||
    existing.runState !== next.runState ||
    existing.detail !== next.detail ||
    existing.eventKind !== next.eventKind ||
    existing.file !== next.file ||
    existing.query !== next.query ||
    existing.scope !== next.scope ||
    existing.command !== next.command ||
    existing.cwd !== next.cwd ||
    existing.exitCode !== next.exitCode ||
    existing.added !== next.added ||
    existing.removed !== next.removed
  );
}

export function applyToolEvent(ctx: MessagesContext, message: ExtensionToolEventMessage): boolean {
  const chatId = message.event.chatId || ctx.activeChatId();
  const byChat = (ctx.activityStateByChat[chatId] ||= {});
  const existing = byChat[message.event.toolId];
  const now = Date.now();
  const nextKind = message.event.kind === 'unknown' && existing?.eventKind
    ? existing.eventKind
    : message.event.kind;
  const file = ('file' in message.event ? message.event.file : undefined) || existing?.file;

  if (!ctx.activityStartedAtByChat[chatId]) {
    ctx.activityStartedAtByChat[chatId] = now;
  }

  const nextEntry: ActivityEntry = {
    toolId: message.event.toolId,
    title: message.event.title,
    status: message.event.status,
    runState: message.event.runState,
    detail: message.event.detail || existing?.detail,
    eventKind: nextKind,
    file,
    query: ('query' in message.event ? message.event.query : undefined) || existing?.query,
    scope: ('scope' in message.event ? message.event.scope : undefined) || existing?.scope,
    command: ('command' in message.event ? message.event.command : undefined) || existing?.command,
    cwd: ('cwd' in message.event ? message.event.cwd : undefined) || existing?.cwd,
    exitCode: 'exitCode' in message.event && typeof message.event.exitCode === 'number' ? message.event.exitCode : existing?.exitCode,
    added: 'added' in message.event && typeof message.event.added === 'number' ? message.event.added : existing?.added,
    removed: 'removed' in message.event && typeof message.event.removed === 'number' ? message.event.removed : existing?.removed,
    kind: 'tool',
    count: existing?.count || 1,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const changed = hasMeaningfulChange(existing, nextEntry);
  if (!changed) {
    return false;
  }

  byChat[message.event.toolId] = nextEntry;

  ctx.debug?.('toolEvent.received', {
    chatId,
    toolId: message.event.toolId,
    toolName: message.event.toolName,
    kind: message.event.kind,
    status: message.event.status,
  });
  return true;
}
