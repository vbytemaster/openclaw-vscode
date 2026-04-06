import { getWebviewShellHtml } from '../webview/shell/layout';

export function getChatHtml(
  fileState: unknown[] | undefined,
  agentId: string,
  scriptUri: string,
  runtimeConfig?: { streamStartTimeoutMs?: number; streamInactivityTimeoutMs?: number }
): string {
  return getWebviewShellHtml(fileState, agentId, scriptUri, runtimeConfig);
}
