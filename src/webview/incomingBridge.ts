import type { ExtensionToWebviewMessage } from './bridgeTypes.js';

type IncomingBridgeContext = {
  editorEl: HTMLElement;
  agentSel: HTMLSelectElement | null;
  modelSel: HTMLSelectElement;
  activeChatId: () => string;
  modelLabelByValue: () => Record<string, string>;
  setModelLabelByValue: (value: Record<string, string>) => void;
  refreshModelPicker: () => void;
  saveState: () => void;
  addMsg: (role: string, text: string) => void;
  clearActiveMessages: () => void;
  insertChip: (refId: string, label: string) => void;
  restoreSelection: (range: Range | null) => void;
  getSavedRange: () => Range | null;
  setSavedRange: (range: Range | null) => void;
};

export function handleIncomingBridgeMessage(ctx: IncomingBridgeContext, m: ExtensionToWebviewMessage): boolean {
  switch (m.type) {
    case 'userMessage':
      ctx.saveState();
      return true;
    case 'applyPrompt': {
      const prompt = String(m.text || '');
      if (!prompt) return true;
      ctx.editorEl.focus();
      ctx.editorEl.textContent = prompt;
      return true;
    }
    case 'modelsLoaded': {
      if (m.models && m.models.length) {
        const curVal = ctx.modelSel.value;
        ctx.modelSel.innerHTML = '';
        const labels: Record<string, string> = {};
        m.models.forEach((mod: { value: string; label: string }) => {
          const opt = document.createElement('option');
          opt.value = mod.value;
          opt.textContent = mod.label;
          opt.title = mod.value;
          labels[mod.value] = mod.label;
          ctx.modelSel.appendChild(opt);
        });
        let found = false;
        for (let i = 0; i < ctx.modelSel.options.length; i += 1) {
          if (ctx.modelSel.options[i].value === curVal) {
            ctx.modelSel.value = curVal;
            found = true;
            break;
          }
        }
        if (!found && ctx.modelSel.options.length) ctx.modelSel.selectedIndex = 0;
        ctx.setModelLabelByValue(labels);
        ctx.refreshModelPicker();
      }
      return true;
    }
    case 'agentsLoaded': {
      if (m.agents && m.agents.length && ctx.agentSel) {
        const curAgent = ctx.agentSel.value;
        ctx.agentSel.innerHTML = '';
        m.agents.forEach((a: string) => {
          const opt = document.createElement('option');
          opt.value = a;
          opt.textContent = a;
          ctx.agentSel?.appendChild(opt);
        });
        const targetAgent = m.activeAgent || curAgent;
        let foundAgent = false;
        for (let i = 0; i < ctx.agentSel.options.length; i += 1) {
          if (ctx.agentSel.options[i].value === targetAgent) {
            ctx.agentSel.value = targetAgent;
            foundAgent = true;
            break;
          }
        }
        if (!foundAgent && ctx.agentSel.options.length) ctx.agentSel.selectedIndex = 0;
      }
      return true;
    }
    case 'agentChanged':
      if (ctx.agentSel && m.agentId) {
        ctx.agentSel.value = m.agentId;
      }
      return true;
    case 'error':
      ctx.addMsg('error', m.text || 'Unknown error');
      return true;
    case 'cleared':
      if (m.chatId && m.chatId !== ctx.activeChatId()) return true;
      ctx.clearActiveMessages();
      ctx.saveState();
      return true;
    case 'codeRef':
      ctx.insertChip(m.refId, m.label);
      return true;
    case 'pasteResult': {
      ctx.restoreSelection(ctx.getSavedRange());
      ctx.setSavedRange(null);
      if (m.isCode) ctx.insertChip(m.refId, m.label);
      else document.execCommand('insertText', false, m.text);
      return true;
    }
    default:
      return false;
  }
}
