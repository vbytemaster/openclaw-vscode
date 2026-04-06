import { esc } from '../../utils.js';
import type { ResponseUiAction, ResponseUiPayload } from '../../types.js';
import { renderCard, renderCodeCard, renderTableCard } from '../primitives/cards.js';
import { formatCodeLang, highlightCode, renderInline } from './markdownRenderer.js';

type ParsedResponse = {
  body: string;
  ui?: ResponseUiPayload;
};

export function parseExplicitResponseUi(raw: string): ParsedResponse {
  const match = raw.match(/```openclaw-ui\s*\n([\s\S]*?)```/);
  if (!match) return { body: raw };

  const body = raw.replace(match[0], '').trim();
  try {
    const ui = JSON.parse(match[1]) as ResponseUiPayload;
    return { body, ui };
  } catch {
    return { body: raw };
  }
}

function normalizeActions(actions?: ResponseUiAction[]): ResponseUiAction[] {
  return Array.isArray(actions) ? actions.filter((a) => a && a.label && (a.prompt || a.value || a.id)) : [];
}

function renderStatus(ui?: ResponseUiPayload): string {
  if (!ui?.status) return '';
  const tone = ui.status.tone || 'info';
  const title = ui.status.title ? `<div class="oc-status-title">${renderInline(ui.status.title)}</div>` : '';
  const text = ui.status.text ? `<div class="oc-status-text">${renderInline(ui.status.text)}</div>` : '';
  return `<section class="oc-status oc-${tone}">${title}${text}</section>`;
}

function renderSummary(ui?: ResponseUiPayload): string {
  if (!ui?.summary) return '';
  return `<section class="oc-summary">${renderInline(ui.summary)}</section>`;
}

function renderSimpleListCard(title: string, items: string[], collapsible = false): string {
  if (!items.length) return '';
  const body = `<ul class="oc-checks">${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`;
  if (!collapsible || items.length < 4) {
    return `<section class="oc-card"><div class="oc-card-title">${renderInline(title)}</div>${body}</section>`;
  }
  return `<details class="oc-card oc-details"><summary class="oc-details-summary"><span class="oc-card-title">${renderInline(title)}</span><span class="oc-details-meta">${items.length} items</span></summary>${body}</details>`;
}

function renderChecks(ui?: ResponseUiPayload): string {
  if (!ui?.checks?.length) return '';
  return renderSimpleListCard('Что проверить', ui.checks, true);
}

function renderFiles(ui?: ResponseUiPayload): string {
  if (!ui?.files?.length) return '';
  const items = ui.files.map((item) => {
    const copyPayload = esc(JSON.stringify({ content: item.path, language: 'text' }));
    const openPrompt = item.openPrompt || `Open file ${item.path} in the editor.`;
    const openPayload = esc(JSON.stringify({ prompt: openPrompt, mode: 'fill', label: item.path }));
    return `<li><div class="oc-file-pill"><code>${esc(item.path)}</code><div class="oc-file-actions"><button class="oc-mini-btn" data-action="copy-code" data-oc-copy="${copyPayload}">Copy path</button><button class="oc-mini-btn" data-action="apply-suggested" data-oc-action="${openPayload}">Open</button></div></div>${item.note ? `<span class="oc-file-note">${renderInline(item.note)}</span>` : ''}</li>`;
  }).join('');
  return `<section class="oc-card"><div class="oc-card-title">Файлы</div><ul class="oc-files">${items}</ul></section>`;
}

function renderActionButtons(actions?: ResponseUiAction[], groupTitle = 'Действия'): string {
  const normalized = normalizeActions(actions);
  if (!normalized.length) return '';
  const buttons = normalized.map((action) => {
    const mode = action.mode || 'fill';
    const kind = action.kind || 'secondary';
    const payload = esc(JSON.stringify({ prompt: action.prompt || action.value || '', mode, label: action.label }));
    const kindClass = kind === 'success' ? 'oc-success-btn' : kind === 'danger' ? 'oc-danger-btn' : kind === 'primary' ? 'oc-primary' : 'oc-secondary';
    return `<button class="oc-action-btn ${kindClass}" data-action="apply-suggested" data-oc-action="${payload}">${renderInline(action.label)}</button>`;
  }).join('');
  return `<section class="oc-card"><div class="oc-card-title">${renderInline(groupTitle)}</div><div class="oc-actions">${buttons}</div></section>`;
}

function renderChoices(ui?: ResponseUiPayload): string {
  if (!ui?.choices?.length) return '';
  const items = ui.choices.map((choice) => `<button class="oc-choice" data-action="apply-suggested" data-oc-action="${esc(JSON.stringify({ prompt: choice.prompt || choice.value || '', mode: choice.mode || 'fill', label: choice.label }))}"><span class="oc-choice-label">${renderInline(choice.label)}</span>${choice.description ? `<span class="oc-choice-desc">${renderInline(choice.description)}</span>` : ''}</button>`).join('');
  return `<section class="oc-card"><div class="oc-card-title">Варианты</div><div class="oc-choices">${items}</div></section>`;
}

function renderUiTable(ui?: ResponseUiPayload): string {
  if (!ui?.table?.columns?.length || !ui?.table?.rows?.length) return '';
  const thead = '<thead><tr>' + ui.table.columns.map((col) => `<th>${renderInline(col)}</th>`).join('') + '</tr></thead>';
  const tbody = '<tbody>' + ui.table.rows.map((row) => '<tr>' + row.map((cell) => `<td>${renderInline(String(cell ?? ''))}</td>`).join('') + '</tr>').join('') + '</tbody>';
  const markdown = ['| ' + ui.table.columns.join(' | ') + ' |', '| ' + ui.table.columns.map(() => '---').join(' | ') + ' |', ...ui.table.rows.map((row) => '| ' + row.map((cell) => String(cell ?? '')).join(' | ') + ' |')].join('\n');
  const payload = esc(JSON.stringify({ content: markdown, language: 'markdown' }));
  return renderTableCard({
    titleHtml: renderInline(ui.table.title || 'Таблица'),
    copyPayload: payload,
    tableHtml: `<table class="oc-table">${thead}${tbody}</table>`,
  });
}

function renderCode(ui?: ResponseUiPayload): string {
  if (!ui?.code?.content) return '';
  const payload = esc(JSON.stringify({ content: ui.code.content, language: ui.code.language || 'text' }));
  const codeLang = ui.code.language || 'text';
  const highlighted = highlightCode(ui.code.content, codeLang);
  return renderCard({
    titleHtml: ui.code.title ? renderInline(ui.code.title) : '',
    actionHtml: `<button class="oc-mini-btn" data-action="copy-code" data-oc-copy="${payload}">Copy</button>`,
    bodyHtml: renderCodeCard({
      langLabel: formatCodeLang(codeLang),
      bodyHtml: `<pre><code class="hljs language-${esc(codeLang)}">${highlighted}</code></pre>`,
    }),
  });
}

export function renderExplicitResponseUi(ui?: ResponseUiPayload): string {
  if (!ui) return '';
  return [
    renderStatus(ui),
    renderSummary(ui),
    renderChecks(ui),
    renderFiles(ui),
    renderUiTable(ui),
    renderCode(ui),
    renderChoices(ui),
    renderActionButtons(ui.actions),
  ].join('');
}
