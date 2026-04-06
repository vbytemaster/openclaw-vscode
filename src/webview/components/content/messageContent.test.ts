import { describe, expect, it } from 'vitest';
import { renderPersistedChatMessage } from './messageContent.js';

describe('renderPersistedChatMessage', () => {
  const renderAssistant = (text: string) => `<article>${text}</article>`;
  const renderAssistantActions = () => '<footer>actions</footer>';
  const esc = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  it('renders assistant messages from rawText instead of legacy html', () => {
    const rendered = renderPersistedChatMessage({
      message: {
        role: 'assistant',
        rawText: 'Structured answer',
        html: '<div>Legacy html should not render</div>',
      },
      renderAssistant,
      renderAssistantActions,
      chatId: 'chat-1',
      esc,
    });

    expect(rendered).toContain('<article>Structured answer</article>');
    expect(rendered).toContain('<footer>actions</footer>');
    expect(rendered).not.toContain('Legacy html should not render');
  });

  it('renders error messages from rawText only', () => {
    const rendered = renderPersistedChatMessage({
      message: {
        role: 'error',
        rawText: 'Boom <tag>',
        html: '<div>Old fallback</div>',
      },
      renderAssistant,
      renderAssistantActions,
      chatId: 'chat-1',
      esc,
    });

    expect(rendered).toBe('Boom &lt;tag&gt;');
  });
});
