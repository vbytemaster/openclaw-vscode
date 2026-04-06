import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: () => ({
      appendLine: () => undefined,
      show: () => undefined,
    }),
  },
}));

import { handleWebviewMessage } from './webviewBridge.js';

function createHandlers() {
  return {
    onSend: vi.fn(),
    onClear: vi.fn(),
    onDeleteChat: vi.fn(),
    onInsertCode: vi.fn(),
    onAttachFile: vi.fn(),
    onPasteCheck: vi.fn(),
    onOpenResponseInEditor: vi.fn(),
    onSaveChatState: vi.fn(),
    onFetchModels: vi.fn(),
    onFetchAgents: vi.fn(),
    onSetAgent: vi.fn(),
    onCancel: vi.fn(),
    onRevertLatestChange: vi.fn(),
    onDebug: vi.fn(),
  };
}

describe('handleWebviewMessage', () => {
  it('dispatches validated send messages to the send handler', async () => {
    const handlers = createHandlers();
    await handleWebviewMessage({
      type: 'send',
      text: 'Hello',
      refs: [],
      chatId: 'chat-1',
    }, handlers);

    expect(handlers.onSend).toHaveBeenCalledTimes(1);
    expect(handlers.onSend.mock.calls[0][0].text).toBe('Hello');
  });

  it('ignores invalid payloads without calling any handler', async () => {
    const handlers = createHandlers();
    await handleWebviewMessage({ type: 'send', refs: [] }, handlers);

    expect(handlers.onSend).not.toHaveBeenCalled();
    expect(handlers.onClear).not.toHaveBeenCalled();
    expect(handlers.onDebug).not.toHaveBeenCalled();
  });
});
