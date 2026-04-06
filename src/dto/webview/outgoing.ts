import { z } from 'zod';
import { ToolEventSchema } from '../../chat/events/types';

export const ChangedFileSchema = z.object({
  path: z.string(),
  status: z.enum(['added', 'modified', 'deleted']),
  added: z.number(),
  removed: z.number(),
  patch: z.string(),
  beforeText: z.string().optional(),
  afterText: z.string().optional(),
});

export const TurnChangeSetSchema = z.object({
  id: z.string(),
  files: z.array(ChangedFileSchema),
  totals: z.object({
    files: z.number(),
    added: z.number(),
    removed: z.number(),
  }),
});

export const ExtensionPasteResultMessageSchema = z.union([
  z.object({
    type: z.literal('pasteResult'),
    isCode: z.literal(true),
    refId: z.string(),
    label: z.string(),
  }),
  z.object({
    type: z.literal('pasteResult'),
    isCode: z.literal(false),
    text: z.string(),
  }),
]);

export const ExtensionCodeRefMessageSchema = z.object({
  type: z.literal('codeRef'),
  refId: z.string(),
  label: z.string(),
  file: z.string().optional(),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
});

export const ExtensionUserMessageSchema = z.object({
  type: z.literal('userMessage'),
  text: z.string(),
  chatId: z.string(),
});

export const ExtensionErrorMessageSchema = z.object({
  type: z.literal('error'),
  text: z.string(),
  chatId: z.string().optional(),
});

export const ExtensionStreamStartMessageSchema = z.object({
  type: z.literal('streamStart'),
  chatId: z.string(),
  agentId: z.string().optional(),
});

export const ExtensionStreamModelMessageSchema = z.object({
  type: z.literal('streamModel'),
  model: z.string(),
  chatId: z.string().optional(),
});

export const ExtensionStreamDeltaMessageSchema = z.object({
  type: z.literal('streamDelta'),
  text: z.string(),
  chatId: z.string().optional(),
});

export const ExtensionStreamFinalMessageSchema = z.object({
  type: z.literal('streamFinal'),
  chatId: z.string(),
  text: z.string(),
  model: z.string().optional(),
});

export const ExtensionStreamEndMessageSchema = z.object({
  type: z.literal('streamEnd'),
  chatId: z.string(),
  changeSet: TurnChangeSetSchema.optional(),
  canRevert: z.boolean().optional(),
});

export const ExtensionToolEventMessageSchema = z.object({
  type: z.literal('toolEvent'),
  event: ToolEventSchema,
});

export const ExtensionAgentsLoadedMessageSchema = z.object({
  type: z.literal('agentsLoaded'),
  agents: z.array(z.string()),
  activeAgent: z.string(),
});

export const ExtensionModelsLoadedMessageSchema = z.object({
  type: z.literal('modelsLoaded'),
  models: z.array(z.object({ value: z.string(), label: z.string() })),
});

export const ExtensionAgentChangedMessageSchema = z.object({
  type: z.literal('agentChanged'),
  agentId: z.string(),
  chatId: z.string(),
});

export const ExtensionClearedMessageSchema = z.object({
  type: z.literal('cleared'),
  chatId: z.string(),
});

export const ExtensionApplyPromptMessageSchema = z.object({
  type: z.literal('applyPrompt'),
  text: z.string(),
});

export const ExtensionRevertAppliedMessageSchema = z.object({
  type: z.literal('revertApplied'),
  chatId: z.string(),
  changeId: z.string(),
});

export const ExtensionRevertInvalidMessageSchema = z.object({
  type: z.literal('revertInvalid'),
  chatId: z.string(),
  changeId: z.string(),
});

export const ExtensionToWebviewMessageSchema = z.union([
  ExtensionPasteResultMessageSchema,
  ExtensionCodeRefMessageSchema,
  ExtensionUserMessageSchema,
  ExtensionErrorMessageSchema,
  ExtensionStreamStartMessageSchema,
  ExtensionStreamModelMessageSchema,
  ExtensionStreamDeltaMessageSchema,
  ExtensionStreamFinalMessageSchema,
  ExtensionStreamEndMessageSchema,
  ExtensionToolEventMessageSchema,
  ExtensionAgentsLoadedMessageSchema,
  ExtensionModelsLoadedMessageSchema,
  ExtensionAgentChangedMessageSchema,
  ExtensionClearedMessageSchema,
  ExtensionApplyPromptMessageSchema,
  ExtensionRevertAppliedMessageSchema,
  ExtensionRevertInvalidMessageSchema,
]);

export type ChangedFileDto = z.infer<typeof ChangedFileSchema>;
export type TurnChangeSetDto = z.infer<typeof TurnChangeSetSchema>;
export type ExtensionPasteResultMessage = z.infer<typeof ExtensionPasteResultMessageSchema>;
export type ExtensionCodeRefMessage = z.infer<typeof ExtensionCodeRefMessageSchema>;
export type ExtensionUserMessage = z.infer<typeof ExtensionUserMessageSchema>;
export type ExtensionErrorMessage = z.infer<typeof ExtensionErrorMessageSchema>;
export type ExtensionStreamStartMessage = z.infer<typeof ExtensionStreamStartMessageSchema>;
export type ExtensionStreamModelMessage = z.infer<typeof ExtensionStreamModelMessageSchema>;
export type ExtensionStreamDeltaMessage = z.infer<typeof ExtensionStreamDeltaMessageSchema>;
export type ExtensionStreamFinalMessage = z.infer<typeof ExtensionStreamFinalMessageSchema>;
export type ExtensionStreamEndMessage = z.infer<typeof ExtensionStreamEndMessageSchema>;
export type ExtensionToolEventMessage = z.infer<typeof ExtensionToolEventMessageSchema>;
export type ExtensionAgentsLoadedMessage = z.infer<typeof ExtensionAgentsLoadedMessageSchema>;
export type ExtensionModelsLoadedMessage = z.infer<typeof ExtensionModelsLoadedMessageSchema>;
export type ExtensionAgentChangedMessage = z.infer<typeof ExtensionAgentChangedMessageSchema>;
export type ExtensionClearedMessage = z.infer<typeof ExtensionClearedMessageSchema>;
export type ExtensionApplyPromptMessage = z.infer<typeof ExtensionApplyPromptMessageSchema>;
export type ExtensionRevertAppliedMessage = z.infer<typeof ExtensionRevertAppliedMessageSchema>;
export type ExtensionRevertInvalidMessage = z.infer<typeof ExtensionRevertInvalidMessageSchema>;
export type ExtensionToWebviewMessage = z.infer<typeof ExtensionToWebviewMessageSchema>;
