import { buildDeviceAuthPayloadV3, loadOrCreateDeviceIdentity, loadStoredDeviceToken, publicKeyRawBase64UrlFromPem, signDevicePayload, storeDeviceToken } from './deviceAuth';
import { logger } from '../shared/logger';
import WebSocket from 'ws';

type PendingRequest = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
};

export type GatewayWsConfig = {
  url: string;
  token: string;
  clientId?: string;
  clientVersion?: string;
  platform?: string;
  deviceFamily?: string;
  clientMode?: string;
  role?: 'operator';
  scopes?: string[];
  userAgent?: string;
};

export type GatewayConnectChallenge = {
  type: 'event';
  event: 'connect.challenge';
  payload: { nonce: string; ts: number };
};

export type GatewayConnectRequest = {
  type: 'req';
  id: string;
  method: 'connect';
  params: {
    minProtocol: 3;
    maxProtocol: 3;
    client: {
      id: string;
      version: string;
      platform: string;
      deviceFamily?: string;
      mode: string;
    };
    role: 'operator';
    scopes: string[];
    caps: string[];
    commands: string[];
    permissions: Record<string, boolean>;
    auth: { token: string; deviceToken?: string };
    locale: string;
    userAgent: string;
    device: {
      id: string;
      publicKey: string;
      signature: string;
      signedAt: number;
      nonce: string;
    };
  };
};

export type GatewayFrame =
  | GatewayConnectChallenge
  | { type: 'res'; id: string; ok: boolean; payload?: any; error?: any }
  | { type: 'event'; event: string; payload?: any; seq?: number; stateVersion?: number };

export type GatewayEventHandler = (frame: GatewayFrame) => void;

export type GatewayWsDiagnostics = {
  url: string;
  challengeReceived: boolean;
  connectSent: boolean;
  connected: boolean;
  challenge?: GatewayConnectChallenge['payload'];
  responsePayload?: any;
  error?: any;
};

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildConnectRequest(config: GatewayWsConfig, nonce: string): GatewayConnectRequest {
  const role = config.role || 'operator';
  const scopes = config.scopes || ['operator.read', 'operator.write'];
  const platform = (config.platform || process.platform).toLowerCase();
  const deviceFamily = (config.deviceFamily || 'desktop').toLowerCase();
  const clientId = config.clientId || 'cli';
  const clientMode = config.clientMode || 'cli';
  const identity = loadOrCreateDeviceIdentity();
  const signedAtMs = Date.now();
  const stored = loadStoredDeviceToken();
  const authTokenForSignature = config.token || stored?.token || '';
  const payload = buildDeviceAuthPayloadV3({
    deviceId: identity.deviceId,
    clientId,
    clientMode,
    role,
    scopes,
    signedAtMs,
    token: authTokenForSignature,
    nonce,
    platform,
    deviceFamily,
  });
  const signature = signDevicePayload(identity.privateKeyPem, payload);

  return {
    type: 'req',
    id: randomId(),
    method: 'connect',
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: clientId,
        version: config.clientVersion || '4.0.0-dev',
        platform,
        deviceFamily,
        mode: clientMode,
      },
      role,
      scopes,
      caps: ['tool-events'],
      commands: [],
      permissions: {},
      auth: (() => {
        if (stored && stored.deviceId === identity.deviceId && stored.role === role) {
          return { token: config.token, deviceToken: stored.token };
        }
        return { token: config.token };
      })(),
      locale: 'en-US',
      userAgent: config.userAgent || 'openclaw-vscode/4.0.0-dev',
      device: {
        id: identity.deviceId,
        publicKey: publicKeyRawBase64UrlFromPem(identity.publicKeyPem),
        signature,
        signedAt: signedAtMs,
        nonce,
      },
    },
  };
}

export class GatewayWsClient {
  private socket: any | undefined;
  private diagnostics: GatewayWsDiagnostics;
  private pending = new Map<string, PendingRequest>();
  private eventHandlers = new Set<GatewayEventHandler>();
  private connectPromise?: Promise<void>;
  private connected = false;

  constructor(private readonly config: GatewayWsConfig) {
    this.diagnostics = {
      url: config.url,
      challengeReceived: false,
      connectSent: false,
      connected: false,
    };
  }

