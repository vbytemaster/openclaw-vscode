export const changeSetStyles = `
  .oc-change-set {
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    background: color-mix(in srgb, var(--fg) 3%, transparent);
    margin-top: 6px;
    max-width: min(100%, 390px);
    width: min(100%, 390px);
    align-self: flex-start;
  }
  .oc-change-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 5px 8px;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--fg) 4%, transparent);
  }
  .oc-change-summary { display: inline-flex; align-items: baseline; gap: 7px; flex-wrap: wrap; }
  .oc-change-title { font-size: 10.5px; font-weight: 700; }
  .oc-change-add { color: var(--vscode-testing-iconPassed); font-weight: 700; }
  .oc-change-del { color: var(--vscode-errorForeground); font-weight: 700; }
  .oc-change-revert {
    border: none;
    background: transparent;
    color: var(--fg);
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    font-size: 10.5px;
  }
  .oc-change-revert.is-disabled,
  .oc-change-revert:disabled { cursor: default; opacity: .45; }
  .oc-change-files { display: flex; flex-direction: column; }
  .oc-change-file { border-top: 1px solid var(--border); }
  .oc-change-file:first-child { border-top: none; }
  .oc-change-file-summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 4px 8px;
  }
  .oc-change-file-summary::-webkit-details-marker { display: none; }
  .oc-change-file[open] .oc-change-file-caret { transform: rotate(0deg); }
  .oc-change-file:not([open]) .oc-change-file-caret { transform: rotate(-90deg); }
  .oc-change-file-path { font-size: 10.5px; font-weight: 700; word-break: break-word; color: #63b3ff; }
  .oc-change-file-path:hover { color: color-mix(in srgb, var(--vscode-textLink-foreground) 88%, white); }
  .oc-change-file-meta { display: inline-flex; align-items: baseline; gap: 5px; white-space: nowrap; font-size: 10px; }
  .oc-change-file-caret {
    color: color-mix(in srgb, var(--fg) 52%, transparent);
    transition: transform .16s ease;
    display: inline-block;
    margin-left: 4px;
  }
  .oc-change-file-body { padding: 0; }
  .oc-change-file .oc-code-panel {
    max-height: 132px;
    overflow: auto;
    border-top: 1px solid color-mix(in srgb, var(--fg) 8%, transparent);
  }
  .oc-diff-lines {
    display: flex;
    flex-direction: column;
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    line-height: 1.4;
  }
  .oc-diff-line { display: grid; grid-template-columns: 28px 28px minmax(0, 1fr); align-items: stretch; }
  .oc-diff-ln {
    padding: 0 3px 0 5px;
    color: color-mix(in srgb, var(--fg) 42%, transparent);
    text-align: right;
    user-select: none;
    border-right: 1px solid color-mix(in srgb, var(--fg) 8%, transparent);
    background: color-mix(in srgb, var(--fg) 2%, transparent);
  }
  .oc-diff-code { padding: 0 7px; white-space: pre-wrap; word-break: break-word; }
  .oc-diff-add { background: color-mix(in srgb, #35d07f 18%, transparent); }
  .oc-diff-del { background: color-mix(in srgb, #ff6b6b 18%, transparent); }
  .oc-diff-hunk { background: color-mix(in srgb, var(--fg) 5%, transparent); color: color-mix(in srgb, var(--fg) 68%, transparent); }
  .oc-diff-note { color: color-mix(in srgb, var(--fg) 54%, transparent); }
`;
