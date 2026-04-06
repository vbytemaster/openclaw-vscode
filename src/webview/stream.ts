type StreamState = Record<string, boolean>;

type StreamHooks = {
  renderTabs?: () => void;
  activeChatId: () => string;
  actionBtn: HTMLElement | null;
  sendIcon: HTMLElement | null;
  stopIcon: HTMLElement | null;
  statusText: HTMLElement | null;
};

export function isChatStreaming(streamStateByChat: StreamState, chatId: string): boolean {
  return !!streamStateByChat[chatId];
}

export function setStreaming(streamStateByChat: StreamState, chatId: string, on: boolean, hooks: StreamHooks): void {
  streamStateByChat[chatId] = on;
  hooks.renderTabs?.();
  if (chatId !== hooks.activeChatId()) return;

  const { actionBtn, sendIcon, stopIcon, statusText } = hooks;
  if (!actionBtn || !sendIcon || !stopIcon || !statusText) return;

  if (on) {
    actionBtn.classList.add('streaming');
    actionBtn.title = 'Stop';
    sendIcon.style.display = 'none';
    stopIcon.style.display = '';
    statusText.textContent = '';
  } else {
    actionBtn.classList.remove('streaming');
    actionBtn.title = 'Send';
    sendIcon.style.display = '';
    stopIcon.style.display = 'none';
    statusText.textContent = '';
  }
}
