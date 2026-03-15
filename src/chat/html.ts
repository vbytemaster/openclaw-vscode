function safeJson(data: any): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

export function getChatHtml(
  fileState: any[] | undefined,
  agentId: string,
  scriptUri: string,
  runtimeConfig?: { streamStartTimeoutMs?: number; streamInactivityTimeoutMs?: number }
): string {
    /* eslint-disable */

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --input-bg: var(--vscode-input-background);
    --input-fg: var(--vscode-input-foreground);
    --border: var(--vscode-widget-border);
    --muted: var(--vscode-descriptionForeground);
    --badge: var(--vscode-badge-background);
    --badge-fg: var(--vscode-badge-foreground);
    --btn-bg: var(--vscode-button-background);
    --btn-fg: var(--vscode-button-foreground);
    --btn-hover: var(--vscode-button-hoverBackground);
    --pill-bg: color-mix(in srgb, var(--fg) 12%, transparent);
    --pill-hover: color-mix(in srgb, var(--fg) 20%, transparent);
    --msg-user: var(--vscode-textBlockQuote-background);
    --chip-bg: color-mix(in srgb, var(--fg) 15%, transparent);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
    color: var(--fg); background: var(--bg); height: 100%; overflow: hidden;
  }
  body { display: flex; flex-direction: column; padding: 8px; gap: 6px; justify-content: flex-start; }

  /* Messages */
  #messages {
    overflow-y: auto; display: flex; flex-direction: column; gap: 6px;
    flex: 0 1 auto; min-height: 0;
  }
  #messages:not(:empty) { flex: 1 1 0; padding-bottom: 4px; }
  .msg {
    padding: 6px 10px; border-radius: 8px; max-width: 95%;
    word-wrap: break-word; white-space: pre-wrap; line-height: 1.4; font-size: 12.5px;
  }
  .msg.user { background: var(--msg-user); align-self: flex-end; border-bottom-right-radius: 2px; }
  .msg.assistant { align-self: flex-start; border-bottom-left-radius: 2px; border: 1px solid var(--border); }
  .msg.error { color: var(--vscode-errorForeground); font-style: italic; font-size: 0.9em; }
  .msg code { background: var(--vscode-textCodeBlock-background); padding: 1px 3px; border-radius: 3px; font-family: var(--vscode-editor-font-family); font-size: 12px; }
  .msg pre { background: var(--vscode-textCodeBlock-background); padding: 6px; border-radius: 4px; overflow-x: auto; margin: 3px 0; }
  .msg pre code { background: none; padding: 0; }
  .msg pre code.hljs { background: transparent; padding: 0; }
  .typing { color: var(--muted); font-style: italic; }
  .msg-actions { margin-top: 6px; display: flex; gap: 4px; }
  .pin-btn {
    background: var(--pill-bg); color: var(--muted); border: none;
    border-radius: 4px; padding: 2px 8px; font-size: 11px;
    cursor: pointer; font-family: var(--vscode-font-family);
  }
  .pin-btn:hover { background: var(--pill-hover); color: var(--fg); }
  .model-inline {
    font-size: 11px;
    color: var(--muted);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--pill-bg);
    border: 1px solid var(--border);
  }
  .code-ref-tag { display: inline-flex; align-items: center; gap: 3px; background: var(--badge); color: var(--badge-fg); border-radius: 4px; padding: 1px 6px; font-size: 11px; font-family: var(--vscode-editor-font-family); margin: 2px; white-space: nowrap; }
  .msg-img { max-width: 120px; max-height: 80px; border-radius: 6px; margin: 4px 2px; vertical-align: middle; }

  /* Composer */
  .composer {
    flex: 0 0 auto;
    border: 1px solid var(--border); border-radius: 12px;
    background: var(--input-bg);
    display: flex; flex-direction: column; overflow: hidden;
    max-height: 40vh;
  }
  /* Composer stays compact at bottom, never expands to fill */

  /* Image strip — horizontal row above the text editor */
  #imgStrip {
    display: none; flex-direction: row; gap: 6px;
    padding: 10px 12px 0; overflow-x: auto; flex-shrink: 0;
  }
  #imgStrip.show { display: flex; }
  .strip-img {
    position: relative; flex-shrink: 0;
    border-radius: 8px; overflow: hidden;
    border: 1px solid var(--border);
  }
  .strip-img img {
    display: block; height: 48px; max-width: 90px; object-fit: cover;
  }
  .strip-img .sx {
    position: absolute; top: 2px; right: 2px;
    background: rgba(0,0,0,0.6); color: #fff;
    border: none; border-radius: 50%; width: 14px; height: 14px;
    font-size: 9px; cursor: pointer; display: flex;
    align-items: center; justify-content: center; line-height: 1;
  }
  .strip-img .sx:hover { background: rgba(0,0,0,0.9); }

  /* Contenteditable editor */
  #editor {
    flex: 0 0 auto; width: 100%; background: transparent; color: var(--input-fg);
    border: none; padding: 10px 16px 4px;
    font-family: var(--vscode-font-family); font-size: 13px;
    line-height: 1.5; outline: none;
    min-height: 36px; max-height: 30vh; overflow-y: auto;
    white-space: pre-wrap; word-break: break-word;
  }
  #editor:empty::before {
    content: attr(data-placeholder); color: var(--muted); pointer-events: none;
  }

  /* Inline chips (code refs) — inside the editor contenteditable */
  .inline-chip {
    display: inline-flex; align-items: center; gap: 3px;
    background: var(--chip-bg); color: var(--fg);
    border-radius: 4px; padding: 1px 8px; font-size: 11px;
    font-family: var(--vscode-editor-font-family);
    vertical-align: baseline; user-select: none;
    margin: 1px 2px; line-height: 1.6;
  }
  .inline-chip .ci { opacity: 0.6; font-size: 13px; }
  .inline-chip .cx {
    cursor: pointer; opacity: 0.4; font-size: 9px; margin-left: 2px;
  }
  .inline-chip .cx:hover { opacity: 1; }

  /* Bottom toolbar */
  .toolbar {
    display: flex; align-items: center; padding: 4px 10px 6px; gap: 6px; flex-shrink: 0;
  }
  .pill {
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--pill-bg); color: var(--fg);
    border: none; border-radius: 8px; padding: 4px 10px;
    font-size: 12px; font-family: var(--vscode-font-family);
    cursor: pointer; outline: none; -webkit-appearance: none; appearance: none;
  }
  .pill:hover { background: var(--pill-hover); }
  .pill svg { width: 14px; height: 14px; fill: currentColor; }
  .pill .arrow { font-size: 8px; opacity: 0.6; margin-left: -2px; }
  select.pill { padding-right: 6px; }
  .spacer { flex: 1; }
  .ico {
    background: none; border: none; color: var(--muted);
    cursor: pointer; padding: 4px; border-radius: 6px; display: flex;
    align-items: center; justify-content: center;
  }
  .ico:hover { color: var(--fg); background: var(--pill-bg); }
  .ico svg { width: 18px; height: 18px; fill: currentColor; }
  .action-btn {
    background: none; color: var(--fg); border: 1px solid var(--border);
    border-radius: 50%; width: 28px; height: 28px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: background 0.15s, border-color 0.15s;
  }
  .action-btn:hover { background: var(--pill-hover); border-color: var(--fg); }
  .action-btn svg { width: 14px; height: 14px; fill: currentColor; }
  .action-btn.streaming { border-color: var(--vscode-errorForeground); color: var(--vscode-errorForeground); }
  .action-btn.streaming:hover { background: color-mix(in srgb, var(--vscode-errorForeground) 15%, transparent); }
  .status-text { font-size: 11px; color: var(--muted); font-style: italic; }
