export const markdownStyles = `
  .msg code {
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    padding: 1px 4px;
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    color: color-mix(in srgb, var(--fg) 88%, transparent);
  }
  .msg pre {
    background: color-mix(in srgb, var(--fg) 3%, transparent);
    padding: 8px 10px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 4px 0;
  }
  .msg pre code { background: none; padding: 0; }
  .msg pre code.hljs { background: transparent; padding: 0; }
  .msg p { margin: 0 0 10px; }
  .msg p:last-child { margin-bottom: 0; }
  .msg ul, .msg ol { margin: 6px 0 10px 18px; }
  .msg li + li { margin-top: 5px; }
  .msg.assistant h1,
  .msg.assistant h2,
  .msg.assistant h3 {
    line-height: 1.25;
    margin: 16px 0 10px;
    letter-spacing: -.01em;
    color: color-mix(in srgb, var(--fg) 96%, transparent);
  }
  .msg.assistant h1 { font-size: 16px; font-weight: 700; }
  .msg.assistant h2 { font-size: 14px; font-weight: 700; }
  .msg.assistant h3 { font-size: 12.5px; font-weight: 700; }
  .msg.assistant strong { color: color-mix(in srgb, var(--fg) 96%, transparent); font-weight: 700; }
  .msg.assistant blockquote {
    margin: 10px 0;
    padding-left: 12px;
    border-left: 2px solid color-mix(in srgb, var(--fg) 14%, transparent);
    color: color-mix(in srgb, var(--fg) 80%, transparent);
  }
  .typing { color: var(--muted); font-style: italic; }
  .msg-actions { margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap; }
  .msg.assistant .msg-actions { opacity: 0; transition: opacity .15s ease; }
  .msg.assistant:hover .msg-actions,
  .msg.assistant:focus-within .msg-actions { opacity: 1; }
  .oc-message { display: flex; flex-direction: column; gap: 10px; }
  .oc-body { display: flex; flex-direction: column; gap: 0; }
  .oc-body hr {
    border: none;
    height: 1px;
    margin: 16px 0;
    background: color-mix(in srgb, var(--fg) 8%, transparent);
  }
  .oc-summary {
    padding: 10px 12px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--vscode-button-background) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-button-background) 35%, var(--border));
    font-weight: 600;
  }
  .oc-status {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .oc-success { background: color-mix(in srgb, var(--vscode-testing-iconPassed) 12%, transparent); border-color: color-mix(in srgb, var(--vscode-testing-iconPassed) 40%, var(--border)); }
  .oc-info { background: color-mix(in srgb, var(--vscode-textLink-foreground) 10%, transparent); border-color: color-mix(in srgb, var(--vscode-textLink-foreground) 35%, var(--border)); }
  .oc-warning { background: color-mix(in srgb, var(--vscode-editorWarning-foreground) 10%, transparent); border-color: color-mix(in srgb, var(--vscode-editorWarning-foreground) 35%, var(--border)); }
  .oc-error { background: color-mix(in srgb, var(--vscode-errorForeground) 10%, transparent); border-color: color-mix(in srgb, var(--vscode-errorForeground) 35%, var(--border)); }
  .oc-status-title { font-weight: 700; }
  .oc-status-text { color: var(--muted); }
  .oc-assistant-turn {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .oc-turn-answer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 2px 0 0;
    color: color-mix(in srgb, var(--fg) 88%, transparent);
    font-size: 12.5px;
  }
  .model-inline {
    font-size: 11px;
    color: var(--muted);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--pill-bg);
    border: 1px solid var(--border);
  }
  .code-ref-tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: var(--badge);
    color: var(--badge-fg);
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 11px;
    font-family: var(--vscode-editor-font-family);
    margin: 2px;
    white-space: nowrap;
  }
  .msg-img { max-width: 120px; max-height: 80px; border-radius: 6px; margin: 4px 2px; vertical-align: middle; }
`;
