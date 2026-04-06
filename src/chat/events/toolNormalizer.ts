import type { GatewayRawAgentEventDto } from '../../dto/gateway/tool';
import type {
  AgentsListToolEvent,
  ApplyPatchToolEvent,
  BrowserToolEvent,
  CanvasToolEvent,
  CronToolEvent,
  EditToolEvent,
  ExecToolEvent,
  GatewayToolEvent,
  ImageGenerateToolEvent,
  ImageToolEvent,
  MemoryGetToolEvent,
  MemorySearchToolEvent,
  MessageToolEvent,
  NodesToolEvent,
  ProcessToolEvent,
  ReadToolEvent,
  SearchToolEvent,
  SessionStatusToolEvent,
  SessionsHistoryToolEvent,
  SessionsListToolEvent,
  SessionsSendToolEvent,
  SessionsSpawnToolEvent,
  SessionsYieldToolEvent,
  SubagentsToolEvent,
  ToolEvent,
  TtsToolEvent,
  UnknownToolEvent,
  WebFetchToolEvent,
  WebSearchToolEvent,
  WriteToolEvent,
} from './types';
import {
  buildToolTitle,
  detectSearchCommand,
  humanToolDetail,
  resolveToolCommand,
  toolKindFrom,
  toRunState,
} from './toolClassification';
import {
  extractDiffStats,
  extractExitCode,
  extractToolQuery,
  extractToolTarget,
  firstStringFromObject,
  normalizeTarget,
} from './toolFieldExtractors';

export function normalizeGatewayToolEvent(payload: GatewayRawAgentEventDto, seq?: number): ToolEvent {
  const data = (payload?.data && typeof payload.data === 'object' ? payload.data : payload) as Record<string, unknown>;
  const toolName =
    firstStringFromObject(data, ['toolName', 'name', 'tool']) ||
    payload?.toolName ||
    payload?.tool ||
    'tool';
  const status =
    firstStringFromObject(data, ['status', 'phase']) ||
    payload?.status ||
    'update';
  const toolId =
    firstStringFromObject(data, ['toolCallId', 'callId']) ||
    payload?.toolCallId ||
    firstStringFromObject(payload as Record<string, unknown>, ['callId', 'id']) ||
    `${String(toolName)}:${payload?.runId || 'run'}:${seq || 'event'}`;
  const query = extractToolQuery(data);
  const file = normalizeTarget(toolName, extractToolTarget(data));
  const resolvedCommand = resolveToolCommand(String(toolName), data);
  const exitCode = extractExitCode(data);
  const diffStats = extractDiffStats(data);
  const search = detectSearchCommand(String(toolName), data, resolvedCommand);
  const kind = toolKindFrom(String(toolName));
  const common = {
    toolId: String(toolId),
    toolName: String(toolName),
    status: String(status),
    runState: toRunState(String(status), exitCode),
    title: buildToolTitle(String(toolName), String(status), data),
    detail: humanToolDetail(String(toolName), data),
  };

  switch (kind) {
    case 'read':
      return {
        kind,
        ...common,
        ...(file ? { file } : {}),
        ...diffStats,
      } satisfies ReadToolEvent;
    case 'write':
      return {
        kind,
        ...common,
        ...(file ? { file } : {}),
        ...diffStats,
      } satisfies WriteToolEvent;
    case 'edit':
      return {
        kind,
        ...common,
        ...(file ? { file } : {}),
        ...diffStats,
      } satisfies EditToolEvent;
    case 'apply_patch':
      return {
        kind,
        ...common,
        ...(file ? { file } : {}),
        ...diffStats,
      } satisfies ApplyPatchToolEvent;
    case 'search':
    case 'web_search':
    case 'memory_search':
      return {
        kind,
        ...common,
        ...(query ? { query } : {}),
        ...(file ? { file } : {}),
        ...(search?.scope ? { scope: search.scope } : {}),
        ...(resolvedCommand ? { command: resolvedCommand } : {}),
      } satisfies SearchToolEvent | WebSearchToolEvent | MemorySearchToolEvent;
    case 'exec':
    case 'process':
      return {
        kind,
        ...common,
        ...(resolvedCommand ? { command: resolvedCommand } : {}),
        ...(file ? { cwd: file } : {}),
        ...(typeof exitCode === 'number' ? { exitCode } : {}),
      } satisfies ExecToolEvent | ProcessToolEvent;
    case 'web_fetch':
      return {
        kind,
        ...common,
        ...(file ? { file } : {}),
        ...(resolvedCommand ? { command: resolvedCommand } : {}),
      } satisfies WebFetchToolEvent;
    case 'memory_get':
      return {
        kind,
        ...common,
        ...(file ? { file } : {}),
      } satisfies MemoryGetToolEvent;
    case 'sessions_list':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies SessionsListToolEvent;
    case 'sessions_history':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies SessionsHistoryToolEvent;
    case 'sessions_send':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies SessionsSendToolEvent;
    case 'sessions_spawn':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies SessionsSpawnToolEvent;
    case 'sessions_yield':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies SessionsYieldToolEvent;
    case 'subagents':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies SubagentsToolEvent;
    case 'session_status':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies SessionStatusToolEvent;
    case 'browser':
      return { kind, ...common, ...(file ? { file } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies BrowserToolEvent;
    case 'canvas':
      return { kind, ...common, ...(file ? { file } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies CanvasToolEvent;
    case 'message':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies MessageToolEvent;
    case 'cron':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies CronToolEvent;
    case 'gateway':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies GatewayToolEvent;
    case 'nodes':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies NodesToolEvent;
    case 'agents_list':
      return { kind, ...common, ...(query ? { query } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies AgentsListToolEvent;
    case 'image':
      return { kind, ...common, ...(file ? { file } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies ImageToolEvent;
    case 'image_generate':
      return { kind, ...common, ...(file ? { file } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies ImageGenerateToolEvent;
    case 'tts':
      return { kind, ...common, ...(file ? { file } : {}), ...(resolvedCommand ? { command: resolvedCommand } : {}) } satisfies TtsToolEvent;
    default:
      return {
        kind: 'unknown',
        ...common,
        ...(file ? { file } : {}),
        ...(query ? { query } : {}),
        ...(resolvedCommand ? { command: resolvedCommand } : {}),
      } satisfies UnknownToolEvent;
  }
}
