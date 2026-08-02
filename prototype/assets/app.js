/*
 * Shared prototype interactions for the AI Matchmaker UX prototype.
 * Static mock data only — no persistence, no network calls.
 * Every init function guards on the presence of its target elements,
 * so this single file is safe to include, unmodified, on every page.
 */

document.addEventListener('DOMContentLoaded', () => {
  initAiPanelMinimize();
  initAiMenu();
  initAiPauseControls();
  initAiComposer();
  initSuggestionChips();
  initThreadComposer();
  initMobileAiDrawer();
  initRecommendationsPage();
  initDealbreakerConfirm();
  initProfileViewPage();
  initPhotoLightbox();
  initReportAndBlock();
  initLikeBack();
  initSearchPage();
  initSavedProfiles();
  initMatchesPage();
  initCompatibilityReportSave();
  initToggles();
  initNotifications();
  initDeleteAccount();
  initSettingsBlockedList();
  initAuthForms();
  initContactForm();
  initProfileCategoryCards();
  initProfileCoach();
});

/* ---------------------------------------------------------------- *
 * Chat helpers (shared by the AI panel, the onboarding chat, and
 * the ordinary human-to-human message thread)
 * ---------------------------------------------------------------- */

function appendMessage(transcript, role, text) {
  if (!transcript) return;
  const bubble = document.createElement('div');
  bubble.className =
    role === 'user'
      ? 'ml-auto max-w-[85%] whitespace-pre-line bg-accent-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed shadow-sm'
      : 'mr-auto max-w-[85%] whitespace-pre-line bg-stone-100 text-stone-800 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed';
  bubble.textContent = text;
  transcript.appendChild(bubble);
  transcript.scrollTop = transcript.scrollHeight;
}

function appendQuickReplies(transcript, options) {
  if (!transcript) return;
  const wrap = document.createElement('div');
  wrap.className = 'mr-auto max-w-[95%] flex flex-wrap gap-2';
  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'text-xs font-medium px-3 py-1.5 rounded-full border border-stone-300 bg-white text-stone-700 hover:border-accent-400 hover:text-accent-700 transition';
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      wrap.remove();
      appendMessage(transcript, 'user', opt.label);
      setTimeout(() => {
        appendMessage(transcript, 'ai', opt.reply);
        if (opt.pause) setAiPaused(true);
      }, 450);
    });
    wrap.appendChild(btn);
  });
  transcript.appendChild(wrap);
  transcript.scrollTop = transcript.scrollHeight;
}

function allTranscripts() {
  return document.querySelectorAll('[data-chat-transcript]');
}

function broadcastMessage(role, text) {
  allTranscripts().forEach((t) => appendMessage(t, role, text));
}

function broadcastQuickReplies(options) {
  allTranscripts().forEach((t) => appendQuickReplies(t, options));
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className =
    'fixed left-1/2 -translate-x-1/2 bottom-6 z-[60] bg-stone-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 300ms';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

function profileFirstName() {
  const nameEl = document.querySelector('[data-person-name]');
  const first = nameEl ? (nameEl.textContent || '').split(',')[0].trim() : '';
  return first || 'this person';
}

/* ---------------------------------------------------------------- *
 * Shared Pass / Save / Like tri-state toggle. Only one of the three
 * can be active; clicking the active one clears it back to neutral —
 * every decision is reversible. Pass/Like can optionally require
 * feedback text before they activate (Save never does). Used by the
 * full profile page, each AI Recommendation card, and the
 * Compatibility Report page.
 * ---------------------------------------------------------------- */

function wireTriState(root, options) {
  options = options || {};
  const buttons = {
    passed: root.querySelector('[data-action-pass]'),
    saved: root.querySelector('[data-action-save]'),
    liked: root.querySelector('[data-action-like]'),
  };
  if (!buttons.passed && !buttons.saved && !buttons.liked) return null;

  const requireFeedback = !!options.requireFeedback;
  const feedbackBox = root.querySelector('[data-feedback-box]');
  const feedbackInput = root.querySelector('[data-feedback-input]');
  const statusEl = root.querySelector('[data-action-status]');
  const name = options.name || 'this profile';

  const activeClasses = {
    passed: ['bg-stone-700', 'text-white', 'border-stone-700'],
    saved: ['bg-accent-100', 'text-accent-700', 'border-accent-300'],
    liked: ['bg-accent-600', 'text-white', 'border-accent-600'],
  };
  const neutralClasses = ['border-stone-300', 'text-stone-600'];
  const messages = Object.assign(
    {
      passed: 'Passed on ' + name + '.',
      saved: 'Saved ' + name + ' for later.',
      liked: 'You liked ' + name + ". We'll let you know if it's mutual.",
      cleared: 'Cleared your decision on ' + name + '.',
    },
    options.messages || {}
  );
  const statusText = Object.assign(
    {
      passed: 'You passed on ' + name + '.',
      saved: "Saved — you're not deciding yet.",
      liked: 'You liked ' + name + '.',
    },
    options.statusText || {}
  );

  let decision = '';

  function hasText() {
    return !!(feedbackInput && feedbackInput.value.trim());
  }

  function refreshEnabled() {
    if (!requireFeedback) return;
    const text = hasText();
    if (buttons.passed) buttons.passed.disabled = decision !== 'passed' && !text;
    if (buttons.liked) buttons.liked.disabled = decision !== 'liked' && !text;
  }

  function render() {
    Object.keys(buttons).forEach((key) => {
      const btn = buttons[key];
      if (!btn) return;
      const active = decision === key;
      const check = btn.querySelector('[data-check]');
      if (check) check.classList.toggle('hidden', !active);
      activeClasses[key].forEach((c) => btn.classList.toggle(c, active));
      neutralClasses.forEach((c) => btn.classList.toggle(c, !active));
    });
    if (statusEl) {
      if (decision) {
        statusEl.textContent = statusText[decision];
        statusEl.classList.remove('hidden');
      } else {
        statusEl.classList.add('hidden');
      }
    }
    if (feedbackBox) {
      feedbackBox.classList.toggle('hidden', decision !== 'passed' && decision !== 'liked');
    }
    refreshEnabled();
  }

  function setDecision(next) {
    if (decision === next) {
      decision = '';
      showToast(messages.cleared);
    } else {
      if ((next === 'passed' || next === 'liked') && requireFeedback && !hasText()) return;
      decision = next;
      showToast(messages[next]);
    }
    render();
    if (options.onChange) options.onChange(decision);
  }

  if (buttons.passed) buttons.passed.addEventListener('click', () => setDecision('passed'));
  if (buttons.saved) buttons.saved.addEventListener('click', () => setDecision('saved'));
  if (buttons.liked) buttons.liked.addEventListener('click', () => setDecision('liked'));
  if (feedbackInput) feedbackInput.addEventListener('input', refreshEnabled);

  render();

  return {
    getDecision: () => decision,
    getFeedback: () => (feedbackInput ? feedbackInput.value.trim() : ''),
  };
}

/* ---------------------------------------------------------------- *
 * Shared pagination component: "‹ Prev  1 2 3  Next ›", used the
 * same way everywhere a list can grow (Search, Saved Profiles,
 * Matches, Recommendations History). Pass the element whose direct
 * children are the items, and an empty slot element to render the
 * controls into. The returned object exposes refresh()/setFilter()
 * so callers can react to items being added, removed, or filtered.
 * ---------------------------------------------------------------- */

function createPaginator(container, pagerSlot, perPage) {
  let page = 1;
  let filterFn = () => true;

  function renderPagerControls(totalPages) {
    if (!pagerSlot) return;
    pagerSlot.innerHTML = '';
    if (totalPages <= 1) return;
    const wrap = document.createElement('div');
    wrap.className = 'flex items-center justify-center gap-1.5 mt-8';

    const navClass =
      'text-xs font-medium px-3 py-1.5 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.textContent = '‹ Prev';
    prev.className = navClass;
    prev.disabled = page === 1;
    prev.addEventListener('click', () => {
      page = Math.max(1, page - 1);
      render();
    });
    wrap.appendChild(prev);

    for (let p = 1; p <= totalPages; p += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = String(p);
      const active = p === page;
      btn.className =
        'text-xs font-medium w-7 h-7 rounded-full transition ' +
        (active ? 'bg-accent-600 text-white' : 'text-stone-600 hover:bg-stone-100');
      btn.addEventListener('click', () => {
        page = p;
        render();
      });
      wrap.appendChild(btn);
    }

    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = 'Next ›';
    next.className = navClass;
    next.disabled = page === totalPages;
    next.addEventListener('click', () => {
      page = Math.min(totalPages, page + 1);
      render();
    });
    wrap.appendChild(next);

    pagerSlot.appendChild(wrap);
  }

  function render() {
    const items = Array.from(container.children);
    const visible = items.filter(filterFn);
    const totalPages = Math.max(1, Math.ceil(visible.length / perPage));
    if (page > totalPages) page = totalPages;
    items.forEach((el) => el.classList.add('hidden'));
    visible.slice((page - 1) * perPage, page * perPage).forEach((el) => el.classList.remove('hidden'));
    renderPagerControls(totalPages);
    return visible.length;
  }

  return {
    render,
    refresh() {
      render();
    },
    setFilter(fn) {
      filterFn = fn;
      page = 1;
      render();
    },
    goToFirstPage() {
      page = 1;
      render();
    },
  };
}

/* ---------------------------------------------------------------- *
 * AI panel: minimize / restore (desktop only)
 * ---------------------------------------------------------------- */

function setPanelCollapsed(panel, collapsed) {
  panel.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
  panel.style.width = collapsed ? '4.5rem' : '380px';
  const content = panel.querySelector('[data-ai-content]');
  const rail = panel.querySelector('[data-ai-collapsed-view]');
  if (content) content.classList.toggle('hidden', collapsed);
  if (rail) {
    rail.classList.toggle('hidden', !collapsed);
    rail.classList.toggle('flex', collapsed);
  }
}

function initAiPanelMinimize() {
  document.querySelectorAll('[data-ai-minimize]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('[data-ai-panel]');
      if (!panel) return;
      const collapsed = panel.getAttribute('data-collapsed') === 'true';
      setPanelCollapsed(panel, !collapsed);
    });
  });
}