</style>
</head>
<body>
  <div id="chatTabs" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;flex:0 0 auto"></div>
  <div id="messages"></div>
  <div class="composer">
    <div id="imgStrip"></div>
    <div id="editor" contenteditable="true" data-placeholder="Ask anything, paste code or screenshots"></div>
    <div class="toolbar">
      <select id="agentSelect" class="pill" onchange="onAgentChange()">
        <option value="${agentId}">${agentId}</option>
      </select>
      <select id="modelSelect" class="pill">
        <option value="">Loading models…</option>
      </select>
      <span id="statusText" class="status-text"></span>
      <div class="spacer"></div>
      <button class="ico" onclick="attachFile()" title="Attach file">
        <svg viewBox="0 0 16 16"><path d="M4.5 3a2.5 2.5 0 015 0v9a1.5 1.5 0 01-3 0V5a.5.5 0 011 0v7a.5.5 0 001 0V3a1.5 1.5 0 00-3 0v9a2.5 2.5 0 005 0V5a.5.5 0 011 0v7a3.5 3.5 0 01-7 0V3z"/></svg>
      </button>
      <button id="actionBtn" class="action-btn" onclick="handleAction()" title="Send">
        <svg id="sendIcon" viewBox="0 0 16 16"><path d="M8 2.5l-4.5 5H7v6h2v-6h3.5z"/></svg>
        <svg id="stopIcon" viewBox="0 0 16 16" style="display:none"><rect x="4" y="4" width="8" height="8" rx="1.5"/></svg>
      </button>
    </div>
  </div>
<script id="_fileState" type="application/json">${safeJson(fileState || [])}</script>
<script id="_chatRuntimeConfig" type="application/json">${safeJson(runtimeConfig || {})}</script>
<script type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
