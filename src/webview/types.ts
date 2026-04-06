export type VsCodeApi = {
  postMessage: (msg: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

export type ChatMessage = {
  role: 'user' | 'assistant' | 'error';
  rawText: string;
  msgIdx?: string;
  model?: string;
  changeSet?: ChatChangeSet;
  canRevert?: boolean;
  chipLabels?: string[];
  imgPreviews?: string[];
  html?: string;
};

export type ChatChangedFile = {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  added: number;
  removed: number;
  patch: string;
};

export type ChatChangeSet = {
  id: string;
  files: ChatChangedFile[];
  totals: {
    files: number;
    added: number;
    removed: number;
  };
};

export type ResponseUiAction = {
  id?: string;
  label: string;
  prompt?: string;
  value?: string;
  mode?: 'fill' | 'send';
  kind?: 'primary' | 'secondary' | 'danger' | 'success';
};

export type ResponseUiChoice = {
  label: string;
  description?: string;
  prompt?: string;
  value?: string;
  mode?: 'fill' | 'send';
};

export type ResponseUiPayload = {
  summary?: string;
  status?: {
    tone?: 'success' | 'info' | 'warning' | 'error';
    title?: string;
    text?: string;
  };
  actions?: ResponseUiAction[];
  checks?: string[];
  files?: { path: string; note?: string; openPrompt?: string }[];
  choices?: ResponseUiChoice[];
  table?: {
    title?: string;
    columns: string[];
    rows: Array<Array<string | number | boolean | null>>;
  };
  code?: {
    title?: string;
    language?: string;
    content: string;
  };
};

export type ChatTab = {
  id: string;
  title: string;
  messages: ChatMessage[];
  msgIndex: number;
  agentId: string;
};