/* ---------------------------------------------------------------- *
 * AI panel: "more controls" menu (kebab)
 * ---------------------------------------------------------------- */

function closeAllMenus() {
  document.querySelectorAll('[data-ai-menu]').forEach((m) => m.classList.add('hidden'));
}

function initAiMenu() {
  document.querySelectorAll('[data-ai-menu-toggle]').forEach((btn) => {
    const panel = btn.closest('[data-ai-panel]');
    const menu = panel ? panel.querySelector('[data-ai-menu]') : null;
    if (!menu) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = menu.classList.contains('hidden');
      closeAllMenus();
      menu.classList.toggle('hidden', !willOpen);
    });
  });
  document.addEventListener('click', (e) => {
    document.querySelectorAll('[data-ai-menu]:not(.hidden)').forEach((menu) => {
      if (!menu.contains(e.target) && e.target.closest('[data-ai-menu-toggle]') === null) {
        menu.classList.add('hidden');
      }
    });
  });
}

/* ---------------------------------------------------------------- *
 * AI panel: pause / resume suggestions
 * ---------------------------------------------------------------- */

function setAiPaused(paused) {
  document.querySelectorAll('[data-ai-panel]').forEach((panel) => {
    const pill = panel.querySelector('[data-ai-status]');
    const dot = panel.querySelector('[data-status-dot]');
    const text = panel.querySelector('[data-status-text]');
    const banner = panel.querySelector('[data-ai-paused-banner]');
    if (pill) {
      pill.classList.toggle('bg-emerald-50', !paused);
      pill.classList.toggle('text-emerald-700', !paused);
      pill.classList.toggle('bg-stone-100', paused);
      pill.classList.toggle('text-stone-500', paused);
    }
    if (dot) {
      dot.classList.toggle('bg-emerald-500', !paused);
      dot.classList.toggle('bg-stone-400', paused);
    }
    if (text) text.textContent = paused ? 'Paused' : 'Available';
    if (banner) banner.classList.toggle('hidden', !paused);
    panel.querySelectorAll('[data-ai-suggestions]').forEach((s) => {
      s.classList.toggle('opacity-40', paused);
      s.classList.toggle('pointer-events-none', paused);
    });
  });
}

function initAiPauseControls() {
  document.querySelectorAll('[data-ai-quiet-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setAiPaused(true);
      closeAllMenus();
    });
  });
  document.querySelectorAll('[data-ai-resume]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setAiPaused(false);
      closeAllMenus();
    });
  });
}

/* ---------------------------------------------------------------- *
 * AI conversation composer (onboarding chat + AI panel, desktop & mobile)
 * ---------------------------------------------------------------- */

function initAiComposer() {
  document.querySelectorAll('[data-chat-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('[data-chat-input]');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      broadcastMessage('user', text);
      input.value = '';
      const acknowledgements = [
        "Got it — thanks for sharing that.",
        "Noted, that helps me understand you better.",
        "Good to know, I'll factor that in.",
        "Thanks — I'll remember that.",
      ];
      const reply = acknowledgements[Math.floor(Math.random() * acknowledgements.length)];
      setTimeout(() => broadcastMessage('ai', reply), 500);
    });
  });
}

function initSuggestionChips() {
  document.querySelectorAll('[data-ai-suggestion]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const label = btn.dataset.aiSuggestion;
      const reply = btn.dataset.aiReply || "Let me look into that for you.";
      broadcastMessage('user', label);
      setTimeout(() => broadcastMessage('ai', reply), 500);
    });
  });
}

/* ---------------------------------------------------------------- *
 * Ordinary human-to-human message thread (independent of the AI)
 * ---------------------------------------------------------------- */

function initThreadComposer() {
  document.querySelectorAll('[data-thread-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('[data-thread-input]');
      const transcript = document.querySelector('[data-thread-transcript]');
      if (!input || !transcript) return;
      const text = input.value.trim();
      if (!text) return;
      appendMessage(transcript, 'user', text);
      input.value = '';
    });
  });
}

/* ---------------------------------------------------------------- *
 * Mobile AI drawer + floating button
 * ---------------------------------------------------------------- */

