import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EditHunk, PendingChange } from '../shared/types';
import { logger } from '../shared/logger';

// ═══════════════════════════════════════════════════════════════════
// Review: Tree Items
// ═══════════════════════════════════════════════════════════════════

export class FileChangeItem extends vscode.TreeItem {
  constructor(
    public readonly change: PendingChange,
    public readonly changeFile: string,
    hasChildren: boolean
  ) {
    super(
      change.file,
      hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
    );
    this.description = change.description;
    this.tooltip = `${change.action}: ${change.description}`;
    this.contextValue = 'fileChange';
    this.iconPath = new vscode.ThemeIcon(
      change.action === 'create' ? 'new-file' :
      change.action === 'delete' ? 'trash' : 'edit'
    );
    // Always clickable — shows full diff with all hunks applied
    this.command = {
      command: 'openclaw-vscode.diff',
      title: 'Show Diff',
      arguments: [this]
    };
  }
}

export class HunkItem extends vscode.TreeItem {
  constructor(
    public readonly hunk: EditHunk,
    public readonly hunkIndex: number,
    public readonly parentItem: FileChangeItem
  ) {
    super(
      hunk.description || `Hunk #${hunkIndex + 1}`,
      vscode.TreeItemCollapsibleState.None
    );
    // Show a preview of what changes
    const oldPreview = hunk.oldText.split('\n')[0].trim().substring(0, 50);
    this.description = oldPreview + (oldPreview.length >= 50 ? '…' : '');
    this.tooltip = `Old: ${hunk.oldText.substring(0, 200)}\n→\nNew: ${hunk.newText.substring(0, 200)}`;
    this.contextValue = 'hunkChange';
    this.iconPath = new vscode.ThemeIcon('diff-modified');
    this.command = {
      command: 'openclaw-vscode.diffHunk',
      title: 'Show Hunk Diff',
      arguments: [this]
    };
  }
}

export type TreeNode = FileChangeItem | HunkItem;

// ═══════════════════════════════════════════════════════════════════
// Review: Tree Data Provider
// ═══════════════════════════════════════════════════════════════════

export class ChangesProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChange = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;
  private fileItems: FileChangeItem[] = [];

  constructor(private pendingDir: string) {}

  refresh(): void {
    this.fileItems = this.loadChanges();
    this._onDidChange.fire(undefined);
  }

  getTreeItem(el: TreeNode): vscode.TreeItem { return el; }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      if (this.fileItems.length === 0) this.fileItems = this.loadChanges();
      return this.fileItems;
    }
    if (element instanceof FileChangeItem) {
      const edits = this.getEffectiveEdits(element.change);
      if (edits.length <= 1) return [];
      return edits.map((h, i) => new HunkItem(h, i, element));
    }
    return [];
  }

  private getEffectiveEdits(change: PendingChange): EditHunk[] {
    if (change.edits && change.edits.length > 0) return change.edits;
    if (change.oldText !== undefined && change.newText !== undefined) {
      return [{ oldText: change.oldText, newText: change.newText, description: change.description }];
    }
    return [];
  }

  private loadChanges(): FileChangeItem[] {
    if (!fs.existsSync(this.pendingDir)) return [];
    const files = fs.readdirSync(this.pendingDir).filter(f => f.endsWith('.json')).sort();
    const items: FileChangeItem[] = [];
    for (const f of files) {
      try {
        const fullPath = path.join(this.pendingDir, f);
        const raw = fs.readFileSync(fullPath, 'utf8');
        const parsed = JSON.parse(raw);
        const changes: PendingChange[] = Array.isArray(parsed) ? parsed : [parsed];
        for (const change of changes) {
          if (!change.file || !change.action) continue; // skip malformed entries
          if (!change.id) change.id = path.basename(f, '.json');
          const edits = this.getEffectiveEdits(change);
          const hasChildren = edits.length > 1;
          items.push(new FileChangeItem(change, fullPath, hasChildren));
        }
      } catch (e) {
        logger.warn(`Skipping malformed pending change file: ${f}`);
        logger.error('Malformed pending change parse error', e);
      }
    }
    return items;
  }

  getFileItems(): FileChangeItem[] { return this.fileItems; }
}

// ═══════════════════════════════════════════════════════════════════
// Review: Helpers
// ═══════════════════════════════════════════════════════════════════

export function getPendingDir(workspaceRoot: string): string {
  const config = vscode.workspace.getConfiguration('openclaw-vscode');
  const rel = config.get<string>('pendingDir', '.openclaw/pending-changes');
  return path.join(workspaceRoot, rel);
}

