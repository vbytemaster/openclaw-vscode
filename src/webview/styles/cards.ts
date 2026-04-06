export const cardStyles = `
  .oc-card {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    background: color-mix(in srgb, var(--fg) 2%, transparent);
  }
  .oc-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 5px;
    padding: 6px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--fg) 8%, transparent);
    background: color-mix(in srgb, var(--fg) 3%, transparent);
  }
  .oc-card-body { padding: 0; }
  .oc-card-title {
    font-size: 10px;
    text-transform: none;
    letter-spacing: .01em;
    color: var(--muted);
    font-weight: 600;
  }
  .oc-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .oc-mini-btn {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 3px 7px;
    background: var(--input-bg);
    color: var(--muted);
    cursor: pointer;
    font: inherit;
    font-size: 10px;
  }
  .oc-mini-btn:hover { background: var(--pill-hover); color: var(--fg); }
  .oc-action-btn,
  .oc-choice {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    background: var(--input-bg);
    color: var(--fg);
    cursor: pointer;
    font: inherit;
    text-align: left;
    transition: background .15s ease, border-color .15s ease, transform .12s ease;
  }
  .oc-action-btn:hover,
  .oc-choice:hover { background: var(--pill-hover); transform: translateY(-1px); }
  .oc-primary { background: var(--btn-bg); color: var(--btn-fg); border-color: transparent; }
  .oc-primary:hover { background: var(--btn-hover); }
  .oc-danger-btn { border-color: color-mix(in srgb, var(--vscode-errorForeground) 40%, var(--border)); }
  .oc-success-btn { border-color: color-mix(in srgb, var(--vscode-testing-iconPassed) 40%, var(--border)); }
  .oc-choices { display: flex; flex-direction: column; gap: 8px; }
  .oc-choice { display: flex; flex-direction: column; gap: 4px; }
  .oc-choice-label { font-weight: 600; }
  .oc-choice-desc,
  .oc-file-note { color: var(--muted); font-size: 12px; }
  .oc-files,
  .oc-checks { margin: 0; padding-left: 18px; }
  .oc-files li + li,
  .oc-checks li + li { margin-top: 6px; }
  .oc-file-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--fg) 3%, transparent);
  }
  .oc-file-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .oc-details summary { list-style: none; cursor: pointer; }
  .oc-details summary::-webkit-details-marker { display: none; }
  .oc-details-summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .oc-details-meta { color: var(--muted); font-size: 11px; }
  .oc-details[open] .oc-details-summary { margin-bottom: 8px; }
  .oc-code-panel {
    border: 1px solid var(--border);
    border-radius: 5px;
    overflow: hidden;
    background: var(--vscode-textCodeBlock-background);
    max-width: min(100%, 460px);
  }
  .oc-code-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 3px 6px;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--fg) 4%, transparent);
  }
  .oc-code-lang {
    font-size: 9.5px;
    color: color-mix(in srgb, var(--fg) 56%, transparent);
    text-transform: none;
    letter-spacing: .01em;
    font-weight: 500;
  }
  .oc-code-panel pre {
    margin: 0;
    padding: 5px 6px;
    overflow-x: auto;
    background: transparent;
    font-size: 10px;
    line-height: 1.25;
  }
  .oc-code-panel code.hljs { display: block; padding: 0; background: transparent; color: inherit; }
  .oc-diff-panel { background: color-mix(in srgb, var(--fg) 4%, transparent); }
  .oc-diff-lines { display: flex; flex-direction: column; font-family: var(--vscode-editor-font-family); font-size: 11px; }
  .oc-diff-line { white-space: pre-wrap; word-break: break-word; padding: 2px 10px; }
  .oc-diff-add { background: color-mix(in srgb, var(--vscode-testing-iconPassed) 18%, transparent); }
  .oc-diff-del { background: color-mix(in srgb, var(--vscode-errorForeground) 18%, transparent); }
  .oc-diff-hunk { color: var(--vscode-textLink-foreground); background: color-mix(in srgb, var(--vscode-textLink-foreground) 12%, transparent); }
  .oc-diff-ctx { background: transparent; }
  .pin-btn,
  .copy-response-btn {
    background: var(--pill-bg);
    color: var(--muted);
    border: none;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
    cursor: pointer;
    font-family: var(--vscode-font-family);
  }
  .pin-btn:hover,
  .copy-response-btn:hover { background: var(--pill-hover); color: var(--fg); }
`;
