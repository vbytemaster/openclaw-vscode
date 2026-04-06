export const baseStyles = `
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
  #chatTabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 0 0 4px;
    flex: 0 0 auto;
  }
  .chat-tab,
  .chat-tab-add {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--fg) 3%, transparent);
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    font: inherit;
    cursor: pointer;
    flex: 0 0 auto;
    transition: background .15s ease, color .15s ease, border-color .15s ease;
  }
  .chat-tab:hover,
  .chat-tab-add:hover {
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    color: var(--fg);
  }
  .chat-tab.is-active {
    color: var(--fg);
    border-color: color-mix(in srgb, var(--fg) 16%, var(--border));
    background: color-mix(in srgb, var(--fg) 7%, transparent);
  }
  .chat-tab-label {
    white-space: nowrap;
    font-size: 9.5px;
    font-weight: 600;
  }
  .chat-tab-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--vscode-textLink-foreground);
    flex: 0 0 auto;
  }
  .chat-tab-close {
    opacity: .7;
    font-size: 10px;
    line-height: 1;
  }
  .chat-tab-add {
    width: 24px;
    justify-content: center;
    padding: 4px 0;
    font-size: 13px;
    line-height: 1;
  }
  #messages {
    overflow-y: auto; display: flex; flex-direction: column; gap: 6px;
    flex: 1 1 0; min-height: 0; padding-bottom: 4px;
  }
  #transientThinking {
    display: none;
    flex: 0 0 auto;
    padding: 0;
    margin-top: 4px;
  }
  #transientThinking.show {
    display: block;
  }
  .msg {
    padding: 6px 10px; border-radius: 8px; max-width: 95%;
    word-wrap: break-word; white-space: normal; line-height: 1.55; font-size: 12px;
    position: relative;
  }
  .msg.user {
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    align-self: flex-end;
    border-bottom-right-radius: 4px;
    padding: 10px 14px;
    color: color-mix(in srgb, var(--fg) 92%, transparent);
  }
  .msg.assistant {
    align-self: flex-start;
    border-bottom-left-radius: 2px;
    border: none;
    background: transparent;
    padding: 0;
    max-width: min(100%, 860px);
  }
  .msg.error { color: var(--vscode-errorForeground); font-style: italic; font-size: 0.9em; }
`;
