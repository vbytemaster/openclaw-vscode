import { describe, expect, it, vi } from 'vitest';
import { applyToolEvent } from './toolEventMessages.js';
import type { MessagesContext } from './messageTypes.js';

function createContext(): MessagesContext {
  return {
    msgsEl: {} as HTMLElement,
    editorEl: {} as HTMLElement,
    agentSel: null,
    transientThinkingEl: {} as HTMLElement,
    renderAssistant: (text) => text,
    esc: (text) => text,
    prettyModelName: (value) => value,
    modelLabelByValue: {},
    setStreaming: vi.fn(),
    activeChatId: () => 'chat-1',
    curElByChat: {},
    assistantTurnByChat: {},
    msgIndexRef: { value: 0 },
    saveState: vi.fn(),
    activityStateByChat: {},
    activityStartedAtByChat: {},
    activityCollapsedByChat: {},
    activityDisclosureOpenByChat: {},
    latestChangeSetByChat: {},
    debug: vi.fn(),
  };
}

describe('applyToolEvent', () => {
  it('stores normalized semantic fields without parsing display text', () => {
    const ctx = createContext();

    const changed = applyToolEvent(ctx, {
      type: 'toolEvent',
      event: {
        kind: 'read',
        chatId: 'chat-1',
        toolId: 'tool-1',
        toolName: 'read',
        status: 'done',
        runState: 'done',
        title: 'Read src/app.ts',
        detail: 'display detail only',
        file: 'src/app.ts',
      },
    });

    expect(changed).toBe(true);
    expect(ctx.activityStateByChat['chat-1']['tool-1'].file).toBe('src/app.ts');
    expect(ctx.activityStateByChat['chat-1']['tool-1'].title).toBe('Read src/app.ts');
  });

  it('preserves prior semantic kind when an unknown update arrives for the same tool', () => {
    const ctx = createContext();
    applyToolEvent(ctx, {
      type: 'toolEvent',
      event: {
        kind: 'read',
        chatId: 'chat-1',
        toolId: 'tool-1',
        toolName: 'read',
        status: 'running',
        runState: 'running',
        title: 'Read src/app.ts',
        file: 'src/app.ts',
      },
    });

    applyToolEvent(ctx, {
      type: 'toolEvent',
      event: {
        kind: 'unknown',
        chatId: 'chat-1',
        toolId: 'tool-1',
        toolName: 'custom',
        status: 'done',
        runState: 'done',
        title: 'Some display text',
      },
    });

    expect(ctx.activityStateByChat['chat-1']['tool-1'].eventKind).toBe('read');
    expect(ctx.activityStateByChat['chat-1']['tool-1'].file).toBe('src/app.ts');
  });
});
