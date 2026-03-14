export interface EditHunk {
  oldText: string;
  newText: string;
  description?: string;
}

export interface PendingChange {
  id: string;
  file: string;
  description: string;
  oldText?: string;
  newText?: string;
  fullContent?: string;
  action: 'edit' | 'create' | 'delete';
  edits?: EditHunk[];
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | any[];
}

export interface CodeReference {
  file: string;
  startLine: number;
  endLine: number;
  content: string;
}
