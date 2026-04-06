import { getWsDeviceInfo } from '../gateway/deviceInfo';
import { logger } from '../shared/logger';
import { ChatTransport, ChatTransportKind, createChatTransport } from './transport';

export class ChatTransportManager {
  private transport?: ChatTransport;
  private transportKey?: string;

  getTransport(kind: ChatTransportKind, host: string, port: number, token: string, timeoutMs?: number): ChatTransport {
    const key = JSON.stringify({
      kind,
      host,
      port,
      token,
      timeoutMs: timeoutMs ?? 0,
    });

    if (this.transport && this.transportKey === key) {
      logger.info(`[transport] reuse kind=${kind} host=${host} port=${port}`);
      return this.transport;
    }

    if (this.transport) {
      logger.info('[transport] config changed, disposing previous transport');
      this.transport.dispose();
    }

    logger.info(`[transport] create kind=${kind} host=${host} port=${port} timeoutMs=${timeoutMs ?? 0} token=${token ? 'set' : 'missing'}`);
    this.transport = createChatTransport({ kind, host, port, token, timeoutMs });
    this.transportKey = key;
    return this.transport;
  }

  dispose() {
    this.transport?.dispose();
    this.transport = undefined;
    this.transportKey = undefined;
  }
}

export function buildSessionKey(agentId: string, sessionUser: string, chatId: string): string {
  const chat = (chatId || 'chat-1').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const agent = (agentId || 'main').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const user = (sessionUser || 'vscode-chat').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `agent:${agent}:openai-user:${user}:chat:${chat}`;
}

export function formatTransportError(error: unknown, host: string, port: number): string {
  const message = error instanceof Error ? error.message : String(error || 'Connection failed');

  if (message.includes('pairing required')) {
    const info = getWsDeviceInfo();
    return [
      `Gateway requires device pairing before this client can connect to ${host}:${port}.`,
      `Approve deviceId '${info.deviceId}' in OpenClaw/Gateway, then retry.`,
      `You can also run 'OpenClaw: Show WS Device Info' to copy the device id again.`,
    ].join(' ');
  }

  if (message.includes('missing scope: operator.admin')) {
    return 'Cannot switch model for this session: the current Gateway token is missing operator.admin scope.';
  }

  if (message.includes('ECONNREFUSED')) {
    return `Gateway is unavailable at ${host}:${port} (ECONNREFUSED). Check that Docker/OpenClaw Gateway is running.`;
  }

  if (message.includes('ETIMEDOUT')) {
    return `Gateway connection to ${host}:${port} timed out. Check that the service is running and reachable.`;
  }

  if (message.includes('ENOTFOUND')) {
    return `Gateway host '${host}' could not be resolved. Check openclaw-vscode.chat.host.`;
  }

  return message;
}
