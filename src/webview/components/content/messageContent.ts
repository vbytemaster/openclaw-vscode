import type { ChatMessage } from '../../types.js';

type RenderMessageOptions = {
  message: ChatMessage;
  renderAssistant: (text: string) => string;
  renderAssistantActions: (message: ChatMessage, chatId: string) => string;
  chatId: string;
  esc: (value: string) => string;
};

function renderUserText(text: string, esc: (value: string) => string, chipLabels?: string[]): string {
  const marker = String.fromCharCode(8984);
  const splitRe = new RegExp(`(${marker}ref:[0-9]+${marker})`);
  const matchRe = new RegExp(`^${marker}ref:([0-9]+)${marker}$`);
  return text.split(splitRe).map((part) => {
    const match = part.match(matchRe);
    if (!match) return esc(part);
    const label = chipLabels?.[Number(match[1])];
    return label ? ` <span class="code-ref-tag">≡ ${esc(label)}</span> ` : '';
  }).join('');
}

export function renderPersistedChatMessage(options: RenderMessageOptions): string {
  const { message, renderAssistant, renderAssistantActions, chatId, esc } = options;
  if (message.role === 'assistant') {
    const body = renderAssistant(message.rawText);
    const actions = renderAssistantActions(message, chatId);
    return `${body}${actions}`;
  }

  if (message.role === 'error') {
    return esc(message.rawText);
  }

  let html = '';
  for (const src of message.imgPreviews || []) {
    html += `<img class="msg-img" src="${esc(src)}"> <br>`;
  }
  html += renderUserText(message.rawText || '', esc, message.chipLabels);
  return html;
}

export function renderAssistantActionsBar(options: {
  message: ChatMessage;
  chatId: string;
  prettyModelName: (value: string, labels?: Record<string, string>) => string;
  modelLabelByValue: Record<string, string>;
  getAgentForChat: (chatId: string) => string;
  esc: (value: string) => string;
}): string {
  const { message, chatId, prettyModelName, modelLabelByValue, getAgentForChat, esc } = options;
  if (!message.rawText) return '';
  const modelPart = message.model
    ? `<span class="model-inline">${esc(prettyModelName(message.model, modelLabelByValue))}</span>`
    : '';
  const agentPart = `<span class="model-inline">${esc(getAgentForChat(chatId))}</span>`;
  return `<div class="msg-actions"><button class="copy-response-btn" data-action="copy-response" title="Copy full response">Copy</button><button class="pin-btn" data-action="open-response" title="Open in editor for reference">📌 Open in Editor</button>${agentPart}${modelPart}</div>`;
}
