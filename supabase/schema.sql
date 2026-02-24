create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text        not null default 'Student',
  full_name    text        not null default EMPTY,
  organization text        not null default EMPTY,
  avatar_url   text,
  email        text,
  aura         integer     not null default 0 check (aura >= 0),
  tier         text        not null default 'seedling'
                           check (tier in ('seedling','sprout','sapling','grove','ancient-oak')),
  badges       text[]      not null default '{}',
  tags         text[]      not null default '{}',
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


-- Full "documents" schema (NO repositories table)
-- Repos are modeled as "public versions" / "roots" of documents via:
--   - root_document_id (the canonical/public root)
--   - source_document_id (fork lineage / copy source)
--
-- Supports:
-- - public/private/restricted access
-- - tag-gated access (required_user_tags)
-- - explicit per-user ACL (document_acl)
-- - merge policy hooks (merge_policy)
-- - merge requests (document_merge_requests)

create table if not exists documents (
  id                 uuid        primary key default gen_random_uuid(),

  -- explicit owner
  owner_user_id      uuid        not null references auth.users(id) on delete cascade,

  -- if this doc was copied/forked from another doc (lineage)
  source_document_id uuid        references documents(id) on delete set null,

  title              text        not null,
  blocks             text       not null default ''::text,
  version            text        not null default '1.0.0',
  tags               text[]      not null default '{}'::text[],

  -- access control
  access_level       text        not null default 'private'
    check (access_level in ('private','public','restricted')),

  -- users must have tags matching this list (when access_level='restricted')
  required_user_tags text[]      not null default '{}'::text[],

  -- merge behavior
  merge_policy       text        not null default 'invite_only'
    check (merge_policy in ('no_merges','invite_only','anyone')),

  -- mark whether this row is the canonical public root (optional convenience)
  is_public_root     boolean     not null default false,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  embeddding         vector 

  -- sanity checks (optional but helpful)
  constraint chk_root_self_consistency
    check (
      (is_public_root = false)
      or (root_document_id = id and access_level = 'public')
    )
);

-- Indexes
create index if not exists idx_documents_owner on documents(owner_user_id);
create index if not exists idx_documents_access_level on documents(access_level) where access_level = 'public';
create index if not exists idx_documents_required_tags on documents using gin (required_user_tags);
create index if not exists idx_documents_source on documents(source_document_id);
create index if not exists idx_documents_root on documents(root_document_id);

-- Optional but recommended: automatic updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_documents_set_updated_at on documents;
create trigger trg_documents_set_updated_at
before update on documents
for each row execute function set_updated_at();

