import type { MessagesContext } from './messageTypes.js';
import { getAssistantTurnState } from './state/assistantTurnStore.js';
import { renderChangeSet } from './changeSet.js';
import { fromAssistantTurnState } from './view-models/assistantTurn.js';
import { buildOperationalFeedViewModel } from './view-models/operationalFeed.js';
import {
  renderExplorationBlock,
  renderFileChangeBlock,
  renderShellBlock,
  renderThinkingRow,
} from './components/operational/toolBlocks.js';

const transientRenderTimerByChat = new Map<string, number>();
const lastTransientHtmlByChat = new Map<string, string>();

export function cancelTransientRender(chatId: string): void {
  const timer = transientRenderTimerByChat.get(chatId);
  if (timer == null) return;
  window.clearTimeout(timer);
  transientRenderTimerByChat.delete(chatId);
}

export function removeStreamingTurn(ctx: MessagesContext, chatId: string): void {
  cancelTransientRender(chatId);
  const active = chatId === ctx.activeChatId();
  if (active) {
    const orphans = Array.from(ctx.msgsEl.querySelectorAll('.msg.assistant[data-streaming="true"]'));
    orphans.forEach((node) => node.remove());
  }
  const current = ctx.curElByChat[chatId];
  if (current) current.remove();
  ctx.curElByChat[chatId] = null;
  lastTransientHtmlByChat.delete(chatId);
  delete ctx.activityStateByChat[chatId];
  delete ctx.activityStartedAtByChat[chatId];
  delete ctx.activityDisclosureOpenByChat[chatId];
}

export function renderAssistantTurn(ctx: MessagesContext, chatId: string, rawText: string, streaming: boolean): string {
  const state = getAssistantTurnState(ctx.assistantTurnByChat, chatId);
  const viewModel = fromAssistantTurnState(chatId, {
    rawText,
    model: state.model,
    changeSet: !streaming ? ctx.latestChangeSetByChat[chatId] || state.changeSet : null,
  }, streaming);
  const bodyHtml = !viewModel.streaming && viewModel.rawText
    ? `<div class="oc-turn-answer">${ctx.renderAssistant(viewModel.rawText)}</div>`
    : '';
  const changeHtml = !viewModel.streaming && viewModel.changeSet
    ? renderChangeSet(ctx, chatId, viewModel.changeSet)
    : '';
  return `<div class="oc-assistant-turn">${bodyHtml}${changeHtml}</div>`;
}

export function renderTransientThinking(ctx: MessagesContext, chatId: string): void {
  const html = renderToolActivityFeed(ctx, chatId);
  if (!html) {
    const existing = ctx.curElByChat[chatId];
    if (existing) {
      existing.remove();
      ctx.curElByChat[chatId] = null;
    }
    lastTransientHtmlByChat.delete(chatId);
    return;
  }
  let el = ctx.curElByChat[chatId];
  if (el && (!el.isConnected || el.parentElement !== ctx.msgsEl)) {
    el = null;
    ctx.curElByChat[chatId] = null;
  }
  if (!el) {
    el = document.createElement('div');
    el.className = 'msg assistant';
    ctx.msgsEl.appendChild(el);
    ctx.curElByChat[chatId] = el;
  }
  if (lastTransientHtmlByChat.get(chatId) === html) {
    return;
  }
  const nearBottom = ctx.msgsEl.scrollHeight - ctx.msgsEl.scrollTop - ctx.msgsEl.clientHeight < 96;
  el.dataset.streaming = 'true';
  el.innerHTML = html;
  lastTransientHtmlByChat.set(chatId, html);
  if (nearBottom) {
    ctx.msgsEl.scrollTop = ctx.msgsEl.scrollHeight;
  }
}

function renderToolActivityFeed(ctx: MessagesContext, chatId: string): string {
  const viewModel = buildOperationalFeedViewModel(ctx, chatId);
  const blocks = [
    viewModel.thinking ? renderThinkingRow(ctx, viewModel.thinking) : '',
    viewModel.exploration ? renderExplorationBlock(ctx, viewModel.exploration.summary, viewModel.exploration.rows) : '',
    viewModel.shell ? renderShellBlock(ctx, viewModel.shell.rows) : '',
    viewModel.fileChanges ? renderFileChangeBlock(ctx, viewModel.fileChanges.rows) : '',
  ].filter(Boolean);

  return blocks.join('');
}

export function scheduleTransientThinking(ctx: MessagesContext, chatId: string): void {
  if (transientRenderTimerByChat.has(chatId)) return;
  const timer = window.setTimeout(() => {
    transientRenderTimerByChat.delete(chatId);
    renderTransientThinking(ctx, chatId);
  }, 500);
  transientRenderTimerByChat.set(chatId, timer);
}

export function clearTransientThinking(ctx: MessagesContext, chatId?: string): void {
  ctx.debug?.('transient.clear');
  cancelTransientRender(chatId || ctx.activeChatId());
  ctx.transientThinkingEl.innerHTML = '';
  ctx.transientThinkingEl.classList.remove('show');
}

export function rerenderCurrentTurn(ctx: MessagesContext, chatId: string, streaming: boolean): void {
  if (streaming) {
    scheduleTransientThinking(ctx, chatId);
    return;
  }
  const el = ctx.curElByChat[chatId];
  if (!el) return;
  delete el.dataset.streaming;
  const state = getAssistantTurnState(ctx.assistantTurnByChat, chatId);
  el.innerHTML = renderAssistantTurn(ctx, chatId, state.rawText || '', false);
  ctx.msgsEl.scrollTop = ctx.msgsEl.scrollHeight;
}

export function addMsg(
  ctx: { msgsEl: HTMLElement; esc: (text: string) => string },
  role: string,
  text: string,
  chipLabels?: string[],
  imgPreviews?: string[]
): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  let html = '';

  if (imgPreviews?.length) {
    imgPreviews.forEach((src) => { html += '<img class="msg-img" src="' + src + '"> '; });
    html += '<br>';
  }

  if (text) {
    const M = String.fromCharCode(8984);
    const splitRe = new RegExp('(' + M + 'ref:[0-9]+' + M + ')');
    const matchRe = new RegExp('^' + M + 'ref:([0-9]+)' + M + '$');
    const parts = text.split(splitRe);
    for (const part of parts) {
      const m = part.match(matchRe);
      if (m && chipLabels?.[parseInt(m[1], 10)]) {
        html += ' <span class="code-ref-tag">≡ ' + ctx.esc(chipLabels[parseInt(m[1], 10)]) + '</span> ';
      } else {
        html += ctx.esc(part);
      }
    }
  }

  d.innerHTML = html || ctx.esc(text);
  ctx.msgsEl.appendChild(d);
  ctx.msgsEl.scrollTop = ctx.msgsEl.scrollHeight;
  return d;
}
