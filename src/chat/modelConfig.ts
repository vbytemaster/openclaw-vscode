import * as fs from 'fs';
import * as path from 'path';

function prettyModelLabel(raw: string): string {
  const r = (raw || '').trim();
  if (!r) return raw;
  const idx = r.indexOf('/');
  const model = idx >= 0 ? r.slice(idx + 1) : r;
  const familyMap: Array<[RegExp, string]> = [
    [/^claude-/i, 'Claude'],
    [/^gpt-/i, 'GPT'],
    [/^gemini-/i, 'Gemini'],
    [/^o(\d)/i, 'O'],
    [/^deepseek-/i, 'DeepSeek'],
    [/^llama-/i, 'Llama'],
    [/^codex-/i, 'Codex'],
  ];
  for (const [re, family] of familyMap) {
    if (re.test(model)) {
      const rest = model
        .replace(re, '')
        .replace(/-/g, ' ')
        .replace(/\./g, '___DOT___')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/___DOT___/g, '.')
        .trim();
      if (family === 'O') {
        const oRest = model
          .replace(/^o/i, '')
          .replace(/-/g, ' ')
          .replace(/\./g, '___DOT___')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace(/___DOT___/g, '.')
          .trim();
        return `O${oRest}`;
      }
      return rest ? `${family} ${rest}` : `${family} ${model}`;
    }
  }
  return model
    .replace(/-/g, ' ')
    .replace(/\./g, '___DOT___')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/___DOT___/g, '.')
    .trim();
}

export function extractModelsFromConfig(workspaceRoot: string | null, agentId: string): Array<{ value: string; label: string }> {
  void agentId;
  const homedir = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [path.join(homedir, '.openclaw', 'openclaw.json')];
  if (workspaceRoot) candidates.unshift(path.join(workspaceRoot, '.openclaw', 'openclaw.json'));

  let cfg: any = null;
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      }
    } catch {
      continue;
    }
  }
  if (!cfg) return [];

  const models: Array<{ value: string; label: string }> = [];
  const agentModels = cfg?.agents?.defaults?.models;
  if (agentModels && typeof agentModels === 'object') {
    for (const [modelId] of Object.entries(agentModels)) {
      models.push({ value: modelId, label: prettyModelLabel(modelId) });
    }
  }

  const fallbacks = cfg?.agents?.defaults?.model?.fallbacks;
  if (Array.isArray(fallbacks)) {
    for (const fb of fallbacks) {
      if (typeof fb === 'string' && !models.some((m) => m.value === fb)) {
        models.push({ value: fb, label: prettyModelLabel(fb) });
      }
    }
  }

  return models;
}