function initMobileAiDrawer() {
  const toggle = document.getElementById('ai-mobile-toggle');
  const drawer = document.getElementById('ai-mobile-drawer');
  const backdrop = document.getElementById('ai-drawer-backdrop');
  const closeBtn = document.getElementById('ai-drawer-close');
  if (!toggle || !drawer) return;

  const open = () => {
    drawer.classList.remove('translate-y-full');
    if (backdrop) backdrop.classList.remove('hidden');
  };
  const close = () => {
    drawer.classList.add('translate-y-full');
    if (backdrop) backdrop.classList.add('hidden');
  };

  toggle.addEventListener('click', () => {
    drawer.classList.contains('translate-y-full') ? open() : close();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
}

/* ---------------------------------------------------------------- *
 * Reason "Show more" truncation, used by any card with
 * [data-reason-text] + [data-reason-toggle]. Only reveals the toggle
 * when the text actually overflows its clamp, and can be re-run
 * safely after new cards are added to the page.
 * ---------------------------------------------------------------- */

function initReasonToggles(scope) {
  (scope || document).querySelectorAll('[data-reason-text]').forEach((textEl) => {
    const toggle = textEl.parentElement.querySelector('[data-reason-toggle]');
    if (!toggle) return;
    requestAnimationFrame(() => {
      const isClamped = textEl.scrollHeight > textEl.clientHeight + 1;
      if (isClamped || textEl.classList.contains('line-clamp-none')) {
        toggle.classList.remove('hidden');
      }
    });
    if (toggle.dataset.wired === 'true') return;
    toggle.dataset.wired = 'true';
    toggle.addEventListener('click', () => {
      const expanded = textEl.classList.toggle('line-clamp-none');
      textEl.classList.toggle('line-clamp-2', !expanded);
      toggle.textContent = expanded ? 'Show less' : 'Show more';
    });
  });
}

/* ---------------------------------------------------------------- *
 * AI Recommendations page: New / History tabs.
 *
 * Every recommendation was AI-generated, so a short free-form reason
 * is required before Pass or Like (Save stays a no-explanation
 * bookmark). Pass/Save/Like are the same reversible tri-state toggle
 * used on the full profile page — deciding hides the card from New
 * and mirrors it into History; toggling back to neutral un-hides it
 * and removes the History entry. The {decision, feedback} shape is
 * deliberately simple so a future version could scan feedback text
 * for recurring themes — that pattern-detection is out of scope here.
 * ---------------------------------------------------------------- */

function initRecommendationsPage() {
  const newPanel = document.querySelector('[data-rec-tab-panel="new"]');
  const historyPanel = document.querySelector('[data-rec-tab-panel="history"]');
  if (!newPanel || !historyPanel) return;

  const tabBtns = document.querySelectorAll('[data-rec-tab-btn]');
  const historyList = document.querySelector('[data-rec-history-list]');
  const historyEmpty = document.querySelector('[data-rec-history-empty]');
  const historyPagerSlot = document.querySelector('[data-rec-history-pager]');
  const newEmpty = document.querySelector('[data-rec-new-empty]');
  const filterBtns = document.querySelectorAll('[data-rec-filter-btn]');
  let activeFilter = 'all';

  function setTab(tab) {
    newPanel.classList.toggle('hidden', tab !== 'new');
    historyPanel.classList.toggle('hidden', tab !== 'history');
    tabBtns.forEach((btn) => {
      const active = btn.dataset.recTabBtn === tab;
      btn.classList.toggle('text-accent-700', active);
      btn.classList.toggle('border-accent-600', active);
      btn.classList.toggle('text-stone-500', !active);
      btn.classList.toggle('border-transparent', !active);
    });
  }
  tabBtns.forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.recTabBtn)));

  const historyPager = createPaginator(historyList, historyPagerSlot, 3);
  historyPager.setFilter((el) => activeFilter === 'all' || el.dataset.decision === activeFilter);

  function applyFilter() {
    if (!historyList) return;
    const visibleCount = historyPager.render();
    if (historyEmpty) historyEmpty.classList.toggle('hidden', visibleCount > 0);
  }
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.recFilterBtn;
      filterBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('bg-accent-600', active);
        b.classList.toggle('text-white', active);
        b.classList.toggle('border', !active);
        b.classList.toggle('border-stone-300', !active);
        b.classList.toggle('text-stone-600', !active);
      });
      historyPager.setFilter((el) => activeFilter === 'all' || el.dataset.decision === activeFilter);
      applyFilter();
    });
  });

  const decisionLabel = { passed: 'Passed', liked: 'Liked', saved: 'Saved' };
  const decisionBadgeClass = {
    passed: 'text-stone-500 bg-stone-100',
    liked: 'text-accent-700 bg-accent-50',
    saved: 'text-accent-700 bg-accent-100',
  };

  function buildHistoryCard(card, decision, reason) {
    const id = (card.dataset.name || '').split(',')[0].trim().toLowerCase();
    const href = 'profile-view.html?id=' + encodeURIComponent(id);
    const item = document.createElement('div');
    item.setAttribute('data-rec-history-item', '');
    item.setAttribute('data-dynamic-history', '');
    item.setAttribute('data-decision', decision);
    item.className = 'flex gap-4 bg-white border border-stone-200 rounded-2xl p-4';
    const pill = '<span class="inline-block text-[11px] font-medium ' + decisionBadgeClass[decision] + ' rounded-full px-2.5 py-1 mb-1">' + decisionLabel[decision] + '</span>';
    const reasonBlock = reason
      ? pill +
        '<p data-reason-text class="text-sm text-stone-600 leading-relaxed line-clamp-2">"' + reason + '"</p>' +
        '<button type="button" data-reason-toggle class="hidden text-xs font-medium text-accent-700 hover:underline mt-0.5">Show more</button>'
      : pill + '<p class="text-sm text-stone-400 italic leading-relaxed">No decision yet.</p>';
    item.innerHTML =
      '<a href="' + href + '" class="w-20 h-20 rounded-xl bg-gradient-to-br ' + (card.dataset.gradient || 'from-stone-200 to-stone-400') + ' flex items-center justify-center shrink-0">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-9 h-9 text-white/70"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5"/></svg>' +
      '</a>' +
      '<div class="flex-1 min-w-0">' +
        '<p class="font-medium text-stone-900">' + (card.dataset.name || '') + '</p>' +
        '<p class="text-xs text-stone-500">' + (card.dataset.location || '') + '</p>' +
        '<p class="text-xs text-stone-400 mt-1">Recommended ' + (card.dataset.date || '') + '</p>' +
        '<div class="mt-2">' + reasonBlock + '</div>' +
        '<a href="' + href + '" class="inline-block mt-3 text-xs font-medium border border-stone-300 text-stone-600 rounded-full px-4 py-2 hover:bg-stone-50">View Profile</a>' +
      '</div>';
    return item;
  }

  const cardEntries = [];

  function syncHistory() {
    if (!historyList) return;
    historyList.querySelectorAll('[data-dynamic-history]').forEach((el) => el.remove());
    cardEntries.forEach(({ card, controller }) => {
      const decision = controller.getDecision();
      if (!decision) return;
      const item = buildHistoryCard(card, decision, controller.getFeedback());
      historyList.insertBefore(item, historyList.firstChild);
    });
    initReasonToggles(historyList);
    applyFilter();
  }

  document.querySelectorAll('[data-rec-card]').forEach((card) => {
    const name = card.dataset.name || 'this profile';
    const controller = wireTriState(card, {
      name: name,
      requireFeedback: true,
      onChange: (decision) => {
        card.classList.toggle('hidden', !!decision);
        const remaining = newPanel.querySelectorAll('[data-rec-card]:not(.hidden)').length;
        if (newEmpty) newEmpty.classList.toggle('hidden', remaining > 0);
        syncHistory();
      },
    });
    if (controller) cardEntries.push({ card, controller });
  });

  initReasonToggles(historyList);
  applyFilter();
}

/* ---------------------------------------------------------------- *
 * Compatibility Report page: a profile is being viewed here too, so
 * it gets the same Save bookmark as everywhere else — "if you can
 * view a profile, you can save it."
 * ---------------------------------------------------------------- */

function initCompatibilityReportSave() {
  const root = document.querySelector('[data-report-save-scope]');
  if (!root) return;
  wireTriState(root, { name: root.dataset.reportName || 'this profile' });
}

/* ---------------------------------------------------------------- *
 * Compatibility report page: "make this a hard dealbreaker" confirmation
 * ---------------------------------------------------------------- */

