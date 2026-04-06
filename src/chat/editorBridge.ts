import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { CodeReference } from '../shared/types';
import type { ExtensionToWebviewMessage } from '../dto/webview/outgoing';

type RegisterCodeReference = (ref: CodeReference) => {
  refId: string;
  label: string;
  file: string;
  startLine: number;
  endLine: number;
};

type PostMessage = (msg: ExtensionToWebviewMessage) => void;

export function checkPasteAgainstVisibleSelections(
  text: string,
  registerCodeReference: RegisterCodeReference,
  postMessage: PostMessage,
): void {
  for (const editor of vscode.window.visibleTextEditors) {
    if (editor.selection.isEmpty) continue;
    const selected = editor.document.getText(editor.selection);
    if (selected !== text) continue;

    const fileName = vscode.workspace.asRelativePath(editor.document.uri);
    const startLine = editor.selection.start.line + 1;
    const endLine = editor.selection.end.line + 1;
    const ref = registerCodeReference({ file: fileName, startLine, endLine, content: text });
    postMessage({
      type: 'pasteResult',
      isCode: true,
      refId: ref.refId,
      label: ref.label,
    });
    return;
  }

  postMessage({ type: 'pasteResult', isCode: false, text });
}

export function cleanupAttachedImages(workspaceRoot: string | null, messageContent: string): void {
  if (!workspaceRoot) return;
  const regex = /\[Attached image: ([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(messageContent)) !== null) {
    const relPath = match[1];
    const absPath = path.join(workspaceRoot, relPath);
    try {
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    } catch {
      // ignore cleanup failures
    }
  }
}

export async function openResponseInEditor(workspaceRoot: string | null, text: string, msgIndex: number): Promise<void> {
  if (!workspaceRoot) return;

  const responsesDir = path.join(workspaceRoot, '.openclaw', 'responses');
  if (!fs.existsSync(responsesDir)) fs.mkdirSync(responsesDir, { recursive: true });

  const fileName = `response-${msgIndex}.md`;
  const filePath = path.join(responsesDir, fileName);
  fs.writeFileSync(filePath, text, 'utf8');

  const uri = vscode.Uri.file(filePath);
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, {
    viewColumn: vscode.ViewColumn.One,
    preview: true,
  });

  const lastLine = doc.lineCount - 1;
  const lastChar = doc.lineAt(lastLine).text.length;
  editor.selection = new vscode.Selection(0, 0, lastLine, lastChar);
  editor.revealRange(editor.selection);
}

export function insertActiveEditorContext(
  registerCodeReference: RegisterCodeReference,
  postMessage: PostMessage,
): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    postMessage({ type: 'error', text: 'No active editor' });
    return;
  }

  const selection = editor.selection;
  const fileName = vscode.workspace.asRelativePath(editor.document.uri);
  let startLine: number;
  let endLine: number;
  let content: string;

  if (!selection.isEmpty) {
    startLine = selection.start.line + 1;
    endLine = selection.end.line + 1;
    content = editor.document.getText(selection);
  } else {
    const range = editor.visibleRanges[0];
    startLine = range.start.line + 1;
    endLine = range.end.line + 1;
    content = editor.document.getText(range);
  }

  const ref = registerCodeReference({ file: fileName, startLine, endLine, content });
  postMessage({
    type: 'codeRef',
    refId: ref.refId,
    label: ref.label,
    file: ref.file,
    startLine: ref.startLine,
    endLine: ref.endLine,
  });
}

export async function attachFileFromDialog(
  registerCodeReference: RegisterCodeReference,
  postMessage: PostMessage,
): Promise<void> {
  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'Attach',
    filters: { 'All files': ['*'] },
  });
  if (!uris || uris.length === 0) return;

  const uri = uris[0];
  const fileName = vscode.workspace.asRelativePath(uri);
  const stat = await vscode.workspace.fs.stat(uri);
  const ext = path.extname(uri.fsPath).toLowerCase();
  const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext);

  if (isImage) {
    const ref = registerCodeReference({ file: fileName, startLine: 0, endLine: 0, content: `[image: ${fileName}]` });
    postMessage({
      type: 'codeRef',
      refId: ref.refId,
      label: ref.label,
      file: ref.file,
      startLine: ref.startLine,
      endLine: ref.endLine,
    });
    return;
  }

  if (stat.size >= 100000) {
    postMessage({ type: 'error', text: `File too large: ${fileName} (${Math.round(stat.size / 1024)}KB)` });
    return;
  }

  const data = await vscode.workspace.fs.readFile(uri);
  const content = Buffer.from(data).toString('utf8');
  const lines = content.split('\n').length;
  const ref = registerCodeReference({ file: fileName, startLine: 1, endLine: lines, content });
  postMessage({
    type: 'codeRef',
    refId: ref.refId,
    label: ref.label,
    file: ref.file,
    startLine: ref.startLine,
    endLine: ref.endLine,
  });
}
