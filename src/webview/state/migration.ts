import type { ChatMessage, ChatTab } from '../types.js';

function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractImgPreviews(html?: string): string[] | undefined {
  if (!html) return undefined;
  const matches = Array.from(html.matchAll(/<img[^>]+src="([^"]+)"/g)).map((match) => match[1]).filter(Boolean);
  return matches.length ? matches : undefined;
}

function extractChipLabels(html?: string): string[] | undefined {
  if (!html) return undefined;
  const labels = Array.from(html.matchAll(/<span class="code-ref-tag">[\s\S]*?([^<]+)<\/span>/g))
    .map((match) => String(match[1] || '').replace(/^≡\s*/, '').trim())
    .filter(Boolean);
  return labels.length ? labels : undefined;
}

export function migrateLegacyChatMessage(input: ChatMessage): ChatMessage {
  if (input.rawText) {
    return {
      ...input,
      imgPreviews: input.imgPreviews?.length ? input.imgPreviews : extractImgPreviews(input.html),
      chipLabels: input.chipLabels?.length ? input.chipLabels : extractChipLabels(input.html),
    };
  }

  const html = String(input.html || '');
  return {
    ...input,
    rawText: decodeHtml(html).trim(),
    imgPreviews: input.imgPreviews?.length ? input.imgPreviews : extractImgPreviews(html),
    chipLabels: input.chipLabels?.length ? input.chipLabels : extractChipLabels(html),
  };
}

export function migrateLegacyChatTab(input: ChatTab): ChatTab {
  return {
    ...input,
    messages: (input.messages || []).map(migrateLegacyChatMessage),
  };
}

export function migrateLegacyChats(chats: ChatTab[]): ChatTab[] {
  return (chats || []).map(migrateLegacyChatTab);
}
