import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const stalePaths = [
  path.join(root, 'out', 'webview', 'webview'),
  path.join(root, 'out', 'webview', 'contracts'),
  path.join(root, 'out-webview'),
];

for (const target of stalePaths) {
  fs.rmSync(target, { recursive: true, force: true });
}
