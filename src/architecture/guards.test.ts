import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');

function collectFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('architecture guards', () => {
  it('keeps src/contracts/chatEvents.ts out of implementation imports', () => {
    const offenders = collectFiles(srcRoot)
      .filter((file) => !file.includes(`${path.sep}contracts${path.sep}`))
      .filter((file) => fs.readFileSync(file, 'utf8').includes('contracts/chatEvents'));

    expect(offenders).toEqual([]);
  });

  it('keeps gateway DTOs out of webview implementation', () => {
    const webviewRoot = path.join(srcRoot, 'webview');
    const offenders = collectFiles(webviewRoot)
      .filter((file) => fs.readFileSync(file, 'utf8').includes('/dto/gateway/'));

    expect(offenders).toEqual([]);
  });
});
