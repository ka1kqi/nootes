-- ============================================================
-- Nootes — Supabase Schema Migration
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================


-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";


-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- Reusable trigger function: stamps updated_at on every UPDATE
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- TABLE: profiles
-- One row per auth.users entry.
-- Matches: supabase.ts `Profile` interface
-- Used by: AuthContext (insert on first login, select by id)
--          useChat (joined via messages → profile:profiles(*))
-- ============================================================

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text        not null default 'Student',
  avatar_url   text,
  email        text,
  aura         integer     not null default 0 check (aura >= 0),
  tier         text        not null default 'seedling'
                           check (tier in ('seedling','sprout','sapling','grove','ancient-oak')),
  badges       text[]      not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

-- Anyone can read any profile (needed for chat message joins)
create policy "profiles: public read"
  on profiles for select using (true);

-- Users can only insert/update their own profile
create policy "profiles: self insert"
  on profiles for insert with check (auth.uid() = id);

create policy "profiles: self update"
  on profiles for update using (auth.uid() = id);


-- ============================================================
-- TABLE: channels
-- Chat channels — school-wide, major, or per-repo.
-- Matches: supabase.ts `Channel` interface
-- Used by: useChat.useChannels (select *, order by created_at)
--          useChat.useMessages (realtime postgres_changes on messages)
-- ============================================================

create table if not exists channels (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  type         text        not null check (type in ('school','major','repo')),
  repo_id      text,                        -- nullable; set for type='repo'
  description  text,
  created_by   uuid        references auth.users(id) on delete set null,
  member_count integer     not null default 0,
  created_at   timestamptz not null default now()
);

alter table channels enable row level security;

-- All channels are publicly readable
create policy "channels: public read"
  on channels for select using (true);

-- Only authenticated users can create channels
create policy "channels: auth insert"
  on channels for insert with check (auth.uid() is not null);


-- ============================================================
-- TABLE: channel_members
-- Join table: user ↔ channel membership.
-- Matches: supabase.ts `ChannelMember` interface
-- Used by: useChat.useChannels — upsert({ channel_id, user_id })
--          useChat.useChannels — select('channel_id').eq('user_id', ...)
-- ============================================================

