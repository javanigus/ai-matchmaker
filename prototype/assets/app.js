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
  initGraphItemRemove();
  initLikeBack();
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
 * AI Recommendations page: like / pass. Search philosophy applies
 * here too — instead of the AI immediately asking why, we reveal an
 * optional feedback textarea the AI can process later in batches.
 * ---------------------------------------------------------------- */

function initRecommendationsPage() {
  const cards = document.querySelectorAll('[data-rec-card]');
  if (!cards.length) return;

  cards.forEach((card) => {
    const passBtn = card.querySelector('[data-rec-pass]');
    const likeBtn = card.querySelector('[data-rec-like]');
    const undoBtn = card.querySelector('[data-rec-undo]');
    const overlay = card.querySelector('[data-rec-passed-overlay]');
    const likedBadge = card.querySelector('[data-rec-liked-badge]');
    const feedbackBox = card.querySelector('[data-feedback-box]');
    const feedbackInput = card.querySelector('[data-feedback-input]');
    const feedbackSubmit = card.querySelector('[data-feedback-submit]');
    const name = card.dataset.name || 'this profile';

    if (passBtn) {
      passBtn.addEventListener('click', () => {
        card.classList.add('opacity-50', 'grayscale');
        if (overlay) overlay.classList.remove('hidden');
        if (feedbackBox) feedbackBox.classList.remove('hidden');
      });
    }

    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        card.classList.remove('opacity-50', 'grayscale');
        if (overlay) overlay.classList.add('hidden');
      });
    }

    if (likeBtn) {
      likeBtn.addEventListener('click', () => {
        showToast('You liked ' + name + ". We'll let you know if it's mutual.");
        if (likedBadge) likedBadge.classList.remove('hidden');
        likeBtn.disabled = true;
        likeBtn.classList.add('opacity-50');
        if (feedbackBox) feedbackBox.classList.remove('hidden');
      });
    }

    if (feedbackSubmit) {
      feedbackSubmit.addEventListener('click', () => {
        if (!feedbackInput || !feedbackInput.value.trim()) return;
        showToast('Thanks — feedback noted.');
        feedbackInput.value = '';
        if (feedbackBox) feedbackBox.classList.add('hidden');
      });
    }
  });
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
            reply: "Done — I've updated your Compatibility Graph. Children is now marked as a hard dealbreaker.",
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
  const metaEl = root.querySelector('[data-profile-meta]');
  const bioEl = root.querySelector('[data-profile-bio]');
  const detailsEl = root.querySelector('[data-profile-details]');
  const interestsEl = root.querySelector('[data-profile-interests]');

  if (primaryPhoto) {
    primaryPhoto.className =
      'relative w-full aspect-[16/9] sm:aspect-[16/8] rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3 cursor-zoom-in ' +
      profile.gradient;
  }
  if (nameEl) nameEl.textContent = profile.name + ', ' + profile.age;
  if (metaEl) metaEl.textContent = profile.meta;
  if (bioEl) bioEl.textContent = profile.bio;

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

  if (detailsEl) {
    detailsEl.innerHTML = '';
    Object.entries(profile.details).forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between px-5 py-3.5';
      row.innerHTML =
        '<span class="text-sm text-stone-500">' + label + '</span>' +
        '<span class="text-sm font-medium text-stone-800">' + value + '</span>';
      detailsEl.appendChild(row);
    });
  }

  if (interestsEl) {
    interestsEl.innerHTML = '';
    profile.interests.forEach((interest) => {
      const span = document.createElement('span');
      span.className = 'text-sm font-medium bg-white border border-stone-200 text-stone-700 rounded-full px-3.5 py-1.5';
      span.textContent = interest;
      interestsEl.appendChild(span);
    });
  }

  document.title = profile.name + ', ' + profile.age + ' — AI Matchmaker';

  const passBtn = root.querySelector('[data-profile-pass]');
  const likeBtn = root.querySelector('[data-profile-like]');
  const statusEl = root.querySelector('[data-profile-decision-status]');
  const feedbackBox = root.querySelector('[data-feedback-box]');
  const feedbackInput = root.querySelector('[data-feedback-input]');
  const feedbackSubmit = root.querySelector('[data-feedback-submit]');

  function decide(label) {
    if (statusEl) {
      statusEl.textContent = label === 'like' ? 'You liked ' + profile.name + '.' : 'You passed on ' + profile.name + '.';
      statusEl.classList.remove('hidden');
    }
    if (passBtn) passBtn.disabled = true;
    if (likeBtn) likeBtn.disabled = true;
    if (passBtn) passBtn.classList.add('opacity-50');
    if (likeBtn) likeBtn.classList.add('opacity-50');
    if (feedbackBox) feedbackBox.classList.remove('hidden');
  }

  if (passBtn) passBtn.addEventListener('click', () => decide('pass'));
  if (likeBtn) likeBtn.addEventListener('click', () => {
    decide('like');
    showToast('You liked ' + profile.name + ". We'll let you know if it's mutual.");
  });
  if (feedbackSubmit) {
    feedbackSubmit.addEventListener('click', () => {
      if (!feedbackInput || !feedbackInput.value.trim()) return;
      showToast('Thanks — feedback noted.');
      feedbackInput.value = '';
    });
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

  let index = 0;
  let zoomed = false;

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
 * Compatibility Graph: user can remove (and undo removing) any
 * inferred item — the graph always stays user-editable.
 * ---------------------------------------------------------------- */

function initGraphItemRemove() {
  document.querySelectorAll('[data-graph-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('[data-graph-item]');
      if (!item) return;
      item.classList.add('opacity-40');
      const removedLabel = item.querySelector('[data-graph-removed-label]');
      const undo = item.querySelector('[data-graph-undo]');
      if (removedLabel) removedLabel.classList.remove('hidden');
      if (undo) undo.classList.remove('hidden');
      btn.classList.add('hidden');
    });
  });
  document.querySelectorAll('[data-graph-undo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('[data-graph-item]');
      if (!item) return;
      item.classList.remove('opacity-40');
      const removedLabel = item.querySelector('[data-graph-removed-label]');
      const removeBtn = item.querySelector('[data-graph-remove]');
      if (removedLabel) removedLabel.classList.add('hidden');
      if (removeBtn) removeBtn.classList.remove('hidden');
      btn.classList.add('hidden');
    });
  });
}
