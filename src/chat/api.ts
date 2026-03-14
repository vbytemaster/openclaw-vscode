import * as http from 'http';
import * as https from 'https';

export async function setSessionModelOverride(
  host: string,
  port: number,
  token: string,
  sessionKey: string,
  model: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const lib = port === 443 ? https : http;
    const payload = JSON.stringify({
      tool: 'session_status',
      sessionKey,
      args: { sessionKey, model }
    });
    const req = lib.request({
      hostname: host,
      port,
      path: '/tools/invoke',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', (c: Buffer) => body += c);
      res.on('end', () => {
        if ((res.statusCode || 500) >= 300) {
          reject(new Error(`Model switch failed (HTTP ${res.statusCode}): ${body.slice(0, 160)}`));
          return;
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export function streamChatCompletion(
  host: string,
  port: number,
  token: string,
  body: string,
  opts?: {
    agentId?: string;
    sessionKey?: string;
    onModel?: (model: string) => void;
    onDelta?: (delta: string) => void;
  }
): { request: http.ClientRequest; done: Promise<string> } {
  const lib = port === 443 ? https : http;
  let request!: http.ClientRequest;

  const done = new Promise<string>((resolve, reject) => {
    request = lib.request({
      hostname: host,
      port,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(body),
        ...(opts?.agentId ? { 'x-openclaw-agent-id': opts.agentId } : {}),
        ...(opts?.sessionKey ? { 'x-openclaw-session-key': opts.sessionKey } : {})
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', (c: Buffer) => errBody += c);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errBody.slice(0, 200)}`)));
        return;
      }

      let fullText = '';
      let buffer = '';
      let resolvedModel = '';

      res.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (!resolvedModel && parsed.model) {
              resolvedModel = parsed.model;
              opts?.onModel?.(resolvedModel);
            }
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              opts?.onDelta?.(delta);
            }
          } catch {
            // skip malformed stream chunks
          }
        }
      });

      res.on('end', () => resolve(fullText));
      res.on('error', reject);
    });

    request.on('error', reject);
    request.write(body);
    request.end();
  });

  return { request, done };
}