function initDealbreakerConfirm() {
  document.querySelectorAll('[data-dealbreaker-trigger]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      broadcastMessage('user', 'Make children a hard dealbreaker.');
      setTimeout(() => {
        broadcastMessage(
          'ai',
          "Just to confirm — you'd like me to treat wanting children as a hard dealbreaker? I'll stop showing you people who don't want children, even if they're a strong match otherwise."
        );
        broadcastQuickReplies([
          {
            label: 'Confirm',
            reply: "Done — I've updated My Profile. Children is now marked as a hard dealbreaker.",
          },
          { label: 'Cancel', reply: "No problem, I'll leave it as-is." },
        ]);
      }, 450);
    });
  });
}

/* ---------------------------------------------------------------- *
 * Full Profile View page (Search → View Profile navigates here
 * instead of opening a modal). Mock directory of public profiles,
 * keyed by the `id` query param.
 * ---------------------------------------------------------------- */

const PROFILES = {
  elena: {
    name: 'Elena', age: 31, meta: 'Austin, TX · UX Researcher',
    gradient: 'from-accent-200 to-accent-400',
    photos: [
      { gradient: 'from-accent-200 to-accent-400', caption: 'Coffee shop portrait' },
      { gradient: 'from-violet-200 to-violet-400', caption: 'Farmers market Saturday' },
      { gradient: 'from-fuchsia-100 to-accent-300', caption: 'Trip to Lisbon' },
      { gradient: 'from-indigo-100 to-indigo-300', caption: 'Reading on the porch' },
      { gradient: 'from-stone-200 to-stone-400', caption: 'Hiking Enchanted Rock' },
    ],
    bio: "Curious, a little too invested in the farmers market, and always planning the next trip. I grew up in Chicago but Austin's felt like home for years now. Looking for someone who wants a real partnership — not just plans, but follow-through.",
    details: {
      Age: '31', Gender: 'Woman', Religion: 'Spiritual, not religious', 'Current city': 'Austin, TX',
      Hometown: 'Chicago, IL', Occupation: 'UX Researcher', Education: "Master's degree",
      Children: 'Has one child', Height: '5\'6"', Languages: 'English, Spanish',
      'Relationship goals': 'Long-term, open to marriage',
    },
    interests: ['Travel', 'Farmers markets', 'Yoga', 'Reading', 'Photography', 'Wine tasting'],
    narrative: [
      { label: 'Religion & Spirituality', text: "Spiritual rather than religious. I don't follow a specific faith, but meaning and openness matter to me, and I'm comfortable around people of any belief system." },
      { label: 'Family', text: "I'm a parent to one child, and family is a meaningful part of my life. I'm hoping to build a relationship with someone who embraces that." },
      { label: 'Relationship Goals', text: "Looking for something long-term and open to marriage — I want a real partnership, someone who follows through on plans, not just makes them." },
      { label: 'Career', text: "UX researcher with a master's degree. I like work that blends curiosity with structure, and I bring that same thoughtfulness to relationships." },
      { label: 'Lifestyle', text: "Weekends usually start at the farmers market and wind down with a yoga class and a glass of wine — I like a life with a little ritual to it." },
      { label: 'Travel', text: "Always planning the next trip. Photography and travel go hand in hand for me — I come home with new photos and a slightly different perspective every time." },
    ],
  },
  priya: {
    name: 'Priya', age: 29, meta: 'Austin, TX · Physician',
    gradient: 'from-violet-200 to-accent-500',
    photos: [
      { gradient: 'from-violet-200 to-accent-500', caption: 'Post-shift smile' },
      { gradient: 'from-accent-300 to-accent-500', caption: 'Half marathon finish line' },
      { gradient: 'from-indigo-100 to-indigo-300', caption: 'Side business pop-up' },
      { gradient: 'from-fuchsia-100 to-accent-300', caption: 'Machu Picchu, 2023' },
      { gradient: 'from-stone-200 to-stone-400', caption: 'Sunday meal prep' },
    ],
    bio: "Runs before work, hikes on weekends, and is quietly building a side business she won't stop talking about once you ask. Family means everything to me, and I'm ready to build one of my own with the right person.",
    details: {
      Age: '29', Gender: 'Woman', Religion: 'Not religious', 'Current city': 'Austin, TX',
      Hometown: 'Houston, TX', Occupation: 'Physician', Education: 'Doctorate',
      Children: 'Wants children', Height: '5\'4"', Languages: 'English, Hindi',
      'Relationship goals': 'Marriage',
    },
    interests: ['Running', 'Hiking', 'Entrepreneurship', 'Travel', 'Health & fitness', 'Cooking'],
    narrative: [
      { label: 'Religion & Spirituality', text: "Not religious, and it's not something I need a partner to share. I care more about someone's everyday values than their beliefs on paper." },
      { label: 'Family', text: "I don't have children yet, but I want them — building a family is a big part of why I'm looking for something serious now." },
      { label: 'Relationship Goals', text: "I'm looking for marriage, not just something long-term. I know what I want, and I'd rather be upfront about it." },
      { label: 'Career', text: "Physician with a doctorate, and quietly building a side business on top of a full-time job. Ambitious, but never at the expense of the people I care about." },
      { label: 'Lifestyle', text: "Runs before work, hikes most weekends, and treats a home-cooked meal as the best way to unwind. Health and fitness aren't a phase for me — it's just how I live." },
      { label: 'Travel', text: "Machu Picchu was the trip that changed how I travel. I plan around what I want to learn, not just where's trending." },
    ],
  },
  maya: {
    name: 'Maya', age: 27, meta: 'Austin, TX · Architect',
    gradient: 'from-fuchsia-100 to-accent-300',
    photos: [
      { gradient: 'from-fuchsia-100 to-accent-300', caption: 'Studio critique day' },
      { gradient: 'from-violet-200 to-violet-400', caption: 'Sketchbook, greenbelt bench' },
      { gradient: 'from-accent-200 to-accent-400', caption: 'Concert night' },
      { gradient: 'from-indigo-100 to-indigo-300', caption: 'Sunday playlist and coffee' },
    ],
    bio: "Designs for a living, sketches for fun. Weekends are for the greenbelt and a good playlist. Faith is a quiet but steady part of my life, and I'd love to find someone who wants a family and shares that grounding.",
    details: {
      Age: '27', Gender: 'Woman', Religion: 'Christian', 'Current city': 'Austin, TX',
      Hometown: 'San Antonio, TX', Occupation: 'Architect', Education: "Bachelor's degree",
      Children: 'Wants children', Height: '5\'5"', Languages: 'English',
      'Relationship goals': 'Long-term, open to marriage',
    },
    interests: ['Design', 'Live music', 'Sketching', 'Nightlife', 'Faith community', 'Outdoors'],
    narrative: [
      { label: 'Religion & Spirituality', text: "Christian, and my faith is a quiet but steady part of my life. I'd love to find someone who shares that grounding, though I'm not looking to convert anyone." },
      { label: 'Family', text: "I want children someday, and I'm looking for someone who sees building a family as something to look forward to, not just plan around." },
      { label: 'Relationship Goals', text: "Long-term, and open to marriage. I'm not in a rush, but I know that's the direction I want things to go." },
      { label: 'Career', text: "Architect with a bachelor's degree. I design for a living and sketch for fun, so the line between work and hobby blurs more than people expect." },
      { label: 'Lifestyle', text: "Weekends are for the greenbelt, a good playlist, and usually a concert or two. I like a life with texture, not just routine." },
    ],
  },
  sofia: {
    name: 'Sofia', age: 33, meta: 'Austin, TX · Marketing Director',
    gradient: 'from-stone-200 to-stone-400',
    photos: [
      { gradient: 'from-stone-200 to-stone-400', caption: 'Trail run finish' },
      { gradient: 'from-violet-200 to-accent-400', caption: 'Team offsite' },
      { gradient: 'from-indigo-100 to-indigo-300', caption: 'Last-minute weekend trip' },
    ],
    bio: "Runs a team by day, runs trails by weekend. Direct, funny, and always down for the last-minute plan. I've built a life I love and I'm not looking to have kids — just a partner who's just as sure of what they want.",
    details: {
      Age: '33', Gender: 'Woman', Religion: 'Not religious', 'Current city': 'Austin, TX',
      Hometown: 'Miami, FL', Occupation: 'Marketing Director', Education: "Bachelor's degree",
      Children: "Doesn't want children", Height: '5\'7"', Languages: 'English, Portuguese',
      'Relationship goals': 'Long-term',
    },
    interests: ['Trail running', 'Marketing & strategy', 'Spontaneous travel', 'Comedy', 'Wine'],
    narrative: [
      { label: 'Religion & Spirituality', text: "Not religious, and honestly don't think about it much. I'm easygoing about what other people believe." },
      { label: 'Family', text: "I've built a life I love and I'm not looking to have kids. Just looking for a partner who's just as sure of what they want." },
      { label: 'Relationship Goals', text: "Long-term is the goal, though marriage isn't something I'm fixed on either way. I'd rather find the right person than force a specific outcome." },
      { label: 'Career', text: "Marketing director with a bachelor's degree. I run a team by day and don't leave the ambition at the office." },
      { label: 'Lifestyle', text: "Direct, funny, and always down for the last-minute plan. Trail running most weekends, wine and comedy most weeknights." },
      { label: 'Travel', text: "Spontaneous travel is my favorite kind — I'd rather book a flight on a whim than plan six months out." },
    ],
  },
  zoe: {
    name: 'Zoe', age: 30, meta: 'Austin, TX · Physical Therapist',
    gradient: 'from-indigo-100 to-indigo-300',
    photos: [
      { gradient: 'from-indigo-100 to-indigo-300', caption: 'Rock climbing gym' },
      { gradient: 'from-violet-200 to-violet-400', caption: 'Sunrise yoga' },
      { gradient: 'from-fuchsia-100 to-accent-300', caption: 'Slow dinner, good wine' },
    ],
    bio: "Believes in slow mornings and long dinners. Rock climbing on weekends, yoga most other days. I take relationships slow and intentionally — if that resonates with you, let's talk.",
    details: {
      Age: '30', Gender: 'Woman', Religion: 'Buddhist', 'Current city': 'Austin, TX',
      Hometown: 'Portland, OR', Occupation: 'Physical Therapist', Education: "Master's degree",
      Children: 'Wants children', Height: '5\'3"', Languages: 'English',
      'Relationship goals': 'Long-term, open to marriage',
    },
    interests: ['Rock climbing', 'Yoga', 'Mindfulness', 'Cooking', 'Quiet mornings'],
    narrative: [
      { label: 'Religion & Spirituality', text: "Buddhist, and it shows up more in how I move through the day than in any strict practice — mindfulness matters to me." },
      { label: 'Family', text: "I want children eventually, and I'd like to build toward that slowly and intentionally with the right person." },
      { label: 'Relationship Goals', text: "Long-term, and open to marriage — but I take relationships slow and intentionally. If that resonates with you, let's talk." },
      { label: 'Career', text: "Physical therapist with a master's degree. I like work that's hands-on and genuinely helps people." },
      { label: 'Lifestyle', text: "Believes in slow mornings and long dinners. Rock climbing on weekends, yoga most other days, and quiet time in between." },
    ],
  },
  naomi: {
    name: 'Naomi', age: 28, meta: 'Austin, TX · Attorney',
    gradient: 'from-purple-100 to-fuchsia-300',
    photos: [
      { gradient: 'from-purple-100 to-fuchsia-300', caption: 'Closing arguments day' },
      { gradient: 'from-violet-200 to-accent-400', caption: 'Taco truck Tuesday' },
      { gradient: 'from-indigo-100 to-indigo-300', caption: 'Book club night' },
    ],
    bio: "Reads more nonfiction than is probably healthy. Loves a good debate and an even better taco. Still figuring out where children fit into the picture, and looking for someone open to figuring it out together.",
    details: {
      Age: '28', Gender: 'Woman', Religion: 'Jewish', 'Current city': 'Austin, TX',
      Hometown: 'New York, NY', Occupation: 'Attorney', Education: 'Doctorate',
      Children: 'Undecided on children', Height: '5\'5"', Languages: 'English, French',
      'Relationship goals': 'Long-term',
    },
    interests: ['Reading', 'Debate & politics', 'Food', 'Book club', 'Travel'],
    narrative: [
      { label: 'Religion & Spirituality', text: "Jewish, and it's part of how I grew up more than a strict daily practice now — but it still matters to me culturally." },
      { label: 'Family', text: "Still figuring out where children fit into the picture, and looking for someone open to figuring it out together.", hidden: true },
      { label: 'Relationship Goals', text: "Looking for something long-term. I know myself well enough to know I don't want to rush this." },
      { label: 'Career', text: "Attorney with a doctorate. I love a good debate almost as much as I love winning one." },
      { label: 'Lifestyle', text: "Reads more nonfiction than is probably healthy, and always has an opinion on the book club pick. Loves a good taco even more than a good argument." },
      { label: 'Travel', text: "Travel is high on my list — I like a trip that teaches me something, not just a photo op." },
    ],
  },
  aisha: {
    name: 'Aisha', age: 26, meta: 'Austin, TX · Software Engineer',
    gradient: 'from-violet-100 to-indigo-300',
    photos: [
      { gradient: 'from-violet-100 to-indigo-300', caption: 'Hackathon weekend' },
      { gradient: 'from-accent-200 to-accent-400', caption: 'Bouldering gym' },
      { gradient: 'from-fuchsia-100 to-accent-300', caption: 'Farmers market haul' },
    ],
    bio: "Writes code for a living and reads sci-fi for fun. Bouldering most weekends, always down to try a new coffee shop. Looking for someone curious and a little competitive at board games.",
    details: {
      Age: '26', Gender: 'Woman', Religion: 'Muslim', 'Current city': 'Austin, TX',
      Hometown: 'Dallas, TX', Occupation: 'Software Engineer', Education: "Bachelor's degree",
      Children: 'Wants children', Height: '5\'4"', Languages: 'English, Urdu',
      'Relationship goals': 'Long-term, open to marriage',
    },
    interests: ['Bouldering', 'Sci-fi', 'Board games', 'Coffee', 'Coding side projects'],
    narrative: [
      { label: 'Religion & Spirituality', text: "Moderate Muslim. Faith is important to me, but I'm looking for someone kind, thoughtful, and open-minded rather than rigid." },
      { label: 'Family', text: "I want children someday, and I'd like a partner who's genuinely excited about that, not just accepting of it." },
      { label: 'Relationship Goals', text: "Long-term, and open to marriage — I'm looking for someone I can build a real life with." },
      { label: 'Career', text: "Software engineer with a bachelor's degree. I write code for a living and read sci-fi for fun — probably not a coincidence." },
      { label: 'Lifestyle', text: "Bouldering most weekends, always down to try a new coffee shop, and a little competitive at board games. Looking for someone curious enough to keep up." },
    ],
  },
  grace: {
    name: 'Grace', age: 32, meta: 'Austin, TX · Veterinarian',
    gradient: 'from-fuchsia-200 to-purple-400',
    photos: [
      { gradient: 'from-fuchsia-200 to-purple-400', caption: 'Clinic with a rescue pup' },
      { gradient: 'from-stone-200 to-stone-400', caption: 'Weekend garden project' },
      { gradient: 'from-indigo-100 to-indigo-300', caption: 'Sunday farmers market' },
    ],
    bio: "Spends all day looking after other people's pets and comes home to two of my own. Big on quiet weekends, gardening, and long phone-free dinners. Ready to build a steady, grounded life with someone.",
    details: {
      Age: '32', Gender: 'Woman', Religion: 'Not religious', 'Current city': 'Austin, TX',
      Hometown: 'Denver, CO', Occupation: 'Veterinarian', Education: 'Doctorate',
      Children: 'Wants children', Height: '5\'6"', Languages: 'English',
      'Relationship goals': 'Marriage',
    },
    interests: ['Animals', 'Gardening', 'Slow living', 'Cooking', 'Hiking'],
    narrative: [
      { label: 'Religion & Spirituality', text: "Not religious, and it's not a big factor for me either way — I care more about how someone treats others than what they believe." },
      { label: 'Family', text: "I want children, and I'm looking for someone ready to build a steady, grounded family life together." },
      { label: 'Relationship Goals', text: "Marriage is the goal — I'm not interested in casual, and I'd rather be clear about that upfront." },
      { label: 'Career', text: "Veterinarian with a doctorate. I spend all day looking after other people's pets and come home to two of my own." },
      { label: 'Lifestyle', text: "Big on quiet weekends, gardening, and long phone-free dinners. Ready to build a steady, grounded life with someone." },
    ],
  },
};

