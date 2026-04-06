import { afterEach, describe, expect, it, vi } from 'vitest';
import { createActivityDisclosureController } from './activityDisclosure.js';

describe('createActivityDisclosureController', () => {
  const previousWindow = globalThis.window;

  afterEach(() => {
    vi.restoreAllMocks();
    if (previousWindow) {
      globalThis.window = previousWindow;
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  });

  it('stores disclosure state per chat and rerenders the active chat', () => {
    const rerenderTransient = vi.fn();
    (globalThis as unknown as { window?: Window & typeof globalThis }).window = {
      setTimeout: (cb: TimerHandler) => {
        if (typeof cb === 'function') cb();
        return 0;
      },
    } as unknown as Window & typeof globalThis;

    const activityDisclosureOpenByChat: Record<string, Record<string, boolean>> = {};
    const controller = createActivityDisclosureController({
      activeChatId: () => 'chat-1',
      activityCollapsedByChat: {},
      activityDisclosureOpenByChat,
      rerenderTransient,
    });

    controller.syncDisclosureState({
      dataset: { chatId: 'chat-1', disclosureId: 'tool-1' },
      open: true,
    } as unknown as HTMLDetailsElement as HTMLElement);

    expect(activityDisclosureOpenByChat['chat-1']).toEqual({ 'tool-1': true });
    expect(rerenderTransient).toHaveBeenCalledWith('chat-1');
  });
});
