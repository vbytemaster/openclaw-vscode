import { z } from 'zod';

export const AnswerDeltaEventSchema = z.object({
  kind: z.literal('answer_delta'),
  chatId: z.string().optional(),
  text: z.string(),
  model: z.string().optional(),
});

export const AnswerFinalEventSchema = z.object({
  kind: z.literal('answer_final'),
  chatId: z.string(),
  text: z.string(),
  model: z.string().optional(),
});

export const ToolEventKindSchema = z.enum([
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
  'unknown',
]);

export const ToolRunStateSchema = z.enum(['running', 'done', 'error']);

const ToolEventBaseSchema = z.object({
  chatId: z.string().optional(),
  toolId: z.string(),
  toolName: z.string(),
  status: z.string(),
  runState: ToolRunStateSchema,
  title: z.string(),
  detail: z.string().optional(),
});

const FileToolEventExtrasSchema = z.object({
  file: z.string().optional(),
  added: z.number().optional(),
  removed: z.number().optional(),
});

const SearchToolEventExtrasSchema = z.object({
  query: z.string().optional(),
  file: z.string().optional(),
  scope: z.string().optional(),
  command: z.string().optional(),
});

const CommandToolEventExtrasSchema = z.object({
  command: z.string().optional(),
  cwd: z.string().optional(),
  exitCode: z.number().optional(),
});

const FileToolEventSchema = <TKind extends string>(kind: TKind) =>
  ToolEventBaseSchema.extend({
    kind: z.literal(kind),
  }).merge(FileToolEventExtrasSchema);

const SearchToolEventSchema = <TKind extends string>(kind: TKind) =>
  ToolEventBaseSchema.extend({
    kind: z.literal(kind),
  }).merge(SearchToolEventExtrasSchema);

const CommandToolEventSchema = <TKind extends string>(kind: TKind) =>
  ToolEventBaseSchema.extend({
    kind: z.literal(kind),
  }).merge(CommandToolEventExtrasSchema);

const GenericToolEventSchema = <TKind extends string>(kind: TKind) =>
  ToolEventBaseSchema.extend({
    kind: z.literal(kind),
    file: z.string().optional(),
    query: z.string().optional(),
    command: z.string().optional(),
  });

export const ReadToolEventSchema = FileToolEventSchema('read');
export const WriteToolEventSchema = FileToolEventSchema('write');
export const EditToolEventSchema = FileToolEventSchema('edit');
export const ApplyPatchToolEventSchema = FileToolEventSchema('apply_patch');
export const ExecToolEventSchema = CommandToolEventSchema('exec');
export const ProcessToolEventSchema = CommandToolEventSchema('process');
export const SearchToolEventSchemaInstance = SearchToolEventSchema('search');
export const WebSearchToolEventSchema = SearchToolEventSchema('web_search');
export const WebFetchToolEventSchema = GenericToolEventSchema('web_fetch');
export const MemorySearchToolEventSchema = SearchToolEventSchema('memory_search');
export const MemoryGetToolEventSchema = GenericToolEventSchema('memory_get');
export const SessionsListToolEventSchema = GenericToolEventSchema('sessions_list');
export const SessionsHistoryToolEventSchema = GenericToolEventSchema('sessions_history');
export const SessionsSendToolEventSchema = GenericToolEventSchema('sessions_send');
export const SessionsSpawnToolEventSchema = GenericToolEventSchema('sessions_spawn');
export const SessionsYieldToolEventSchema = GenericToolEventSchema('sessions_yield');
export const SubagentsToolEventSchema = GenericToolEventSchema('subagents');
export const SessionStatusToolEventSchema = GenericToolEventSchema('session_status');
export const BrowserToolEventSchema = GenericToolEventSchema('browser');
export const CanvasToolEventSchema = GenericToolEventSchema('canvas');
export const MessageToolEventSchema = GenericToolEventSchema('message');
export const CronToolEventSchema = GenericToolEventSchema('cron');
export const GatewayToolEventSchema = GenericToolEventSchema('gateway');
export const NodesToolEventSchema = GenericToolEventSchema('nodes');
export const AgentsListToolEventSchema = GenericToolEventSchema('agents_list');
export const ImageToolEventSchema = GenericToolEventSchema('image');
export const ImageGenerateToolEventSchema = GenericToolEventSchema('image_generate');
export const TtsToolEventSchema = GenericToolEventSchema('tts');
export const UnknownToolEventSchema = GenericToolEventSchema('unknown');