function initProfileViewPage() {
  const root = document.querySelector('[data-profile-view]');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || 'elena';
  const profile = PROFILES[id] || PROFILES.elena;

  const primaryPhoto = root.querySelector('[data-photo-primary]');
  const thumbsWrap = root.querySelector('[data-photo-thumbs]');
  const nameEl = root.querySelector('[data-profile-name]');
  const requiredEl = root.querySelector('[data-profile-required]');
  const narrativeEl = root.querySelector('[data-profile-narrative]');

  if (primaryPhoto) {
    primaryPhoto.className =
      'relative w-full aspect-[16/9] sm:aspect-[16/8] rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3 cursor-zoom-in ' +
      profile.gradient;
  }
  if (nameEl) nameEl.textContent = profile.name + ', ' + profile.age;

  // Required fields — always public, shown as simple facts rather than AI-generated prose.
  if (requiredEl) {
    const required = [
      profile.details.Gender,
      profile.details['Current city'] + ', United States',
      profile.details.Occupation,
    ];
    requiredEl.innerHTML = required
      .map((v) => '<span>' + v + '</span>')
      .join('<span class="text-stone-300">·</span>');
  }

  // Narrative sections — About plus every category the person has kept visible.
  // A category that's been turned off is omitted entirely, not just hidden with CSS.
  if (narrativeEl) {
    narrativeEl.innerHTML = '';
    const sections = [{ label: 'About', text: profile.bio }].concat(profile.narrative || []);
    sections.forEach((section) => {
      if (section.hidden) return;
      const el = document.createElement('section');
      el.className = 'mb-10';
      el.innerHTML =
        '<h2 class="text-sm font-semibold uppercase tracking-wide text-stone-400 mb-3">' + section.label + '</h2>' +
        '<div class="bg-white border border-stone-200 rounded-2xl px-5 py-4">' +
        '<p class="text-sm text-stone-600 leading-relaxed">' + section.text + '</p>' +
        '</div>';
      narrativeEl.appendChild(el);
    });
  }

  if (thumbsWrap) {
    thumbsWrap.innerHTML = '';
    profile.photos.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-photo-thumb', '');
      btn.setAttribute('data-gradient', p.gradient);
      btn.setAttribute('data-caption', p.caption);
      btn.className = 'aspect-square rounded-xl bg-gradient-to-br flex items-center justify-center ' + p.gradient;
      btn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-white/70"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5"/></svg>';
      thumbsWrap.appendChild(btn);
    });
  }

  document.title = profile.name + ', ' + profile.age + ' — AI Matchmaker';

  wireTriState(root, { name: profile.name });

  const feedbackInput = root.querySelector('[data-feedback-input]');
  const feedbackSubmit = root.querySelector('[data-feedback-submit]');
  if (feedbackSubmit) {
    feedbackSubmit.addEventListener('click', () => {
      if (!feedbackInput || !feedbackInput.value.trim()) return;
      showToast('Thanks — feedback noted.');
      feedbackInput.value = '';
    });
  }
}

