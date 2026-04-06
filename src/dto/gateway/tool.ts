import { z } from 'zod';
import { GatewayRecordSchema } from './base';

export const GatewayRawToolPayloadSchema = z.object({
  toolName: z.string().optional(),
  toolCallId: z.string().optional(),
  tool: z.string().optional(),
  status: z.string().optional(),
  title: z.string().optional(),
  detail: z.string().optional(),
  data: GatewayRecordSchema.optional(),
  payload: GatewayRecordSchema.optional(),
  result: GatewayRecordSchema.optional(),
  output: GatewayRecordSchema.optional(),
});

export const GatewayRawAgentEventDtoSchema = GatewayRawToolPayloadSchema.extend({
  sessionKey: z.string().optional(),
  runId: z.string().optional(),
  stream: z.string().optional(),
  data: z.object({
    text: z.string().optional(),
  }).catchall(z.unknown()).optional(),
});

export type GatewayRawToolPayloadDto = z.infer<typeof GatewayRawToolPayloadSchema>;
export type GatewayRawAgentEventDto = z.infer<typeof GatewayRawAgentEventDtoSchema>;
