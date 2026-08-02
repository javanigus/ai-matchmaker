-- Initial schema — consolidated data model from docs/PLAN.md §2.
--
-- RLS is enabled on every table (belt-and-suspenders alongside the
-- project's "Automatically enable RLS" dashboard setting), but most
-- tables get no policies yet — that's deliberate. With RLS on and no
-- policies, a table is fully locked down (deny-by-default) rather than
-- silently exposed. Policies are written feature-by-feature, in the
-- phase that actually builds that feature (see docs/PLAN.md), not
-- dumped here speculatively.

-- users.id references auth.users(id) directly — this wasn't spelled out
-- in PLAN.md's schema sketch (it used "…" for implicit columns), decided
-- here: standard Supabase pattern, one row per authenticated user.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  age int,
  gender text,
  location_city text,
  location_state text,
  location_country text,
  occupation text,
  baseline_reached_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  started_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table public.ai_memory_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  session_id uuid,
  summary_text text not null,
  source text,
  created_at timestamptz not null default now()
);

-- One row per (user, category) — quick_fact is null for categories that
-- don't define one (see docs/PLAN.md's note on quick_fact's canonical
-- option lists living in code, not a table).
create table public.profile_categories (
  user_id uuid not null references public.users (id) on delete cascade,
  category text not null,
  ai_summary text,
  full_summary text,
  confidence text,
  visible boolean not null default false,
  updated_at timestamptz not null default now(),
  pending_summary text,
  pending_confidence text,
  pending_source_event_id uuid references public.ai_memory_events (id),
  quick_fact text,
  primary key (user_id, category)
);

create table public.user_ethnicities (
  user_id uuid not null references public.users (id) on delete cascade,
  ethnicity text not null,
  primary key (user_id, ethnicity)
);

-- One row per attribute *value* — multi-select attributes (religion,
-- ethnicity) get multiple rows, same attribute, different value.
create table public.dealbreakers_structured (
  user_id uuid not null references public.users (id) on delete cascade,
  attribute text not null,
  value text not null,
  primary key (user_id, attribute, value)
);

create table public.dealbreakers_custom (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('learning', 'profile')),
  storage_path text not null,
  caption text,
  ai_caption text,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  position int,
  created_at timestamptz not null default now()
);

-- physical_attraction_rating, feedback_reasons, feedback_text: all
-- user-provided (see docs/PLAN.md); the AI only reads them downstream,
-- never populates them. unique(user_id, target_user_id): a decision
-- replaces itself rather than accumulating, matching the prototype's
-- tri-state toggle behavior.
create table public.profile_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  target_user_id uuid not null references public.users (id) on delete cascade,
  decision text not null check (decision in ('pass', 'like')),
  recommendation_id uuid,
  feedback_given boolean not null default false,
  physical_attraction_rating int check (physical_attraction_rating between 1 and 5),
  feedback_reasons text[],
  feedback_text text,
  created_at timestamptz not null default now(),
  unique (user_id, target_user_id)
);

create table public.saved_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  target_user_id uuid not null references public.users (id) on delete cascade,
  source text,
  created_at timestamptz not null default now(),
  unique (user_id, target_user_id)
);

-- user_a_id < user_b_id enforces one canonical row per pair (no separate
-- (A,B) and (B,A) rows for the same match).
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.users (id) on delete cascade,
  user_b_id uuid not null references public.users (id) on delete cascade,
  matched_at timestamptz not null default now(),
  check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);

-- Cached on generation, not recomputed per view — generated only on
-- request (prd.md), so this avoids re-billing an LLM call per view.
create table public.compatibility_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  target_user_id uuid not null references public.users (id) on delete cascade,
  overall_level text,
  summary_text text,
  category_levels jsonb,
  generated_at timestamptz not null default now()
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  reported_id uuid not null references public.users (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- type enum reconstructed from prototype/notifications.html, not
-- authoritative — see docs/PLAN.md's note. Extend alongside the mockup
-- when new notification types are actually built.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (
    type in (
      'new_match', 'new_like', 'photo_like', 'new_message',
      'new_recommendations', 'connection_profile_update', 'subscription'
    )
  ),
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS on every table, deny-by-default. Policies added per-feature.
alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_memory_events enable row level security;
alter table public.profile_categories enable row level security;
alter table public.user_ethnicities enable row level security;
alter table public.dealbreakers_structured enable row level security;
alter table public.dealbreakers_custom enable row level security;
alter table public.photos enable row level security;
alter table public.profile_decisions enable row level security;
alter table public.saved_profiles enable row level security;
alter table public.matches enable row level security;
alter table public.compatibility_reports enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
