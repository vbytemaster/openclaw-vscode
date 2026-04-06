import { describe, expect, it, vi } from 'vitest';
import { createMessagesContextFactory } from './messageContextFactory.js';

describe('createMessagesContextFactory', () => {
  it('returns a bridge-ready context with persisted wiring', () => {
    const refreshModelPicker = vi.fn();
    const insertChip = vi.fn();
    const restoreSelection = vi.fn();
    const clearActiveMessages = vi.fn();

    const factory = createMessagesContextFactory({
      msgsEl: {} as HTMLElement,
      editorEl: {} as HTMLElement,
      agentSel: null,
      transientThinkingEl: {} as HTMLElement,
      curElByChat: {},
      assistantTurnByChat: {},
      activityStateByChat: {},
      activityStartedAtByChat: {},
      activityCollapsedByChat: {},
      activityDisclosureOpenByChat: {},
      latestChangeSetByChat: {},
      modelLabelByValue: () => ({ opus: 'Claude Opus' }),
      msgIndexRef: { value: 3 },
      activeChatId: () => 'chat-1',
      setStreaming: vi.fn(),
      renderAssistant: (text) => text,
      esc: (text) => text,
      prettyModelName: (value) => value,
      saveState: vi.fn(),
      refreshModelPicker,
      getAgentForChat: () => 'main',
      persistAssistantToChat: vi.fn(),
      insertChip,
      restoreSelection,
      getSavedRange: () => null,
      setSavedRange: vi.fn(),
      addMsg: vi.fn(),
      clearActiveMessages,
      streamLifecycleHandle: vi.fn(),
      debug: vi.fn(),
    });

    const ctx = factory();

    expect(ctx.modelLabelByValue).toEqual({ opus: 'Claude Opus' });
    expect(ctx.refreshModelPicker).toBe(refreshModelPicker);
    expect(ctx.insertChip).toBe(insertChip);
    expect(ctx.restoreSelection).toBe(restoreSelection);
    expect(ctx.clearActiveMessages).toBe(clearActiveMessages);
    expect(ctx.parseMessage({ type: 'error', text: 'boom' }).type).toBe('error');
  });
});