function applyEditsToContent(original: string, edits: EditHunk[]): { content: string; failures: number[] } {
  let content = original;
  const failures: number[] = [];
  for (let i = 0; i < edits.length; i++) {
    const idx = content.indexOf(edits[i].oldText);
    if (idx === -1) {
      failures.push(i);
    } else {
      content = content.substring(0, idx) + edits[i].newText + content.substring(idx + edits[i].oldText.length);
    }
  }
  return { content, failures };
}

function buildProposedContent(change: PendingChange, originalContent: string): string {
  if (change.action === 'delete') return '';
  if (change.action === 'create') return change.fullContent ?? change.newText ?? '';

  if (change.edits && change.edits.length > 0) {
    const { content, failures } = applyEditsToContent(originalContent, change.edits);
    if (failures.length > 0) {
      return content + `\n// ⚠️ ${failures.length} hunk(s) failed to match`;
    }
    return content;
  }

  if (change.fullContent !== undefined) return change.fullContent;

  if (change.oldText !== undefined && change.newText !== undefined) {
    const idx = originalContent.indexOf(change.oldText);
    if (idx === -1) return originalContent + '\n// ⚠️ oldText not found, showing newText:\n' + change.newText;
    return originalContent.substring(0, idx) + change.newText + originalContent.substring(idx + change.oldText.length);
  }

  return originalContent;
}

function buildHunkProposed(original: string, hunk: EditHunk): string {
  const idx = original.indexOf(hunk.oldText);
  if (idx === -1) return original + '\n// ⚠️ oldText not found';
  return original.substring(0, idx) + hunk.newText + original.substring(idx + hunk.oldText.length);
}

// ── Diff display ──

export async function showFileDiff(item: FileChangeItem, workspaceRoot: string) {
  reviewState.currentDiffItem = item;
  reviewState.currentDiffHunkItem = null;
  reviewState.currentHunkIndex = 0;
  updateHunkContext(); updateHunkStatusBar();
  const absFile = path.join(workspaceRoot, item.change.file);
  const original = fs.existsSync(absFile) ? fs.readFileSync(absFile, 'utf8') : '';
  const proposed = buildProposedContent(item.change, original);

  await openDiff(item.change.file, original, proposed,
    `\u{1F42F} ${item.change.file} (${item.change.action}: ${item.change.description})`);

  // Update hunk status bar
  updateHunkStatusBar();
}

// ── Hunk status bar items ──
let hunkAcceptBtn: vscode.StatusBarItem | undefined;
let hunkRejectBtn: vscode.StatusBarItem | undefined;
let hunkInfoItem: vscode.StatusBarItem | undefined;
let hunkPrevBtn: vscode.StatusBarItem | undefined;
let hunkNextBtn: vscode.StatusBarItem | undefined;

export function createHunkStatusBar(context: vscode.ExtensionContext) {
  hunkPrevBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 105);
  hunkPrevBtn.command = 'openclaw-vscode.prevHunk';
  hunkPrevBtn.text = '$(chevron-left)';
  hunkPrevBtn.tooltip = 'Previous Hunk (Cmd+Shift+[)';
  context.subscriptions.push(hunkPrevBtn);

  hunkInfoItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 104);
  hunkInfoItem.tooltip = 'Current hunk';
  context.subscriptions.push(hunkInfoItem);

  hunkNextBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 103);
  hunkNextBtn.command = 'openclaw-vscode.nextHunk';
  hunkNextBtn.text = '$(chevron-right)';
  hunkNextBtn.tooltip = 'Next Hunk (Cmd+Shift+])';
  context.subscriptions.push(hunkNextBtn);

  hunkAcceptBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 102);
  hunkAcceptBtn.command = 'openclaw-vscode.acceptCurrent';
  hunkAcceptBtn.text = '$(check) Accept';
  hunkAcceptBtn.tooltip = 'Accept Change (Cmd+Shift+Y)';
  hunkAcceptBtn.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  context.subscriptions.push(hunkAcceptBtn);

  hunkRejectBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);
  hunkRejectBtn.command = 'openclaw-vscode.rejectCurrent';
  hunkRejectBtn.text = '$(x) Reject';
  hunkRejectBtn.tooltip = 'Reject Change (Cmd+Shift+N)';
  context.subscriptions.push(hunkRejectBtn);
}

