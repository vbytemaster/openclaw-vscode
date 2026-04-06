export const operationalFeedStyles = `
  .oc-turn-activity {
    max-width: min(100%, 860px);
    margin-top: 6px;
    margin-left: 0;
    color: color-mix(in srgb, var(--fg) 72%, transparent);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .oc-activity-group {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .oc-activity-summary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: color-mix(in srgb, var(--fg) 64%, transparent);
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 6px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    font: inherit;
    width: fit-content;
  }
  .oc-activity-summary-caret { color: color-mix(in srgb, var(--fg) 42%, transparent); }
  .oc-activity-list { display: flex; flex-direction: column; gap: 4px; }
  .oc-activity-list.is-collapsed { display: none; }
  .oc-read-feed {
    max-width: min(100%, 820px);
    display: flex;
    flex-direction: column;
    gap: 5px;
    color: color-mix(in srgb, var(--fg) 68%, transparent);
  }
  .oc-read-summary {
    color: color-mix(in srgb, var(--fg) 60%, transparent);
    font-size: 11.5px;
    font-weight: 520;
    line-height: 1.28;
  }
  .oc-read-summary-running { color: color-mix(in srgb, var(--fg) 68%, transparent); }
  .oc-read-summary-done { color: color-mix(in srgb, var(--fg) 60%, transparent); }
  .oc-read-summary-error { color: color-mix(in srgb, var(--vscode-errorForeground) 82%, var(--fg)); }
  .oc-read-list { display: flex; flex-direction: column; gap: 6px; }
  .oc-read-row {
    color: color-mix(in srgb, var(--fg) 70%, transparent);
    font-size: 11.5px;
    line-height: 1.28;
  }
  .oc-read-row-running { color: color-mix(in srgb, var(--fg) 74%, transparent); }
  .oc-read-row-done { color: color-mix(in srgb, var(--fg) 66%, transparent); }
  .oc-read-row-error { color: color-mix(in srgb, var(--vscode-errorForeground) 82%, var(--fg)); }
  .oc-shell-feed {
    max-width: min(100%, 820px);
    margin-top: 0;
    align-self: flex-start;
    width: 100%;
  }
  .oc-disclosure-card { margin: 0; }
  .oc-disclosure-summary {
    list-style: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: color-mix(in srgb, var(--fg) 72%, transparent);
    font-size: 11px;
    font-weight: 560;
    line-height: 1.2;
    margin-bottom: 3px;
    width: 100%;
    justify-content: space-between;
    padding: 0;
    border-radius: 0;
    transition: color .14s ease, opacity .14s ease;
  }
  .oc-disclosure-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1 1 auto;
    min-width: 0;
    padding-right: 4px;
  }
  .oc-disclosure-summary:hover {
    background: transparent;
    color: color-mix(in srgb, var(--fg) 88%, transparent);
  }
  .oc-disclosure-summary::-webkit-details-marker { display: none; }
  .oc-disclosure-caret {
    color: color-mix(in srgb, var(--fg) 56%, transparent);
    transition: transform .16s ease;
    display: inline-block;
    margin-left: 0;
    font-size: 9px;
    flex: 0 0 auto;
  }
  .oc-disclosure-card[open] .oc-disclosure-caret { transform: rotate(0deg); }
  .oc-disclosure-card:not([open]) .oc-disclosure-caret { transform: rotate(-90deg); }
  .oc-summary-when-open { display: none; }
  .oc-disclosure-card[open] .oc-summary-when-open { display: inline; }
  .oc-disclosure-card[open] .oc-summary-when-closed { display: none; }
  .oc-shell-panel { max-width: min(100%, 760px); width: 100%; }
  .oc-shell-status {
    padding: 0 10px 6px;
    color: color-mix(in srgb, var(--fg) 56%, transparent);
    font-size: 10.5px;
    text-align: right;
    display: inline-flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0;
    width: 100%;
  }
  .oc-shell-status-sep { margin: 0 6px; color: color-mix(in srgb, var(--fg) 32%, transparent); }
  .oc-filechange-row { color: color-mix(in srgb, var(--fg) 74%, transparent); font-size: 12px; line-height: 1.3; }
  .oc-filechange-file { color: #63b3ff; }
  .oc-filechange-added { color: #35d07f; }
  .oc-filechange-removed { color: #ff6b6b; }
  .oc-thinking-label {
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    color: transparent;
    margin-bottom: 6px;
    background-image: linear-gradient(90deg, color-mix(in srgb, var(--fg) 40%, transparent) 0%, color-mix(in srgb, var(--fg) 72%, transparent) 35%, color-mix(in srgb, var(--fg) 42%, transparent) 70%, color-mix(in srgb, var(--fg) 40%, transparent) 100%);
    background-size: 220% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    animation: oc-thinking-shimmer 2.2s linear infinite;
  }
  .oc-thinking-label::before { content: none !important; display: none !important; }
  .oc-activity-row { display: flex; flex-direction: column; gap: 2px; padding: 2px 0; }
  .oc-activity-row + .oc-activity-row { margin-top: 2px; }
  .oc-activity-head { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
  .oc-activity-title {
    font-size: 12px;
    line-height: 1.45;
    color: color-mix(in srgb, var(--fg) 70%, transparent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .oc-activity-row-thinking .oc-activity-title { color: color-mix(in srgb, var(--fg) 68%, transparent); }
  .oc-activity-row-note { padding: 2px 0 8px; }
  .oc-activity-note { color: color-mix(in srgb, var(--fg) 88%, transparent); font-size: 12px; line-height: 1.6; max-width: 720px; }
  .oc-compact-separator { display: flex; align-items: center; gap: 14px; margin: 10px 0 6px; max-width: 720px; }
  .oc-compact-line { flex: 1 1 auto; height: 1px; background: color-mix(in srgb, var(--fg) 10%, transparent); }
  .oc-compact-text {
    flex: 0 0 auto;
    font-size: 12px;
    font-weight: 500;
    color: transparent;
    background-image: linear-gradient(90deg, color-mix(in srgb, var(--fg) 36%, transparent) 0%, color-mix(in srgb, var(--fg) 62%, transparent) 35%, color-mix(in srgb, var(--fg) 36%, transparent) 70%, color-mix(in srgb, var(--fg) 36%, transparent) 100%);
    background-size: 220% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    animation: oc-thinking-shimmer 2.2s linear infinite;
  }
  .oc-activity-count { font-size: 11px; color: var(--muted); flex: 0 0 auto; }
  .oc-activity-detail-inline {
    font-size: 11px;
    line-height: 1.35;
    color: color-mix(in srgb, var(--fg) 52%, transparent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-left: 2px;
  }
  .oc-activity-row-command { gap: 8px; margin-top: 6px; }
  @keyframes oc-thinking-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -20% 0; }
  }
  @keyframes oc-thinking-pulse {
    0% { opacity: .72; box-shadow: 0 0 0 0 color-mix(in srgb, var(--fg) 18%, transparent); }
    70% { opacity: 1; box-shadow: 0 0 0 8px transparent; }
    100% { opacity: .72; box-shadow: 0 0 0 0 transparent; }
  }
`;
