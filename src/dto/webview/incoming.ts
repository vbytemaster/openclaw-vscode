import { z } from 'zod';

export const WebviewDebugPayloadSchema = z.object({
  event: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
  activeChatId: z.string().optional(),
  ts: z.number().optional(),
});

export const WebviewSendRequestSchema = z.object({
  type: z.literal('send'),
  text: z.string(),
  refs: z.array(z.string()),
  images: z.array(z.string()).optional(),
  model: z.string().optional(),
  thinkingLevel: z.string().nullable().optional(),
  chatId: z.string(),
  agentId: z.string().optional(),
});

export const WebviewClearRequestSchema = z.object({
  type: z.literal('clear'),
  chatId: z.string(),
});

export const WebviewDeleteChatRequestSchema = z.object({
  type: z.literal('deleteChat'),
  chatId: z.string(),
});

export const WebviewInsertCodeRequestSchema = z.object({
  type: z.literal('insertCode'),
});

export const WebviewAttachFileRequestSchema = z.object({
  type: z.literal('attachFile'),
});

export const WebviewPasteCheckRequestSchema = z.object({
  type: z.literal('pasteCheck'),
  text: z.string(),
});

export const WebviewOpenResponseRequestSchema = z.object({
  type: z.literal('openResponseInEditor'),
  text: z.string(),
  msgIndex: z.number(),
});

export const WebviewSaveChatStateRequestSchema = z.object({
  type: z.literal('saveChatState'),
  messages: z.unknown(),
});

export const WebviewFetchModelsRequestSchema = z.object({
  type: z.literal('fetchModels'),
});

export const WebviewFetchAgentsRequestSchema = z.object({
  type: z.literal('fetchAgents'),
});

export const WebviewSetAgentRequestSchema = z.object({
  type: z.literal('setAgent'),
  agentId: z.string(),
  chatId: z.string(),
});

export const WebviewCancelRequestSchema = z.object({
  type: z.literal('cancel'),
  chatId: z.string(),
});

export const WebviewRevertLatestChangeRequestSchema = z.object({
  type: z.literal('revertLatestChange'),
  chatId: z.string(),
  changeId: z.string(),
});

export const WebviewDebugRequestSchema = WebviewDebugPayloadSchema.extend({
  type: z.literal('webviewDebug'),
});

export const WebviewToExtensionMessageSchema = z.discriminatedUnion('type', [
  WebviewSendRequestSchema,
  WebviewClearRequestSchema,
  WebviewDeleteChatRequestSchema,
  WebviewInsertCodeRequestSchema,
  WebviewAttachFileRequestSchema,
  WebviewPasteCheckRequestSchema,
  WebviewOpenResponseRequestSchema,
  WebviewSaveChatStateRequestSchema,
  WebviewFetchModelsRequestSchema,
  WebviewFetchAgentsRequestSchema,
  WebviewSetAgentRequestSchema,
  WebviewCancelRequestSchema,
  WebviewRevertLatestChangeRequestSchema,
  WebviewDebugRequestSchema,
]);

export type WebviewDebugPayload = z.infer<typeof WebviewDebugPayloadSchema>;
export type WebviewSendRequest = z.infer<typeof WebviewSendRequestSchema>;
export type WebviewClearRequest = z.infer<typeof WebviewClearRequestSchema>;
export type WebviewDeleteChatRequest = z.infer<typeof WebviewDeleteChatRequestSchema>;
export type WebviewInsertCodeRequest = z.infer<typeof WebviewInsertCodeRequestSchema>;
export type WebviewAttachFileRequest = z.infer<typeof WebviewAttachFileRequestSchema>;
export type WebviewPasteCheckRequest = z.infer<typeof WebviewPasteCheckRequestSchema>;
export type WebviewOpenResponseRequest = z.infer<typeof WebviewOpenResponseRequestSchema>;
export type WebviewSaveChatStateRequest = z.infer<typeof WebviewSaveChatStateRequestSchema>;
export type WebviewFetchModelsRequest = z.infer<typeof WebviewFetchModelsRequestSchema>;
export type WebviewFetchAgentsRequest = z.infer<typeof WebviewFetchAgentsRequestSchema>;
export type WebviewSetAgentRequest = z.infer<typeof WebviewSetAgentRequestSchema>;
export type WebviewCancelRequest = z.infer<typeof WebviewCancelRequestSchema>;
export type WebviewRevertLatestChangeRequest = z.infer<typeof WebviewRevertLatestChangeRequestSchema>;
export type WebviewDebugRequest = z.infer<typeof WebviewDebugRequestSchema>;
export type WebviewToExtensionMessage = z.infer<typeof WebviewToExtensionMessageSchema>;
