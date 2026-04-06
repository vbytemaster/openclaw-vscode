import { baseStyles } from '../styles/base';
import { composerStyles } from '../styles/composer';
import { cardStyles } from '../styles/cards';
import { changeSetStyles } from '../styles/changeSet';
import { markdownStyles } from '../styles/markdown';
import { operationalFeedStyles } from '../styles/operationalFeed';
import { tableStyles } from '../styles/tables';

function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

export function getWebviewShellHtml(
  fileState: unknown[] | undefined,
  agentId: string,
  scriptUri: string,
  runtimeConfig?: { streamStartTimeoutMs?: number; streamInactivityTimeoutMs?: number }
): string {
  const styles = [
    baseStyles,
    operationalFeedStyles,
    markdownStyles,
    cardStyles,
    tableStyles,
    changeSetStyles,
    composerStyles,
  ].join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
${styles}
</style>
</head>
<body>
  <div id="chatTabs"></div>
  <div id="messages"></div>
  <div id="transientThinking"></div>
  <div class="composer">
    <div id="imgStrip"></div>
    <div id="editor" contenteditable="true" data-placeholder="Ask anything, paste code or screenshots"></div>
    <div class="toolbar">
      <button class="ico attach-btn" data-action="attach-file" title="Add file">
        <svg viewBox="0 0 16 16"><path d="M7 2h2v5h5v2H9v5H7V9H2V7h5z"/></svg>
      </button>
      <select id="agentSelect" class="hidden-select">
        <option value="${agentId}">${agentId}</option>
      </select>
      <select id="modelSelect" class="hidden-select">
        <option value="">Loading models…</option>
      </select>
      <div id="modelPickerWrap" class="picker-wrap">
        <button id="modelPickerBtn" class="picker-trigger" type="button" title="Choose model">
          <span id="modelPickerLabel" class="picker-label">Loading models…</span>
          <svg class="picker-caret" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div id="modelMenu" class="picker-menu"></div>
      </div>
      <select id="thinkingSelect" class="hidden-select">
        <option value="auto">Auto</option>
        <option value="off">Off</option>
        <option value="minimal">Minimal</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="xhigh">XHigh</option>
      </select>
      <div id="thinkingPickerWrap" class="picker-wrap">
        <button id="thinkingPickerBtn" class="picker-trigger" type="button" title="Choose thinking level">
          <span id="thinkingPickerLabel" class="picker-label">Auto</span>
          <svg class="picker-caret" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div id="thinkingMenu" class="picker-menu"></div>
      </div>
      <span id="statusText" class="status-text"></span>
      <div class="spacer"></div>
      <button id="actionBtn" class="action-btn" data-action="composer-submit" title="Send">
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
