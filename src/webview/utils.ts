export function prettyModelName(raw: string, modelLabelByValue: Record<string, string>): string {
  if (!raw) return '';
  if (modelLabelByValue[raw]) return modelLabelByValue[raw];
  const idx = raw.indexOf('/');
  return idx >= 0 ? raw.slice(idx + 1) : raw;
}

export function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function md(t: string): string {
  let h = esc(t);
  const BT = String.fromCharCode(96);
  const BT3 = BT + BT + BT;

  h = h.replace(new RegExp(BT3 + '(\\w*)\\n([\\s\\S]*?)' + BT3, 'g'), (_m: string, lang: string, code: string) => {
    const hljs = window.hljs;
    const normalized = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    if (lang && hljs && hljs.getLanguage(lang)) {
      try {
        return '<pre><code class="hljs">' + hljs.highlight(normalized, { language: lang }).value + '</code></pre>';
      } catch {}
    }
    if (hljs) {
      try {
        return '<pre><code class="hljs">' + hljs.highlightAuto(normalized).value + '</code></pre>';
      } catch {}
    }
    return '<pre><code>' + code + '</code></pre>';
  });

  h = h.replace(new RegExp(BT + '([^' + BT + ']+)' + BT, 'g'), '<code>$1</code>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return h;
}
