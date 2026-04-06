import { describe, expect, it } from 'vitest';
import { toExtensionMessage } from './chatEventBridge.js';

describe('toExtensionMessage', () => {
  it('maps answer_final events to streamFinal webview messages', () => {
    const message = toExtensionMessage({
      kind: 'answer_final',
      chatId: 'chat-1',
      text: 'Final answer',
      model: 'opus',
    });

    expect(message).toEqual({
      type: 'streamFinal',
      chatId: 'chat-1',
      text: 'Final answer',
      model: 'opus',
    });
  });

  it('maps tool events to validated toolEvent messages', () => {
    const message = toExtensionMessage({
      kind: 'exec',
      chatId: 'chat-1',
      toolId: 'tool-1',
      toolName: 'exec',
      status: 'done',
      runState: 'done',
      title: 'Executed pnpm test',
      command: 'pnpm test',
    });

    expect(message.type).toBe('toolEvent');
    if (message.type !== 'toolEvent') {
      throw new Error('expected toolEvent message');
    }
    expect(message.event.kind).toBe('exec');
    expect(message.event.toolId).toBe('tool-1');
  });
});
