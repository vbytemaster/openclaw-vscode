import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ChatViewProvider } from './chat/provider';
import { logger } from './shared/logger';
import {
  FileChangeItem,
  HunkItem,
  TreeNode,
  ChangesProvider,
  getPendingDir,
  showFileDiff,
  showHunkDiff,
  applyFileChange,
  applyHunk,
  rejectHunk,
  rejectFileChange,
  createHunkStatusBar,
  updateHunkContext,
  updateHunkStatusBar,
  hideHunkStatusBar,
  removeChangeFile,
  saveChange,
  reviewState,
} from './review/core';



// ═══════════════════════════════════════════════════════════════════
// Activate
// ═══════════════════════════════════════════════════════════════════

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push({ dispose: () => logger.dispose() });
  logger.info('Extension activated');
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  // ── Review ──
  const pendingDir = getPendingDir(workspaceRoot);
  fs.mkdirSync(pendingDir, { recursive: true });

  const provider = new ChangesProvider(pendingDir);
  vscode.window.registerTreeDataProvider('openclawChanges', provider);

  const pattern = new vscode.RelativePattern(pendingDir, '*.json');
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher.onDidCreate(() => provider.refresh());
  watcher.onDidChange(() => provider.refresh());
  watcher.onDidDelete(() => provider.refresh());
  context.subscriptions.push(watcher);

  // Review commands
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw-vscode.diff', (item: FileChangeItem) =>
      showFileDiff(item, workspaceRoot)),

    vscode.commands.registerCommand('openclaw-vscode.diffHunk', (item: HunkItem) =>
      showHunkDiff(item, workspaceRoot)),

    vscode.commands.registerCommand('openclaw-vscode.accept', async (item: TreeNode) => {
      if (item instanceof HunkItem) {
        if (applyHunk(item, workspaceRoot)) {
          vscode.window.showInformationMessage(`✅ Applied hunk: ${item.hunk.description || 'Hunk #' + (item.hunkIndex + 1)}`);
          provider.refresh();
        }
      } else if (item instanceof FileChangeItem) {
        if (await applyFileChange(item, workspaceRoot)) {
          vscode.window.showInformationMessage(`✅ Applied: ${item.change.file}`);
          provider.refresh();
        }
      }
    }),

    vscode.commands.registerCommand('openclaw-vscode.reject', (item: TreeNode) => {
      if (item instanceof HunkItem) {
        if (rejectHunk(item)) {
          vscode.window.showInformationMessage(`❌ Rejected hunk: ${item.hunk.description || 'Hunk #' + (item.hunkIndex + 1)}`);
          provider.refresh();
        }
      } else if (item instanceof FileChangeItem) {
        if (rejectFileChange(item)) {
          vscode.window.showInformationMessage(`❌ Rejected: ${item.change.file}`);
          provider.refresh();
        }
      }
    }),

    vscode.commands.registerCommand('openclaw-vscode.acceptAll', async () => {
      const all = provider.getFileItems();
      let ok = 0;
      for (const item of all) { if (await applyFileChange(item, workspaceRoot)) ok++; }
      vscode.window.showInformationMessage(`✅ Applied ${ok}/${all.length} changes`);
      provider.refresh();
    }),

    vscode.commands.registerCommand('openclaw-vscode.rejectAll', () => {
      const all = provider.getFileItems();
      let ok = 0;
      for (const item of all) { if (rejectFileChange(item)) ok++; }
      vscode.window.showInformationMessage(`❌ Rejected ${ok}/${all.length} changes`);
      provider.refresh();
    }),

    vscode.commands.registerCommand('openclaw-vscode.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('openclaw-vscode.showLogs', () => logger.show(false)),

    // Editor title buttons — accept/reject from diff view
    vscode.commands.registerCommand('openclaw-vscode.acceptCurrent', async () => {
      if (reviewState.currentDiffHunkItem) {
        // Viewing a single hunk diff
        if (applyHunk(reviewState.currentDiffHunkItem, workspaceRoot)) {
          vscode.window.showInformationMessage(`\u2705 ${reviewState.currentDiffHunkItem.hunk.description || 'Hunk'}`);
          reviewState.currentDiffHunkItem = null;
          updateHunkContext(); updateHunkStatusBar();
          provider.refresh();
          await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
      } else if (reviewState.currentDiffItem) {
        const edits = reviewState.currentDiffItem.change.edits;
        if (edits && edits.length > 1) {
          // Multi-hunk file view — accept current hunk only
          const hunk = edits[reviewState.currentHunkIndex];
          if (!hunk) return;
          const absFile = path.join(workspaceRoot, reviewState.currentDiffItem.change.file);
          const content = fs.readFileSync(absFile, 'utf8');
          const idx = content.indexOf(hunk.oldText);
          if (idx === -1) { vscode.window.showWarningMessage('Hunk not found in file'); return; }
          fs.writeFileSync(absFile, content.substring(0, idx) + hunk.newText + content.substring(idx + hunk.oldText.length), 'utf8');
          edits.splice(reviewState.currentHunkIndex, 1);
          if (edits.length === 0) {
            removeChangeFile(reviewState.currentDiffItem.changeFile);
            reviewState.currentDiffItem = null;
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
          } else {
            saveChange(reviewState.currentDiffItem, reviewState.currentDiffItem.change);
            if (reviewState.currentHunkIndex >= edits.length) reviewState.currentHunkIndex = edits.length - 1;
            await showFileDiff(reviewState.currentDiffItem, workspaceRoot);
          }
          vscode.window.showInformationMessage(`\u2705 ${hunk.description || 'Hunk'}`);
          provider.refresh();
        } else {
          // Single change — accept whole file
          if (await applyFileChange(reviewState.currentDiffItem, workspaceRoot)) {
            vscode.window.showInformationMessage(`\u2705 ${reviewState.currentDiffItem.change.file}`);
            reviewState.currentDiffItem = null;
            updateHunkContext(); updateHunkStatusBar();
            provider.refresh();
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
          }
        }
      }
    }),

    vscode.commands.registerCommand('openclaw-vscode.rejectCurrent', async () => {
      if (reviewState.currentDiffHunkItem) {
        if (rejectHunk(reviewState.currentDiffHunkItem)) {
          vscode.window.showInformationMessage(`\u274C ${reviewState.currentDiffHunkItem.hunk.description || 'Hunk'}`);
          reviewState.currentDiffHunkItem = null;
          updateHunkContext(); updateHunkStatusBar();
          provider.refresh();
          await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
      } else if (reviewState.currentDiffItem) {
        const edits = reviewState.currentDiffItem.change.edits;
        if (edits && edits.length > 1) {
          // Multi-hunk — reject current hunk only
          const hunk = edits[reviewState.currentHunkIndex];
          if (!hunk) return;
          edits.splice(reviewState.currentHunkIndex, 1);
          if (edits.length === 0) {
            removeChangeFile(reviewState.currentDiffItem.changeFile);
            reviewState.currentDiffItem = null;
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
          } else {
            saveChange(reviewState.currentDiffItem, reviewState.currentDiffItem.change);
            if (reviewState.currentHunkIndex >= edits.length) reviewState.currentHunkIndex = edits.length - 1;
            await showFileDiff(reviewState.currentDiffItem, workspaceRoot);
          }
          vscode.window.showInformationMessage(`\u274C ${hunk.description || 'Hunk'}`);
          provider.refresh();
        } else {
          if (rejectFileChange(reviewState.currentDiffItem)) {
            vscode.window.showInformationMessage(`\u274C ${reviewState.currentDiffItem.change.file}`);
            reviewState.currentDiffItem = null;
            updateHunkContext(); updateHunkStatusBar();
            provider.refresh();
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
          }
        }
      }
    })
  );

  // Status bar
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusBar.command = 'openclaw-vscode.refresh';
  context.subscriptions.push(statusBar);
  function updateStatusBar() {
    const count = provider.getFileItems().length;
    if (count > 0) { statusBar.text = `\u{1F42F} ${count} pending`; statusBar.show(); }
    else { statusBar.hide(); }
  }
  provider.onDidChangeTreeData(() => updateStatusBar());
  provider.refresh();

  // Hunk status bar
  createHunkStatusBar(context);

  // Track diff editor close to reset context + hide status bar
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor || (editor.document.uri.scheme !== 'openclaw-original' && editor.document.uri.scheme !== 'openclaw-proposed')) {
        vscode.commands.executeCommand('setContext', 'openclaw-vscode.diffOpen', false);
        hideHunkStatusBar();
        reviewState.currentDiffItem = null;
        reviewState.currentDiffHunkItem = null;
      }
    })
  );

  // ── Hunk navigation in diff view ──
  context.subscriptions.push(
    vscode.commands.registerCommand('openclaw-vscode.prevHunk', async () => {
      if (!reviewState.currentDiffItem?.change.edits || reviewState.currentDiffItem.change.edits.length <= 1) return;
      reviewState.currentHunkIndex = (reviewState.currentHunkIndex - 1 + reviewState.currentDiffItem.change.edits.length) % reviewState.currentDiffItem.change.edits.length;
      const hunk = reviewState.currentDiffItem.change.edits[reviewState.currentHunkIndex];
      const fakeHunkItem = new HunkItem(hunk, reviewState.currentHunkIndex, reviewState.currentDiffItem);
      await showHunkDiff(fakeHunkItem, workspaceRoot);
    }),

    vscode.commands.registerCommand('openclaw-vscode.nextHunk', async () => {
      if (!reviewState.currentDiffItem?.change.edits || reviewState.currentDiffItem.change.edits.length <= 1) return;
      reviewState.currentHunkIndex = (reviewState.currentHunkIndex + 1) % reviewState.currentDiffItem.change.edits.length;
      const hunk = reviewState.currentDiffItem.change.edits[reviewState.currentHunkIndex];
      const fakeHunkItem = new HunkItem(hunk, reviewState.currentHunkIndex, reviewState.currentDiffItem);
      await showHunkDiff(fakeHunkItem, workspaceRoot);
    })
  );

  // ── Chat ──
  const chatProvider = new ChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatProvider)
  );

}

export function deactivate() {
  logger.info('Extension deactivated');
}
