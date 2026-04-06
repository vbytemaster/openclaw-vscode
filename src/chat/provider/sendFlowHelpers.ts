import * as fs from 'fs';
import * as path from 'path';
import type { CodeReference } from '../../shared/types';

export function normalizeThinkingLevel(
  thinkingLevelRaw?: string | null,
): string | null {
  const normalizedThinkingLevel = String(thinkingLevelRaw || '').trim().toLowerCase();
  return normalizedThinkingLevel && normalizedThinkingLevel !== 'auto'
    ? normalizedThinkingLevel
    : null;
}

function expandRefsIntoMessage(
  text: string,
  refIds: string[],
  codeRefs: Map<string, CodeReference>,
): string {
  if (refIds.length === 0) {
    return text.replace(/\u2318ref:\d+\u2318/g, '');
  }

  let refBlock = '';
  for (const refId of refIds) {
    const ref = codeRefs.get(refId);
    if (!ref) continue;
    refBlock += `\n\n[${ref.file}:${ref.startLine}-${ref.endLine}]\n\`\`\`\n${ref.content}\n\`\`\``;
  }
  return text + refBlock;
}

function persistInlineImages(
  workspaceRoot: string | null,
  images: string[],
): string[] {
  if (!workspaceRoot || images.length === 0) return [];
  const imagesDir = path.join(workspaceRoot, '.openclaw', 'images');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  const attachedPaths: string[] = [];
  for (const img of images) {
    const match = img.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) continue;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
    attachedPaths.push(`.openclaw/images/${fileName}`);
  }
  return attachedPaths;
}

export function buildMessageContent(
  text: string,
  refIds: string[],
  images: string[] | undefined,
  codeRefs: Map<string, CodeReference>,
  workspaceRoot: string | null,
): string {
  let messageContent = expandRefsIntoMessage(text, refIds, codeRefs);
  for (const relPath of persistInlineImages(workspaceRoot, images || [])) {
    messageContent += `\n\n[Attached image: ${relPath}]`;
  }
  return messageContent;
}
