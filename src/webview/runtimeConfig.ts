export type ChatRuntimeConfig = {
  streamStartTimeoutMs?: number;
  streamInactivityTimeoutMs?: number;
};

export function parseChatRuntimeConfig(el: HTMLElement | null): ChatRuntimeConfig {
  try {
    return el ? JSON.parse(el.textContent || '{}') : {};
  } catch {
    return {};
  }
}