-- Explicit allow-list + roles per document
create table if not exists document_acl (
  document_id uuid not null references documents(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'viewer'
    check (role in ('viewer','commenter','editor','maintainer')),
  created_at  timestamptz not null default now(),
  primary key (document_id, user_id)
);
create index if not exists idx_document_acl_user on document_acl(user_id);

-- Merge requests (from source doc -> target doc)
create table if not exists document_merge_requests (
  id                 uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references documents(id) on delete cascade,
  target_document_id uuid not null references documents(id) on delete cascade,
  author_user_id     uuid not null references auth.users(id) on delete cascade,
  status             text not null default 'open'
    check (status in ('open','accepted','rejected','closed')),
  patch              jsonb not null default '{}'::jsonb,
  message            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_merge_requests_target on document_merge_requests(target_document_id, status);
create index if not exists idx_merge_requests_author on document_merge_requests(author_user_id, status);

drop trigger if exists trg_document_merge_requests_set_updated_at on document_merge_requests;
create trigger trg_document_merge_requests_set_updated_at
before update on document_merge_requests
for each row execute function set_updated_at();

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

-- Anyone authenticated can read public documents
CREATE POLICY "documents: read public"
  ON documents FOR SELECT TO authenticated
  USING (access_level = 'public');

-- Users can fully manage their own documents
CREATE POLICY "documents: users manage own"
  ON documents FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

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

   -- The canonical graph record (one per user-created graph)
   CREATE TABLE graphs (
     id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
     owner_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     title         text        NOT NULL DEFAULT 'Untitled Graph',
     description   text,
     tags          text[]      NOT NULL DEFAULT '{}',
     is_pinned     boolean     NOT NULL DEFAULT false,
     created_at    timestamptz NOT NULL DEFAULT now(),
     updated_at    timestamptz NOT NULL DEFAULT now()
   );

   CREATE INDEX idx_graphs_owner ON graphs(owner_id);

   -- Immutable append-only version log (each save = one row)
   -- "nodes" stores the full JSON array your AI already outputs
   CREATE TABLE graph_versions (
     id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
     graph_id      uuid        NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
     version_num   integer     NOT NULL,             -- 1, 2, 3… per graph
     nodes         jsonb       NOT NULL DEFAULT '[]',-- your existing node JSON
     edges         jsonb       NOT NULL DEFAULT '[]',-- optional if edges are separate
     summary       text,                             -- AI-generated 2–3 sentence summary
     prompt        text,                             -- the user prompt that produced this
     created_at    timestamptz NOT NULL DEFAULT now(),

     UNIQUE (graph_id, version_num)
   );

   CREATE INDEX idx_gv_graph_id ON graph_versions(graph_id);

   -- Convenience: points to the latest version so you don't scan history each time
   CREATE TABLE graph_heads (
     graph_id           uuid PRIMARY KEY REFERENCES graphs(id) ON DELETE CASCADE,
     latest_version_id  uuid NOT NULL REFERENCES graph_versions(id) ON DELETE CASCADE,
     version_num        integer NOT NULL
   );

   -- Auto-bump updated_at on graphs
   CREATE TRIGGER trg_graphs_updated_at
   BEFORE UPDATE ON graphs
   FOR EACH ROW EXECUTE FUNCTION set_updated_at();  -- reuse your existing function

   -- RLS
   ALTER TABLE graphs         ENABLE ROW LEVEL SECURITY;
   ALTER TABLE graph_versions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE graph_heads    ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "graphs: users own their graphs"
     ON graphs FOR ALL TO authenticated
     USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

   CREATE POLICY "graph_versions: users read own"
     ON graph_versions FOR SELECT TO authenticated
     USING (graph_id IN (SELECT id FROM graphs WHERE owner_id = auth.uid()));

   CREATE POLICY "graph_versions: users insert own"
     ON graph_versions FOR INSERT TO authenticated
     WITH CHECK (graph_id IN (SELECT id FROM graphs WHERE owner_id = auth.uid()));

   CREATE POLICY "graph_heads: users manage own"
     ON graph_heads FOR ALL TO authenticated
     USING (graph_id IN (SELECT id FROM graphs WHERE owner_id = auth.uid()));

  -- ============================================================
   -- Nootes — Conversation History
   -- Reuses existing graphs / graph_versions for graph rendering
   -- ============================================================

   create table if not exists conversations (
     id              uuid        primary key default gen_random_uuid(),
     user_id         uuid        not null references auth.users(id) on delete cascade,

     -- optional scope: tie a convo to a document or channel
     document_id     uuid        references documents(id) on delete set null,
     channel_id      uuid        references channels(id) on delete set null,

     context_type    text        not null default 'home'
                                 check (context_type in ('home', 'editor', 'channel')),

     title           text,           -- auto-generated summary title
     system_prompt   text,           -- persona / context injected at conversation start

     created_at      timestamptz not null default now(),
     updated_at      timestamptz not null default now()
   );

   create index if not exists idx_conversations_user    on conversations(user_id);
   create index if not exists idx_conversations_doc     on conversations(document_id);
   create index if not exists idx_conversations_channel on conversations(channel_id);

   create table if not exists conversation_turns (
     id                  uuid        primary key default gen_random_uuid(),
     conversation_id     uuid        not null references conversations(id) on delete cascade,

     role                text        not null check (role in ('user', 'assistant', 'system')),
     content             text        not null,

     -- rendering hints (read by frontend to pick correct renderer)
     render_mode         text        not null default 'markdown'
                                     check (render_mode in ('markdown', 'latex', 'code', 'graph', 'mixed')),

     -- if this turn produced / references a graph, point to the version
     graph_version_id    uuid        references graph_versions(id) on delete set null,

     turn_index          integer     not null,   -- ordering within conversation
     prompt_tokens       integer,
     completion_tokens   integer,

     created_at          timestamptz not null default now(),

     unique (conversation_id, turn_index)
   );

   create index if not exists idx_turns_conversation on conversation_turns(conversation_id, turn_index);

   -- ============================================================
   -- Triggers / RLS
   -- ============================================================

   drop trigger if exists trg_conversations_updated_at on conversations;
   create trigger trg_conversations_updated_at
   before update on conversations
   for each row execute function set_updated_at();

   alter table conversations        enable row level security;
   alter table conversation_turns   enable row level security;

   create policy "conversations: users manage own"
     on conversations for all to authenticated
     using (user_id = auth.uid()) with check (user_id = auth.uid());

   create policy "conversation_turns: users manage own"
     on conversation_turns for all to authenticated
     using (
       exists (
         select 1 from conversations c
         where c.id = conversation_id and c.user_id = auth.uid()
       )
     )
     with check (
       exists (
         select 1 from conversations c
         where c.id = conversation_id and c.user_id = auth.uid()
       )
     );

   alter publication supabase_realtime add table conversation_turns;

-- Folders
create table if not exists folders (
  id               uuid primary key default gen_random_uuid(),
  owner_user_id    uuid not null references auth.users(id) on delete cascade,
  parent_folder_id uuid references folders(id) on delete cascade,
  name             text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (owner_user_id, parent_folder_id, name)
);

create index if not exists idx_folders_owner  on folders(owner_user_id);
create index if not exists idx_folders_parent on folders(parent_folder_id);

-- Documents: add this column
alter table documents
  add column if not exists folder_id uuid references folders(id) on delete set null;

create index if not exists idx_documents_folder on documents(folder_id);

create policy "folders: users manage own"
  on folders for all to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());