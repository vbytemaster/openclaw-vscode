import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage } from '../../dto/webview/outgoing';
import { getChatHtml } from '../html';

export function configureChatWebview(
  webviewView: vscode.WebviewView,
  extensionUri: vscode.Uri,
): void {
  webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots: [extensionUri],
  };
}

export function buildChatWebviewHtml(
  webviewView: vscode.WebviewView | undefined,
  extensionUri: vscode.Uri,
  fileState: any[] | undefined,
  activeAgentId: string,
): string {
  const scriptUri = webviewView
    ? webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'out-webview', 'webview', 'chat.js'),
    ).toString()
    : '';
  const config = vscode.workspace.getConfiguration('openclaw-vscode');
  return getChatHtml(fileState, activeAgentId, scriptUri, {
    streamStartTimeoutMs: config.get<number>('chat.streamStartTimeoutMs', 60000),
    streamInactivityTimeoutMs: config.get<number>('chat.streamInactivityTimeoutMs', 600000),
  });
}

export function postToChatWebview(
  webviewView: vscode.WebviewView | undefined,
  message: ExtensionToWebviewMessage,
): void {
  void webviewView?.webview.postMessage(message);
}
