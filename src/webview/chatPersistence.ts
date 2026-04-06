import type { ChatTab, VsCodeApi } from './types.js';

type SaveChatStateContext = {
  vsc: VsCodeApi;
  chats: ChatTab[];
  activeChatId: string;
};

export function saveChatState(ctx: SaveChatStateContext): void {
  const state = { chats: ctx.chats, activeChatId: ctx.activeChatId };
  ctx.vsc.setState(state);
  ctx.vsc.postMessage({ type: 'saveChatState', messages: state });
}
