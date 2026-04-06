import { describe, expect, it } from 'vitest';
import { migrateLegacyChatMessage } from './migration.js';

describe('migrateLegacyChatMessage', () => {
  it('hydrates rawText and structured preview fields from legacy html', () => {
    const message = migrateLegacyChatMessage({
      role: 'user',
      rawText: '',
      html: '<img src="data:image/png;base64,abc"><br><span class="code-ref-tag">≡ src/app.ts</span><div>Hello &lt;world&gt;</div>',
    });

    expect(message.rawText).toContain('Hello <world>');
    expect(message.imgPreviews).toEqual(['data:image/png;base64,abc']);
    expect(message.chipLabels).toEqual(['src/app.ts']);
  });

  it('keeps structured runtime fields authoritative when rawText already exists', () => {
    const message = migrateLegacyChatMessage({
      role: 'assistant',
      rawText: 'Structured response',
      html: '<div>Legacy fallback</div>',
    });

    expect(message.rawText).toBe('Structured response');
    expect(message.imgPreviews).toBeUndefined();
    expect(message.chipLabels).toBeUndefined();
  });
});
