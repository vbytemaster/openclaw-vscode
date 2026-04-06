export const composerStyles = `
  .composer {
    flex: 0 0 auto;
    border: 1px solid var(--border); border-radius: 12px;
    background: var(--input-bg);
    display: flex; flex-direction: column; overflow: visible;
    max-height: 38vh;
    position: relative;
    z-index: 5;
  }
  #imgStrip {
    display: none; flex-direction: row; gap: 6px;
    padding: 10px 12px 0; overflow-x: auto; flex-shrink: 0;
  }
  #imgStrip.show { display: flex; }
  .strip-img { position: relative; flex-shrink: 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
  .strip-img img { display: block; height: 48px; max-width: 90px; object-fit: cover; }
  .strip-img .sx {
    position: absolute; top: 2px; right: 2px;
    background: rgba(0,0,0,0.6); color: #fff;
    border: none; border-radius: 50%; width: 14px; height: 14px;
    font-size: 9px; cursor: pointer; display: flex;
    align-items: center; justify-content: center; line-height: 1;
  }
  .strip-img .sx:hover { background: rgba(0,0,0,0.9); }
  #editor {
    flex: 0 0 auto; width: 100%; background: transparent; color: var(--input-fg);
    border: none; padding: 10px 16px 4px;
    font-family: var(--vscode-font-family); font-size: 13px;
    line-height: 1.5; outline: none;
    min-height: 30px; max-height: 26vh; overflow-y: auto;
    white-space: pre-wrap; word-break: break-word;
  }
  #editor:empty::before { content: attr(data-placeholder); color: var(--muted); pointer-events: none; }
  .inline-chip {
    display: inline-flex; align-items: center; gap: 3px;
    background: var(--chip-bg); color: var(--fg);
    border-radius: 4px; padding: 1px 8px; font-size: 11px;
    font-family: var(--vscode-editor-font-family);
    vertical-align: baseline; user-select: none;
    margin: 1px 2px; line-height: 1.6;
  }
  .inline-chip .ci { opacity: 0.6; font-size: 13px; }
  .inline-chip .cx { cursor: pointer; opacity: 0.4; font-size: 9px; margin-left: 2px; }
  .inline-chip .cx:hover { opacity: 1; }
  .toolbar {
    display: flex; align-items: center; padding: 4px 12px 8px; gap: 10px; flex-shrink: 0;
    position: relative;
    z-index: 6;
  }
  .hidden-select {
    position: absolute !important;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .picker-wrap { position: relative; display: inline-flex; align-items: center; z-index: 20; }
  .picker-trigger {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: var(--muted);
    padding: 4px 7px;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
    transition: background .15s ease, color .15s ease;
  }
  .picker-trigger:hover,
  .picker-wrap.open .picker-trigger { background: var(--pill-bg); color: var(--fg); }
  .picker-label { font-size: 11px; white-space: nowrap; }
  .picker-caret { width: 11px; height: 11px; flex: 0 0 auto; opacity: .62; }
  .picker-menu {
    position: absolute;
    left: 0;
    bottom: calc(100% + 8px);
    min-width: 170px;
    max-width: min(240px, calc(100vw - 48px));
    max-height: 220px;
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: color-mix(in srgb, var(--bg) 96%, black 4%);
    box-shadow: 0 10px 30px rgba(0,0,0,.28);
    padding: 4px;
    display: none;
    z-index: 40;
  }
  .picker-wrap.open .picker-menu { display: block; }
  .picker-option {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--fg);
    padding: 7px 9px;
    text-align: left;
    cursor: pointer;
    font: inherit;
    font-size: 11px;
  }
  .picker-option:hover { background: var(--pill-bg); }
  .picker-option.is-selected { background: color-mix(in srgb, var(--fg) 8%, transparent); }
  .picker-option-check { color: var(--vscode-testing-iconPassed); opacity: 0; font-size: 12px; font-weight: 700; }
  .picker-option.is-selected .picker-option-check { opacity: 1; }
  .spacer { flex: 1; }
  .ico {
    background: none; border: none; color: var(--muted);
    cursor: pointer; padding: 0; border-radius: 999px; display: flex;
    align-items: center; justify-content: center;
    transition: background .15s ease, color .15s ease, border-color .15s ease;
  }
  .ico:hover { color: var(--fg); background: var(--pill-bg); }
  .ico.attach-btn {
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
  }
  .ico.attach-btn:hover { background: color-mix(in srgb, var(--fg) 8%, transparent); }
  .ico svg { width: 16px; height: 16px; fill: currentColor; }
  .ico.attach-btn svg { width: 11px; height: 11px; }
  .action-btn {
    background: none; color: var(--fg); border: 1px solid var(--border);
    border-radius: 50%; width: 31px; height: 31px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: background 0.15s, border-color 0.15s;
  }
  .action-btn:hover { background: var(--pill-hover); border-color: var(--fg); }
  .action-btn svg { width: 14px; height: 14px; fill: currentColor; }
  .action-btn.streaming { border-color: var(--vscode-errorForeground); color: var(--vscode-errorForeground); }
  .action-btn.streaming:hover { background: color-mix(in srgb, var(--vscode-errorForeground) 15%, transparent); }
  .status-text {
    font-size: 10px;
    color: color-mix(in srgb, var(--fg) 46%, transparent);
    font-style: italic;
  }
`;
