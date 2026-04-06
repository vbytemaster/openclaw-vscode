type DiffStats = { added?: number; removed?: number };

export function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function extractPathLikeString(value?: string): string | undefined {
  if (!value) return undefined;
  const text = value.trim();
  if (!text) return undefined;
  const candidates = [
    ...text.matchAll(/(?:\/[\w.@~+-]+)+(?:\/[\w.@~+-]+)*/g),
    ...text.matchAll(/\b[\w.-]+\.[A-Za-z0-9]{1,8}\b/g),
  ].map((match) => match[0]).filter(Boolean);
  return candidates[0];
}

export function firstStringFromObject(obj: any, keys: string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function firstStringFromArray(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const entry of value) {
    if (typeof entry === 'string' && entry.trim()) return entry.trim();
    if (entry && typeof entry === 'object') {
      const candidate = firstStringFromObject(entry, ['path', 'file', 'name', 'target']);
      if (candidate) return candidate;
    }
  }
  return undefined;
}

export function nestedObjects(obj: any): any[] {
  if (!obj || typeof obj !== 'object') return [];
  return [
    obj,
    obj.arguments,
    obj.args,
    obj.input,
    obj.result,
    obj.output,
    obj.payload,
    obj.meta,
    obj.metadata,
    obj.options,
    obj.parameters,
    obj.params,
    obj.data,
  ].filter((value) => value && typeof value === 'object');
}

function joinStringArray(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const parts = value
    .map((entry) => {
      if (typeof entry === 'string' && entry.trim()) return entry.trim();
      if (entry && typeof entry === 'object') {
        return firstStringFromObject(entry, ['value', 'path', 'file', 'target', 'name']);
      }
      return undefined;
    })
    .filter((entry): entry is string => Boolean(entry));
  if (!parts.length) return undefined;
  return parts.join(' ');
}

function firstNumberFromObject(obj: any, keys: string[]): number | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return undefined;
}

export function extractToolTarget(data: any): string | undefined {
  const objects = nestedObjects(data);
  for (const obj of objects) {
    const direct = firstStringFromObject(obj, [
      'path', 'file', 'target', 'name',
      'file_path',
      'filePath', 'filepath', 'filename',
      'file_name', 'outputPath', 'output_path',
      'destinationPath', 'destination_path',
      'newPath', 'new_path',
      'oldPath', 'old_path',
      'uri', 'cwd', 'root', 'dir', 'workspace',
      'workingDirectory', 'working_directory',
      'relativePath', 'relative_path',
      'source', 'destination', 'dest',
      'url',
    ]);
    if (direct) return direct;
    const fromArrays = firstString(
      firstStringFromArray(obj?.paths),
      firstStringFromArray(obj?.files),
      firstStringFromArray(obj?.targets),
      firstStringFromArray(obj?.uris),
      firstStringFromArray(obj?.sources),
    );
    if (fromArrays) return fromArrays;
    const fromText = firstString(
      extractPathLikeString(firstStringFromObject(obj, ['detail', 'message', 'description', 'text'])),
      extractPathLikeString(typeof obj === 'string' ? obj : undefined),
    );
    if (fromText) return fromText;
  }
  return undefined;
}

export function extractToolCommand(data: any): string | undefined {
  const objects = nestedObjects(data);
  for (const obj of objects) {
    const direct = firstStringFromObject(obj, [
      'command', 'cmd', 'shellCommand', 'shell',
      'commandLine', 'command_line',
      'script', 'program', 'bash', 'invocation',
      'executable', 'rawCommand', 'raw_command',
      'input',
    ]);
    if (direct) return direct;
    const argv = firstString(
      joinStringArray(obj?.argv),
      joinStringArray(obj?.commandArgs),
      joinStringArray(obj?.argsv),
    );
    if (argv) return argv;
  }
  return undefined;
}

export function extractToolQuery(data: any): string | undefined {
  const objects = nestedObjects(data);
  for (const obj of objects) {
    const direct = firstStringFromObject(obj, [
      'query', 'pattern', 'glob', 'needle', 'search',
      'searchQuery', 'search_query',
      'match', 'text',
    ]);
    if (direct) return direct;
  }
  return undefined;
}

export function extractExitCode(data: any): number | undefined {
  const objects = nestedObjects(data);
  for (const obj of objects) {
    const code = firstNumberFromObject(obj, [
      'exitCode',
      'exit_code',
      'code',
      'statusCode',
      'status_code',
    ]);
    if (typeof code === 'number') return code;
  }
  return undefined;
}

export function extractDiffStats(data: any): DiffStats {
  const objects = nestedObjects(data);
  for (const obj of objects) {
    const added = firstNumberFromObject(obj, ['added', 'additions', 'insertions', 'linesAdded', 'lines_added']);
    const removed = firstNumberFromObject(obj, ['removed', 'deletions', 'linesRemoved', 'lines_removed']);
    if (typeof added === 'number' || typeof removed === 'number') {
      return {
        ...(typeof added === 'number' ? { added } : {}),
        ...(typeof removed === 'number' ? { removed } : {}),
      };
    }
  }
  return {};
}

export function prettifyPath(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/^\/Users\/[^/]+\/\.openclaw\/workspace\//, '')
    .replace(/^\/home\/node\/\.openclaw\/workspace\//, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 5) return normalized;
  return `.../${parts.slice(-4).join('/')}`;
}

export function prettifyCommand(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/^\/Users\/[^/]+\/\.openclaw\/workspace\//g, '')
    .replace(/^\/home\/node\/\.openclaw\/workspace\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 88 ? `${normalized.slice(0, 85)}...` : normalized;
}

export function normalizeTarget(toolName: string, value?: string): string | undefined {
  const target = prettifyPath(value);
  if (!target) return undefined;
  const lowerTool = toolName.toLowerCase();
  const lowerTarget = target.toLowerCase();
  if (lowerTarget === lowerTool) return undefined;
  if (['read', 'write', 'edit', 'exec', 'grep', 'rg'].includes(lowerTarget)) return undefined;
  return target;
}