export function updateHunkStatusBar() {
  if (!reviewState.currentDiffItem || !hunkInfoItem) {
    hideHunkStatusBar();
    return;
  }
  const edits = reviewState.currentDiffItem.change.edits;
  const hasMultiple = edits && edits.length > 1;

  if (hasMultiple) {
    const hunk = edits![reviewState.currentHunkIndex];
    const label = hunk?.description || `Hunk #${reviewState.currentHunkIndex + 1}`;
    hunkInfoItem.text = `$(diff) ${reviewState.currentHunkIndex + 1}/${edits!.length}: ${label}`;
    hunkInfoItem.show();
    hunkPrevBtn?.show();
    hunkNextBtn?.show();
  } else if (reviewState.currentDiffHunkItem) {
    const label = reviewState.currentDiffHunkItem.hunk.description || 'Hunk';
    hunkInfoItem.text = `$(diff) ${label}`;
    hunkInfoItem.show();
    hunkPrevBtn?.hide();
    hunkNextBtn?.hide();
  } else {
    hunkInfoItem.text = `$(diff) ${reviewState.currentDiffItem.change.file}`;
    hunkInfoItem.show();
    hunkPrevBtn?.hide();
    hunkNextBtn?.hide();
  }
  hunkAcceptBtn?.show();
  hunkRejectBtn?.show();
}

export function hideHunkStatusBar() {
  hunkInfoItem?.hide();
  hunkAcceptBtn?.hide();
  hunkRejectBtn?.hide();
  hunkPrevBtn?.hide();
  hunkNextBtn?.hide();
}

export async function showHunkDiff(item: HunkItem, workspaceRoot: string) {
  reviewState.currentDiffItem = item.parentItem;
  reviewState.currentDiffHunkItem = item;
  reviewState.currentHunkIndex = item.hunkIndex;
  updateHunkContext(); updateHunkStatusBar();
  const absFile = path.join(workspaceRoot, item.parentItem.change.file);
  const original = fs.existsSync(absFile) ? fs.readFileSync(absFile, 'utf8') : '';
  const proposed = buildHunkProposed(original, item.hunk);
  const label = item.hunk.description || `Hunk #${item.hunkIndex + 1}`;

  await openDiff(item.parentItem.change.file, original, proposed,
    `\u{1F42F} ${item.parentItem.change.file} \u{2014} ${label}`);
  updateHunkStatusBar();
}

// Track currently viewed diff for editor title buttons
export const reviewState = {
  currentDiffItem: null as FileChangeItem | null,
  currentDiffHunkItem: null as HunkItem | null,
  currentHunkIndex: 0,
};

async function openDiff(filePath: string, original: string, proposed: string, title: string) {
  const ts = Date.now();
  const origUri = vscode.Uri.parse(`openclaw-original:${filePath}?t=${ts}`);
  const propUri = vscode.Uri.parse(`openclaw-proposed:${filePath}?t=${ts}`);

  const d1 = vscode.workspace.registerTextDocumentContentProvider('openclaw-original',
    { provideTextDocumentContent: () => original });
  const d2 = vscode.workspace.registerTextDocumentContentProvider('openclaw-proposed',
    { provideTextDocumentContent: () => proposed });

  // Set context for editor title buttons
  await vscode.commands.executeCommand('setContext', 'openclaw-vscode.diffOpen', true);

  await vscode.commands.executeCommand('vscode.diff', origUri, propUri, title);
  setTimeout(() => { d1.dispose(); d2.dispose(); }, 120000);
}

// ── Apply / Reject ──

export function saveChange(item: FileChangeItem, change: PendingChange) {
  fs.writeFileSync(item.changeFile, JSON.stringify(change, null, 2), 'utf8');
}

export function removeChangeFile(filePath: string) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/**
 * Remove a single change from a JSON file that may contain an array.
 * If the file contains a single object or the array becomes empty, delete the file.
 */