/* ---------------------------------------------------------------- *
 * Report and Block: available from the "..." menu on someone's
 * profile or in a message thread. Both reachable from the same
 * markup pattern (data-report-menu-toggle etc.), so one function
 * wires every page that includes it. Blocking replaces whatever's
 * marked data-decision-section with a reversible data-blocked-banner
 * instead of navigating away, so the mock stays on the page.
 * ---------------------------------------------------------------- */

function initReportAndBlock() {
  const menuToggle = document.querySelector('[data-report-menu-toggle]');
  const menu = document.querySelector('[data-report-menu]');
  if (!menuToggle || !menu) return;

  const name = profileFirstName();

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuToggle) {
      menu.classList.add('hidden');
    }
  });

  const reportModal = document.getElementById('report-modal');
  const reportTrigger = document.querySelector('[data-report-trigger]');
  if (reportTrigger && reportModal) {
    const reportModalName = reportModal.querySelector('[data-report-modal-name]');
    const reportCancel = reportModal.querySelector('[data-report-cancel]');
    const reportBackdrop = reportModal.querySelector('[data-report-modal-backdrop]');
    const reportSubmit = reportModal.querySelector('[data-report-submit]');
    const reportDetails = reportModal.querySelector('[data-report-details]');

    function closeReportModal() {
      reportModal.classList.add('hidden');
    }
    reportTrigger.addEventListener('click', () => {
      menu.classList.add('hidden');
      if (reportModalName) reportModalName.textContent = name;
      reportModal.classList.remove('hidden');
    });
    if (reportCancel) reportCancel.addEventListener('click', closeReportModal);
    if (reportBackdrop) reportBackdrop.addEventListener('click', closeReportModal);
    if (reportSubmit) {
      reportSubmit.addEventListener('click', () => {
        closeReportModal();
        if (reportDetails) reportDetails.value = '';
        showToast('Report submitted — our team will review it within 24 hours.');
      });
    }
  }

  const blockModal = document.getElementById('block-modal');
  const blockTrigger = document.querySelector('[data-block-trigger]');
  if (blockTrigger && blockModal) {
    const blockModalName = blockModal.querySelector('[data-block-modal-name]');
    const blockCancel = blockModal.querySelector('[data-block-cancel]');
    const blockBackdrop = blockModal.querySelector('[data-block-modal-backdrop]');
    const blockConfirm = blockModal.querySelector('[data-block-confirm]');
    const decisionSection = document.querySelector('[data-decision-section]');
    const blockedBanner = document.querySelector('[data-blocked-banner]');
    const blockedName = blockedBanner ? blockedBanner.querySelector('[data-blocked-name]') : null;
    const unblockBtn = blockedBanner ? blockedBanner.querySelector('[data-unblock]') : null;

    function closeBlockModal() {
      blockModal.classList.add('hidden');
    }
    blockTrigger.addEventListener('click', () => {
      menu.classList.add('hidden');
      if (blockModalName) blockModalName.textContent = name;
      blockModal.classList.remove('hidden');
    });
    if (blockCancel) blockCancel.addEventListener('click', closeBlockModal);
    if (blockBackdrop) blockBackdrop.addEventListener('click', closeBlockModal);
    if (blockConfirm) {
      blockConfirm.addEventListener('click', () => {
        closeBlockModal();
        if (blockedName) blockedName.textContent = name;
        if (decisionSection) decisionSection.classList.add('hidden');
        if (blockedBanner) blockedBanner.classList.remove('hidden');
        showToast(name + ' is blocked.');
      });
    }
    if (unblockBtn) {
      unblockBtn.addEventListener('click', () => {
        if (blockedBanner) blockedBanner.classList.add('hidden');
        if (decisionSection) decisionSection.classList.remove('hidden');
        showToast('Unblocked ' + name + '.');
      });
    }
  }
}

