import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../shared/logger';

export function startOpenClawConfigWatcher(params: {
  onConfigChange: () => void;
  debounceMs?: number;
}): {
  dispose: () => void;
} {
  const homedir = process.env.HOME || process.env.USERPROFILE || '';
  const configPath = path.join(homedir, '.openclaw', 'openclaw.json');
  let watcher: fs.FSWatcher | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    if (!fs.existsSync(configPath)) {
      return { dispose: () => {} };
    }

    watcher = fs.watch(configPath, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        logger.info('[config-watcher] openclaw.json changed, refreshing models & agents');
        params.onConfigChange();
      }, params.debounceMs ?? 500);
    });
  } catch (err) {
    logger.warn('[config-watcher] Failed to watch openclaw.json');
  }

  return {
    dispose: () => {
      if (watcher) watcher.close();
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}