function removeChangeFromFile(filePath: string, changeId: string) {
  if (!fs.existsSync(filePath)) return;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      fs.unlinkSync(filePath);
      return;
    }
    const remaining = parsed.filter((c: any) => c.id !== changeId);
    if (remaining.length === 0) {
      fs.unlinkSync(filePath);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(remaining, null, 2), 'utf8');
    }
  } catch (e) {
    logger.error(`Failed to update JSON change file, removing as fallback: ${filePath}`, e);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

/**
 * After applying a change (oldText→newText) to a target file,
 * rebase remaining changes in the same JSON that touch the same target file.
 * Updates their oldText to account for the already-applied edit.
 */
function rebaseRemainingChanges(
  jsonFilePath: string,
  appliedChangeId: string,
  appliedOldText: string,
  appliedNewText: string,
  targetFile: string
) {
  if (!fs.existsSync(jsonFilePath)) return;
  try {
    const raw = fs.readFileSync(jsonFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    let modified = false;
    for (const c of parsed) {
      if (c.id === appliedChangeId) continue;
      if (c.file !== targetFile) continue;
      if (c.action !== 'edit') continue;

      // Rebase single oldText/newText
      if (c.oldText && c.oldText.includes(appliedOldText)) {
        c.oldText = c.oldText.replace(appliedOldText, appliedNewText);
        modified = true;
      }

      // Rebase edits array (multi-hunk)
      if (c.edits && Array.isArray(c.edits)) {
        for (const e of c.edits) {
          if (e.oldText && e.oldText.includes(appliedOldText)) {
            e.oldText = e.oldText.replace(appliedOldText, appliedNewText);
            modified = true;
          }
        }
      }
    }
    if (modified) {
      fs.writeFileSync(jsonFilePath, JSON.stringify(parsed, null, 2), 'utf8');
    }
  } catch (e) {
    logger.warn(`Failed to rebase remaining changes for ${targetFile}`);
    logger.error('Rebase remaining changes error', e);
  }
}

export async function applyFileChange(item: FileChangeItem, workspaceRoot: string): Promise<boolean> {
  const change = item.change;
  const absFile = path.join(workspaceRoot, change.file);
  try {
    if (change.action === 'delete') {
      if (fs.existsSync(absFile)) fs.unlinkSync(absFile);
    } else if (change.action === 'create') {
      fs.mkdirSync(path.dirname(absFile), { recursive: true });
      fs.writeFileSync(absFile, change.fullContent ?? change.newText ?? '', 'utf8');
    } else {
      const original = fs.existsSync(absFile) ? fs.readFileSync(absFile, 'utf8') : '';
      const proposed = buildProposedContent(change, original);
      if (proposed.includes('⚠️')) {
        vscode.window.showWarningMessage(`Some hunks failed to match in ${change.file}`);
        return false;
      }
      fs.writeFileSync(absFile, proposed, 'utf8');
    }
    // Rebase remaining changes that target the same file before removing
    if (change.action === 'edit' && change.oldText && change.newText) {
      rebaseRemainingChanges(item.changeFile, change.id, change.oldText, change.newText, change.file);
    }
    removeChangeFromFile(item.changeFile, change.id);
    return true;
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to apply: ${e.message}`);
    return false;
  }
}

export function applyHunk(item: HunkItem, workspaceRoot: string): boolean {
  const change = item.parentItem.change;
  const absFile = path.join(workspaceRoot, change.file);
  try {
    const content = fs.readFileSync(absFile, 'utf8');
    const idx = content.indexOf(item.hunk.oldText);
    if (idx === -1) {
      vscode.window.showWarningMessage(`Hunk oldText not found in ${change.file}`);
      return false;
    }
    const updated = content.substring(0, idx) + item.hunk.newText + content.substring(idx + item.hunk.oldText.length);
    fs.writeFileSync(absFile, updated, 'utf8');

    // Remove this hunk from the change
    removeHunkFromChange(item);
    return true;
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to apply hunk: ${e.message}`);
    return false;
  }
}

export function rejectHunk(item: HunkItem): boolean {
  try {
    removeHunkFromChange(item);
    return true;
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to reject hunk: ${e.message}`);
    return false;
  }
}

function removeHunkFromChange(item: HunkItem) {
  const change = item.parentItem.change;
  if (change.edits && change.edits.length > 0) {
    change.edits.splice(item.hunkIndex, 1);
    if (change.edits.length === 0) {
      removeChangeFromFile(item.parentItem.changeFile, change.id);
    } else {
      // Update description to reflect remaining hunks
      change.description = `${change.description} (${change.edits.length} remaining)`;
      saveChange(item.parentItem, change);
    }
  } else {
    // Single-hunk legacy format — remove this change from file
    removeChangeFromFile(item.parentItem.changeFile, change.id);
  }
}

export function rejectFileChange(item: FileChangeItem): boolean {
  try {
    removeChangeFromFile(item.changeFile, item.change.id);
    return true;
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to reject: ${e.message}`);
    return false;
  }
}


export function updateHunkContext() {
  const hasMultiple = reviewState.currentDiffItem?.change.edits && reviewState.currentDiffItem.change.edits.length > 1;
  vscode.commands.executeCommand('setContext', 'openclaw-vscode.hasMultipleHunks', !!hasMultiple);
}

