import { describe, expect, it } from 'vitest';
import { buildOperationalFeedViewModel } from './operationalFeed.js';
import type { MessagesContext } from '../messageTypes.js';

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
    setStreaming: () => undefined,
    activeChatId: () => 'chat-1',
    curElByChat: {},
    assistantTurnByChat: {},
    msgIndexRef: { value: 0 },
    saveState: () => undefined,
    activityStateByChat: {
      'chat-1': {
        'tool-read': {
          toolId: 'tool-read',
          title: 'Read src/app.ts',
          status: 'done',
          runState: 'done',
          eventKind: 'read',
          file: 'src/app.ts',
          kind: 'tool',
        },
        'tool-search': {
          toolId: 'tool-search',
          title: 'Searched for openclaw in src',
          status: 'done',
          runState: 'done',
          eventKind: 'search',
          query: 'openclaw',
          scope: 'src',
          kind: 'tool',
        },
        'tool-exec': {
          toolId: 'tool-exec',
          title: 'Executed pnpm test',
          status: 'done',
          runState: 'done',
          eventKind: 'exec',
          command: 'pnpm test',
          exitCode: 0,
          kind: 'tool',
        },
      },
    },
    activityStartedAtByChat: {},
    activityCollapsedByChat: {},
    activityDisclosureOpenByChat: { 'chat-1': { 'tool-exec': true } },
    latestChangeSetByChat: {},
  };
}

describe('buildOperationalFeedViewModel', () => {
  it('renders exploration and shell blocks from semantic state only', () => {
    const vm = buildOperationalFeedViewModel(createContext(), 'chat-1');

    expect(vm.exploration?.rows).toHaveLength(2);
    expect(vm.exploration?.rows[0].label).toBe('Read app.ts');
    expect(vm.exploration?.rows[1].label).toBe('Searched for openclaw in src');
    expect(vm.shell?.rows[0].command).toBe('pnpm test');
    expect(vm.shell?.rows[0].open).toBe(true);
  });
});
