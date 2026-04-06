export function buildWebviewBootstrapErrorHtml(detail: string): string {
  const safeDetail = String(detail).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 16px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background);">
  <h3>OpenClaw webview failed to initialize</h3>
  <pre style="white-space: pre-wrap;">${safeDetail}</pre>
</body>
</html>`;
}
