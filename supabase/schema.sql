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
  title        text        not null,
  blocks       jsonb       not null default '[]',
  version      text        not null default '1.0.0',
  tags         text[]      not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (repo_id, user_id)
);

create table if not exists document_versions (
  id              uuid        primary key default gen_random_uuid(),
  repo_id         text        not null references repositories(id) on delete cascade,
  version         text        not null,
  blocks          jsonb       not null,
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