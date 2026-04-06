export {
  GatewayRecordSchema,
} from '../dto/gateway/base';
export {
  GatewayRawToolPayloadSchema,
  GatewayRawAgentEventDtoSchema,
  type GatewayRawToolPayloadDto as GatewayRawToolPayload,
  type GatewayRawAgentEventDto,
} from '../dto/gateway/tool';
export {
  GatewayRawContentBlockSchema,
  GatewayRawChatEventDtoSchema,
  type GatewayRawChatEventDto,
} from '../dto/gateway/chat';
import {
  GatewayRawAgentEventDtoSchema,
  type GatewayRawAgentEventDto,
} from '../dto/gateway/tool';
import {
  GatewayRawChatEventDtoSchema as GatewayChatSchema,
  type GatewayRawChatEventDto,
} from '../dto/gateway/chat';

export function parseGatewayRawAgentEventDto(input: unknown): GatewayRawAgentEventDto {
  return GatewayRawAgentEventDtoSchema.parse(input);
}

export function parseGatewayRawChatEventDto(input: unknown): GatewayRawChatEventDto {
  return GatewayChatSchema.parse(input);
}

export function safeParseGatewayRawAgentEventDto(input: unknown): GatewayRawAgentEventDto | null {
  const parsed = GatewayRawAgentEventDtoSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function safeParseGatewayRawChatEventDto(input: unknown): GatewayRawChatEventDto | null {
  const parsed = GatewayChatSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
