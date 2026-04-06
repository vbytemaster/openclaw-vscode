import * as vscode from 'vscode';

class ProbeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'openclawChat';

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = { enableScripts: false };
    webviewView.webview.html = `<!DOCTYPE html>
<html lang="en">
<body style="font-family:sans-serif;padding:16px;color:#ddd;background:#1e1e1e">
  <h2>OpenClaw Static Probe</h2>
  <p>Extension activated and provider resolved.</p>
  <p>Version: 4.0.47</p>
</body>
</html>`;
  }
}

export function activate(context: vscode.ExtensionContext) {
  try {
    const { ChatViewProvider } = require('./chat/provider') as typeof import('./chat/provider');
    const provider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
      provider,
      vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider),
    );
  } catch (error) {
    void vscode.window.showErrorMessage(
      `OpenClaw provider load failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    const provider = new ProbeViewProvider();
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(ProbeViewProvider.viewType, provider),
    );
  }
}

export function deactivate() {}
