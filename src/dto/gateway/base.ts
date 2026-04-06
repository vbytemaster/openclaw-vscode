import { z } from 'zod';

export const GatewayRecordSchema = z.record(z.string(), z.unknown());

export type GatewayRecordDto = z.infer<typeof GatewayRecordSchema>;
