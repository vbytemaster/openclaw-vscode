import { z } from 'zod';

export const GatewayRawContentBlockSchema = z.object({
  type: z.string().optional(),
  text: z.string().optional(),
  thinking: z.string().optional(),
});

export const GatewayRawChatEventDtoSchema = z.object({
  runId: z.string().optional(),
  sessionKey: z.string().optional(),
  state: z.string().optional(),
  errorMessage: z.string().optional(),
  message: z.object({
    content: z.array(GatewayRawContentBlockSchema).optional(),
  }).catchall(z.unknown()).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
}).catchall(z.unknown());

export type GatewayRawContentBlockDto = z.infer<typeof GatewayRawContentBlockSchema>;
export type GatewayRawChatEventDto = z.infer<typeof GatewayRawChatEventDtoSchema>;
