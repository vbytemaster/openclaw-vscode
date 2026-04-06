import { renderMarkdownLite } from './components/content/markdownRenderer.js';
import { parseExplicitResponseUi, renderExplicitResponseUi } from './components/content/responseUiRenderer.js';

export function renderAssistantMessage(raw: string): string {
  const parsed = parseExplicitResponseUi(raw || '');
  const bodyHtml = parsed.body ? `<section class="oc-body">${renderMarkdownLite(parsed.body)}</section>` : '';
  const uiHtml = renderExplicitResponseUi(parsed.ui);
  return `<div class="oc-message">${bodyHtml}${uiHtml}</div>`;
}
