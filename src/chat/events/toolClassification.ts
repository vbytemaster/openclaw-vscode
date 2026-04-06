import type { ToolEventKind, ToolRunState } from './types';
import {
  extractToolCommand,
  extractToolQuery,
  extractToolTarget,
  firstString,
  firstStringFromObject,
  normalizeTarget,
  prettifyCommand,
} from './toolFieldExtractors';

export function toRunState(status?: string, exitCode?: number): ToolRunState {
  if (typeof exitCode === 'number') {
    return exitCode === 0 ? 'done' : 'error';
  }
  const lower = (status || '').trim().toLowerCase();
  if (['done', 'complete', 'completed', 'success', 'ok', 'finished', 'result'].includes(lower)) {
    return 'done';
  }
  if (['error', 'failed', 'failure'].includes(lower)) {
    return 'error';
  }
  return 'running';
}

export function detectSearchCommand(
  toolName: string,
  data: any,
  command?: string,
): { query?: string; scope?: string; label?: string } | null {
  const normalized = command?.replace(/\s+/g, ' ').trim() || '';
  const query = extractToolQuery(data) || normalized.match(/"([^"]{2,120})"/)?.[1];
  const scope = normalizeTarget(toolName, extractToolTarget(data));
  const isSearchTool =
    /\b(find|rg|grep|search|web_search|memory_search)\b/.test(toolName.toLowerCase()) ||
    /\b(find|rg|grep)\b/.test(normalized) ||
    Boolean(query);

  if (!isSearchTool) return null;
  if (query && scope) return { query, scope, label: `Searched for ${query} in ${scope}` };
  if (query) return { query, label: `Searched for ${query}` };
  if (scope) return { scope, label: `Searched in ${scope}` };
  return { label: 'Searching project' };
}

const KNOWN_TOOL_KINDS = new Set<ToolEventKind>([
  'read',
  'write',
  'edit',
  'apply_patch',
  'exec',
  'process',
  'search',
  'web_search',
  'web_fetch',
  'memory_search',
  'memory_get',
  'sessions_list',
  'sessions_history',
  'sessions_send',
  'sessions_spawn',
  'sessions_yield',
  'subagents',
  'session_status',
  'browser',
  'canvas',
  'message',
  'cron',
  'gateway',
  'nodes',
  'agents_list',
  'image',
  'image_generate',
  'tts',
]);

export function toolKindFrom(toolName: string): ToolEventKind {
  const lower = toolName.trim().toLowerCase() as ToolEventKind;
  return KNOWN_TOOL_KINDS.has(lower) ? lower : 'unknown';
}

export function buildToolTitle(toolName: string, status: string, data: any): string {
  const lowerTool = toolName.toLowerCase();
  const lowerStatus = status.toLowerCase();
  const done = /(done|complete|completed|success|ok|finished|result)/.test(lowerStatus);
  const target = normalizeTarget(toolName, extractToolTarget(data));
  const command = prettifyCommand(extractToolCommand(data));
  const search = detectSearchCommand(toolName, data, command);

  if (lowerTool.includes('read')) return target ? `Read ${target}` : 'Read file';
  if (lowerTool.includes('write')) return target ? `Wrote ${target}` : 'Wrote file';
  if (lowerTool.includes('edit')) return target ? `Edited ${target}` : 'Edited file';
  if (lowerTool.includes('apply_patch')) return target ? `Patched ${target}` : 'Patched file';
  if (search) return search.label || 'Searching project';
  if (lowerTool.includes('exec') || lowerTool.includes('process') || lowerTool.includes('bash') || lowerTool.includes('shell')) {
    return command ? `Executed ${command}` : 'Executed command';
  }
  if (lowerTool.includes('web_fetch')) return target ? `Fetched ${target}` : 'Fetched web content';
  if (lowerTool.includes('memory_get')) return target ? `Read memory ${target}` : 'Read memory';
  if (lowerTool.includes('session_status')) return 'Checked session status';
  if (lowerTool.includes('sessions_')) return `${done ? 'Completed' : 'Running'} ${toolName}`;
  if (lowerTool.includes('subagents')) return `${done ? 'Updated' : 'Running'} subagents`;
  if (lowerTool.includes('browser')) return `${done ? 'Completed' : 'Running'} browser action`;
  if (lowerTool.includes('canvas')) return `${done ? 'Completed' : 'Running'} canvas action`;
  if (lowerTool.includes('message')) return `${done ? 'Sent' : 'Sending'} message`;
  if (lowerTool.includes('cron')) return `${done ? 'Updated' : 'Running'} cron`;
  if (lowerTool.includes('gateway')) return `${done ? 'Updated' : 'Running'} gateway`;
  if (lowerTool.includes('nodes')) return `${done ? 'Updated' : 'Running'} nodes`;
  if (lowerTool.includes('agents_list')) return `${done ? 'Loaded' : 'Loading'} agents list`;
  if (lowerTool.includes('image_generate')) return `${done ? 'Generated' : 'Generating'} image`;
  if (lowerTool.includes('image')) return `${done ? 'Processed' : 'Processing'} image`;
  if (lowerTool.includes('tts')) return `${done ? 'Generated' : 'Generating'} speech`;
  if (lowerTool.includes('search') || lowerTool.includes('grep') || lowerTool.includes('find')) {
    return target ? `Searched ${target}` : 'Search';
  }

  return command || target ? `${toolName} ${command || target}` : toolName;
}

export function humanToolDetail(toolName: string, data: any): string | undefined {
  const lowerTool = toolName.toLowerCase();
  const target = normalizeTarget(toolName, extractToolTarget(data));
  const command = prettifyCommand(extractToolCommand(data));
  const search = detectSearchCommand(toolName, data, command);

  if (lowerTool.includes('read') || lowerTool.includes('write') || lowerTool.includes('edit') || lowerTool.includes('apply_patch')) return target;
  if (search) return search.scope || search.query || command;
  if (lowerTool.includes('exec') || lowerTool.includes('process') || lowerTool.includes('bash') || lowerTool.includes('shell')) return command;
  if (lowerTool.includes('search') || lowerTool.includes('grep') || lowerTool.includes('find')) return command || target;
  return target || command;
}

export function resolveToolCommand(toolName: string, data: any): string | undefined {
  const command = prettifyCommand(extractToolCommand(data));
  const commandFallback = firstStringFromObject(data, ['detail', 'message', 'description', 'text']);
  return command || (
    /(exec|process|bash|shell)/.test(String(toolName).toLowerCase()) && commandFallback && /\s/.test(commandFallback)
      ? prettifyCommand(commandFallback)
      : undefined
  );
}
