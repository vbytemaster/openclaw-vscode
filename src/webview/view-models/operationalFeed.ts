import type { MessagesContext } from '../messageTypes.js';

export type ReadRowViewModel = {
  kind: 'read';
  label: string;
  state: ActivityRunState;
};

export type SearchRowViewModel = {
  kind: 'search';
  label: string;
  state: ActivityRunState;
};

export type ThinkingRowViewModel = {
  kind: 'thinking';
  label: string;
  active: boolean;
};

export type ExplorationRowViewModel = ReadRowViewModel | SearchRowViewModel;
export type ActivityRunState = 'running' | 'done' | 'error';
export type ShellRunState = ActivityRunState;

export type ShellRowViewModel = {
  kind: 'shell';
  toolId: string;
  chatId: string;
  open: boolean;
  runState: ShellRunState;
  summaryText: string;
  summaryOpenText: string;
  command: string;
  statusLabel?: string;
  elapsedLabel?: string;
};

export type FileChangeRowViewModel = {
  kind: 'file_change';
  labelPrefix: 'Wrote' | 'Edited' | 'Patched';
  file: string;
  added?: number;
  removed?: number;
};

export type OperationalFeedViewModel = {
  thinking?: ThinkingRowViewModel;
  exploration?: {
    state: ActivityRunState;
    summary: string;
    rows: ExplorationRowViewModel[];
  };
  shell?: {
    rows: ShellRowViewModel[];
  };
  fileChanges?: {
    rows: FileChangeRowViewModel[];
  };
};

function compactText(input?: string): string {
  if (!input) return '';
  return input.replace(/\s+/g, ' ').trim();
}

function basenameLike(input?: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const normalized = trimmed.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || trimmed;
}

