import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildMessageContent, normalizeThinkingLevel } from './sendFlowHelpers.js';

describe('sendFlow helpers', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('normalizes thinking level without leaking auto into the transport layer', () => {
    expect(normalizeThinkingLevel('HIGH')).toBe('high');
    expect(normalizeThinkingLevel('auto')).toBeNull();
    expect(normalizeThinkingLevel(undefined)).toBeNull();
  });

  it('builds message content from structured refs and persisted images', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-sendflow-'));
    tempDirs.push(workspaceRoot);

    const content = buildMessageContent(
      'Please inspect this',
      ['ref-1'],
      ['data:image/png;base64,AA=='],
      new Map([
        ['ref-1', {
          file: 'src/app.ts',
          startLine: 2,
          endLine: 4,
          content: 'const answer = 42;',
        }],
      ]),
      workspaceRoot,
    );

    expect(content).toContain('[src/app.ts:2-4]');
    expect(content).toContain('const answer = 42;');
    expect(content).toContain('[Attached image: .openclaw/images/');

    const imagesDir = path.join(workspaceRoot, '.openclaw', 'images');
    expect(fs.readdirSync(imagesDir).length).toBe(1);
  });
});
