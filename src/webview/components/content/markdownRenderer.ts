import { esc } from '../../utils.js';
import { renderCodeCard } from '../primitives/cards.js';

export function highlightCode(code: string, lang?: string): string {
  const hljs = window.hljs;
  const normalized = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  if (lang && hljs && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(normalized, { language: lang }).value;
    } catch {
      // fall through
    }
  }

  if (hljs) {
    try {
      return hljs.highlightAuto(normalized).value;
    } catch {
      // fall through
    }
  }

  return esc(normalized);
}

export function formatCodeLang(lang?: string): string {
  const raw = String(lang || 'text').trim().toLowerCase();
  if (!raw) return 'Text';
  if (raw === 'cpp' || raw === 'c++') return 'C++';
  if (raw === 'csharp' || raw === 'cs') return 'C#';
  if (raw === 'js' || raw === 'javascript') return 'JavaScript';
  if (raw === 'ts' || raw === 'typescript') return 'TypeScript';
  if (raw === 'sh' || raw === 'bash' || raw === 'zsh' || raw === 'shell') return 'Bash';
  if (raw === 'py' || raw === 'python') return 'Python';
  if (raw === 'json') return 'JSON';
  if (raw === 'yaml' || raw === 'yml') return 'YAML';
  if (raw === 'md' || raw === 'markdown') return 'Markdown';
  if (raw === 'text' || raw === 'txt' || raw === 'plaintext') return 'Text';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function renderInline(text: string): string {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderParagraphs(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return blocks.map((block) => `<p>${renderInline(block).replace(/\n/g, '<br>')}</p>`).join('');
}

function splitTableRow(line: string): string[] {
  const src = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  let inCode = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '`') {
      inCode = !inCode;
      current += ch;
      continue;
    }
    if (ch === '|' && !inCode) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }

  cells.push(current.trim());
  return cells;
}

function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  return /^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(trimmed);
}

function parseTable(lines: string[]): string | null {
  if (lines.length < 2) return null;
  if (!lines.every((line) => line.includes('|'))) return null;
  if (!isSeparatorRow(lines[1])) return null;

  const header = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);
  if (!header.length || header.every((cell) => !cell)) return null;

  const thead = '<thead><tr>' + header.map((cell) => `<th>${renderInline(cell)}</th>`).join('') + '</tr></thead>';
  const tbody = '<tbody>' + rows.map((row) => {
    const normalized = header.map((_, idx) => row[idx] ?? '');
    return '<tr>' + normalized.map((cell) => `<td>${renderInline(cell)}</td>`).join('') + '</tr>';
  }).join('') + '</tbody>';
  return `<div class="oc-table-wrap"><table class="oc-table">${thead}${tbody}</table></div>`;
}

function parseList(lines: string[]): string | null {
  if (!lines.length) return null;
  const ordered = lines.every((line) => /^\s*\d+\.\s+/.test(line));
  const unordered = lines.every((line) => /^\s*[-*]\s+/.test(line));
  if (!ordered && !unordered) return null;
  const tag = ordered ? 'ol' : 'ul';
  const items = lines.map((line) => line.replace(/^\s*(?:\d+\.|[-*])\s+/, '')).map((item) => `<li>${renderInline(item)}</li>`).join('');
  return `<${tag}>${items}</${tag}>`;
}

function wrapCodePanels(html: string): string {
  return html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (_m: string, attrs: string, code: string) => {
    const classMatch = attrs.match(/language-([^"\s]+)/);
    const lang = classMatch?.[1] || 'text';
    const raw = code.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const payload = esc(JSON.stringify({ content: raw, language: lang }));
    if (lang === 'diff') {
      const rows = raw.split('\n').map((line) => {
        const cls = line.startsWith('+')
          ? 'oc-diff-add'
          : line.startsWith('-')
            ? 'oc-diff-del'
            : line.startsWith('@@')
              ? 'oc-diff-hunk'
              : 'oc-diff-ctx';
        return `<div class="oc-diff-line ${cls}">${esc(line || ' ')}</div>`;
      }).join('');
      return renderCodeCard({
        langLabel: formatCodeLang(lang),
        copyPayload: payload,
        className: 'oc-diff-panel',
        bodyHtml: `<div class="oc-diff-lines">${rows}</div>`,
      });
    }
    const highlighted = highlightCode(raw, lang);
    const cls = lang ? ` class="hljs language-${lang}"` : ' class="hljs"';
    return renderCodeCard({
      langLabel: formatCodeLang(lang),
      copyPayload: payload,
      bodyHtml: `<pre><code${cls}>${highlighted}</code></pre>`,
    });
  });
}

export function renderMarkdownLite(text: string): string {
  const BT = String.fromCharCode(96);
  const BT3 = BT + BT + BT;
  const codeBlocks: string[] = [];

  let source = text.replace(new RegExp(BT3 + '(\\w*)\\n([\\s\\S]*?)' + BT3, 'g'), (_m: string, lang: string, code: string) => {
    const highlighted = highlightCode(code, lang);
    const cls = lang ? ` class="hljs language-${lang}"` : ' class="hljs"';
    const token = `__OC_CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code${cls}>${highlighted}</code></pre>`);
    return token;
  });

  const lines = source.split('\n');
  const html: string[] = [];

  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^__OC_CODE_BLOCK_\d+__$/.test(trimmed)) {
      html.push(trimmed);
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length);
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      html.push('<hr>');
      i += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      html.push(`<blockquote>${renderParagraphs(quoteLines.join('\n'))}</blockquote>`);
      continue;
    }

    const tableChunk: string[] = [];
    while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
      tableChunk.push(lines[i]);
      i += 1;
    }
    const renderedTable = parseTable(tableChunk);
    if (renderedTable) {
      html.push(renderedTable);
      continue;
    }
    if (tableChunk.length) i -= tableChunk.length;

    const listChunk: string[] = [];
    while (i < lines.length && lines[i].trim() && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
      listChunk.push(lines[i]);
      i += 1;
    }
    const renderedList = parseList(listChunk);
    if (renderedList) {
      html.push(renderedList);
      continue;
    }
    if (listChunk.length) i -= listChunk.length;

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^__OC_CODE_BLOCK_\d+__$/.test(lines[i].trim()) && !lines[i].includes('|') && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
      paraLines.push(lines[i]);
      i += 1;
    }
    html.push(renderParagraphs(paraLines.join('\n')));
  }

  let out = html.join('');
  out = out.replace(/__OC_CODE_BLOCK_(\d+)__/g, (_m: string, idx: string) => codeBlocks[Number(idx)] || '');
  return wrapCodePanels(out);
}
