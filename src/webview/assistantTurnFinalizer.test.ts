import { describe, expect, it, vi } from 'vitest';
import { finalizeAssistantTurn } from './assistantTurnFinalizer.js';
import type { MessagesContext } from './messageTypes.js';

describe('finalizeAssistantTurn', () => {
  it('persists completed assistant turns for inactive chats and clears transient state', () => {
    const persistAssistantToChat = vi.fn();
    const saveState = vi.fn();
    const ctx: MessagesContext = {
      msgsEl: {} as HTMLElement,
      editorEl: { focus: vi.fn() } as unknown as HTMLElement,
      agentSel: null,
      transientThinkingEl: {} as HTMLElement,
      renderAssistant: (text) => text,
      esc: (text) => text,
      prettyModelName: (value) => value,
      modelLabelByValue: {},
      setStreaming: vi.fn(),
      activeChatId: () => 'chat-active',
      curElByChat: {},
      assistantTurnByChat: {
        'chat-other': {
          rawText: 'Completed answer',
          model: 'opus',
          changeSet: null,
        },
      },
      msgIndexRef: { value: 0 },
      saveState,
      persistAssistantToChat,
      activityStateByChat: {
        'chat-other': {},
      },
      activityStartedAtByChat: {
        'chat-other': Date.now(),
      },
      activityCollapsedByChat: {},
      activityDisclosureOpenByChat: {},
      latestChangeSetByChat: {},
      debug: vi.fn(),
    };

    finalizeAssistantTurn(ctx, {
      type: 'streamEnd',
      chatId: 'chat-other',
    });

    expect(persistAssistantToChat).toHaveBeenCalledWith(
      'chat-other',
      'Completed answer',
      'opus',
      1,
      null,
      false,
    );
    expect(ctx.assistantTurnByChat['chat-other'].rawText).toBe('');
    expect(saveState).toHaveBeenCalled();
  });
});
