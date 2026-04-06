import type { IncomingMessage, MessagesContext } from './messageTypes.js';
import {
  applyRevertApplied,
  applyStreamDelta,
  applyStreamFinal,
  applyStreamModel,
  applyStreamStart,
} from './assistantTurnMessages.js';
import { disableRevertButtons } from './changeSet.js';
import { finalizeAssistantTurn } from './assistantTurnFinalizer.js';
import { applyToolEvent } from './toolEventMessages.js';
import {
  addMsg,
  clearTransientThinking,
  removeStreamingTurn,
  scheduleTransientThinking,
} from './messageRendering.js';

export function handleIncoming(ctx: MessagesContext, m: IncomingMessage): boolean {
  switch (m.type) {
    case 'streamStart': {
      const sid = m.chatId || ctx.activeChatId();
      ctx.debug?.('streamStart.received', {
        chatId: sid,
        activeChatId: ctx.activeChatId(),
        agentId: (m as unknown as { agentId?: string }).agentId || '',
      });
      removeStreamingTurn(ctx, sid);
      ctx.setStreaming(sid, true);
      applyStreamStart(ctx, m);
      if (sid !== ctx.activeChatId()) break;
      scheduleTransientThinking(ctx, sid);
      break;
    }
    case 'streamModel': {
      const mid = m.chatId || ctx.activeChatId();
      ctx.debug?.('streamModel.received', {
        chatId: mid,
        model: m.model || '',
      });
      applyStreamModel(ctx, m);
      break;
    }
    case 'streamDelta': {
      applyStreamDelta(ctx, m);
      break;
    }
    case 'streamTick': {
      break;
    }
    case 'streamFinal': {
      const fid = m.chatId || ctx.activeChatId();
      ctx.debug?.('streamFinal.received', {
        chatId: fid,
        textChars: typeof m.text === 'string' ? m.text.length : 0,
        model: m.model || '',
      });
      applyStreamFinal(ctx, m);
      if (fid !== ctx.activeChatId()) break;
      break;
    }
    case 'streamEnd': {
      finalizeAssistantTurn(ctx, m);
      break;
    }
    case 'revertApplied': {
      const rid = m.chatId || ctx.activeChatId();
      applyRevertApplied(ctx, m);
      disableRevertButtons(ctx, rid, m.changeId, 'Откачено');
      ctx.saveState();
      break;
    }
    case 'revertInvalid': {
      const rid = m.chatId || ctx.activeChatId();
      disableRevertButtons(ctx, rid, m.changeId);
      ctx.saveState();
      break;
    }
    case 'toolEvent': {
      const tid = m.event.chatId || ctx.activeChatId();
      const changed = applyToolEvent(ctx, m);
      if (changed && tid === ctx.activeChatId()) {
        scheduleTransientThinking(ctx, tid);
      }
      break;
    }
    default:
      return false;
  }
  return true;
}
