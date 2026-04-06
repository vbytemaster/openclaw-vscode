import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

export type FileSnapshot = {
  text: string | null;
};

export type WorkspaceSnapshot = Map<string, FileSnapshot>;

export type ChangedFile = {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  added: number;
  removed: number;
  patch: string;
  beforeText?: string;
  afterText?: string;
};

export type TurnChangeSet = {
  id: string;
  files: ChangedFile[];
  totals: {
    files: number;
    added: number;
    removed: number;
  };
};

function shouldSkipSnapshotEntry(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  if (parts.includes('.git')) return true;
  if (parts.includes('node_modules')) return true;
  if (parts[0] === 'out') return true;
  if (parts[0] === '.openclaw') return true;
  if (parts[0] === 'vscode' && parts[1] === 'identity') return true;
  if (parts[0] === 'agents' && parts[2] === 'sessions') return true;
  if (parts[0] === 'workspace' && parts[1] === 'agents' && parts[3] === 'sessions') return true;
  return false;
}

function isProbablyText(data: Buffer): boolean {
  const probe = data.subarray(0, Math.min(data.length, 4096));
  for (const byte of probe) {
    if (byte === 0) return false;
  }
  return true;
}

export function takeWorkspaceSnapshot(wsRoot: string | null): WorkspaceSnapshot {
  const snapshot: WorkspaceSnapshot = new Map();
  if (!wsRoot || !fs.existsSync(wsRoot)) return snapshot;

  const walk = (dir: string) => {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      const relPath = path.relative(wsRoot, absPath).replace(/\\/g, '/');
      if (!relPath) continue;
      if (shouldSkipSnapshotEntry(relPath)) continue;
      if (entry.isDirectory()) {
        walk(absPath);
        continue;
      }
      let stat: fs.Stats;
      try {
        stat = fs.statSync(absPath);
      } catch {
        continue;
      }
      if (!stat.isFile() || stat.size > 262144) continue;
      let data: Buffer;
      try {
        data = fs.readFileSync(absPath);
      } catch {
        continue;
      }
      if (!isProbablyText(data)) continue;
      snapshot.set(relPath, { text: data.toString('utf8') });
    }
  };

  walk(wsRoot);
  return snapshot;
}

function extractPatchBody(diffText: string): string {
  const lines = diffText.replace(/\r/g, '').split('\n');
  const start = lines.findIndex((line) => line.startsWith('@@'));
  if (start >= 0) return lines.slice(start).join('\n').trim();
  return lines
    .filter((line) => !line.startsWith('diff --git') && !line.startsWith('index ') && !line.startsWith('--- ') && !line.startsWith('+++ '))
    .join('\n')
    .trim();
}

function fallbackPatch(beforeText: string | null, afterText: string | null): string {
  const beforeLines = (beforeText ?? '').split('\n');
  const afterLines = (afterText ?? '').split('\n');
  return ['@@', ...beforeLines.map((line) => `-${line}`), ...afterLines.map((line) => `+${line}`)].join('\n').trim();
}

function buildPatch(relPath: string, beforeText: string | null, afterText: string | null): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-diff-'));
  const beforeFile = path.join(tmpDir, 'before.txt');
  const afterFile = path.join(tmpDir, 'after.txt');

  try {
    fs.writeFileSync(beforeFile, beforeText ?? '', 'utf8');
    fs.writeFileSync(afterFile, afterText ?? '', 'utf8');
    const out = execFileSync('git', [
      'diff',
      '--no-index',
      '--no-ext-diff',
      '--unified=3',
      '--label',
      `a/${relPath}`,
      '--label',
      `b/${relPath}`,
      beforeFile,
      afterFile,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const patch = extractPatchBody(out);
    return patch || fallbackPatch(beforeText, afterText);
  } catch (error: any) {
    const stdout = typeof error?.stdout === 'string'
      ? error.stdout
      : Buffer.isBuffer(error?.stdout)
        ? error.stdout.toString('utf8')
        : '';
    const patch = stdout ? extractPatchBody(stdout) : '';
    return patch || fallbackPatch(beforeText, afterText);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

function countPatchStats(patch: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) added += 1;
    if (line.startsWith('-')) removed += 1;
  }
  return { added, removed };
}

export function computeChangeSet(before: WorkspaceSnapshot | undefined, after: WorkspaceSnapshot): TurnChangeSet | undefined {
  if (!before) return undefined;
  const allPaths = new Set<string>([...before.keys(), ...after.keys()]);
  const files: ChangedFile[] = [];

  for (const relPath of Array.from(allPaths).sort()) {
    const beforeText = before.get(relPath)?.text ?? null;
    const afterText = after.get(relPath)?.text ?? null;
    if (beforeText === afterText) continue;

    const status: ChangedFile['status'] =
      beforeText == null ? 'added' :
      afterText == null ? 'deleted' :
      'modified';
    const patch = buildPatch(relPath, beforeText, afterText);
    const stats = countPatchStats(patch);
    files.push({
      path: relPath,
      status,
      added: stats.added,
      removed: stats.removed,
      patch,
      beforeText: beforeText ?? undefined,
      afterText: afterText ?? undefined,
    });
  }

  if (!files.length) return undefined;

  return {
    id: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    files,
    totals: {
      files: files.length,
      added: files.reduce((sum, file) => sum + file.added, 0),
      removed: files.reduce((sum, file) => sum + file.removed, 0),
    },
  };
}

export function isChangeSetRevertible(wsRoot: string | null, changeSet: TurnChangeSet): boolean {
  if (!wsRoot) return false;
  for (const file of changeSet.files) {
    const absPath = path.join(wsRoot, file.path);
    const currentText = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf8') : null;
    if (currentText !== (file.afterText ?? null)) return false;
  }
  return true;
}

export function revertChangeSet(wsRoot: string | null, changeSet: TurnChangeSet): boolean {
  if (!wsRoot) return false;
  try {
    for (const file of changeSet.files) {
      const absPath = path.join(wsRoot, file.path);
      if (file.status === 'added') {
        if (fs.existsSync(absPath)) fs.rmSync(absPath, { force: true });
        continue;
      }
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, file.beforeText ?? '', 'utf8');
    }
    return true;
  } catch {
    return false;
  }
}
