import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('OpenClaw VS Code');
  }
  return channel;
}

function fmt(level: string, message: string): string {
  return `[${new Date().toISOString()}] [${level}] ${message}`;
}

export const logger = {
  info(message: string) {
    getChannel().appendLine(fmt('INFO', message));
  },
  warn(message: string) {
    getChannel().appendLine(fmt('WARN', message));
  },
  error(message: string, err?: unknown) {
    const details = err instanceof Error ? `\n${err.stack || err.message}` : err ? `\n${String(err)}` : '';
    getChannel().appendLine(fmt('ERROR', `${message}${details}`));
  },
  show(preserveFocus = true) {
    getChannel().show(preserveFocus);
  },
  dispose() {
    channel?.dispose();
    channel = undefined;
  }
};
