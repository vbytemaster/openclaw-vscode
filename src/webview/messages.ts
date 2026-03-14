type MsgIndexRef = { value: number };

type MessagesContext = {
  msgsEl: HTMLElement;
  editorEl: HTMLElement;
  agentSel: HTMLSelectElement | null;
  md: (text: string) => string;
  esc: (text: string) => string;
  prettyModelName: (raw: string, labels: Record<string, string>) => string;
  modelLabelByValue: Record<string, string>;
  setStreaming: (chatId: string, on: boolean) => void;
  activeChatId: () => string;
  curElByChat: Record<string, HTMLDivElement | null>;
  curTextByChat: Record<string, string>;
  curModelByChat: Record<string, string>;
  msgIndexRef: MsgIndexRef;
  saveState: () => void;
  persistAssistantToChat?: (chatId: string, raw: string, model: string, msgIndex: number) => void;
  getAgentForChat?: (chatId: string) => string;
};

type IncomingMessage = {
  type?: string;
  chatId?: string;
  model?: string;
  text?: string;
};

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

export function handleIncoming(ctx: MessagesContext, m: IncomingMessage): boolean {
  switch (m.type) {
    case 'streamStart': {
      const sid = m.chatId || ctx.activeChatId();
      ctx.setStreaming(sid, true);
      ctx.curTextByChat[sid] = '';
      ctx.curModelByChat[sid] = '';
      if (sid !== ctx.activeChatId()) break;
      const curEl = document.createElement('div');
      curEl.className = 'msg assistant';
      ctx.msgsEl.appendChild(curEl);
      curEl.innerHTML = '<span class="typing">...</span>';
      ctx.curElByChat[sid] = curEl;
      ctx.msgsEl.scrollTop = ctx.msgsEl.scrollHeight;
      break;
    }
    case 'streamModel': {
      const mid = m.chatId || ctx.activeChatId();
      ctx.curModelByChat[mid] = m.model || '';
      break;
    }
    case 'streamDelta': {
      const did = m.chatId || ctx.activeChatId();
      ctx.curTextByChat[did] = (ctx.curTextByChat[did] || '') + (m.text || '');
      if (did !== ctx.activeChatId()) break;
      const dEl = ctx.curElByChat[did];
      if (dEl) {
        dEl.innerHTML = ctx.md(ctx.curTextByChat[did]);
        ctx.msgsEl.scrollTop = ctx.msgsEl.scrollHeight;
      }
      break;
    }
    case 'streamEnd': {
      const eid = m.chatId || ctx.activeChatId();
      ctx.setStreaming(eid, false);
      const raw = ctx.curTextByChat[eid] || '';
      const mdl = ctx.curModelByChat[eid] || '';

      if (eid !== ctx.activeChatId()) {
        if (raw && ctx.persistAssistantToChat) {
          const idx = ++ctx.msgIndexRef.value;
          ctx.persistAssistantToChat(eid, raw, mdl, idx);
        }
        ctx.curElByChat[eid] = null;
        ctx.curTextByChat[eid] = '';
        ctx.curModelByChat[eid] = '';
        ctx.saveState();
        break;
      }

      const el = ctx.curElByChat[eid];
      if (el && !raw) {
        el.remove();
      } else if (el) {
        const idx = ++ctx.msgIndexRef.value;
        el.dataset.rawText = raw;
        el.dataset.msgIndex = String(idx);
        el.dataset.model = mdl;
        const pinBar = document.createElement('div');
        pinBar.className = 'msg-actions';
        const modelPart = mdl ? ('<span class="model-inline">' + ctx.esc(ctx.prettyModelName(mdl, ctx.modelLabelByValue)) + '</span>') : '';
        const activeAgent = (ctx.getAgentForChat?.(eid)) || (ctx.agentSel?.value) || 'main';
        const agentPart = '<span class="model-inline">' + ctx.esc(activeAgent) + '</span>';
        pinBar.innerHTML = '<button class="pin-btn" onclick="openInEditor(this)" title="Open in editor for reference">📌 Open in Editor</button>' + agentPart + modelPart;
        el.appendChild(pinBar);
      } else if (raw && ctx.persistAssistantToChat) {
        // Safety fallback: stream ended but placeholder element is missing in DOM.
        const idx = ++ctx.msgIndexRef.value;
        ctx.persistAssistantToChat(eid, raw, mdl, idx);
      }
      ctx.curElByChat[eid] = null;
      ctx.curTextByChat[eid] = '';
      ctx.curModelByChat[eid] = '';
      ctx.editorEl.focus();
      ctx.saveState();
      break;
    }
    default:
      return false;
  }
  return true;
}
