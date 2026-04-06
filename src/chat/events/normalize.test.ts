import { describe, expect, it } from 'vitest';
import {
  extractThinkingTextFromGatewayPayload,
  normalizeGatewayChatEvent,
  normalizeGatewayToolEvent,
} from './normalize.js';

describe('chat event normalization', () => {
  it('normalizes delta payloads into answer_delta events', () => {
    const event = normalizeGatewayChatEvent({
      state: 'delta',
      model: 'claude-opus',
      message: {
        content: [{ type: 'text', text: 'Hello from gateway' }],
      },
    }, 'chat-1');

    expect(event).toEqual({
      kind: 'answer_delta',
      chatId: 'chat-1',
      text: 'Hello from gateway',
      model: 'claude-opus',
    });
  });

  it('extracts thinking text from explicit thinking blocks', () => {
    const thinking = extractThinkingTextFromGatewayPayload({
      message: {
        content: [
          { type: 'thinking', thinking: 'First thought' },
          { type: 'thinking', thinking: 'Second thought' },
        ],
      },
    });

    expect(thinking).toBe('First thought\nSecond thought');
  });
});

describe('tool event normalization', () => {
  it('normalizes file reads with done runState', () => {
    const event = normalizeGatewayToolEvent({
      toolName: 'read',
      status: 'completed',
      data: {
        filePath: '/Users/test/.openclaw/workspace/project/src/app.ts',
      },
    }, 1);

    expect(event.kind).toBe('read');
    expect(event.runState).toBe('done');
    expect(event.title).toBe('Read project/src/app.ts');
    expect('file' in event && event.file).toBe('project/src/app.ts');
  });

  it('normalizes search payloads with query and scope', () => {
    const event = normalizeGatewayToolEvent({
      toolName: 'search',
      status: 'update',
      data: {
        query: 'openclaw',
        scope: 'src/webview',
        command: 'rg openclaw src/webview',
      },
    }, 2);

    expect(event.kind).toBe('search');
    expect(event.runState).toBe('running');
    expect('query' in event && event.query).toBe('openclaw');
    expect('command' in event && event.command).toBe('rg openclaw src/webview');
  });

  it('normalizes exec payloads with failing exit code into error state', () => {
    const event = normalizeGatewayToolEvent({
      toolName: 'exec',
      status: 'result',
      data: {
        command: 'pnpm test',
        cwd: '/Users/test/.openclaw/workspace/project',
        exitCode: 1,
      },
    }, 3);

    expect(event.kind).toBe('exec');
    expect(event.runState).toBe('error');
    expect('command' in event && event.command).toBe('pnpm test');
    expect('cwd' in event && event.cwd).toBe('project');
    expect('exitCode' in event && event.exitCode).toBe(1);
  });

  it('normalizes patch payloads with diff stats', () => {
    const event = normalizeGatewayToolEvent({
      toolName: 'apply_patch',
      status: 'done',
      data: {
        path: 'src/chat/provider.ts',
        added: 12,
        removed: 3,
      },
    }, 4);

    expect(event.kind).toBe('apply_patch');
    expect('file' in event && event.file).toBe('src/chat/provider.ts');
    expect('added' in event && event.added).toBe(12);
    expect('removed' in event && event.removed).toBe(3);
  });

  it('falls back to unknown kind without losing structured fields', () => {
    const event = normalizeGatewayToolEvent({
      toolName: 'custom_tool',
      status: 'running',
      data: {
        command: 'custom --flag',
        file: 'tmp/output.txt',
        query: 'needle',
      },
    }, 5);

    expect(event.kind).toBe('unknown');
    expect(event.runState).toBe('running');
    expect('command' in event && event.command).toBe('custom --flag');
    expect('file' in event && event.file).toBe('tmp/output.txt');
    expect('query' in event && event.query).toBe('needle');
  });
});
