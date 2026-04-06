import type { ChangeSetPayload, MessagesContext } from './messageTypes.js';
import { renderCard, renderCodeCard } from './components/primitives/cards.js';

export function renderChangeSet(ctx: MessagesContext, chatId: string, changeSet: ChangeSetPayload): string {
  const activeId = ctx.latestChangeSetByChat[chatId]?.id || '';
  const canRevert = Boolean(changeSet.id && activeId === changeSet.id);
  const fileWord = changeSet.totals.files === 1 ? 'файл' : changeSet.totals.files < 5 ? 'файла' : 'файлов';
  const header = `<div class="oc-change-head">
    <div class="oc-change-summary">
      <span class="oc-change-title">Изменено ${ctx.esc(String(changeSet.totals.files))} ${fileWord}</span>
      <span class="oc-change-add">+${ctx.esc(String(changeSet.totals.added))}</span>
      <span class="oc-change-del">-${ctx.esc(String(changeSet.totals.removed))}</span>
    </div>
    ${canRevert ? `<button class="oc-change-revert oc-revert-btn" data-action="revert-latest-change" data-chat-id="${ctx.esc(chatId)}" data-change-id="${ctx.esc(changeSet.id)}">Отменить</button>` : ''}
  </div>`;

  const files = changeSet.files.map((file, index) => {
    const rows = renderUnifiedPatch(ctx, file.patch);

    return `<details class="oc-change-file" ${index === 0 ? 'open' : ''}>
      <summary class="oc-change-file-summary">
        <span class="oc-change-file-path">${ctx.esc(file.path)}</span>
        <span class="oc-change-file-meta">
          <span class="oc-change-add">+${ctx.esc(String(file.added))}</span>
          <span class="oc-change-del">-${ctx.esc(String(file.removed))}</span>
          <span class="oc-change-file-caret">▾</span>
        </span>
      </summary>
      <div class="oc-change-file-body">
        ${renderCodeCard({
          langLabel: 'Diff',
          className: 'oc-diff-panel',
          bodyHtml: `<div class="oc-diff-lines">${rows}</div>`,
        })}
      </div>
    </details>`;
  }).join('');

  return renderCard({
    className: 'oc-change-set',
    bodyHtml: `${header}<div class="oc-change-files">${files}</div>`,
  }).replace('<section class="oc-card oc-change-set">', `<section class="oc-card oc-change-set" data-change-id="${ctx.esc(changeSet.id)}">`);
}

export function disableRevertButtons(ctx: MessagesContext, chatId: string, changeId?: string, label?: string): void {
  const buttons = Array.from(ctx.msgsEl.querySelectorAll(`.oc-revert-btn[data-chat-id="${chatId}"]`)) as HTMLButtonElement[];
  buttons.forEach((button) => {
    if (changeId && button.dataset.changeId !== changeId) return;
    button.disabled = true;
    button.classList.add('is-disabled');
    if (label) button.textContent = label;
  });
}

export function lockPreviousReverts(ctx: MessagesContext): void {
  const buttons = Array.from(ctx.msgsEl.querySelectorAll('.oc-revert-btn')) as HTMLButtonElement[];
  buttons.forEach((button) => {
    button.disabled = true;
    button.classList.add('is-disabled');
  });
}

function renderUnifiedPatch(ctx: MessagesContext, patch: string): string {
  let oldLine = 0;
  let newLine = 0;

  return patch.split('\n').map((line) => {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
      }
      return `<div class="oc-diff-line oc-diff-hunk"><span class="oc-diff-ln"></span><span class="oc-diff-ln"></span><span class="oc-diff-code">${ctx.esc(line || ' ')}</span></div>`;
    }

    if (line.startsWith('+')) {
      const rendered = `<div class="oc-diff-line oc-diff-add"><span class="oc-diff-ln"></span><span class="oc-diff-ln">${newLine}</span><span class="oc-diff-code">${ctx.esc(line || ' ')}</span></div>`;
      newLine += 1;
      return rendered;
    }

    if (line.startsWith('-')) {
      const rendered = `<div class="oc-diff-line oc-diff-del"><span class="oc-diff-ln">${oldLine}</span><span class="oc-diff-ln"></span><span class="oc-diff-code">${ctx.esc(line || ' ')}</span></div>`;
      oldLine += 1;
      return rendered;
    }

    if (line.startsWith('\\')) {
      return `<div class="oc-diff-line oc-diff-note"><span class="oc-diff-ln"></span><span class="oc-diff-ln"></span><span class="oc-diff-code">${ctx.esc(line || ' ')}</span></div>`;
    }

    const rendered = `<div class="oc-diff-line oc-diff-ctx"><span class="oc-diff-ln">${oldLine || ''}</span><span class="oc-diff-ln">${newLine || ''}</span><span class="oc-diff-code">${ctx.esc(line || ' ')}</span></div>`;
    if (oldLine) oldLine += 1;
    if (newLine) newLine += 1;
    return rendered;
  }).join('');
}