create table if not exists channel_members (
  channel_id   uuid        not null references channels(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (channel_id, user_id)
);

alter table channel_members enable row level security;

create policy "channel_members: public read"
  on channel_members for select using (true);

create policy "channel_members: self insert"
  on channel_members for insert with check (auth.uid() = user_id);

create policy "channel_members: self delete"
  on channel_members for delete using (auth.uid() = user_id);

-- Trigger: keep channels.member_count in sync
create or replace function sync_channel_member_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update channels set member_count = member_count + 1 where id = new.channel_id;
  elsif (tg_op = 'DELETE') then
    update channels set member_count = greatest(0, member_count - 1) where id = old.channel_id;
  end if;
  return null;
end;
$$;

create trigger channel_members_count
  after insert or delete on channel_members
  for each row execute function sync_channel_member_count();


-- ============================================================
-- TABLE: messages
-- Chat messages; supports threading via thread_id self-reference.
-- Matches: supabase.ts `Message` interface
-- Used by: useChat.useMessages — select(*, profile:profiles(*), reactions(*))
--          useChat.useSendMessage — insert({ channel_id, user_id, content, is_latex, thread_id })
--          useChat.useThreadMessages — select where thread_id = ?
--          Realtime: postgres_changes INSERT filter channel_id/thread_id
-- ============================================================

create table if not exists messages (
  id           uuid        primary key default gen_random_uuid(),
  channel_id   uuid        not null references channels(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  content      text        not null,
  is_latex     boolean     not null default false,
  thread_id    uuid        references messages(id) on delete cascade,  -- null = top-level
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index messages_channel_idx on messages(channel_id, created_at);
create index messages_thread_idx  on messages(thread_id)  where thread_id is not null;

create trigger messages_updated_at
  before update on messages
  for each row execute function set_updated_at();

alter table messages enable row level security;

create policy "messages: public read"
  on messages for select using (true);

create policy "messages: auth insert"
  on messages for insert with check (auth.uid() = user_id);

create policy "messages: self update"
  on messages for update using (auth.uid() = user_id);

create policy "messages: self delete"
  on messages for delete using (auth.uid() = user_id);

-- Enable realtime for messages (postgres_changes subscriptions in useChat)
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table channels;


-- ============================================================
-- TABLE: reactions
-- Emoji reactions on messages; one row per (message, user, emoji).
-- Matches: supabase.ts `Reaction` interface
-- Used by: useChat.useReactions
--   select('*').eq('message_id', ...)
--   insert({ message_id, user_id, emoji }).select().single()
--   delete().eq('id', existing.id)
-- ============================================================

create table if not exists reactions (
  id           uuid        primary key default gen_random_uuid(),
  message_id   uuid        not null references messages(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  emoji        text        not null,
  created_at   timestamptz not null default now(),
  unique (message_id, user_id, emoji)   -- one reaction per emoji per user per message
);

alter table reactions enable row level security;

create policy "reactions: public read"
  on reactions for select using (true);

create policy "reactions: auth insert"
  on reactions for insert with check (auth.uid() = user_id);

create policy "reactions: self delete"
  on reactions for delete using (auth.uid() = user_id);


-- ============================================================
-- TABLE: repositories
-- Top-level knowledge unit (class notes repo, topic, etc.).
-- Shape derived from: main.py list_repos() response,
--   Repos.tsx repo card fields, useDocument.ts Document type
-- ============================================================

create table if not exists repositories (
  id               text        primary key,   -- human slug, e.g. 'cs-ua-310'
  title            text        not null,
  description      text,
  course           text,                       -- e.g. 'CS-UA 310'
  professor        text,
  semester         text,                       -- e.g. 'Spring 2026'
  university       text,                       -- e.g. 'NYU'
  department       text,                       -- e.g. 'CS'
  is_class         boolean     not null default true,
  is_public        boolean     not null default true,
  tags             text[]      not null default '{}',
  star_count       integer     not null default 0,
  contributor_count integer    not null default 0,
  created_by       uuid        references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger repositories_updated_at
  before update on repositories
  for each row execute function set_updated_at();

alter table repositories enable row level security;

create policy "repositories: public read"
  on repositories for select using (is_public = true);

create policy "repositories: auth read private"
  on repositories for select using (
    auth.uid() is not null and (
      is_public = true or created_by = auth.uid()
    )
  );

create policy "repositories: auth insert"
  on repositories for insert with check (auth.uid() is not null);

create policy "repositories: owner update"
  on repositories for update using (auth.uid() = created_by);


-- ============================================================
-- TABLE: documents
-- One master doc (user_id IS NULL) + one personal fork per user.
-- Matches: useDocument.ts `Document` type + main.py Block model
-- Used by: main.py all routes — replaces .md file read/write
--   GET /api/repos/{id}/master       → user_id IS NULL
--   GET /api/repos/{id}/personal/{u} → user_id = u (auto-fork if absent)
--   PUT /api/repos/{id}/personal/{u} → update blocks + updated_at
-- ============================================================

create table if not exists documents (
  id           uuid        primary key default gen_random_uuid(),
  repo_id      text        not null references repositories(id) on delete cascade,
  user_id      uuid        references auth.users(id) on delete cascade,  -- NULL = master
  title        text        not null,
  blocks       jsonb       not null default '[]',  -- Block[] — {id, type, content, meta}
  version      text        not null default '1.0.0',
  tags         text[]      not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One master per repo; one personal fork per (repo, user)
  unique (repo_id, user_id)
);

create index documents_repo_idx  on documents(repo_id);
create index documents_user_idx  on documents(user_id) where user_id is not null;
-- GIN index enables fast jsonb search on blocks content
create index documents_blocks_gin on documents using gin(blocks);

create trigger documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

alter table documents enable row level security;

-- Master docs are publicly readable
create policy "documents: public read master"
  on documents for select using (user_id is null);

-- Personal forks readable only by owner
create policy "documents: self read personal"
  on documents for select using (auth.uid() = user_id);

-- Only authenticated users can insert (auto-fork)
create policy "documents: auth insert"
  on documents for insert with check (
    auth.uid() is not null and (user_id is null or auth.uid() = user_id)
  );

-- Personal forks writable only by owner; master only by service role
create policy "documents: self update personal"
  on documents for update using (auth.uid() = user_id);


-- ============================================================
-- TABLE: document_versions
-- Immutable master snapshots — written after each semantic merge.
-- Enables diff view and rollback.
-- ============================================================

create table if not exists document_versions (
  id              uuid        primary key default gen_random_uuid(),
  repo_id         text        not null references repositories(id) on delete cascade,
  version         text        not null,        -- semver e.g. '3.2.1'
  blocks          jsonb       not null,        -- full snapshot at this version
  merged_by       uuid        references auth.users(id) on delete set null,
  merge_summary   text,                        -- AI-generated changelog
  contributor_ids uuid[]      not null default '{}',
  created_at      timestamptz not null default now(),

  unique (repo_id, version)
);

alter table document_versions enable row level security;

create policy "document_versions: public read"
  on document_versions for select using (true);

-- Only service role can insert (merge engine writes versions)
-- No insert policy needed for anon/authenticated — service role bypasses RLS


-- ============================================================
-- TABLE: repository_contributors
-- Tracks who has forked/contributed to a repo.
-- ============================================================

create table if not exists repository_contributors (
  repo_id      text        not null references repositories(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  role         text        not null default 'contributor'
                           check (role in ('owner','contributor','forked')),
  aura_earned  integer     not null default 0,
  joined_at    timestamptz not null default now(),
  primary key (repo_id, user_id)
);

alter table repository_contributors enable row level security;

create policy "repo_contributors: public read"
  on repository_contributors for select using (true);

create policy "repo_contributors: self insert"
  on repository_contributors for insert with check (auth.uid() = user_id);

create policy "repo_contributors: self update"
  on repository_contributors for update using (auth.uid() = user_id);

-- Trigger: keep repositories.contributor_count in sync
create or replace function sync_repo_contributor_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update repositories set contributor_count = contributor_count + 1 where id = new.repo_id;
  elsif (tg_op = 'DELETE') then
    update repositories set contributor_count = greatest(0, contributor_count - 1) where id = old.repo_id;
  end if;
  return null;
end;
$$;

create trigger repo_contributors_count
  after insert or delete on repository_contributors
  for each row execute function sync_repo_contributor_count();


-- ============================================================
-- TABLE: merge_requests
-- A user opts their fork into the next semantic merge run.
-- ============================================================

create table if not exists merge_requests (
  id           uuid        primary key default gen_random_uuid(),
  repo_id      text        not null references repositories(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  status       text        not null default 'pending'
                           check (status in ('pending','merged','rejected','conflict')),
  note         text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

alter table merge_requests enable row level security;

create policy "merge_requests: contributor read"
  on merge_requests for select using (
    auth.uid() = user_id or
    exists (
      select 1 from repository_contributors rc
      where rc.repo_id = merge_requests.repo_id and rc.user_id = auth.uid()
    )
  );

create policy "merge_requests: self insert"
  on merge_requests for insert with check (auth.uid() = user_id);

create policy "merge_requests: self delete"
  on merge_requests for delete using (auth.uid() = user_id);


-- ============================================================
-- SEED: Default channels
-- Matches useChat.useChannels — fetches all channels ordered by created_at
-- ============================================================

insert into channels (name, type, description) values
  ('NYU General',      'school', 'All NYU students — announcements, intros, off-topic'),
  ('CS Discussion',    'major',  'Computer Science — algorithms, systems, interviews'),
  ('Math Discussion',  'major',  'Mathematics — proofs, problem sets, concepts'),
  ('Physics Discussion','major', 'Physics — mechanics, E&M, quantum'),
  ('Chemistry Discussion','major','Chemistry — organic, inorganic, lab help')
on conflict do nothing;


-- ============================================================
-- SEED: Initial repositories  (mirrors Repos.tsx hardcoded data)
-- ============================================================

insert into repositories (id, title, description, course, professor, semester, university, department, tags, star_count, contributor_count) values
  ('cs-ua-310',          'Intro to Algorithms',    'Binary search, graph algorithms, dynamic programming, and complexity analysis.',   'CS-UA 310',  'Prof. Siegel',  'Spring 2026', 'NYU',      'CS',      array['algorithms','exam-relevant','midterm'], 234, 47),
  ('math-ua-140',        'Linear Algebra',          'Vector spaces, eigenvalues, SVD, and matrix decompositions with proofs.',          'MATH-UA 140','Prof. Chen',    'Spring 2026', 'NYU',      'Math',    array['proofs','midterm'],                    189, 31),
  ('mit-cs-ml',          'Machine Learning',        'Supervised learning, neural networks, regularization, and optimization.',          '6.036',      'Prof. Jaakkola','Spring 2026', 'MIT',      'CS',      array['deep-learning','final'],               412, 82),
  ('stanford-phys-130',  'Quantum Mechanics',       'Wave functions, Schrödinger equation, perturbation theory, and spin.',             'PHYS 130',   'Prof. Gharibyan','Spring 2026','Stanford', 'Physics', array['proofs','exam-relevant'],              156, 19),
  ('berkeley-math-104',  'Real Analysis',           'Sequences, series, continuity, differentiability, and Riemann integration.',       'MATH 104',   'Prof. Christ',  'Spring 2026', 'Berkeley', 'Math',    array['proofs','midterm','final'],            178, 24),
  ('columbia-coms-4118', 'Operating Systems',       'Processes, threads, memory management, file systems, and concurrency.',            'COMS 4118',  'Prof. Nieh',    'Spring 2026', 'Columbia', 'CS',      array['systems','midterm'],                   203, 38),
  ('nyu-chem-ua-226',    'Organic Chemistry',       'Reaction mechanisms, stereochemistry, spectroscopy, and synthesis.',               'CHEM-UA 226','Prof. Malone',  'Spring 2026', 'NYU',      'Chem',    array['reactions','exam-relevant'],            97, 15),
  ('mit-econ-1401',      'Microeconomics',          'Supply & demand, game theory, market structures, and welfare economics.',          '14.01',      'Prof. Autor',   'Spring 2026', 'MIT',      'Econ',    array['midterm','final'],                     145, 29)
on conflict (id) do nothing;

