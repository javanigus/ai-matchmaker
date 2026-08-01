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
  initDiscoverPage();
  initDealbreakerConfirm();
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
 * Discover page: Like / Pass / pass-reason follow-up / recently passed
 * ---------------------------------------------------------------- */

function initDiscoverPage() {
  const profiles = document.querySelectorAll('[data-profile]');
  if (!profiles.length) return;

  const banner = document.getElementById('recently-passed-banner');
  const bannerName = document.getElementById('recently-passed-name');
  const restoreBtn = document.getElementById('restore-passed-btn');
  const backBtn = document.getElementById('back-to-current-btn');

  let current = 0;
  let passedIndex = null;

  function show(index) {
    profiles.forEach((p, i) => p.classList.toggle('hidden', i !== index));
  }
  show(current);

  document.querySelectorAll('[data-pass-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = current;
      passedIndex = idx;
      if (bannerName) bannerName.textContent = profiles[idx].dataset.name || 'this profile';
      if (banner) banner.classList.remove('hidden');
      if (backBtn) backBtn.classList.add('hidden');
      current = (idx + 1) % profiles.length;
      show(current);
      askPassReason();
    });
  });

  document.querySelectorAll('[data-like-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = profiles[current].dataset.name || 'this profile';
      showToast('You liked ' + name + ". We'll let you know if it's mutual.");
      current = (current + 1) % profiles.length;
      show(current);
    });
  });

  if (restoreBtn) {
    restoreBtn.addEventListener('click', () => {
      if (passedIndex === null) return;
      show(passedIndex);
      if (backBtn) backBtn.classList.remove('hidden');
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      show(current);
      backBtn.classList.add('hidden');
    });
  }

  function askPassReason() {
    broadcastMessage('ai', 'What influenced your decision?');
    broadcastQuickReplies([
      {
        label: 'She looks attractive, but she has kids.',
        reply:
          "Thanks for sharing. Here's what I picked up:\nPhysical attraction: positive\nChildren: hard incompatibility\nOverall: pass\n\nI'll keep prioritizing people without children going forward.",
      },
      {
        label: "I'm not physically attracted.",
        reply:
          "Got it — physical attraction wasn't there. I'll pay closer attention to the physical traits you tend to respond to.",
      },
      {
        label: 'Different lifestyle.',
        reply: "Understood — lifestyle mismatch noted. I'll weigh day-to-day lifestyle fit more heavily.",
      },
      {
        label: "Don't ask me about passes for now.",
        reply: "Understood, I won't ask about passes for now. Just message me anytime you'd like to share feedback again.",
        pause: true,
      },
    ]);
  }
}

/* ---------------------------------------------------------------- *
 * Compatibility page: "make this a hard dealbreaker" confirmation
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
            reply: "Done — I've updated your Compatibility Graph. Children is now marked as a hard dealbreaker.",
          },
          { label: 'Cancel', reply: "No problem, I'll leave it as-is." },
        ]);
      }, 450);
    });
  });
}