  async connect(): Promise<void> {
    if (this.connected && this.socket) return;
    if (this.connectPromise) return await this.connectPromise;

    logger.info(`[ws] connect start url=${this.config.url}`);

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.config.url);
      this.socket = ws;
      let settled = false;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        this.diagnostics.error = error.message;
        this.connectPromise = undefined;
        logger.error(`[ws] connect failed url=${this.config.url}`, error);
        reject(error);
      };

      const succeed = () => {
        if (settled) return;
        settled = true;
        this.connected = true;
        this.diagnostics.connected = true;
        this.connectPromise = undefined;
        logger.info(`[ws] connect ok url=${this.config.url}`);
        resolve();
      };

      ws.on('message', (data: WebSocket.RawData) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString();
          const frame = JSON.parse(raw) as GatewayFrame;
          this.handleFrame(frame, { onConnectOk: succeed, onConnectError: fail, ws });
        } catch (err) {
          fail(err instanceof Error ? err : new Error(String(err)));
        }
      });

      ws.on('error', (err: any) => {
        const message = err instanceof Error ? err.message : String(err);
        fail(err instanceof Error ? err : new Error(message));
      });

      ws.on('close', (code: number, reason: Buffer) => {
        this.connected = false;
        this.socket = undefined;
        logger.warn(`[ws] close code=${code} reason=${reason?.toString?.() || ''}`);
        if (!settled) fail(new Error('Gateway WebSocket closed during connect'));
        this.rejectAllPending(new Error('Gateway WebSocket closed'));
      });
    });

    return await this.connectPromise;
  }

  private handleFrame(
    frame: GatewayFrame,
    opts?: { onConnectOk?: () => void; onConnectError?: (error: Error) => void; ws?: any },
  ): void {
    if (frame.type === 'event' && frame.event === 'connect.challenge') {
      this.diagnostics.challengeReceived = true;
      this.diagnostics.challenge = frame.payload;
      logger.info(`[ws] connect.challenge ts=${frame.payload.ts}`);
      const req = buildConnectRequest(this.config, frame.payload.nonce);
      this.diagnostics.connectSent = true;
      logger.info(`[ws] connect request sent id=${req.id}`);
      (opts?.ws || this.socket)?.send(JSON.stringify(req));
      return;
    }

    if (frame.type === 'res') {
      const pending = this.pending.get(frame.id);
      if (pending) {
        if (pending.timer) clearTimeout(pending.timer);
        this.pending.delete(frame.id);
        logger.info(`[ws] response id=${frame.id} ok=${frame.ok}`);
        if (frame.ok) pending.resolve(frame.payload ?? {});
        else pending.reject(new Error(frame.error?.message || 'Gateway request failed'));
        return;
      }

      if (frame.ok) {
        logger.info(`[ws] connect response ok`);
        this.diagnostics.responsePayload = frame.payload;
        const auth = frame.payload?.auth;
        const identity = loadOrCreateDeviceIdentity();
        if (auth?.deviceToken && auth?.role) {
          storeDeviceToken({
            deviceId: identity.deviceId,
            role: String(auth.role),
            token: String(auth.deviceToken),
            scopes: Array.isArray(auth.scopes) ? auth.scopes : undefined,
            issuedAtMs: typeof auth.issuedAtMs === 'number' ? auth.issuedAtMs : undefined,
          });
        }
        opts?.onConnectOk?.();
      } else {
        this.diagnostics.error = frame.error;
        logger.warn(`[ws] connect response error=${frame.error?.message || 'unknown'}`);
        opts?.onConnectError?.(new Error(frame.error?.message || 'Gateway connect failed'));
      }
      return;
    }

    if (frame.type === 'event') {
      for (const handler of this.eventHandlers) handler(frame);
    }
  }

  onEvent(handler: GatewayEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  async request<T = any>(method: string, params?: any, timeoutMs: number = 30000): Promise<T> {
    await this.connect();
    const ws = this.socket;
    if (!ws) throw new Error('Gateway WebSocket is not connected');
    const id = randomId();
    logger.info(`[ws] request method=${method} id=${id} timeoutMs=${timeoutMs}`);

    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        logger.warn(`[ws] request timeout method=${method} id=${id}`);
        reject(new Error(`Gateway request timeout for ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ type: 'req', id, method, params }));
    });
  }

  async requestWithEvents<T = any>(params: {
    method: string;
    params?: any;
    matchEvent: (frame: GatewayFrame) => boolean;
    onEvent?: (frame: GatewayFrame) => void;
    resolveFinal: (frame: GatewayFrame) => T | undefined;
    timeoutMs?: number;
  }): Promise<T> {
    const timeoutMs = params.timeoutMs ?? 30000;

    return await new Promise<T>(async (resolve, reject) => {
      const off = this.onEvent((frame) => {
        if (!params.matchEvent(frame)) return;
        params.onEvent?.(frame);
        try {
          const resolved = params.resolveFinal(frame);
          if (resolved !== undefined) {
            cleanup();
            resolve(resolved);
          }
        } catch (err) {
          cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Gateway request timeout for ${params.method}`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        off();
      };

      try {
        await this.request(params.method, params.params, timeoutMs);
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pending.entries()) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  disconnect(): void {
    try {
      logger.info(`[ws] disconnect`);
      this.socket?.close?.();
    } finally {
      this.rejectAllPending(new Error('Gateway WebSocket disconnected'));
      this.socket = undefined;
      this.connected = false;
      this.connectPromise = undefined;
    }
  }

  getDiagnostics(): GatewayWsDiagnostics {
    return { ...this.diagnostics };
  }
}
