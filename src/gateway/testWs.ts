import { GatewayWsClient } from './ws';

export type TestWsResult = {
  ok: boolean;
  diagnostics: ReturnType<GatewayWsClient['getDiagnostics']>;
  error?: string;
};

export async function testGatewayWs(host: string, port: number, token: string): Promise<TestWsResult> {
  const scheme = port === 443 ? 'wss' : 'ws';
  const url = `${scheme}://${host}:${port}`;
  const client = new GatewayWsClient({
    url,
    token,
    clientId: 'cli',
    clientMode: 'cli',
    clientVersion: '4.0.0-dev',
    role: 'operator',
    scopes: ['operator.read', 'operator.write', 'operator.admin'],
    deviceFamily: 'desktop',
    userAgent: 'openclaw-vscode/4.0.0-dev',
  });

  try {
    await client.connect();
    return { ok: true, diagnostics: client.getDiagnostics() };
  } catch (error: any) {
    return {
      ok: false,
      diagnostics: client.getDiagnostics(),
      error: error?.message || String(error),
    };
  } finally {
    client.disconnect();
  }
}
