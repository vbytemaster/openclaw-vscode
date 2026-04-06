export type WebviewDomRefs = {
  tabsEl: HTMLElement;
  msgsEl: HTMLElement;
  transientThinkingEl: HTMLElement;
  composerEl: Element | null;
  editorEl: HTMLElement;
  agentSel: HTMLSelectElement | null;
  modelSel: HTMLSelectElement;
  thinkingSel: HTMLSelectElement | null;
  modelPickerWrap: HTMLElement | null;
  modelPickerBtn: HTMLButtonElement | null;
  modelPickerLabel: HTMLElement | null;
  modelMenu: HTMLElement | null;
  thinkingPickerWrap: HTMLElement | null;
  thinkingPickerBtn: HTMLButtonElement | null;
  thinkingPickerLabel: HTMLElement | null;
  thinkingMenu: HTMLElement | null;
  imgStripEl: HTMLElement;
  actionBtn: HTMLElement;
  sendIcon: HTMLElement;
  stopIcon: HTMLElement;
  statusText: HTMLElement;
  runtimeConfigEl: HTMLElement | null;
  fileStateEl: HTMLElement | null;
};

function mustGetById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required DOM element #${id}`);
  }
  return element as T;
}

export function getWebviewDomRefs(): WebviewDomRefs {
  return {
    tabsEl: mustGetById<HTMLElement>('chatTabs'),
    msgsEl: mustGetById<HTMLElement>('messages'),
    transientThinkingEl: mustGetById<HTMLElement>('transientThinking'),
    composerEl: document.querySelector('.composer'),
    editorEl: mustGetById<HTMLElement>('editor'),
    agentSel: document.getElementById('agentSelect') as HTMLSelectElement | null,
    modelSel: mustGetById<HTMLSelectElement>('modelSelect'),
    thinkingSel: document.getElementById('thinkingSelect') as HTMLSelectElement | null,
    modelPickerWrap: document.getElementById('modelPickerWrap') as HTMLElement | null,
    modelPickerBtn: document.getElementById('modelPickerBtn') as HTMLButtonElement | null,
    modelPickerLabel: document.getElementById('modelPickerLabel') as HTMLElement | null,
    modelMenu: document.getElementById('modelMenu') as HTMLElement | null,
    thinkingPickerWrap: document.getElementById('thinkingPickerWrap') as HTMLElement | null,
    thinkingPickerBtn: document.getElementById('thinkingPickerBtn') as HTMLButtonElement | null,
    thinkingPickerLabel: document.getElementById('thinkingPickerLabel') as HTMLElement | null,
    thinkingMenu: document.getElementById('thinkingMenu') as HTMLElement | null,
    imgStripEl: mustGetById<HTMLElement>('imgStrip'),
    actionBtn: mustGetById<HTMLElement>('actionBtn'),
    sendIcon: mustGetById<HTMLElement>('sendIcon'),
    stopIcon: mustGetById<HTMLElement>('stopIcon'),
    statusText: mustGetById<HTMLElement>('statusText'),
    runtimeConfigEl: document.getElementById('_chatRuntimeConfig'),
    fileStateEl: document.getElementById('_fileState'),
  };
}
