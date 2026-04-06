type ActivityDisclosureDeps = {
  activeChatId: () => string;
  activityCollapsedByChat: Record<string, boolean>;
  activityDisclosureOpenByChat: Record<string, Record<string, boolean>>;
  rerenderTransient: (chatId: string) => void;
};

export function createActivityDisclosureController(deps: ActivityDisclosureDeps) {
  function toggleActivityGroup(btn: HTMLElement): void {
    const group = btn.closest('.oc-activity-group') as HTMLElement | null;
    if (!group) return;
    const list = group.querySelector('.oc-activity-list') as HTMLElement | null;
    if (!list) return;
    const nextCollapsed = !list.classList.contains('is-collapsed');
    list.classList.toggle('is-collapsed', nextCollapsed);
    btn.setAttribute('aria-expanded', nextCollapsed ? 'false' : 'true');
    const caret = btn.querySelector('.oc-activity-summary-caret');
    if (caret) caret.textContent = nextCollapsed ? '›' : '⌄';
    deps.activityCollapsedByChat[deps.activeChatId()] = nextCollapsed;
  }

  function toggleExecCard(btn: HTMLElement): void {
    const targetId = btn.getAttribute('data-target');
    if (!targetId) return;
    const card = document.getElementById(targetId);
    if (!card) return;
    const nextCollapsed = !card.classList.contains('is-collapsed');
    card.classList.toggle('is-collapsed', nextCollapsed);
    btn.setAttribute('aria-expanded', nextCollapsed ? 'false' : 'true');
    const caret = btn.querySelector('.oc-activity-summary-caret');
    if (caret) caret.textContent = nextCollapsed ? '›' : '⌄';
  }

  function syncDisclosureState(el: HTMLElement): void {
    const details = el as HTMLDetailsElement;
    const chatId = details.dataset.chatId || deps.activeChatId();
    const disclosureId = details.dataset.disclosureId;
    if (!disclosureId) return;
    const byChat = (deps.activityDisclosureOpenByChat[chatId] ||= {});
    byChat[disclosureId] = details.open;
    if (chatId === deps.activeChatId()) {
      window.setTimeout(() => deps.rerenderTransient(chatId), 0);
    }
  }

  return {
    toggleActivityGroup,
    toggleExecCard,
    syncDisclosureState,
  };
}