export const ToolEventSchema = z.discriminatedUnion('kind', [
  ReadToolEventSchema,
  WriteToolEventSchema,
  EditToolEventSchema,
  ApplyPatchToolEventSchema,
  ExecToolEventSchema,
  ProcessToolEventSchema,
  SearchToolEventSchemaInstance,
  WebSearchToolEventSchema,
  WebFetchToolEventSchema,
  MemorySearchToolEventSchema,
  MemoryGetToolEventSchema,
  SessionsListToolEventSchema,
  SessionsHistoryToolEventSchema,
  SessionsSendToolEventSchema,
  SessionsSpawnToolEventSchema,
  SessionsYieldToolEventSchema,
  SubagentsToolEventSchema,
  SessionStatusToolEventSchema,
  BrowserToolEventSchema,
  CanvasToolEventSchema,
  MessageToolEventSchema,
  CronToolEventSchema,
  GatewayToolEventSchema,
  NodesToolEventSchema,
  AgentsListToolEventSchema,
  ImageToolEventSchema,
  ImageGenerateToolEventSchema,
  TtsToolEventSchema,
  UnknownToolEventSchema,
]);

export const ErrorEventSchema = z.object({
  kind: z.literal('error'),
  chatId: z.string().optional(),
  message: z.string(),
});

export const ChatEventSchema = z.union([
  AnswerDeltaEventSchema,
  AnswerFinalEventSchema,
  ToolEventSchema,
  ErrorEventSchema,
]);

export type AnswerDeltaEvent = z.infer<typeof AnswerDeltaEventSchema>;
export type AnswerFinalEvent = z.infer<typeof AnswerFinalEventSchema>;
export type ToolEventKind = z.infer<typeof ToolEventKindSchema>;
export type ToolRunState = z.infer<typeof ToolRunStateSchema>;
export type ReadToolEvent = z.infer<typeof ReadToolEventSchema>;
export type WriteToolEvent = z.infer<typeof WriteToolEventSchema>;
export type EditToolEvent = z.infer<typeof EditToolEventSchema>;
export type ApplyPatchToolEvent = z.infer<typeof ApplyPatchToolEventSchema>;
export type ExecToolEvent = z.infer<typeof ExecToolEventSchema>;
export type ProcessToolEvent = z.infer<typeof ProcessToolEventSchema>;
export type SearchToolEvent = z.infer<typeof SearchToolEventSchemaInstance>;
export type WebSearchToolEvent = z.infer<typeof WebSearchToolEventSchema>;
export type WebFetchToolEvent = z.infer<typeof WebFetchToolEventSchema>;
export type MemorySearchToolEvent = z.infer<typeof MemorySearchToolEventSchema>;
export type MemoryGetToolEvent = z.infer<typeof MemoryGetToolEventSchema>;
export type SessionsListToolEvent = z.infer<typeof SessionsListToolEventSchema>;
export type SessionsHistoryToolEvent = z.infer<typeof SessionsHistoryToolEventSchema>;
export type SessionsSendToolEvent = z.infer<typeof SessionsSendToolEventSchema>;
export type SessionsSpawnToolEvent = z.infer<typeof SessionsSpawnToolEventSchema>;
export type SessionsYieldToolEvent = z.infer<typeof SessionsYieldToolEventSchema>;
export type SubagentsToolEvent = z.infer<typeof SubagentsToolEventSchema>;
export type SessionStatusToolEvent = z.infer<typeof SessionStatusToolEventSchema>;
export type BrowserToolEvent = z.infer<typeof BrowserToolEventSchema>;
export type CanvasToolEvent = z.infer<typeof CanvasToolEventSchema>;
export type MessageToolEvent = z.infer<typeof MessageToolEventSchema>;
export type CronToolEvent = z.infer<typeof CronToolEventSchema>;
export type GatewayToolEvent = z.infer<typeof GatewayToolEventSchema>;
export type NodesToolEvent = z.infer<typeof NodesToolEventSchema>;
export type AgentsListToolEvent = z.infer<typeof AgentsListToolEventSchema>;
export type ImageToolEvent = z.infer<typeof ImageToolEventSchema>;
export type ImageGenerateToolEvent = z.infer<typeof ImageGenerateToolEventSchema>;
export type TtsToolEvent = z.infer<typeof TtsToolEventSchema>;
export type UnknownToolEvent = z.infer<typeof UnknownToolEventSchema>;
export type ToolEvent = z.infer<typeof ToolEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type ChatEvent = z.infer<typeof ChatEventSchema>;
