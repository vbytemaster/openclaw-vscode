import * as path from 'path';
import { execSync } from 'child_process';

function runGit(cwd: string, command: string): string {
  try {
    return execSync(command, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
  } catch {
    return '';
  }
}

export function detectWorkspaceContext(
  workspaceRoot: string,
  activeDocumentPath: string | undefined,
  agentId: string,
  chatId: string,
): string {
  const runtimeWorkspaceRoot = '/home/node/.openclaw/workspace';
  const localWorkspaceAnchor = `${path.sep}.openclaw${path.sep}workspace${path.sep}`;

  const toRuntimeRelative = (value: string): string => {
    const normalized = value.replace(/\\/g, '/');
    const anchorIndex = normalized.indexOf('/.openclaw/workspace/');
    if (anchorIndex >= 0) {
      const relative = normalized.slice(anchorIndex + '/.openclaw/workspace/'.length);
      return relative || '.';
    }
    const rel = path.relative(workspaceRoot, value).replace(/\\/g, '/');
    if (!rel || rel === '') return '.';
    if (rel.startsWith('..')) return normalized;
    return rel;
  };

  const openedProjectPath = activeDocumentPath || workspaceRoot;
  const gitRoot = runGit(openedProjectPath, 'git rev-parse --show-toplevel') || openedProjectPath;
  const repoName = path.basename(gitRoot);
  const branch = runGit(gitRoot, 'git branch --show-current');
  const origin = runGit(gitRoot, 'git remote get-url origin');
  const openedProjectRelativePath = toRuntimeRelative(openedProjectPath);
  const repoRootRelativePath = toRuntimeRelative(gitRoot);

  const lines = [
    'OpenClaw VS Code startup context (auto-injected):',
    `- agentId: ${agentId}`,
    `- chatId: ${chatId}`,
    `- workspaceRoot: . (${runtimeWorkspaceRoot})`,
    `- openedProjectPath: ${openedProjectRelativePath}`,
    `- repoRoot: ${repoRootRelativePath}`,
    `- repoName: ${repoName}`,
    `- gitBranch: ${branch || 'unknown'}`,
    `- gitOrigin: ${origin || 'unknown'}`,
    '',
    'Instruction: Use this workspace/repository context for this chat session.',
    `Instruction: Treat workspaceRoot as the current workspace root (.) and prioritize file discovery and edits inside openedProjectPath=${openedProjectRelativePath} first; do not assume host absolute paths are valid inside the agent runtime.`,
    `Instruction: When the user says "project root", use repoRoot=${repoRootRelativePath}; do not default to workspaceRoot unless repoRoot is also '.'.`,
  ];

  return lines.join('\n');
}
