import type { ToolEvent } from '../../chat/events/types.js';

export type ToolEventViewModel = {
  kind: ToolEvent['kind'];
  label: string;
  detail?: string;
  runState: ToolEvent['runState'];
  file?: string;
  query?: string;
  scope?: string;
  command?: string;
  cwd?: string;
  status: string;
  added?: number;
  removed?: number;
};

export function fromToolEvent(event: ToolEvent): ToolEventViewModel {
  return {
    kind: event.kind,
    label: event.title,
    detail: event.detail,
    runState: event.runState,
    status: event.status,
    ...('file' in event && event.file ? { file: event.file } : {}),
    ...('query' in event && event.query ? { query: event.query } : {}),
    ...('scope' in event && event.scope ? { scope: event.scope } : {}),
    ...('command' in event && event.command ? { command: event.command } : {}),
    ...('cwd' in event && event.cwd ? { cwd: event.cwd } : {}),
    ...('added' in event && typeof event.added === 'number' ? { added: event.added } : {}),
    ...('removed' in event && typeof event.removed === 'number' ? { removed: event.removed } : {}),
  };
}