/* ---------------------------------------------------------------- *
 * Public profile photo lightbox: primary photo + thumbnail grid,
 * previous/next, keyboard, click, swipe, zoom toggle.
 * ---------------------------------------------------------------- */

function initPhotoLightbox() {
  const lightbox = document.getElementById('photo-lightbox');
  const thumbs = Array.from(document.querySelectorAll('[data-photo-thumb]'));
  if (!lightbox || !thumbs.length) return;

  const imgEl = lightbox.querySelector('[data-lightbox-image]');
  const captionEl = lightbox.querySelector('[data-lightbox-caption]');
  const counterEl = lightbox.querySelector('[data-lightbox-counter]');
  const thumbstripEl = lightbox.querySelector('[data-lightbox-thumbstrip]');
  const likeBtn = lightbox.querySelector('[data-lightbox-like]');
  const likeIcon = lightbox.querySelector('[data-lightbox-like-icon]');
  const likedIndices = new Set();

  const captionEditBtn = lightbox.querySelector('[data-lightbox-caption-edit]');
  const captionEditRow = lightbox.querySelector('[data-lightbox-caption-edit-row]');
  const captionInput = lightbox.querySelector('[data-lightbox-caption-input]');
  const captionCancelBtn = lightbox.querySelector('[data-lightbox-caption-cancel]');
  const captionSaveBtn = lightbox.querySelector('[data-lightbox-caption-save]');

  let index = 0;
  let zoomed = false;

  function renderLike() {
    if (!likeBtn || !likeIcon) return;
    const liked = likedIndices.has(index);
    likeBtn.classList.toggle('text-rose-400', liked);
    likeBtn.classList.toggle('text-white/80', !liked);
    likeIcon.setAttribute('fill', liked ? 'currentColor' : 'none');
  }

  function closeCaptionEdit() {
    if (captionEditRow) captionEditRow.classList.add('hidden');
  }

  if (thumbstripEl) {
    thumbstripEl.innerHTML = '';
    thumbs.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-lightbox-thumb', '');
      btn.className =
        'w-12 h-12 rounded-lg bg-gradient-to-br shrink-0 transition ' + (t.dataset.gradient || 'from-stone-300 to-stone-400');
      btn.addEventListener('click', () => {
        index = i;
        zoomed = false;
        render();
      });
      thumbstripEl.appendChild(btn);
    });
  }

  function render() {
    const t = thumbs[index];
    if (imgEl) {
      imgEl.className =
        'w-full h-full rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform duration-300 ' +
        (t.dataset.gradient || 'from-stone-300 to-stone-400') +
        ' ' +
        (zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in');
    }
    if (captionEl) captionEl.textContent = t.dataset.caption || '';
    if (counterEl) counterEl.textContent = index + 1 + ' / ' + thumbs.length;
    renderLike();
    closeCaptionEdit();
    if (thumbstripEl) {
      Array.from(thumbstripEl.children).forEach((btn, i) => {
        btn.classList.toggle('ring-2', i === index);
        btn.classList.toggle('ring-white', i === index);
        btn.classList.toggle('opacity-100', i === index);
        btn.classList.toggle('opacity-50', i !== index);
        btn.classList.toggle('hover:opacity-80', i !== index);
      });
    }
  }
  function open(i) {
    index = i;
    zoomed = false;
    lightbox.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    render();
  }
  function close() {
    lightbox.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
  function next() {
    index = (index + 1) % thumbs.length;
    zoomed = false;
    render();
  }
  function prev() {
    index = (index - 1 + thumbs.length) % thumbs.length;
    zoomed = false;
    render();
  }

  thumbs.forEach((t, i) => t.addEventListener('click', () => open(i)));
  document.querySelectorAll('[data-photo-primary]').forEach((p) => p.addEventListener('click', () => open(0)));

  const nextBtn = lightbox.querySelector('[data-lightbox-next]');
  const prevBtn = lightbox.querySelector('[data-lightbox-prev]');
  const closeBtn = lightbox.querySelector('[data-lightbox-close]');
  const backdrop = lightbox.querySelector('[data-lightbox-backdrop]');
  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
  if (imgEl) imgEl.addEventListener('click', () => { zoomed = !zoomed; render(); });
  if (likeBtn) {
    likeBtn.addEventListener('click', () => {
      const name = profileFirstName();
      if (likedIndices.has(index)) {
        likedIndices.delete(index);
        showToast('Removed your like.');
      } else {
        likedIndices.add(index);
        showToast('Liked ' + name + '’s photo.');
      }
      renderLike();
    });
  }
  if (captionEditBtn && captionEditRow && captionInput) {
    captionEditBtn.addEventListener('click', () => {
      captionInput.value = thumbs[index].dataset.caption || '';
      captionEditRow.classList.remove('hidden');
      captionInput.focus();
    });
    if (captionCancelBtn) captionCancelBtn.addEventListener('click', closeCaptionEdit);
    if (captionSaveBtn) {
      captionSaveBtn.addEventListener('click', () => {
        const value = captionInput.value.trim();
        if (value) {
          thumbs[index].dataset.caption = value;
          if (captionEl) captionEl.textContent = value;
          showToast('Caption updated.');
        }
        closeCaptionEdit();
      });
    }
  }

  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'Escape') close();
  });

  let touchStartX = null;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  lightbox.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx > 40) prev();
    else if (dx < -40) next();
    touchStartX = null;
  });
}

/* ---------------------------------------------------------------- *
 * Search page: paginate the results grid.
 * ---------------------------------------------------------------- */

function initSearchPage() {
  const grid = document.querySelector('[data-search-grid]');
  const pagerSlot = document.querySelector('[data-search-pager]');
  if (!grid) return;
  createPaginator(grid, pagerSlot, 6).render();
}

/* ---------------------------------------------------------------- *
 * Saved Profiles page: a temporary holding area, not a decision.
 * Removing just clears the bookmark — nothing else happens to it.
 * ---------------------------------------------------------------- */

function initSavedProfiles() {
  const grid = document.querySelector('[data-saved-grid]');
  const empty = document.querySelector('[data-saved-empty]');
  const pagerSlot = document.querySelector('[data-saved-pager]');
  if (!grid) return;

  const pager = createPaginator(grid, pagerSlot, 3);

  function checkEmpty() {
    const remaining = grid.querySelectorAll('[data-saved-card]').length;
    grid.classList.toggle('hidden', remaining === 0);
    if (empty) empty.classList.toggle('hidden', remaining > 0);
    pager.refresh();
  }

  document.querySelectorAll('[data-saved-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('[data-saved-card]');
      if (!card) return;
      const name = card.querySelector('p')?.textContent || 'Profile';
      card.remove();
      showToast('Removed ' + name + ' from Saved Profiles.');
      checkEmpty();
    });
  });

  pager.render();
}

/* ---------------------------------------------------------------- *
 * Matches page: Mutual / Liked Me / I Liked tabs, each its own
 * paginated grid — cleaner than one long scrolling page, especially
 * once "I Liked" grows.
 * ---------------------------------------------------------------- */