function commandLikeDetail(input?: string): string {
  const text = compactText(input);
  if (!text) return '';
  const lower = text.toLowerCase();
  if (
    lower === 'result' ||
    lower === 'update' ||
    lower === 'start' ||
    lower.includes('executed command') ||
    lower.includes('running command')
  ) {
    return '';
  }
  if (/[;&|$`]/.test(text) || /\b(cat|find|rg|grep|git|npm|pnpm|node|python|bash|sh|ls|cd|wc)\b/i.test(text)) {
    return text;
  }
  return '';
}

function formatDiffStats(added?: number, removed?: number): Pick<FileChangeRowViewModel, 'added' | 'removed'> {
  return {
    ...(typeof added === 'number' ? { added } : {}),
    ...(typeof removed === 'number' ? { removed } : {}),
  };
}

function toStatusLabel(runState: ActivityRunState, exitCode?: number): string {
  if (typeof exitCode === 'number') {
    return exitCode === 0 ? 'Success' : `Exit ${exitCode}`;
  }
  if (runState === 'running') return 'Running';
  if (runState === 'error') return 'Error';
  return 'Success';
}

function toElapsedLabel(createdAt?: number, updatedAt?: number): string | undefined {
  if (!createdAt) return undefined;
  const end = updatedAt || Date.now();
  const seconds = Math.max(0, Math.round((end - createdAt) / 1000));
  if (seconds <= 0) return undefined;
  return `${seconds}s`;
}

export function buildOperationalFeedViewModel(ctx: MessagesContext, chatId: string): OperationalFeedViewModel {
  const entries = Object.values(ctx.activityStateByChat[chatId] || {}).filter((entry) => entry.kind === 'tool');
  const viewModel: OperationalFeedViewModel = {};

  const readEntries = entries.filter((entry) => entry.eventKind === 'read');
  const readRows = Array.from(new Set(
    readEntries
      .map((entry) => JSON.stringify({
        file: basenameLike(entry.file),
        state: entry.runState,
      }))
      .filter(Boolean),
  ))
    .map((row) => JSON.parse(row) as { file: string; state: ActivityRunState })
    .filter((row) => row.file)
    .map((row) => ({ kind: 'read' as const, label: `Read ${row.file}`, state: row.state }));

  const searchEntries = entries.filter((entry) => (
    entry.eventKind === 'search' ||
    entry.eventKind === 'web_search' ||
    entry.eventKind === 'memory_search'
  ));
  const searchRows = searchEntries.map((entry) => {
    const query = compactText(entry.query);
    const state = entry.runState;
    if (!query) return null;
    if (entry.eventKind === 'search') {
      const file = basenameLike(entry.file || entry.scope);
      return { kind: 'search' as const, label: `Searched for ${query}${file ? ` in ${file}` : ''}`, state };
    }
    if (entry.eventKind === 'web_search') {
      return { kind: 'search' as const, label: `Web search: ${query}`, state };
    }
    return { kind: 'search' as const, label: `Memory search: ${query}`, state };
  }).filter((row): row is SearchRowViewModel => Boolean(row));

  const explorationRows: ExplorationRowViewModel[] = [...readRows, ...searchRows];
  if (explorationRows.length) {
    const fileCount = readRows.length;
    const searchCount = searchRows.length;
    const summaryParts: string[] = [];
    const explorationState: ActivityRunState = explorationRows.some((row) => row.state === 'running') ? 'running' : 'done';
    const lead = explorationState === 'running' ? 'Exploring' : 'Explored';
    if (fileCount) summaryParts.push(`${fileCount} ${fileCount === 1 ? 'file' : 'files'}`);
    if (searchCount) summaryParts.push(`${searchCount} ${searchCount === 1 ? 'search' : 'searches'}`);
    viewModel.exploration = {
      state: explorationState,
      summary: `${lead} ${summaryParts.join(', ')}`,
      rows: explorationRows,
    };
  }

  const execEntries = entries.filter((entry) => entry.eventKind === 'exec' || entry.eventKind === 'process');
  if (execEntries.length) {
    const rows = execEntries.map((entry): ShellRowViewModel | null => {
      const command = compactText(entry.command || commandLikeDetail(entry.detail));
      if (!command) return null;
      const open = Boolean(ctx.activityDisclosureOpenByChat[chatId]?.[entry.toolId]);
      const runState = entry.runState;
      const statusLabel = toStatusLabel(runState, entry.exitCode);
      const elapsedLabel = toElapsedLabel(entry.createdAt, entry.updatedAt);
      const timing = elapsedLabel ? ` for ${elapsedLabel}` : '';
      return {
        kind: 'shell' as const,
        toolId: entry.toolId,
        chatId,
        open,
        runState,
        summaryText: `${runState === 'running' ? 'Running' : 'Ran'} ${command}${timing}`,
        summaryOpenText: `${runState === 'running' ? 'Running' : 'Ran'} command`,
        command,
        statusLabel,
        ...(elapsedLabel ? { elapsedLabel } : {}),
      };
    }).filter((row): row is ShellRowViewModel => row !== null);
    if (rows.length) {
      viewModel.shell = { rows };
    }
  }

  const fileChangeEntries = entries.filter((entry) => (
    entry.eventKind === 'edit' ||
    entry.eventKind === 'write' ||
    entry.eventKind === 'apply_patch'
  ));
  if (fileChangeEntries.length) {
    const rows = fileChangeEntries.map((entry) => {
      const file = basenameLike(entry.file);
      if (!file) return null;
      if (entry.eventKind === 'edit') {
        return {
          kind: 'file_change' as const,
          labelPrefix: 'Edited' as const,
          file,
          ...formatDiffStats(entry.added, entry.removed),
        };
      }
      if (entry.eventKind === 'apply_patch') {
        return {
          kind: 'file_change' as const,
          labelPrefix: 'Patched' as const,
          file,
          ...formatDiffStats(entry.added, entry.removed),
        };
      }
      return {
        kind: 'file_change' as const,
        labelPrefix: 'Wrote' as const,
        file,
        ...formatDiffStats(entry.added, entry.removed),
      };
    }).filter((row): row is FileChangeRowViewModel => Boolean(row));
    if (rows.length) {
      viewModel.fileChanges = { rows };
    }
  }

  if (entries.length && (viewModel.shell?.rows.some((row) => row.runState === 'running') || viewModel.exploration?.state === 'running')) {
    viewModel.thinking = {
      kind: 'thinking',
      label: 'Thinking',
      active: true,
    };
  }

  return viewModel;
}
