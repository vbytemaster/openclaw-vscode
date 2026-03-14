export type VsCodeApi = {
  postMessage: (msg: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

export type ChatMessage = {
  role: string;
  html: string;
  rawText?: string;
  msgIdx?: string;
  model?: string;
};

export type ChatTab = {
  id: string;
  title: string;
  messages: ChatMessage[];
  msgIndex: number;
  agentId: string;
};
