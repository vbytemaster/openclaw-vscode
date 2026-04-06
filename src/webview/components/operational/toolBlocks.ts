import type { MessagesContext } from '../../messageTypes.js';
import type {
  ExplorationRowViewModel,
  FileChangeRowViewModel,
  ReadRowViewModel,
  SearchRowViewModel,
  ShellRowViewModel,
  ThinkingRowViewModel,
} from '../../view-models/operationalFeed.js';
import { renderCodeCard, renderDisclosureCard } from '../primitives/cards.js';

function renderDiffStats(added?: number, removed?: number): string {
  const parts: string[] = [];
  if (typeof added === 'number') parts.push(` <span class="oc-filechange-added">+${added}</span>`);
  if (typeof removed === 'number') parts.push(` <span class="oc-filechange-removed">-${removed}</span>`);
  return parts.join('');
}

export function renderReadBlock(
  ctx: MessagesContext,
  summary: string,
  rows: ReadRowViewModel[],
): string {
  if (!rows.length) return '';
  const state = rows.some((row) => row.state === 'running') ? 'running' : rows.some((row) => row.state === 'error') ? 'error' : 'done';
  const htmlRows = rows.map((row) => `<div class="oc-read-row oc-read-row-${row.state}">${ctx.esc(row.label)}</div>`);
  return `<div class="oc-read-feed"><div class="oc-read-summary oc-read-summary-${state}">${ctx.esc(summary)}</div><div class="oc-read-list">${htmlRows.join('')}</div></div>`;
}

export function renderThinkingRow(ctx: MessagesContext, row: ThinkingRowViewModel): string {
  const activeClass = row.active ? ' oc-thinking-active' : '';
  return `<div class="oc-thinking-label${activeClass}">${ctx.esc(row.label)}</div>`;
}

export function renderExplorationBlock(
  ctx: MessagesContext,
  summary: string,
  rows: ExplorationRowViewModel[],
): string {
  if (!rows.length) return '';
  const state = rows.some((row) => row.state === 'running') ? 'running' : rows.some((row) => row.state === 'error') ? 'error' : 'done';
  const htmlRows = rows.map((row) => `<div class="oc-read-row oc-read-row-${row.state}">${ctx.esc(row.label)}</div>`);
  return `<div class="oc-read-feed"><div class="oc-read-summary oc-read-summary-${state}">${ctx.esc(summary)}</div><div class="oc-read-list">${htmlRows.join('')}</div></div>`;
}

export function renderSearchBlock(
  ctx: MessagesContext,
  summary: string,
  rows: SearchRowViewModel[],
): string {
  if (!rows.length) return '';
  const state = rows.some((row) => row.state === 'running') ? 'running' : rows.some((row) => row.state === 'error') ? 'error' : 'done';
  const htmlRows = rows.map((row) => `<div class="oc-read-row oc-read-row-${row.state}">${ctx.esc(row.label)}</div>`);
  return `<div class="oc-read-feed"><div class="oc-read-summary oc-read-summary-${state}">${ctx.esc(summary)}</div><div class="oc-read-list">${htmlRows.join('')}</div></div>`;
}

export function renderShellBlock(ctx: MessagesContext, rows: ShellRowViewModel[]): string {
  if (!rows.length) return '';
  const cards = rows.map((row) => {
    const footerParts = [row.statusLabel, row.elapsedLabel].filter(Boolean).map((part) => `<span>${ctx.esc(part!)}</span>`);
    const body = renderCodeCard({
      langLabel: 'Bash',
      bodyHtml: `<pre><code>$ ${ctx.esc(row.command)}</code></pre>${footerParts.length ? `<div class="oc-shell-status">${footerParts.join('<span class="oc-shell-status-sep">·</span>')}</div>` : ''}`,
      className: `oc-shell-panel oc-shell-panel-${row.runState}`,
    });
    return renderDisclosureCard({
      className: `oc-shell-feed oc-shell-feed-${row.runState}`,
      summaryText: row.summaryText,
      summaryOpenText: row.summaryOpenText,
      bodyHtml: body,
      disclosureId: row.toolId,
      chatId: row.chatId,
      open: row.open,
    });
  });
  return cards.join('');
}

export function renderFileChangeBlock(ctx: MessagesContext, rows: FileChangeRowViewModel[]): string {
  if (!rows.length) return '';
  return rows
    .map((row) => {
      const stats = renderDiffStats(row.added, row.removed);
      return `<div class="oc-filechange-row">${row.labelPrefix} <span class="oc-filechange-file">${ctx.esc(row.file)}</span>${stats}</div>`;
    })
    .join('');
}
