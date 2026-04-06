export type CodeCardOptions = {
  langLabel: string;
  bodyHtml: string;
  copyPayload?: string;
  className?: string;
  actionHtml?: string;
};

export type CardOptions = {
  titleHtml?: string;
  bodyHtml: string;
  className?: string;
  actionHtml?: string;
};

export type DisclosureCardOptions = {
  summaryText: string;
  summaryOpenText?: string;
  bodyHtml: string;
  className?: string;
  open?: boolean;
  disclosureId?: string;
  chatId?: string;
};

export type TableCardOptions = {
  titleHtml: string;
  tableHtml: string;
  copyPayload?: string;
  className?: string;
};

function renderCopyButton(copyPayload?: string, label = 'Copy'): string {
  if (!copyPayload) return '';
  return `<button class="oc-mini-btn" data-action="copy-code" data-oc-copy="${copyPayload}">${label}</button>`;
}

export function renderCard(options: CardOptions): string {
  const classes = ['oc-card', options.className].filter(Boolean).join(' ');
  const head = options.titleHtml || options.actionHtml
    ? `<div class="oc-card-head">${options.titleHtml ? `<div class="oc-card-title">${options.titleHtml}</div>` : '<div></div>'}${options.actionHtml ?? ''}</div>`
    : '';
  return `<section class="${classes}">${head}<div class="oc-card-body">${options.bodyHtml}</div></section>`;
}

export function renderCodeCard(options: CodeCardOptions): string {
  const classes = ['oc-code-panel', options.className].filter(Boolean).join(' ');
  const action = options.actionHtml ?? renderCopyButton(options.copyPayload);
  return `<div class="${classes}"><div class="oc-code-toolbar"><span class="oc-code-lang">${options.langLabel}</span>${action}</div>${options.bodyHtml}</div>`;
}

export function renderDisclosureCard(options: DisclosureCardOptions): string {
  const classes = ['oc-disclosure-card', options.className].filter(Boolean).join(' ');
  const attrs = [
    options.open ? 'open' : '',
    options.disclosureId ? `data-disclosure-id="${options.disclosureId}"` : '',
    options.chatId ? `data-chat-id="${options.chatId}"` : '',
    `data-summary-closed="${options.summaryText.replace(/"/g, '&quot;')}"`,
    options.summaryOpenText ? `data-summary-open="${options.summaryOpenText.replace(/"/g, '&quot;')}"` : '',
  ].filter(Boolean).join(' ');
  const closedLabel = options.summaryText;
  const openLabel = options.summaryOpenText || options.summaryText;
  const body = options.open ? options.bodyHtml : '';
  return `<details class="${classes}" ${attrs}><summary class="oc-disclosure-summary"><span class="oc-disclosure-label"><span class="oc-summary-when-closed">${closedLabel}</span><span class="oc-summary-when-open">${openLabel}</span></span><span class="oc-disclosure-caret">▾</span></summary>${body}</details>`;
}

export function renderTableCard(options: TableCardOptions): string {
  const classes = ['oc-table-card', options.className].filter(Boolean).join(' ');
  return `<section class="${classes}"><div class="oc-table-wrap">${options.tableHtml}</div></section>`;
}