function initMatchesPage() {
  const tabBtns = document.querySelectorAll('[data-matches-tab-btn]');
  const panels = document.querySelectorAll('[data-matches-tab-panel]');
  if (!tabBtns.length || !panels.length) return;

  function setTab(tab) {
    panels.forEach((panel) => panel.classList.toggle('hidden', panel.dataset.matchesTabPanel !== tab));
    tabBtns.forEach((btn) => {
      const active = btn.dataset.matchesTabBtn === tab;
      btn.classList.toggle('text-accent-700', active);
      btn.classList.toggle('border-accent-600', active);
      btn.classList.toggle('text-stone-500', !active);
      btn.classList.toggle('border-transparent', !active);
    });
  }
  tabBtns.forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.matchesTabBtn)));

  document.querySelectorAll('[data-matches-grid]').forEach((grid) => {
    const key = grid.dataset.matchesGrid;
    const pagerSlot = document.querySelector('[data-matches-pager="' + key + '"]');
    createPaginator(grid, pagerSlot, 3).render();
  });
}

/* ---------------------------------------------------------------- *
 * Matches page: "Like back" on someone who already liked you turns
 * it into a mutual match.
 * ---------------------------------------------------------------- */

function initLikeBack() {
  document.querySelectorAll('[data-like-back]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.likeBack || 'them';
      showToast("It's a match! You and " + name + ' liked each other.');
      btn.disabled = true;
      btn.textContent = 'Matched';
      btn.classList.add('opacity-50');
    });
  });
}

/* ---------------------------------------------------------------- *
 * My Profile page: AI-generated summary cards (About section, and
 * the profile-text bio). Edit swaps the summary for a textarea;
 * Save overwrites the AI's text with the user's version — the AI
 * proposes, the user owns the final version. Visibility toggles
 * (wired generically by initToggles) only affect the public
 * profile — the category is still learned and still used for
 * matching either way.
 * ---------------------------------------------------------------- */

function initProfileCategoryCards() {
  document.querySelectorAll('[data-profile-category]').forEach((card) => {
    const textEl = card.querySelector('[data-category-text]');
    const inputEl = card.querySelector('[data-category-edit-input]');
    const editBtn = card.querySelector('[data-category-edit-btn]');
    const actions = card.querySelector('[data-category-edit-actions]');
    const cancelBtn = card.querySelector('[data-category-cancel-btn]');
    const saveBtn = card.querySelector('[data-category-save-btn]');
    if (!textEl || !inputEl || !editBtn) return;

    function enterEdit() {
      inputEl.value = textEl.textContent.trim();
      textEl.classList.add('hidden');
      inputEl.classList.remove('hidden');
      editBtn.classList.add('hidden');
      if (actions) { actions.classList.remove('hidden'); actions.classList.add('flex'); }
      inputEl.focus();
    }
    function exitEdit() {
      textEl.classList.remove('hidden');
      inputEl.classList.add('hidden');
      editBtn.classList.remove('hidden');
      if (actions) { actions.classList.add('hidden'); actions.classList.remove('flex'); }
    }

    editBtn.addEventListener('click', enterEdit);
    if (cancelBtn) cancelBtn.addEventListener('click', exitEdit);
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const value = inputEl.value.trim();
        if (value) textEl.textContent = value;
        exitEdit();
        showToast('Saved — your edit replaces the AI’s summary here.');
      });
    }
  });
}

/* ---------------------------------------------------------------- *
 * AI Profile Coach: never asks a question or gathers information on
 * its own — it only surfaces gaps in the Compatibility Graph and,
 * on click, launches a conversation. The click posts the opener as
 * the user's own message (they started it), and the AI replies in
 * kind a moment later — the same pattern as a suggestion chip. The
 * AI Matchmaker conversation itself is the only thing that ever
 * changes the Compatibility Graph.
 * ---------------------------------------------------------------- */

function initProfileCoach() {
  document.querySelectorAll('[data-coach-launch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const topic = btn.dataset.coachTopic || 'this';
      const opener = btn.dataset.coachOpener || ('Let’s talk about ' + topic + '.');
      const reply = btn.dataset.coachReply || 'Happy to dig into that — tell me a bit about it.';

      document.querySelectorAll('[data-ai-panel]').forEach((panel) => {
        if (panel.getAttribute('data-collapsed') === 'true') setPanelCollapsed(panel, false);
      });

      broadcastMessage('user', opener);
      setTimeout(() => broadcastMessage('ai', reply), 450);

      const mobileToggle = document.getElementById('ai-mobile-toggle');
      const mobileDrawer = document.getElementById('ai-mobile-drawer');
      if (mobileToggle && mobileDrawer && mobileDrawer.classList.contains('translate-y-full')) {
        mobileToggle.click();
      }
      showToast('Started a conversation with your AI Matchmaker.');
    });
  });
}

/* ---------------------------------------------------------------- *
 * Settings page: simple on/off pill toggles, purely visual state.
 * ---------------------------------------------------------------- */

function initToggles() {
  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.classList.toggle('bg-accent-600');
      btn.classList.toggle('bg-stone-200', !on);
      const thumb = btn.querySelector('span');
      if (thumb) thumb.classList.toggle('translate-x-5', on);
    });
  });
}

/* ---------------------------------------------------------------- *
 * Public auth pages: Login / Sign Up / Reset Password all just
 * redirect on submit (no real backend), and Forgot Password swaps
 * to a "check your email" confirmation state in place.
 * ---------------------------------------------------------------- */

function initAuthForms() {
  document.querySelectorAll('[data-auth-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const redirect = form.dataset.authRedirect;
      if (redirect) window.location.href = redirect;
    });
  });

  document.querySelectorAll('[data-auth-google]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const redirect = btn.dataset.authRedirect;
      if (redirect) window.location.href = redirect;
    });
  });

  const forgotForm = document.querySelector('[data-forgot-form]');
  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formState = document.querySelector('[data-forgot-form-state]');
      const sentState = document.querySelector('[data-forgot-sent-state]');
      if (formState) formState.classList.add('hidden');
      if (sentState) sentState.classList.remove('hidden');
    });
  }
}

/* ---------------------------------------------------------------- *
 * Contact Support page: submitting just confirms via toast.
 * ---------------------------------------------------------------- */

function initContactForm() {
  const btn = document.querySelector('[data-contact-submit]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    showToast("Message sent — we'll get back to you within one business day.");
  });
}

/* ---------------------------------------------------------------- *
 * Delete Account page: type-to-confirm gate before the destructive
 * button becomes clickable.
 * ---------------------------------------------------------------- */

function initDeleteAccount() {
  const input = document.querySelector('[data-delete-confirm-input]');
  const btn = document.querySelector('[data-delete-confirm-btn]');
  if (!input || !btn) return;
  input.addEventListener('input', () => {
    btn.disabled = input.value.trim().toUpperCase() !== 'DELETE';
  });
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    showToast('Prototype only — no account was deleted.');
  });
}

/* ---------------------------------------------------------------- *
 * Settings → Safety: unblock removes a person from the blocked list.
 * ---------------------------------------------------------------- */

function initSettingsBlockedList() {
  const list = document.querySelector('[data-blocked-list]');
  const emptyState = document.querySelector('[data-blocked-empty]');
  if (!list) return;
  list.querySelectorAll('[data-settings-unblock]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('div');
      const name = row ? row.querySelector('span').textContent : 'them';
      if (row) row.remove();
      if (emptyState && !list.querySelector('[data-settings-unblock]')) {
        emptyState.classList.remove('hidden');
      }
      showToast('Unblocked ' + name + '.');
    });
  });
}

/* ---------------------------------------------------------------- *
 * Notifications page: mark all as read clears the unread indicators.
 * ---------------------------------------------------------------- */

function initNotifications() {
  const markAllBtn = document.querySelector('[data-notif-mark-all]');
  if (!markAllBtn) return;
  markAllBtn.addEventListener('click', () => {
    document.querySelectorAll('[data-notif-item]').forEach((item) => {
      item.classList.remove('border-accent-200');
      item.classList.add('border-stone-200', 'opacity-70');
      const dot = item.querySelector('[data-notif-dot]');
      if (dot) dot.remove();
    });
    showToast('All caught up.');
  });
}
