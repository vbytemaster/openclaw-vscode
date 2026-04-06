import { describe, expect, it } from 'vitest';
import {
  asExtensionMessage,
  buildErrorMessage,
  buildStreamEndMessage,
  buildStreamStartMessage,
} from './webviewMessages.js';

describe('webview message builders', () => {
  it('builds a stream start message with optional agent id', () => {
    expect(buildStreamStartMessage('chat-1', 'main')).toEqual({
      type: 'streamStart',
      chatId: 'chat-1',
      agentId: 'main',
    });
  });

  it('builds a stream end message with change-set payload', () => {
    const message = buildStreamEndMessage('chat-1', {
      id: 'chg-1',
      files: [],
      totals: { files: 0, added: 0, removed: 0 },
    }, true);

    expect(message.type).toBe('streamEnd');
    expect(message.canRevert).toBe(true);
    expect(message.changeSet?.id).toBe('chg-1');
  });

  it('validates arbitrary extension messages through asExtensionMessage', () => {
    expect(asExtensionMessage(buildErrorMessage('boom', 'chat-2'))).toEqual({
      type: 'error',
      text: 'boom',
      chatId: 'chat-2',
    });
  });
});
