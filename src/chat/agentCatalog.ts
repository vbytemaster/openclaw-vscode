import * as fs from 'fs';
import * as path from 'path';
import { extractModelsFromConfig } from './modelConfig';

export function loadAgentIds(workspaceRoot: string | null, activeAgentId: string): string[] {
  const homedir = process.env.HOME || process.env.USERPROFILE || '';

  const configCandidates = [
    path.join(homedir, '.openclaw', 'openclaw.json'),
    ...(workspaceRoot ? [path.join(workspaceRoot, '.openclaw', 'openclaw.json')] : []),
  ];

  const ordered: string[] = [];
  const pushUnique = (idRaw: unknown) => {
    const id = String(idRaw || '').trim();
    if (!id) return;
    if (!ordered.includes(id)) ordered.push(id);
  };

  for (const candidate of configCandidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const cfg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      const agents = cfg?.agents?.list;
      if (Array.isArray(agents)) {
        for (const agent of agents) pushUnique((agent as { id?: unknown })?.id);
      }
      if (ordered.length > 0) break;
    } catch {
      // ignore malformed config and keep searching
    }
  }

  const listCandidates = workspaceRoot
    ? [
        path.join(workspaceRoot, 'agents-list.json'),
        path.join(workspaceRoot, 'openclaw-vscode', 'agents-list.json'),
      ]
    : [];

  for (const candidate of listCandidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      const agents = Array.isArray(parsed) ? parsed : parsed?.agents;
      if (Array.isArray(agents)) {
        for (const agent of agents) pushUnique(agent);
      }
    } catch {
      // ignore malformed fallback file
    }
  }

  const filtered = ordered.filter((id) => id !== 'workroom');
  if (!filtered.length) filtered.push(activeAgentId || 'main');
  return filtered;
}

export function loadModelsForAgent(workspaceRoot: string | null, agentId: string): Array<{ value: string; label: string }> {
  return extractModelsFromConfig(workspaceRoot, agentId);
}
