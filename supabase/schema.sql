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

create table if not exists channels (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  type         text        not null check (type in ('school','major','repo')),
  repo_id      text,
  description  text,
  created_by   uuid        references auth.users(id) on delete set null,
  member_count integer     not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists channel_members (
  channel_id   uuid        not null references channels(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table if not exists messages (
  id           uuid        primary key default gen_random_uuid(),
  channel_id   uuid        not null references channels(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  content      text        not null,
  is_latex     boolean     not null default false,
  thread_id    uuid        references messages(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists reactions (
  id           uuid        primary key default gen_random_uuid(),
  message_id   uuid        not null references messages(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  emoji        text        not null,
  created_at   timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create table if not exists repositories (
  id               text        primary key,
  title            text        not null,
  description      text,
  course           text,
  professor        text,
  semester         text,
  university       text,
  department       text,
  is_class         boolean     not null default true,
  is_public        boolean     not null default true,
  tags             text[]      not null default '{}',
  star_count       integer     not null default 0,
  contributor_count integer    not null default 0,
  created_by       uuid        references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists documents (
  id           uuid        primary key default gen_random_uuid(),
  repo_id      text        not null references repositories(id) on delete cascade,
  user_id      uuid        references auth.users(id) on delete cascade,
  title        text        not null default '',
  -- content is stored as a .md file in Supabase Storage bucket "documents"
  -- path: {userId}/{repoId}.md
  version      text        not null default '1.0.0',
  tags         text[]      not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (repo_id, user_id)
);

-- Migration: run this in the Supabase SQL editor if upgrading from the old schema
-- ALTER TABLE documents DROP COLUMN IF EXISTS content;

create table if not exists document_versions (
  id              uuid        primary key default gen_random_uuid(),
  repo_id         text        not null references repositories(id) on delete cascade,
  version         text        not null,
  content         text        not null default '',
  merged_by       uuid        references auth.users(id) on delete set null,
  merge_summary   text,
  contributor_ids uuid[]      not null default '{}',
  created_at      timestamptz not null default now(),
  unique (repo_id, version)
);

create table if not exists repository_contributors (
  repo_id      text        not null references repositories(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  role         text        not null default 'contributor'
                           check (role in ('owner','contributor','forked')),
  aura_earned  integer     not null default 0,
  joined_at    timestamptz not null default now(),
  primary key (repo_id, user_id)
);

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

-- ============================================================
-- Nootes — Seed Data
-- Run this in the Supabase SQL editor after applying the schema.
-- Creates default channels so the chat isn't empty on first load.
-- ============================================================

-- Upsert default channels (idempotent — safe to re-run)
INSERT INTO public.channels (id, name, type, repo_id, description, created_by, member_count)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'General',
    'school',
    NULL,
    'General discussion for all Nootes users.',
    NULL,
    0
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Computer Science',
    'major',
    NULL,
    'Algorithms, systems, theory, and everything CS.',
    NULL,
    0
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Mathematics',
    'major',
    NULL,
    'Analysis, linear algebra, topology, and proofs.',
    NULL,
    0
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Intro to Algorithms',
    'repo',
    NULL,
    'CS-UA 310 — Binary search, graph algorithms, dynamic programming.',
    NULL,
    0
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Linear Algebra',
    'repo',
    NULL,
    'MATH-UA 140 — Vector spaces, eigenvalues, SVD, matrix decompositions.',
    NULL,
    0
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'DSA Interview Prep',
    'repo',
    NULL,
    'Collaborative prep nootes for coding interviews.',
    NULL,
    0
  )
ON CONFLICT (id) DO NOTHING;

alter publication supabase_realtime add table channels;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table channel_members;

-- Allow authenticated users to read/write only their own folder
CREATE POLICY "Users manage own docs"
ON storage.objects FOR ALL TO authenticated
USING  (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Row Level Security (RLS)
-- Enable RLS on every table and grant appropriate access.
-- Run the entire block in the Supabase SQL editor.
-- ============================================================

-- profiles ------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can read any profile (needed for contributor cards, chat avatars, etc.)
CREATE POLICY "profiles: authenticated users can read all"
  ON profiles FOR SELECT TO authenticated USING (true);

-- Users can only create / update their own profile row
CREATE POLICY "profiles: users insert own"
  ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: users update own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- channels ------------------------------------------------
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- All signed-in users can read channels (needed for chat sidebar)
CREATE POLICY "channels: authenticated users can read all"
  ON channels FOR SELECT TO authenticated USING (true);

-- Any signed-in user can create a channel
CREATE POLICY "channels: authenticated users can insert"
  ON channels FOR INSERT TO authenticated WITH CHECK (true);

-- Only the creator can edit / delete their channel
CREATE POLICY "channels: creators can update"
  ON channels FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "channels: creators can delete"
  ON channels FOR DELETE TO authenticated USING (created_by = auth.uid());

-- channel_members -----------------------------------------
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can see who is in a channel
CREATE POLICY "channel_members: authenticated users can read all"
  ON channel_members FOR SELECT TO authenticated USING (true);

-- Users can only join / leave for themselves
CREATE POLICY "channel_members: users manage own membership"
  ON channel_members FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- messages ------------------------------------------------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can read messages in any channel
CREATE POLICY "messages: authenticated users can read all"
  ON messages FOR SELECT TO authenticated USING (true);

-- Users can only post / edit / delete their own messages
CREATE POLICY "messages: users insert own"
  ON messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "messages: users update own"
  ON messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "messages: users delete own"
  ON messages FOR DELETE TO authenticated USING (user_id = auth.uid());

-- reactions -----------------------------------------------
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions: authenticated users can read all"
  ON reactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "reactions: users insert own"
  ON reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions: users delete own"
  ON reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- repositories --------------------------------------------
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- All signed-in users can read all repositories
-- (class repos are public by default; keeping SELECT open simplifies contributor JOINs)
CREATE POLICY "repositories: authenticated users can read all"
  ON repositories FOR SELECT TO authenticated USING (true);

-- Any signed-in user can create a repository
CREATE POLICY "repositories: authenticated users can insert"
  ON repositories FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Only the creator can update / delete a repository
CREATE POLICY "repositories: owners can update"
  ON repositories FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "repositories: owners can delete"
  ON repositories FOR DELETE TO authenticated USING (created_by = auth.uid());

-- documents -----------------------------------------------
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can only access their own document metadata rows
CREATE POLICY "documents: users manage own"
  ON documents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- document_versions ---------------------------------------
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can read version history
CREATE POLICY "document_versions: authenticated users can read all"
  ON document_versions FOR SELECT TO authenticated USING (true);

-- Any signed-in user can snapshot a version (merge workflow)
CREATE POLICY "document_versions: authenticated users can insert"
  ON document_versions FOR INSERT TO authenticated WITH CHECK (true);

-- repository_contributors ---------------------------------
ALTER TABLE repository_contributors ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can see contributors (needed for stats, cards, Repos page)
CREATE POLICY "repository_contributors: authenticated users can read all"
  ON repository_contributors FOR SELECT TO authenticated USING (true);

-- Users can only insert / update / delete their own contributor row
CREATE POLICY "repository_contributors: users manage own"
  ON repository_contributors FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- merge_requests ------------------------------------------
ALTER TABLE merge_requests ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can read merge requests (to review diffs)
CREATE POLICY "merge_requests: authenticated users can read all"
  ON merge_requests FOR SELECT TO authenticated USING (true);

-- Users can only create / edit / delete their own merge requests
CREATE POLICY "merge_requests: users manage own"
  ON merge_requests FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());